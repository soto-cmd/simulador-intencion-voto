(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let rows = [];
  let listRows = [];
  let mountedCard = null;
  let busy = false;

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function adminVisible(){
    const panel = document.getElementById('adminPanel');
    return panel && !panel.classList.contains('hidden');
  }

  async function loadData(){
    const [{data:candidates,error:ce},{data:lists,error:le}] = await Promise.all([
      client.from('vote_candidates').select('id,name,race_type,list_number,list_id,party_name,party_abbr,option_number,display_order,active').eq('active',true).order('race_type').order('list_number').order('option_number').order('display_order'),
      client.from('vote_lists').select('id,list_number,party_name,party_abbr,display_order,active').eq('active',true).order('display_order').order('list_number')
    ]);
    if(ce) throw ce;
    if(le) throw le;
    rows = candidates || [];
    listRows = lists || [];
  }

  function listLabel(listNumber){
    const l = listRows.find(x => String(x.list_number) === String(listNumber));
    if(l) return `Lista ${l.list_number} — ${l.party_abbr || l.party_name || ''}`.trim();
    const c = rows.find(x => String(x.list_number) === String(listNumber));
    return `Lista ${listNumber}${c?.party_abbr ? ` — ${c.party_abbr}` : ''}`;
  }

  function uniqueListsForRace(race){
    const vals = [...new Set(rows.filter(c => c.race_type === race && c.list_number != null).map(c => String(c.list_number)))];
    return vals.sort((a,b) => Number(a)-Number(b));
  }

  function refreshLists(){
    const race = document.getElementById('accessRace')?.value || '';
    const sel = document.getElementById('accessList');
    if(!sel) return;
    const vals = race ? uniqueListsForRace(race) : [];
    sel.innerHTML = '<option value="">Seleccionar lista</option>' + vals.map(v => `<option value="${esc(v)}">${esc(listLabel(v))}</option>`).join('');
    refreshCandidates();
  }

  function refreshCandidates(){
    const race = document.getElementById('accessRace')?.value || '';
    const list = document.getElementById('accessList')?.value || '';
    const sel = document.getElementById('accessCandidate');
    if(!sel) return;
    let filtered = rows.filter(c => (!race || c.race_type === race) && (!list || String(c.list_number) === String(list)));
    filtered.sort((a,b) => (Number(a.option_number)||Number(a.display_order)||999) - (Number(b.option_number)||Number(b.display_order)||999));
    sel.innerHTML = '<option value="">Seleccionar candidato</option>' + filtered.map(c => {
      const detail = c.race_type === 'junta' && c.option_number ? ` — Opción ${c.option_number}` : '';
      return `<option value="${c.id}">${esc(c.name + detail)}</option>`;
    }).join('');
  }

  async function assignAccess(){
    const candidateId = document.getElementById('accessCandidate')?.value || '';
    const email = (document.getElementById('accessEmail')?.value || '').trim().toLowerCase();
    const msg = document.getElementById('accessMsg');
    const btn = document.getElementById('accessAssignBtn');
    if(!candidateId || !email){ if(msg) msg.textContent = 'Seleccioná lista, candidato e ingresá el correo.'; return; }
    if(!/^\S+@\S+\.\S+$/.test(email)){ if(msg) msg.textContent = 'Ingresá un correo válido.'; return; }
    btn.disabled = true;
    if(msg) msg.textContent = 'Asignando acceso…';
    try{
      const {error} = await client.from('vote_candidate_invites').upsert({candidate_id:candidateId,email},{onConflict:'candidate_id,email'});
      if(error) throw error;
      if(msg) msg.textContent = 'Acceso asignado correctamente. El candidato ya puede crear su cuenta.';
      document.getElementById('accessEmail').value = '';
    }catch(err){
      console.error(err);
      if(msg) msg.textContent = 'No se pudo asignar el acceso.';
    }finally{
      btn.disabled = false;
    }
  }

  function mount(){
    if(!adminVisible()) return;
    const panel = document.getElementById('adminPanel');
    const card = panel?.querySelector('.card');
    if(!card) return;
    if(card.dataset.accessV3 === '1' && mountedCard === card) return;
    mountedCard = card;
    card.dataset.accessV3 = '1';
    card.classList.add('accessManagerCard');
    card.innerHTML = `
      <div class="accessManagerHead">
        <div><p class="eyebrow">ACCESOS</p><h3>Asignar acceso a candidato</h3></div>
        <span class="accessHint">Candidaturas existentes</span>
      </div>
      <div class="accessGrid">
        <div><label for="accessRace">Tipo</label><select id="accessRace"><option value="">Seleccionar tipo</option><option value="intendente">Intendente municipal</option><option value="junta">Junta municipal</option></select></div>
        <div><label for="accessList">Lista</label><select id="accessList" disabled><option value="">Seleccionar lista</option></select></div>
        <div class="accessWide"><label for="accessCandidate">Candidato</label><select id="accessCandidate" disabled><option value="">Seleccionar candidato</option></select></div>
        <div class="accessWide"><label for="accessEmail">Correo del candidato</label><input id="accessEmail" type="email" autocomplete="off" placeholder="correo@ejemplo.com"></div>
      </div>
      <button id="accessAssignBtn" class="btn accessAssignBtn" type="button">Asignar acceso</button>
      <p id="accessMsg" class="muted accessMsg"></p>
      <p class="muted accessNote">El candidato creará su propia contraseña al registrar su cuenta.</p>`;

    const race = document.getElementById('accessRace');
    const list = document.getElementById('accessList');
    const candidate = document.getElementById('accessCandidate');
    race.addEventListener('change', () => {
      list.disabled = !race.value;
      candidate.disabled = true;
      refreshLists();
    });
    list.addEventListener('change', () => {
      candidate.disabled = !list.value;
      refreshCandidates();
    });
    document.getElementById('accessAssignBtn').addEventListener('click', assignAccess);
  }

  async function ensure(){
    if(!adminVisible() || busy) return;
    busy = true;
    try{
      await loadData();
      mount();
    }catch(err){ console.error('admin access v3',err); }
    finally{ busy = false; }
  }

  const obs = new MutationObserver(() => setTimeout(ensure,40));
  window.addEventListener('DOMContentLoaded', () => {
    obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    setTimeout(ensure,250);
    setTimeout(ensure,900);
  });
})();