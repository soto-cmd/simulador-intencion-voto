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
        const cls = size === 'small' ? 'spritePortrait spritePortraitSmall' : 'spritePortrait';
        return `<div class="${cls}" style="--sprite-x:${col};--sprite-y:${row}" role="img" aria-label="${esc(candidate?.name || '')}"></div>`;
      }
    }
    return original(candidate, size);
  };
})();
