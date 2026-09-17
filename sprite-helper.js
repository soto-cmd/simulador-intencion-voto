// Candidate portrait sprite helper for the ANR slate shown in the simulator reference.
(() => {
  const original = window.imageMarkup;
  window.imageMarkup = function(candidate, size = 'large') {
    const raw = candidate?.photo_url || '';
    if (raw.startsWith('sprite:')) {
      const i = Number(raw.slice(7));
      if (Number.isInteger(i) && i >= 0 && i < 12) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const px = size === 'small' ? 120 : 220;
        return `<div role="img" aria-label="${esc(candidate?.name || '')}" style="width:${px}px;height:${px}px;max-width:100%;background:#fff url('./assets/candidates/anr-sprite.webp') no-repeat ${-col * px}px ${-row * px}px;background-size:${4 * px}px ${3 * px}px"></div>`;
      }
    }
    return original(candidate, size);
  };
})();
