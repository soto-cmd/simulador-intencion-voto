(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let rows = [];

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function label(c){
    const parts = [];
    parts.push(c.race_type === 'intendente' ? 'Intendente' : 'Junta');
    if(c.list_number) parts.push(`Lista ${c.list_number}`);
    if(c.option_number) parts.push(`Opción ${c.option_number}`);
    return `${c.name} — ${parts.join(' · ')}`;
  }

  function renderOptions(){
    const select = document.getElementById('existingCandidateSelect');
    if(!select) return;
    const mayors = rows.filter(r => r.race_type === 'intendente');
    const j1 = rows.filter(r => r.race_type === 'junta' && String(r.list_number) === '1');
    const j2 = rows.filter(r => r.race_type === 'junta' && String(r.list_number) === '2');
    let html = '<option value="">Seleccionar candidato existente</option>';
    if(mayors.length) html += `<optgroup label="Intendente municipal">${mayors.map(c => `<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    if(j1.length) html += `<optgroup label="Junta municipal · Lista 1">${j1.map(c => `<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    if(j2.length) html += `<optgroup label="Junta municipal · Lista 2">${j2.map(c => `<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    select.innerHTML = html;
  }

  async function loadCandidates(){
    const {data,error} = await client.from('vote_candidates')
      .select('id,name,race_type,list_number,option_number,display_order')
      .eq('active',true)
      .order('race_type')
      .order('list_number')
      .order('option_number')
      .order('display_order');
    if(error) throw error;
    rows = data || [];
    renderOptions();
  }

  async function loadCandidateStatus(){
    const select = document.getElementById('existingCandidateSelect');
    const email = document.getElementById('candidateAccessEmail');
    const status = document.getElementById('candidateAccessStatus');
    const btn = document.getElementById('candidateAccessSave');
    if(!select || !email || !status || !btn) return;

    email.value = '';
    email.disabled = !select.value;
    btn.disabled = !select.value;
    status.textContent = select.value ? 'Listo para asignar acceso.' : 'Seleccioná un candidato existente.';

    if(!select.value) return;

    const {data,error} = await client.rpc('vote_admin_candidate_access_status');
    if(error) return;
    const row = (data || []).find(r => r.candidate_id === select.value);
    if(!row) return;

    if(row.account_active){
      email.value = row.access_email || '';
      email.disabled = true;
      btn.disabled = true;
      status.textContent = `Cuenta activa${row.access_email ? `: ${row.access_email}` : ''}`;
    } else if(row.access_email){
      email.value = row.access_email;
      status.textContent = `Acceso pendiente para ${row.access_email}`;
    }
  }

  async function saveAccess(){
    const candidateId = document.getElementById('existingCandidateSelect')?.value || '';
    const emailEl = document.getElementById('candidateAccessEmail');
    const msg = document.getElementById('candidateAccessMsg');
    const btn = document.getElementById('candidateAccessSave');
    const email = (emailEl?.value || '').trim().toLowerCase();

    if(!candidateId){ msg.textContent = 'Seleccioná un candidato.'; return; }
    if(!/^\S+@\S+\.\S+$/.test(email)){ msg.textContent = 'Ingresá un correo válido.'; return; }

    btn.disabled = true;
    msg.textContent = 'Guardando acceso…';
    try{
      const {data,error} = await client.rpc('vote_admin_set_candidate_access', {p_candidate_id:candidateId,p_email:email});
      if(error) throw error;
      if(!data?.ok){
        msg.textContent = data?.reason === 'account_already_active'
          ? `La cuenta ya está activa${data.email ? ` con ${data.email}` : ''}.`
          : 'No se pudo guardar el acceso.';
        return;
      }
      msg.textContent = `Acceso guardado para ${data.candidate}.`;
      await loadCandidateStatus();
    }catch(err){
      console.error(err);
      msg.textContent = 'No se pudo guardar el acceso.';
    }finally{
      if(!emailEl.disabled) btn.disabled = false;
    }
  }

  async function init(){
    const select = document.getElementById('existingCandidateSelect');
    if(!select) return;
    try{
      await loadCandidates();
      select.addEventListener('change', loadCandidateStatus);
      document.getElementById('candidateAccessSave')?.addEventListener('click', saveAccess);
      document.getElementById('signUpBtn') && (document.getElementById('signUpBtn').textContent = 'Activar cuenta');
    }catch(err){
      console.error('candidate access init', err);
      const msg = document.getElementById('candidateAccessMsg');
      if(msg) msg.textContent = 'No se pudieron cargar los candidatos.';
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
