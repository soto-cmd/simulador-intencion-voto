// Candidate portrait sprite helper for municipal slates.
(() => {
  const original = window.imageMarkup;

  function spriteMarkup(candidate, size, index, asset) {
    if (!Number.isInteger(index) || index < 0 || index > 11) return null;
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = (col / 3) * 100;
    const y = (row / 2) * 100;
    return `<div class="candidateSpritePortrait" role="img" aria-label="${esc(candidate?.name || '')}" style="width:100%;height:100%;background:#fff url('./${asset}') no-repeat ${x}% ${y}%;background-size:400% 300%;background-position:${x}% ${y}%"></div>`;
  }

  window.imageMarkup = function(candidate, size = 'large') {
    const raw = candidate?.photo_url || '';

    if (raw.startsWith('sprite:')) {
      const html = spriteMarkup(candidate, size, Number(raw.slice(7)), 'assets/candidates/anr-sprite.webp');
      if (html) return html;
    }

    if (raw.startsWith('sprite-plra:')) {
      const html = spriteMarkup(candidate, size, Number(raw.slice(12)), 'assets/candidates/plra-sprite.webp');
      if (html) return html;
    }

    return original(candidate, size);
  };
})();
