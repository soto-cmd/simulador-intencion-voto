const referralDb = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
const activeReferralCode = (new URLSearchParams(window.location.search).get('ref') || '').trim().toLowerCase() || null;

function referralBaseUrl(code){
  return `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(code)}`;
}

async function showReferralBanner(){
  if(!activeReferralCode) return;
  const {data,error}=await referralDb.from('vote_candidates').select('name,office,referral_code').eq('referral_code',activeReferralCode).eq('active',true).maybeSingle();
  if(error || !data) return;
  const card=document.createElement('div');
  card.className='card';
  card.style.marginBottom='18px';
  card.style.borderLeft='6px solid #11213f';
  card.innerHTML=`<strong>Invitación al simulador</strong><div style="margin-top:5px">Enlace compartido por <strong>${esc(data.name)}</strong>${data.office?` · ${esc(data.office)}`:''}.</div>`;
  const registration=document.getElementById('registrationCard');
  registration?.parentNode?.insertBefore(card,registration);
}

document.getElementById('startBtn')?.addEventListener('click', async (event)=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  const cedula=$('cedula').value.trim(), gender=$('gender').value, age=$('ageBand').value, residence=$('residence').value.trim();
  if(!cedula||!gender||!age||!residence){$('registrationMsg').textContent='Completá todos los campos.';return;}
  if(!$('consent').checked){$('registrationMsg').textContent='Necesitás aceptar la participación voluntaria.';return;}
  $('startBtn').disabled=true;
  $('registrationMsg').textContent='Validando participación…';
  const {data,error}=await referralDb.rpc('vote_register_participant',{
    p_cedula:cedula,
    p_gender:gender,
    p_age_band:age,
    p_residence_zone:residence,
    p_referral_code:activeReferralCode
  });
  $('startBtn').disabled=false;
  if(error){console.error(error);$('registrationMsg').textContent='No pudimos validar los datos. Revisalos e intentá otra vez.';return;}
  if(!data?.ok){$('registrationMsg').textContent=data?.reason==='already_participated'?'Esta cédula ya participó en el simulador.':'No se pudo iniciar la simulación.';return;}
  voteToken=data.token;
  sessionStorage.setItem('vote_token',voteToken);
  mayorChoice=null;councilListChoice=null;councilChoice=null;
  $('registrationCard').classList.add('hidden');
  $('completedCard').classList.add('hidden');
  $('ballotSection').classList.remove('hidden');
  $('cedula').value='';
  await loadElectionData();
  goStep(1);
  window.scrollTo({top:$('ballotSection').offsetTop-70,behavior:'smooth'});
}, true);

function ensureReferralPanel(){
  let panel=document.getElementById('referralPanel');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.id='referralPanel';
  panel.className='card';
  panel.style.marginBottom='18px';
  const stats=document.getElementById('statsGrid');
  stats?.insertAdjacentElement('afterend',panel);
  return panel;
}

async function copyReferralLink(link,button){
  try{
    await navigator.clipboard.writeText(link);
    const old=button.textContent;
    button.textContent='Copiado';
    setTimeout(()=>button.textContent=old,1600);
  }catch{
    window.prompt('Copiá este enlace:',link);
  }
}

async function referralRows(){
  const bundled = window.__dashboardBundle?.referral;
  if(Array.isArray(bundled)) return bundled;
  const {data,error}=await referralDb.rpc('vote_my_referral_summary');
  if(error) throw error;
  return data || [];
}

async function renderReferralPanel(profile){
  const panel=ensureReferralPanel();
  let rows=[];
  try{ rows=await referralRows(); }
  catch(error){ panel.innerHTML='<h3>Enlace único</h3><p class="muted">No se pudo cargar el enlace en este momento.</p>';return; }

  if(profile.role==='candidate'){
    const r=rows[0];
    if(!r?.referral_code){panel.innerHTML='<h3>Enlace único</h3><p class="muted">Todavía no hay un enlace asignado.</p>';return;}
    const link=referralBaseUrl(r.referral_code);
    panel.innerHTML=`
      <h3 style="margin-top:0">Tu enlace único para participantes</h3>
      <p class="muted">Compartí este enlace. Podrás ver cuántas participaciones válidas llegaron desde él. El origen del enlace no queda unido al voto registrado.</p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="candidateReferralLink" value="${esc(link)}" readonly style="flex:1;min-width:260px">
        <button id="copyReferralBtn" class="btn" type="button">Copiar enlace</button>
      </div>
      <div class="stats" style="margin-top:16px;margin-bottom:0">
        <div class="statCard"><div class="statLabel">Participaciones desde tu enlace</div><div class="statValue">${Number(r.participants_from_link||0)}</div></div>
        <div class="statCard"><div class="statLabel">Hoy desde tu enlace</div><div class="statValue">${Number(r.today_from_link||0)}</div></div>
      </div>`;
    document.getElementById('copyReferralBtn')?.addEventListener('click',(e)=>copyReferralLink(link,e.currentTarget));
  }else{
    panel.innerHTML=`<h3 style="margin-top:0">Enlaces únicos de candidatos</h3><p class="muted">Cada enlace contabiliza únicamente el origen de la participación. No identifica la opción votada.</p><div id="adminReferralRows"></div>`;
    const holder=document.getElementById('adminReferralRows');
    holder.innerHTML=rows.map((r,i)=>{
      const link=referralBaseUrl(r.referral_code);
      return `<div class="adminRow"><div><strong>${esc(r.candidate_name)}</strong><div class="adminMeta">${Number(r.participants_from_link||0)} participaciones · ${Number(r.today_from_link||0)} hoy<br><span style="word-break:break-all">${esc(link)}</span></div></div><button class="btn secondary" type="button" data-refcopy="${i}">Copiar</button></div>`;
    }).join('') || '<div class="empty">No hay candidaturas con enlace.</div>';
    holder.querySelectorAll('[data-refcopy]').forEach(btn=>{
      const row=rows[Number(btn.dataset.refcopy)];
      btn.addEventListener('click',()=>copyReferralLink(referralBaseUrl(row.referral_code),btn));
    });
  }
}

const originalLoadDashboard = loadDashboard;
loadDashboard = async function(profile){
  await originalLoadDashboard(profile);
  await renderReferralPanel(profile || currentProfile || window.currentProfile || {});
};
window.loadDashboard = loadDashboard;

window.addEventListener('dashboard:loaded',(event)=>{
  const profile=event.detail?.profile || currentProfile || window.currentProfile;
  if(profile) renderReferralPanel(profile);
});

showReferralBanner();
