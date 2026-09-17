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
        const small = size === 'small';
        const w = small ? 120 : 220;
        const h = small ? 120 : 220;
        const scale = small ? 3 : 2.18;
        const bgW = Math.round(640 * scale);
        const bgH = Math.round(480 * scale);
        const x = Math.round(-col * 160 * scale);
        const y = Math.round(-row * 160 * scale);
        return `<div role="img" aria-label="${esc(candidate?.name || '')}" style="width:${w}px;height:${h}px;max-width:100%;background:#fff url('./assets/candidates/anr-sprite.webp') no-repeat ${x}px ${y}px;background-size:${bgW}px ${bgH}px;background-origin:border-box"></div>`;
      }
    }
    return original(candidate, size);
  };
})();
