(() => {
  const client = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let candidateRows = [];
  let statusMap = {};

  const esc = (s='') => String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => v ? new Date(v).toLocaleString('es-PY',{dateStyle:'medium',timeStyle:'short'}) : '';

  function label(c){
    const parts=[c.race_type==='intendente'?'Intendente':'Junta'];
    if(c.list_number) parts.push(`Lista ${c.list_number}`);
    if(c.option_number) parts.push(`Opción ${c.option_number}`);
    return `${c.name} — ${parts.join(' · ')}`;
  }

  function ensureDurationField(){
    if(document.getElementById('candidateAccessDays')) return;
    const email=document.getElementById('candidateAccessEmail');
    if(!email?.parentElement) return;
    const wrap=document.createElement('div');
    wrap.style.gridColumn='1/-1';
    wrap.innerHTML='<label for="candidateAccessDays">Duración del acceso</label><select id="candidateAccessDays" disabled><option value="3">3 días · prueba</option><option value="7">7 días</option><option value="30">30 días · 1 mes</option><option value="60">60 días · 2 meses</option><option value="90">90 días · 3 meses</option></select>';
    email.parentElement.insertAdjacentElement('afterend',wrap);
  }

  function ensureCodeBox(){
    const card=document.getElementById('candidateAccessAdminCard');
    if(!card || document.getElementById('candidateActivationCodeBox')) return;
    const box=document.createElement('div');
    box.id='candidateActivationCodeBox';
    box.className='hidden';
    box.style.cssText='margin-top:16px;padding:18px;border:2px solid #0f274d;border-radius:16px;background:#f8fafc';
    box.innerHTML='<div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b">Código de activación</div><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px"><strong id="candidateActivationCodeValue" style="font-size:30px;letter-spacing:.1em;color:#0f274d"></strong><button id="copyCandidateActivationCode" class="btn secondary" type="button">Copiar código</button></div><div id="candidateActivationExpiry" class="muted" style="margin-top:8px"></div><div class="muted" style="margin-top:6px">Compartí este código con el candidato junto con el correo autorizado.</div>';
    card.appendChild(box);
    document.getElementById('copyCandidateActivationCode')?.addEventListener('click',async()=>{
      const code=document.getElementById('candidateActivationCodeValue')?.textContent||'';
      if(!code) return;
      try{await navigator.clipboard.writeText(code);}catch{window.prompt('Copiá el código:',code);}
    });
  }

  function hideCode(){
    document.getElementById('candidateActivationCodeBox')?.classList.add('hidden');
    const v=document.getElementById('candidateActivationCodeValue'); if(v) v.textContent='';
    const e=document.getElementById('candidateActivationExpiry'); if(e) e.textContent='';
  }

  function showCode(code,expiresAt){
    if(!code) return;
    const box=document.getElementById('candidateActivationCodeBox');
    const v=document.getElementById('candidateActivationCodeValue');
    const e=document.getElementById('candidateActivationExpiry');
    if(!box||!v) return;
    v.textContent=code;
    if(e) e.textContent=expiresAt?`Acceso habilitado hasta ${fmt(expiresAt)}.`:'';
    box.classList.remove('hidden');
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function renderOptions(){
    const select=document.getElementById('existingCandidateSelect');
    if(!select) return;
    const mayors=candidateRows.filter(r=>r.race_type==='intendente');
    const j1=candidateRows.filter(r=>r.race_type==='junta'&&String(r.list_number)==='1');
    const j2=candidateRows.filter(r=>r.race_type==='junta'&&String(r.list_number)==='2');
    let html='<option value="">Seleccionar candidato existente</option>';
    if(mayors.length) html+=`<optgroup label="Intendente municipal">${mayors.map(c=>`<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    if(j1.length) html+=`<optgroup label="Junta municipal · Lista 1">${j1.map(c=>`<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    if(j2.length) html+=`<optgroup label="Junta municipal · Lista 2">${j2.map(c=>`<option value="${c.id}">${esc(label(c))}</option>`).join('')}</optgroup>`;
    select.innerHTML=html;
  }

  async function loadCandidates(){
    try{
      if(typeof candidates !== 'undefined' && Array.isArray(candidates) && candidates.length){
        candidateRows=candidates.filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name,race_type:c.race_type,list_number:c.list_number,option_number:c.option_number,display_order:c.display_order}));
      }else{
        const {data,error}=await client.from('vote_candidates').select('id,name,race_type,list_number,option_number,display_order').eq('active',true).order('race_type').order('list_number').order('option_number').order('display_order');
        if(error) throw error;
        candidateRows=data||[];
      }
      renderOptions();
    }catch(err){ throw err; }
  }

  async function refreshStatuses(){
    statusMap={};
    const {data,error}=await client.rpc('vote_admin_candidate_access_status');
    if(error) throw error;
    (data||[]).forEach(r=>{statusMap[r.candidate_id]=r;});
  }

  function getStatusRow(candidateId){ return statusMap[candidateId]||null; }

  async function loadCandidateStatus({preserveCode=false,refresh=false}={}){
    ensureDurationField(); ensureCodeBox();
    if(!preserveCode) hideCode();
    const select=document.getElementById('existingCandidateSelect');
    const email=document.getElementById('candidateAccessEmail');
    const status=document.getElementById('candidateAccessStatus');
    const btn=document.getElementById('candidateAccessSave');
    const duration=document.getElementById('candidateAccessDays');
    if(!select||!email||!status||!btn||!duration) return;

    email.value=''; email.disabled=!select.value; duration.disabled=!select.value; btn.disabled=!select.value; btn.textContent='Guardar acceso';
    status.textContent=select.value?'Consultando estado…':'Seleccioná un candidato existente.';
    if(!select.value) return;

    try{
      if(refresh || !Object.keys(statusMap).length) await refreshStatuses();
      const row=getStatusRow(select.value);
      if(!row){ status.textContent='Listo para asignar acceso.'; return; }
      if(row.account_active){
        email.value=row.access_email||''; email.disabled=true; btn.disabled=false;
        btn.textContent=row.access_valid?'Agregar tiempo':'Reactivar acceso';
        status.textContent=`${row.access_valid?'Acceso activo':'Acceso vencido'}${row.access_email?` · ${row.access_email}`:''}${row.access_expires_at?` · hasta ${fmt(row.access_expires_at)}`:''}`;
      }else if(row.access_email){
        email.value=row.access_email; email.disabled=false; btn.disabled=false; btn.textContent='Generar nuevo código';
        status.textContent=`Acceso pendiente para ${row.access_email}${row.access_expires_at?` · disponible hasta ${fmt(row.access_expires_at)}`:''}`;
      }else status.textContent='Listo para asignar acceso.';
    }catch(err){ console.error('candidate access status',err); status.textContent='No se pudo consultar el estado del acceso.'; }
  }

  function errorText(reason,data){
    if(reason==='not_authorized') return 'La sesión de administrador venció. Cerrá sesión e ingresá nuevamente.';
    if(reason==='invalid_email') return 'El correo ingresado no es válido.';
    if(reason==='invalid_days') return 'Seleccioná una duración válida.';
    if(reason==='candidate_not_found') return 'No se encontró ese candidato.';
    if(reason==='account_already_active') return `La cuenta ya está activa${data?.email?` con ${data.email}`:''}.`;
    if(reason==='email_in_use') return 'Ese correo ya pertenece a otra cuenta. Usá otro correo.';
    if(reason==='no_access_record') return 'Primero asigná un acceso a este candidato.';
    return 'No se pudo guardar el acceso.';
  }

  async function saveAccess(){
    ensureDurationField(); ensureCodeBox(); hideCode();
    const candidateId=document.getElementById('existingCandidateSelect')?.value||'';
    const emailEl=document.getElementById('candidateAccessEmail');
    const daysEl=document.getElementById('candidateAccessDays');
    const msg=document.getElementById('candidateAccessMsg');
    const btn=document.getElementById('candidateAccessSave');
    const email=(emailEl?.value||'').trim().toLowerCase();
    const days=Number(daysEl?.value||3);
    if(!candidateId){msg.textContent='Seleccioná un candidato.';return;}
    if(!Number.isInteger(days)||days<1||days>365){msg.textContent='Seleccioná una duración válida.';return;}

    btn.disabled=true; msg.textContent='Guardando acceso…';
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session){msg.textContent='La sesión de administrador venció. Cerrá sesión e ingresá nuevamente.';return;}
      if(!Object.keys(statusMap).length) await refreshStatuses();
      const row=getStatusRow(candidateId);

      if(row?.account_active){
        const {data,error}=await client.rpc('vote_admin_extend_candidate_access',{p_candidate_id:candidateId,p_days:days});
        if(error){console.error(error);msg.textContent=`No se pudo actualizar: ${error.message||'error'}`;return;}
        if(!data?.ok){msg.textContent=errorText(data?.reason,data);return;}
        msg.textContent=`Acceso actualizado hasta ${fmt(data.access_expires_at)}.`;
        await refreshStatuses(); await loadCandidateStatus();
      }else{
        if(!/^\S+@\S+\.\S+$/.test(email)){msg.textContent='Ingresá un correo válido.';return;}
        const {data,error}=await client.rpc('vote_admin_set_candidate_access',{p_candidate_id:candidateId,p_email:email,p_days:days});
        if(error){console.error(error);msg.textContent=`No se pudo guardar: ${error.message||'error'}`;return;}
        if(!data?.ok){msg.textContent=errorText(data?.reason,data);return;}
        msg.textContent=`Acceso preparado por ${data.days} días para ${data.candidate}.`;
        const code=data.activation_code||''; const expiresAt=data.access_expires_at||null;
        await refreshStatuses(); await loadCandidateStatus({preserveCode:true}); showCode(code,expiresAt);
      }
    }catch(err){ console.error('save candidate access',err); msg.textContent=`No se pudo guardar: ${err?.message||'error'}`; }
    finally{ btn.disabled=false; }
  }

  async function init(){
    if(window.__appRole!=='admin') return;
    const select=document.getElementById('existingCandidateSelect');
    if(!select) return;
    ensureDurationField(); ensureCodeBox();
    try{
      await loadCandidates();
      select.addEventListener('change',()=>loadCandidateStatus());
      document.getElementById('candidateAccessSave')?.addEventListener('click',saveAccess);
      // El estado se consulta recién cuando el administrador elige un candidato.
      const status=document.getElementById('candidateAccessStatus');
      if(status) status.textContent='Seleccioná un candidato existente.';
    }catch(err){
      console.error('candidate access init',err);
      const msg=document.getElementById('candidateAccessMsg'); if(msg) msg.textContent='No se pudieron cargar los accesos.';
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
