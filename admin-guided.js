(() => {
  const $ = (id) => document.getElementById(id);
  let initialized = false;

  function replaceWithSelect(id, placeholder) {
    const old = $(id);
    if (!old) return null;
    if (old.tagName === 'SELECT') {
      if (!old.options.length) old.innerHTML = `<option value="">${placeholder}</option>`;
      return old;
    }
    const sel = document.createElement('select');
    sel.id = id;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    old.replaceWith(sel);
    return sel;
  }

  function currentCandidates() {
    try { return Array.isArray(candidates) ? candidates : []; }
    catch { return []; }
  }

  function listLabel(row) {
    const party = row.party_name || row.party_abbr || '';
    const abbr = row.party_abbr ? ` · ${row.party_abbr}` : '';
    return `Lista ${row.list_number}${party ? ` — ${party}` : ''}${abbr}`;
  }

  function candidateLabel(c) {
    return c.option_number ? `${c.name} — Opción ${c.option_number}` : c.name;
  }

  function rowsForRace() {
    const race = $('candRace')?.value || 'intendente';
    return currentCandidates().filter(c => c.race_type === race && c.active !== false);
  }

  function refreshLists() {
    const listSelect = $('candList');
    if (!listSelect) return;
    const rows = rowsForRace();
    const seen = new Map();
    rows.forEach(c => {
      const key = String(c.list_number || '');
      if (key && !seen.has(key)) seen.set(key, c);
    });
    const ordered = [...seen.entries()].sort((a,b) => Number(a[0]) - Number(b[0]));
    listSelect.innerHTML = '<option value="">Seleccionar lista</option>' + ordered.map(([num, c]) => `<option value="${num}">${listLabel(c)}</option>`).join('');
    refreshNames();
  }

  function refreshNames() {
    const nameSelect = $('candName');
    if (!nameSelect) return;
    const list = $('candList')?.value || '';
    let rows = rowsForRace();
    if (list) rows = rows.filter(c => String(c.list_number || '') === String(list));
    rows.sort((a,b) => (a.option_number || a.display_order || 999) - (b.option_number || b.display_order || 999));
    nameSelect.innerHTML = '<option value="">Seleccionar candidato</option>' + rows.map(c => `<option value="${c.id}">${candidateLabel(c)}</option>`).join('');
    syncHiddenFields(null);
  }

  function syncHiddenFields(c) {
    if (!$('candParty')) return;
    $('candParty').value = c?.party_name || '';
    $('candOffice').value = c?.office || '';
    $('candPartyAbbr').value = c?.party_abbr || '';
    if ($('candColor')) $('candColor').value = c?.party_color || '#64748b';
    $('candOption').value = c?.option_number || '';
    $('candOrder').value = c?.display_order || '';
    $('candPhoto').value = c?.photo_url || '';
  }

  function fillFromCandidate() {
    const id = $('candName')?.value;
    const c = currentCandidates().find(x => x.id === id);
    syncHiddenFields(c || null);
  }

  function prepareForm() {
    replaceWithSelect('candName', 'Seleccionar candidato');
    replaceWithSelect('candList', 'Seleccionar lista');

    const btn = $('addCandidateBtn');
    if (btn) btn.textContent = 'Asignar acceso';
    const title = btn?.closest('.card')?.querySelector('h3');
    if (title) title.textContent = 'Asignar acceso a candidato';
    const hint = btn?.closest('.card')?.querySelector('.muted:last-child');
    if (hint) hint.textContent = 'Seleccioná la lista y el candidato, luego asignale un correo. El candidato creará su propia contraseña.';
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
        if (msg) msg.textContent = 'Seleccioná una lista, un candidato e ingresá su correo.';
        return;
      }
      btn.disabled = true;
      if (msg) msg.textContent = 'Asignando acceso…';
      try {
        const { error } = await db.from('vote_candidate_invites').upsert(
          { candidate_id: candidateId, email },
          { onConflict: 'candidate_id,email' }
        );
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
    if (!$('candName') || !$('candList') || !$('candRace')) return;
    initialized = true;

    prepareForm();
    $('candRace').addEventListener('change', refreshLists);
    $('candList').addEventListener('change', refreshNames);
    $('candName').addEventListener('change', fillFromCandidate);
    refreshLists();
    interceptSubmit();
  }

  const obs = new MutationObserver(() => setTimeout(init, 50));
  window.addEventListener('DOMContentLoaded', () => {
    const dash = $('dashboardView');
    if (dash) obs.observe(dash, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
    setTimeout(init, 500);
  });
})();
