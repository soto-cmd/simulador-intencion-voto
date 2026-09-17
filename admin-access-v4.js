(() => {
  const client = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let statusRows = [];
  let mountedCard = null;
  let busy = false;

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function adminVisible(){
    const panel = document.getElementById('adminPanel');
    return panel && !panel.classList.contains('hidden');
  }

  async function loadStatus(){
    const {data,error} = await client.rpc('vote_admin_candidate_access_status');
    if(error) throw error;
    statusRows = data || [];
  }

  function candidateLabel(r){
    const parts = [r.race_type === 'intendente' ? 'Intendente' : 'Junta'];
    if(r.list_number) parts.push(`Lista ${r.list_number}`);
    if(r.option_number) parts.push(`Opción ${r.option_number}`);
    return `${r.candidate_name} — ${parts.join(' · ')}`;
  }

  function groupedOptions(){
    const mayors = statusRows.filter(r => r.race_type === 'intendente');
    const junta1 = statusRows.filter(r => r.race_type === 'junta' && String(r.list_number) === '1');
    const junta2 = statusRows.filter(r => r.race_type === 'junta' && String(r.list_number) === '2');
    let html = '<option value="">Seleccionar candidato existente</option>';
    if(mayors.length) html += `<optgroup label="Intendente municipal">${mayors.map(r => `<option value="${r.candidate_id}">${esc(candidateLabel(r))}</option>`).join('')}</optgroup>`;
    if(junta1.length) html += `<optgroup label="Junta municipal · Lista 1">${junta1.map(r => `<option value="${r.candidate_id}">${esc(candidateLabel(r))}</option>`).join('')}</optgroup>`;
    if(junta2.length) html += `<optgroup label="Junta municipal · Lista 2">${junta2.map(r => `<option value="${r.candidate_id}">${esc(candidateLabel(r))}</option>`).join('')}</optgroup>`;
    return html;
  }

  function selectedRow(){
    const id = document.getElementById('accessCandidateV4')?.value;
    return statusRows.find(r => r.candidate_id === id) || null;
  }

  function renderState(){
    const row = selectedRow();
    const email = document.getElementById('accessEmailV4');
    const btn = document.getElementById('accessSaveV4');
    const status = document.getElementById('accessStateV4');
    if(!email || !btn || !status) return;

    if(!row){
      email.value = '';
      email.disabled = true;
      btn.disabled = true;
      status.innerHTML = '<span class="accessState neutral">Seleccioná un candidato</span>';
      return;
    }

    email.value = row.access_email || '';
    if(row.account_active){
      email.disabled = true;
      btn.disabled = true;
      status.innerHTML = `<span class="accessState active">Cuenta activa</span><small>${esc(row.access_email || '')}</small>`;
    } else {
      email.disabled = false;
      btn.disabled = false;
      status.innerHTML = row.access_email
        ? `<span class="accessState pending">Acceso pendiente</span><small>${esc(row.access_email)}</small>`
        : '<span class="accessState neutral">Sin acceso asignado</span>';
    }
  }

  function reasonText(reason, data){
    if(reason === 'not_authorized') return 'La sesión de administrador venció. Cerrá sesión e ingresá nuevamente.';
    if(reason === 'invalid_email') return 'El correo ingresado no es válido.';
    if(reason === 'candidate_not_found') return 'No se encontró ese candidato.';
    if(reason === 'account_already_active') return `La cuenta ya está activa${data?.email ? ` con ${data.email}` : ''}.`;
    return 'No se pudo guardar el acceso.';
  }

  async function saveAccess(){
    const row = selectedRow();
    const emailEl = document.getElementById('accessEmailV4');
    const msg = document.getElementById('accessMsgV4');
    const btn = document.getElementById('accessSaveV4');
    const email = (emailEl?.value || '').trim().toLowerCase();
    if(!row){ msg.textContent = 'Seleccioná un candidato.'; return; }
    if(!/^\S+@\S+\.\S+$/.test(email)){ msg.textContent = 'Ingresá un correo válido.'; return; }

    btn.disabled = true;
    msg.textContent = 'Guardando acceso…';

    try{
      const { data: sessionData } = await client.auth.getSession();
      if(!sessionData?.session){
        msg.textContent = 'La sesión de administrador venció. Cerrá sesión e ingresá nuevamente.';
        return;
      }

      const {data,error} = await client.rpc('vote_admin_set_candidate_access', {
        p_candidate_id: row.candidate_id,
        p_email: email
      });

      if(error){
        console.error('vote_admin_set_candidate_access', error);
        msg.textContent = error.message ? `No se pudo guardar: ${error.message}` : 'No se pudo guardar el acceso.';
        return;
      }

      if(!data?.ok){
        msg.textContent = reasonText(data?.reason, data);
        return;
      }

      msg.textContent = `Acceso guardado para ${data.candidate}.`;
      await loadStatus();
      const selector = document.getElementById('accessCandidateV4');
      if(selector) selector.value = row.candidate_id;
      renderState();
    } catch(err){
      console.error(err);
      msg.textContent = err?.message ? `No se pudo guardar: ${err.message}` : 'No se pudo guardar el acceso.';
    } finally {
      const current = selectedRow();
      if(btn && !current?.account_active) btn.disabled = false;
    }
  }

  function mount(){
    if(!adminVisible()) return;
    const panel = document.getElementById('adminPanel');
    const card = panel?.querySelector('.card');
    if(!card) return;
    if(card.dataset.accessV4 === '1' && mountedCard === card) return;

    mountedCard = card;
    card.dataset.accessV4 = '1';
    card.classList.add('accessManagerCardV4');
    card.innerHTML = `
      <div class="accessV4Head">
        <div>
          <p class="eyebrow">ACCESO DE CANDIDATOS</p>
          <h3>Habilitar inicio de sesión</h3>
          <p class="muted">Seleccioná un candidato existente y asignale su correo de acceso.</p>
        </div>
      </div>
      <div class="accessV4Grid">
        <div class="accessV4Wide">
          <label for="accessCandidateV4">Candidato existente</label>
          <select id="accessCandidateV4">${groupedOptions()}</select>
        </div>
        <div class="accessV4Wide">
          <label for="accessEmailV4">Correo para iniciar sesión</label>
          <input id="accessEmailV4" type="email" placeholder="correo@ejemplo.com" disabled>
        </div>
      </div>
      <div id="accessStateV4" class="accessStateWrap"><span class="accessState neutral">Seleccioná un candidato</span></div>
      <button id="accessSaveV4" class="btn accessSaveV4" type="button" disabled>Guardar acceso</button>
      <p id="accessMsgV4" class="muted accessMsgV4"></p>`;

    document.getElementById('accessCandidateV4').addEventListener('change', renderState);
    document.getElementById('accessSaveV4').addEventListener('click', saveAccess);
  }

  function improveAuthCopy(){
    const signUp = document.getElementById('signUpBtn');
    if(signUp) signUp.textContent = 'Activar cuenta';
    const auth = document.getElementById('authView');
    const title = auth?.querySelector('h2');
    if(title) title.textContent = 'Acceso privado';
  }

  async function ensure(){
    improveAuthCopy();
    if(!adminVisible() || busy) return;
    busy = true;
    try{
      await loadStatus();
      mount();
    } catch(err){
      console.error('admin access v4', err);
    } finally {
      busy = false;
    }
  }

  const obs = new MutationObserver(() => setTimeout(ensure, 50));
  window.addEventListener('DOMContentLoaded', () => {
    obs.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    setTimeout(ensure, 250);
    setTimeout(ensure, 900);
  });
})();
