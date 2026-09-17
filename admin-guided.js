(() => {
  const $ = (id) => document.getElementById(id);
  let initialized = false;

  function optionText(c) {
    const extras = [];
    if (c.list_number) extras.push(`Lista ${c.list_number}`);
    if (c.option_number) extras.push(`Opción ${c.option_number}`);
    return extras.length ? `${c.name} — ${extras.join(' · ')}` : c.name;
  }

  function replaceWithSelect(id, placeholder) {
    const old = $(id);
    if (!old || old.tagName === 'SELECT') return old;
    const sel = document.createElement('select');
    sel.id = id;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    old.replaceWith(sel);
    return sel;
  }

  function makeReadonly(id) {
    const el = $(id);
    if (!el) return;
    el.readOnly = true;
    el.classList.add('adminAutoField');
    el.tabIndex = -1;
  }

  function partyKey(c) {
    return `${c.party_abbr || ''}|${c.party_name || ''}|${c.list_number || ''}`;
  }

  function currentCandidates() {
    try { return Array.isArray(candidates) ? candidates : []; }
    catch { return []; }
  }

  function refreshParties() {
    const race = $('candRace')?.value || 'intendente';
    const rows = currentCandidates().filter(c => c.race_type === race);
    const partySelect = $('candParty');
    if (!partySelect) return;
    const seen = new Map();
    rows.forEach(c => {
      const key = partyKey(c);
      if (!seen.has(key)) seen.set(key, c);
    });
    partySelect.innerHTML = '<option value="">Seleccionar partido / movimiento</option>' +
      [...seen.entries()].map(([key, c]) => `<option value="${key}">${c.party_name || c.party_abbr || 'Sin partido'}${c.list_number ? ` — Lista ${c.list_number}` : ''}</option>`).join('');
    refreshNames();
  }

  function refreshNames() {
    const race = $('candRace')?.value || 'intendente';
    const party = $('candParty')?.value || '';
    const nameSelect = $('candName');
    if (!nameSelect) return;
    let rows = currentCandidates().filter(c => c.race_type === race);
    if (party) rows = rows.filter(c => partyKey(c) === party);
    rows.sort((a,b) => (a.option_number || a.display_order || 999) - (b.option_number || b.display_order || 999));
    nameSelect.innerHTML = '<option value="">Seleccionar candidato</option>' + rows.map(c => `<option value="${c.id}">${optionText(c)}</option>`).join('');
    clearAutoFields();
  }

  function clearAutoFields() {
    ['candOffice','candList','candPartyAbbr','candOption','candOrder','candPhoto'].forEach(id => {
      const el = $(id); if (el) el.value = '';
    });
    const color = $('candColor'); if (color) color.value = '#64748b';
  }

  function fillFromCandidate() {
    const id = $('candName')?.value;
    const c = currentCandidates().find(x => x.id === id);
    if (!c) { clearAutoFields(); return; }
    $('candOffice').value = c.office || (c.race_type === 'junta' ? 'Junta municipal' : 'Intendente municipal');
    $('candList').value = c.list_number || '';
    $('candPartyAbbr').value = c.party_abbr || '';
    $('candColor').value = c.party_color || '#64748b';
    $('candOption').value = c.option_number || '';
    $('candOrder').value = c.display_order || '';
    $('candPhoto').value = c.photo_url || '';
  }

  function convertButtonToAccessMode() {
    const btn = $('addCandidateBtn');
    if (!btn) return;
    btn.textContent = 'Asignar acceso';
    const title = btn.closest('.card')?.querySelector('h3');
    if (title) title.textContent = 'Asignar acceso a candidato';
    const hint = btn.closest('.card')?.querySelector('.muted:last-child');
    if (hint) hint.textContent = 'Elegí una candidatura existente y asignale un correo. El candidato creará su propia contraseña.';
  }

  function interceptSubmit() {
    const btn = $('addCandidateBtn');
    if (!btn || btn.dataset.guidedBound) return;
    btn.dataset.guidedBound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const candidateId = $('candName')?.value;
      const email = $('candEmail')?.value.trim().toLowerCase();
      const msg = $('adminMsg');
      if (!candidateId || !email) {
        if (msg) msg.textContent = 'Seleccioná un candidato e ingresá su correo.';
        return;
      }
      btn.disabled = true;
      if (msg) msg.textContent = 'Asignando acceso…';
      try {
        const { error } = await db.from('vote_candidate_invites').upsert({ candidate_id: candidateId, email }, { onConflict: 'candidate_id,email' });
        if (error) throw error;
        if (msg) msg.textContent = 'Acceso asignado. El candidato ya puede crear su cuenta con ese correo.';
        $('candEmail').value = '';
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = 'No se pudo asignar el acceso.';
      } finally {
        btn.disabled = false;
      }
    }, true);
  }

  function init() {
    if (initialized) return;
    const panel = $('adminPanel');
    if (!panel || panel.classList.contains('hidden')) return;
    if (!$('candName') || !$('candParty') || !$('candRace')) return;
    initialized = true;

    replaceWithSelect('candName', 'Seleccionar candidato');
    replaceWithSelect('candParty', 'Seleccionar partido / movimiento');
    ['candOffice','candList','candPartyAbbr','candOption','candOrder','candPhoto'].forEach(makeReadonly);
    const color = $('candColor'); if (color) { color.disabled = true; color.classList.add('adminAutoField'); }

    $('candRace').addEventListener('change', refreshParties);
    $('candParty').addEventListener('change', refreshNames);
    $('candName').addEventListener('change', fillFromCandidate);
    convertButtonToAccessMode();
    refreshParties();
    interceptSubmit();
  }

  const obs = new MutationObserver(() => setTimeout(init, 50));
  window.addEventListener('DOMContentLoaded', () => {
    const dash = $('dashboardView');
    if (dash) obs.observe(dash, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
    setTimeout(init, 500);
  });
})();
