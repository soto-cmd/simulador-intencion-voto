(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let allCandidates = [];

  function partyKey(c){
    return c.party_abbr || c.party_name || '';
  }

  function uniqueParties(rows){
    const map = new Map();
    rows.forEach(c => {
      const key = partyKey(c);
      if(key && !map.has(key)) map.set(key, { key, label: c.party_name || c.party_abbr || key, abbr: c.party_abbr || '' });
    });
    return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'es'));
  }

  function candidateLabel(c){
    const pieces = [c.name];
    if(c.list_number) pieces.push(`Lista ${c.list_number}`);
    if(c.option_number) pieces.push(`Opción ${c.option_number}`);
    return pieces.join(' · ');
  }

  function findAdminFormCard(){
    const panel = document.getElementById('adminPanel');
    if(!panel) return null;
    const button = document.getElementById('addCandidateBtn');
    return button?.closest('.card') || null;
  }

  function buildGuidedForm(card){
    if(!card || card.dataset.guidedAccessReady === '1') return;
    card.dataset.guidedAccessReady = '1';

    const oldGrid = card.querySelector('.formGrid');
    if(!oldGrid) return;

    card.querySelector('h3').textContent = 'Asignar acceso a candidato';
    const helper = card.querySelector('#adminMsg')?.nextElementSibling;
    if(helper) helper.textContent = 'Elegí una candidatura existente y asignale un correo. El candidato creará su propia contraseña.';

    oldGrid.classList.add('legacyCandidateFields');
    oldGrid.style.display = 'none';

    const guided = document.createElement('div');
    guided.id = 'guidedAccessForm';
    guided.className = 'guidedAccessForm';
    guided.innerHTML = `
      <div>
        <label for="accessRace">Tipo</label>
        <select id="accessRace">
          <option value="intendente">Intendente municipal</option>
          <option value="junta">Junta municipal</option>
        </select>
      </div>
      <div>
        <label for="accessParty">Partido / movimiento</label>
        <select id="accessParty"></select>
      </div>
      <div class="guidedSpan2">
        <label for="accessCandidate">Candidato</label>
        <select id="accessCandidate"></select>
      </div>
      <div class="guidedCandidatePreview guidedSpan2" id="guidedCandidatePreview"></div>
      <div class="guidedSpan2">
        <label for="candEmail">Correo del candidato</label>
        <input id="guidedEmail" type="email" autocomplete="email" placeholder="correo@ejemplo.com" />
      </div>`;
    oldGrid.insertAdjacentElement('afterend', guided);

    const btn = document.getElementById('addCandidateBtn');
    btn.textContent = 'Asignar acceso';
    btn.type = 'button';

    document.getElementById('accessRace')?.addEventListener('change', refreshParties);
    document.getElementById('accessParty')?.addEventListener('change', refreshCandidates);
    document.getElementById('accessCandidate')?.addEventListener('change', refreshPreview);
    btn.addEventListener('click', assignAccess, true);

    refreshParties();
  }

  function filteredByRace(){
    const race = document.getElementById('accessRace')?.value || 'intendente';
    return allCandidates.filter(c => c.race_type === race && c.active !== false);
  }

  function refreshParties(){
    const rows = filteredByRace();
    const parties = uniqueParties(rows);
    const sel = document.getElementById('accessParty');
    if(!sel) return;
    sel.innerHTML = parties.map(p => `<option value="${esc(p.key)}">${esc(p.label)}${p.abbr && p.abbr !== p.label ? ` (${esc(p.abbr)})` : ''}</option>`).join('');
    refreshCandidates();
  }

  function refreshCandidates(){
    const party = document.getElementById('accessParty')?.value || '';
    const rows = filteredByRace().filter(c => partyKey(c) === party).sort((a,b) => (a.option_number||a.display_order||999) - (b.option_number||b.display_order||999) || a.name.localeCompare(b.name,'es'));
    const sel = document.getElementById('accessCandidate');
    if(!sel) return;
    sel.innerHTML = rows.map(c => `<option value="${c.id}">${esc(candidateLabel(c))}</option>`).join('');
    refreshPreview();
  }

  function refreshPreview(){
    const id = document.getElementById('accessCandidate')?.value;
    const c = allCandidates.find(x => x.id === id);
    const box = document.getElementById('guidedCandidatePreview');
    if(!box) return;
    if(!c){ box.innerHTML = '<span class="muted">No hay candidatos disponibles para esta selección.</span>'; return; }
    const color = c.party_color || '#64748b';
    box.innerHTML = `<span class="guidedColorDot" style="background:${esc(color)}"></span><div><strong>${esc(c.name)}</strong><small>${esc(c.office || '')}${c.list_number ? ` · Lista ${esc(c.list_number)}` : ''}${c.option_number ? ` · Opción ${esc(c.option_number)}` : ''}${c.party_abbr ? ` · ${esc(c.party_abbr)}` : ''}</small></div>`;
  }

  async function assignAccess(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const candidateId = document.getElementById('accessCandidate')?.value;
    const email = (document.getElementById('guidedEmail')?.value || '').trim().toLowerCase();
    const msg = document.getElementById('adminMsg');
    if(!candidateId || !email){
      if(msg) msg.textContent = 'Seleccioná un candidato e ingresá su correo.';
      return;
    }
    const btn = document.getElementById('addCandidateBtn');
    btn.disabled = true;
    if(msg) msg.textContent = 'Asignando acceso…';

    const { error } = await client.from('vote_candidate_invites').upsert({ candidate_id: candidateId, email }, { onConflict: 'candidate_id,email' });
    btn.disabled = false;
    if(error){
      console.error(error);
      if(msg) msg.textContent = 'No se pudo asignar el acceso. Revisá el correo o intentá otra vez.';
      return;
    }
    const c = allCandidates.find(x => x.id === candidateId);
    if(msg) msg.textContent = `Acceso asignado a ${c?.name || 'la candidatura'}.`;
    document.getElementById('guidedEmail').value = '';
  }

  async function init(){
    const card = findAdminFormCard();
    if(!card) return;
    const { data, error } = await client.from('vote_candidates').select('id,name,office,list_number,option_number,display_order,party_name,party_abbr,party_color,race_type,active').order('race_type').order('list_number').order('option_number');
    if(error){ console.error(error); return; }
    allCandidates = data || [];
    buildGuidedForm(card);
  }

  const observer = new MutationObserver(() => {
    const panel = document.getElementById('adminPanel');
    if(panel && !panel.classList.contains('hidden')) init();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const dash = document.getElementById('dashboardView');
    if(dash) observer.observe(dash, { attributes:true, subtree:true, childList:true, attributeFilter:['class'] });
    setTimeout(init, 900);
  });
})();