(() => {
  let lastKey = '';

  function numFromStat(labelText) {
    const cards = [...document.querySelectorAll('#statsGrid .statCard')];
    const card = cards.find(c => (c.querySelector('.statLabel')?.textContent || '').toLowerCase().includes(labelText.toLowerCase()));
    if (!card) return 0;
    const raw = (card.querySelector('.statValue')?.textContent || '').replace('%','').replace(',','.').trim();
    return Number(raw) || 0;
  }

  function findCandidate() {
    try {
      if (typeof currentProfile === 'undefined' || !currentProfile || currentProfile.role !== 'candidate') return null;
      if (typeof candidates === 'undefined') return null;
      return candidates.find(c => c.id === currentProfile.candidate_id) || null;
    } catch { return null; }
  }

  function photoHTML(c) {
    try { return imageMarkup(c, 'large'); } catch { return `<div class="avatarFallback largeAvatar">${(c?.name||'?').slice(0,2).toUpperCase()}</div>`; }
  }

  function ensureHero() {
    const view = document.getElementById('dashboardView');
    const stats = document.getElementById('statsGrid');
    const title = document.getElementById('dashboardTitle');
    if (!view || !stats || !title || view.classList.contains('hidden')) return;

    const candidate = findCandidate();
    if (!candidate) {
      view.classList.remove('candidateMode');
      document.getElementById('candidateVisualHero')?.remove();
      return;
    }

    const percentage = numFromStat('Intención de voto');
    const today = numFromStat('Intención de voto hoy');
    const votes = numFromStat('Registros para tu candidatura');
    const total = numFromStat('Simulaciones registradas');
    const color = candidate.party_color || '#1738cf';
    const key = [candidate.id, percentage, today, votes, total].join('|');
    if (key === lastKey && document.getElementById('candidateVisualHero')) return;
    lastKey = key;

    view.classList.add('candidateMode');
    view.style.setProperty('--candidate-color', color);
    document.getElementById('candidateVisualHero')?.remove();

    const hero = document.createElement('section');
    hero.id = 'candidateVisualHero';
    hero.className = 'candidateVisualHero';
    hero.innerHTML = `
      <div class="candidateIdentityCard">
        <div class="candidateIdentityPhoto">${photoHTML(candidate)}</div>
        <div class="candidateIdentityText">
          <div class="candidateRole">${candidate.race_type === 'junta' ? 'Candidato a Junta Municipal' : 'Candidato a Intendente Municipal'}</div>
          <h3>${esc(candidate.name || '')}</h3>
          <div class="candidateIdentityMeta">
            <span class="partyChip">${esc(candidate.party_name || candidate.party_abbr || 'Candidatura')}</span>
            ${candidate.list_number ? `<span>Lista ${esc(candidate.list_number)}</span>` : ''}
            ${candidate.option_number ? `<span>Opción ${esc(candidate.option_number)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="candidateChartCard">
        <div class="candidateDonut" style="--candidate-pct:${Math.max(0,Math.min(100,percentage))}">
          <div class="candidateDonutValue">${percentage.toFixed(1).replace('.0','')}%<small>Intención</small></div>
        </div>
        <div class="candidateChartInfo">
          <h4>Resumen visual</h4>
          <div class="candidateMetric">
            <div class="candidateMetricHead"><span>Intención general</span><strong>${percentage.toFixed(1).replace('.0','')}%</strong></div>
            <div class="candidateMetricTrack"><div class="candidateMetricFill" style="width:${Math.max(0,Math.min(100,percentage))}%"></div></div>
          </div>
          <div class="candidateMetric">
            <div class="candidateMetricHead"><span>Intención de hoy</span><strong>${today.toFixed(1).replace('.0','')}%</strong></div>
            <div class="candidateMetricTrack"><div class="candidateMetricFill" style="width:${Math.max(0,Math.min(100,today))}%"></div></div>
          </div>
          <div class="candidateMetricHead"><span>Registros</span><strong>${votes} / ${total}</strong></div>
        </div>
      </div>`;
    stats.parentNode.insertBefore(hero, stats);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(ensureHero));
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, characterData:true});
    setTimeout(ensureHero, 500);
  });
})();
