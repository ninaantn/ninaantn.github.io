(() => {
  const root = document.documentElement;
  const page = document.querySelector('.page');
  const column = document.querySelector('.intro');
  const corner = document.querySelector('.ruler-corner');
  const controls = document.querySelector('.page-controls');
  // Draw above controls without placing the drag target above their buttons.
  const horizontalLine = document.createElement('span');
  horizontalLine.className = 'guide-line--y';
  horizontalLine.setAttribute('aria-hidden', 'true');
  horizontalLine.hidden = true;
  document.body.append(horizontalLine);
  const axes = ['x', 'y'].map(key => {
    const ruler = document.getElementById(key === 'x' ? 'portfolio-ruler' : 'portfolio-ruler-y');
    const readout = document.createElement('span');
    readout.className = `ruler-active-value ruler-active-value--${key}`;
    readout.setAttribute('aria-hidden', 'true');
    ruler.append(readout);
    return {
      key, ruler, readout, value: 0, minimum: 0, maximum: 0,
      scale: ruler.querySelector('.ruler-scale'),
      marker: ruler.querySelector('.ruler-index'),
      rail: document.querySelector(`.measure-rail--${key}`)
    };
  });
  let frame = 0;
  let drag = null;

  // Guides use document coordinates. Their positions never affect page layout.
  function render() {
    frame = 0;
    const bounds = column.getBoundingClientRect();
    const thickness = parseFloat(getComputedStyle(root).getPropertyValue('--ruler-height'));
    const width = root.clientWidth;
    const height = window.innerHeight;
    const originX = bounds.left - 20;
    const originScreenY = bounds.top - 20;
    const originY = originScreenY + window.scrollY;
    // Keep the horizontal drag cue just before the theme control on every viewport.
    const controlsLeft = controls.getBoundingClientRect().left;
    root.style.setProperty('--guide-hint-x', `${Math.max(thickness + 16, controlsLeft - 24)}px`);

    for (const axis of axes) {
      const vertical = axis.key === 'y';
      axis.ruler.hidden = false;
      const start = vertical ? axis.ruler.getBoundingClientRect().top : 0;
      const end = vertical ? height : width;
      axis.origin = vertical ? originScreenY : originX;
      axis.minimum = Math.ceil(thickness - (vertical ? originY : originX));
      axis.maximum = Math.floor(vertical ? root.scrollHeight - originY - 1 : width - originX - 1);
      axis.value = Math.max(axis.minimum, Math.min(axis.maximum, axis.value));
      axis.screen = axis.origin + axis.value;
      const visible = axis.screen >= thickness && axis.screen < end;
      axis.rail.hidden = !visible;
      if (vertical) horizontalLine.hidden = !visible;
      axis.marker.hidden = !visible;
      axis.readout.hidden = !visible;
      axis.readout.textContent = axis.value;

      root.style.setProperty(`--guide-${axis.key}`, `${axis.screen}px`);
      // Keep the hit target inside the viewport, including at either edge.
      const hitStart = Math.max(thickness, Math.min(end - 25, axis.screen - 12));
      root.style.setProperty(`--guide-hit-${axis.key}`, `${hitStart}px`);
      root.style.setProperty(`--guide-hit-offset-${axis.key}`, `${axis.screen - hitStart}px`);
      if (vertical) root.style.setProperty('--guide-y-on-ruler', `${axis.screen - start}px`);

      const labelWidth = axis.readout.offsetWidth;
      let labelStart = axis.screen + 7;
      if (labelStart + labelWidth > end - 6) labelStart = axis.screen - labelWidth - 7;
      labelStart = Math.max(thickness + 6, labelStart);
      const labelPosition = vertical ? labelStart + labelWidth / 2 - start : labelStart;
      root.style.setProperty(`--guide-label-${axis.key}`, `${labelPosition}px`);

      const ticks = document.createDocumentFragment();
      const first = Math.floor((start - axis.origin) / 100) * 100;
      for (let value = first; axis.origin + value <= end + 100; value += 100) {
        const position = axis.origin + value;
        if (position < thickness + 20 || position > end - 16) continue;
        const tick = document.createElement('span');
        tick.className = `ruler-tick${vertical ? ' ruler-tick--vertical' : ''}`;
        tick.style.setProperty('--tick-position', `${position - start}px`);
        const number = document.createElement('span');
        number.className = 'ruler-number';
        number.textContent = value;
        const halfWidth = String(value).length * 3;
        if (visible && position + halfWidth >= labelStart - 5 && position - halfWidth <= labelStart + labelWidth + 5) {
          number.classList.add('ruler-number--near-guide');
        }
        tick.append(number);
        ticks.append(tick);
      }
      axis.scale.replaceChildren(ticks);
      axis.ruler.setAttribute('aria-valuemin', axis.minimum);
      axis.ruler.setAttribute('aria-valuemax', axis.maximum);
      axis.ruler.setAttribute('aria-valuenow', axis.value);
    }
    corner.hidden = false;
    updateLabels();
  }

  function updateLabels() {
    const english = root.lang === 'en';
    for (const axis of axes) {
      const vertical = axis.key === 'x';
      axis.ruler.setAttribute('aria-label', english
        ? `${vertical ? 'Vertical' : 'Horizontal'} guide, ${axis.key.toUpperCase()}`
        : `${vertical ? 'Вертикальная' : 'Горизонтальная'} направляющая, ${axis.key.toUpperCase()}`);
      axis.ruler.setAttribute('aria-valuetext', english ? `${axis.value} pixels` : `${axis.value} пикс.`);
      axis.ruler.title = english
        ? 'Drag to move the guide. Arrow keys adjust; 0 resets it to the origin.'
        : 'Потяните, чтобы переместить направляющую. Стрелки — шаг, 0 — вернуть к началу координат.';
    }
  }

  function scheduleRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function setValue(axis, value) {
    axis.value = Math.max(axis.minimum, Math.min(axis.maximum, Math.round(value)));
    render();
  }

  for (const axis of axes) {
    const coordinate = event => axis.key === 'x' ? event.clientX : event.clientY;
    for (const target of [axis.ruler, axis.rail]) {
      target.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || drag) return;
        event.preventDefault();
        axis.ruler.focus({ preventScroll: true });
        drag = { id: event.pointerId, target, offset: target === axis.rail ? coordinate(event) - axis.screen : 0 };
        target.setPointerCapture(event.pointerId);
        root.dataset.rulerDragging = axis.key;
        setValue(axis, coordinate(event) - axis.origin - drag.offset);
      });
      target.addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId || drag.target !== target) return;
        setValue(axis, coordinate(event) - axis.origin - drag.offset);
      });
      function finishDrag(event) {
        if (drag?.id !== event.pointerId || drag.target !== target) return;
        drag = null;
        delete root.dataset.rulerDragging;
        if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      }
      target.addEventListener('pointerup', finishDrag);
      target.addEventListener('pointercancel', finishDrag);
      target.addEventListener('lostpointercapture', finishDrag);
    }

    axis.ruler.addEventListener('keydown', event => {
      const step = event.shiftKey ? 10 : 1;
      const visibleMinimum = axis.key === 'y'
        ? Math.max(axis.minimum, Math.ceil(axis.ruler.getBoundingClientRect().top - axis.origin))
        : axis.minimum;
      const visibleMaximum = axis.key === 'y'
        ? Math.min(axis.maximum, Math.floor(window.innerHeight - axis.origin - 1))
        : axis.maximum;
      const current = Math.max(visibleMinimum, Math.min(visibleMaximum, axis.value));
      const values = {
        ArrowLeft: Math.max(visibleMinimum, current - step),
        ArrowUp: Math.max(visibleMinimum, current - step),
        ArrowRight: Math.min(visibleMaximum, current + step),
        ArrowDown: Math.min(visibleMaximum, current + step),
        Home: visibleMinimum, End: visibleMaximum, '0': 0
      };
      if (!(event.key in values)) return;
      event.preventDefault();
      setValue(axis, values[event.key]);
    });
  }

  root.dataset.rulersReady = '';
  document.addEventListener('portfolio-languagechange', updateLabels);
  new ResizeObserver(scheduleRender).observe(page);
  window.addEventListener('resize', scheduleRender);
  window.addEventListener('scroll', scheduleRender, { passive: true });
  document.fonts.ready.then(scheduleRender);
  render();

  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    // Tie the guides to the first scale reveal, even if a guide later scrolls back into view.
    root.dataset.drawingGuides = '';
    const endDrawing = () => {
      delete root.dataset.drawingGuides;
      document.removeEventListener('pointerdown', endDrawing, true);
      document.removeEventListener('focusin', endDrawing, true);
    };
    document.addEventListener('pointerdown', endDrawing, true);
    document.addEventListener('focusin', endDrawing, true);
    const reveals = axes.flatMap(axis => axis.scale.getAnimations());
    Promise.allSettled(reveals.map(animation => animation.finished)).then(endDrawing);
  }
})();
