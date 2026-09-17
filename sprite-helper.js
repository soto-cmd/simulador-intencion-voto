// Candidate portrait sprite helper for municipal slates.
(() => {
  const original = window.imageMarkup;

  function spriteMarkup(candidate, size, index, asset, cellW, cellH) {
    if (!Number.isInteger(index) || index < 0 || index > 11) return null;
    const col = index % 4;
    const row = Math.floor(index / 4);
    const width = size === 'small' ? 120 : 220;
    const height = size === 'small' ? 120 : 220;
    const scaleX = width / cellW;
    const scaleY = height / cellH;
    const sx = 4 * cellW * scaleX;
    const sy = 3 * cellH * scaleY;
    const px = -(col * cellW * scaleX);
    const py = -(row * cellH * scaleY);
    return `<div role="img" aria-label="${esc(candidate?.name || '')}" style="width:${width}px;height:${height}px;max-width:100%;background:#fff url('./${asset}') no-repeat ${px}px ${py}px;background-size:${sx}px ${sy}px;background-position:${px}px ${py}px"></div>`;
  }

  window.imageMarkup = function(candidate, size = 'large') {
    const raw = candidate?.photo_url || '';

    if (raw.startsWith('sprite:')) {
      const html = spriteMarkup(candidate, size, Number(raw.slice(7)), 'assets/candidates/anr-sprite.webp', 120, 120);
      if (html) return html;
    }

    if (raw.startsWith('sprite-plra:')) {
      const html = spriteMarkup(candidate, size, Number(raw.slice(12)), 'assets/candidates/plra-sprite.webp', 100, 91.6667);
      if (html) return html;
    }

    return original(candidate, size);
  };
})();
