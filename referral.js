const referralDb = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
const activeReferralCode = (new URLSearchParams(window.location.search).get('ref') || '').trim().toLowerCase() || null;
let referralRendering = false;

function referralBaseUrl(code){
  return `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(code)}`;
}

async function showReferralBanner(){
  if(!activeReferralCode || document.getElementById('referralInviteBanner')) return;
  const {data,error}=await referralDb.from('vote_candidates').select('name,office,referral_code').eq('referral_code',activeReferralCode).eq('active',true).maybeSingle();
  if(error || !data) return;
  const card=document.createElement('div');
  card.id='referralInviteBanner';
  card.className='card';
  card.style.marginBottom='18px';
  card.style.borderLeft='6px solid #11213f';
  card.innerHTML=`<strong>Invitación al simulador</strong><div style="margin-top:5px">Enlace compartido por <strong>${esc(data.name)}</strong>${data.office?` · ${esc(data.office)}`:''}.</div>`;
  const registration=document.getElementById('registrationCard');
  registration?.parentNode?.insertBefore(card,registration);
}

function ensureReferralPanel(){
  let panel=document.getElementById('referralPanel');
  if(panel) return panel;
  const stats=document.getElementById('statsGrid');
  if(!stats) return null;
  panel=document.createElement('div');
  panel.id='referralPanel';
  panel.className='card';
  panel.style.marginBottom='18px';
  stats.insertAdjacentElement('afterend',panel);
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
  if(!profile?.role || referralRendering) return;
  const dashboard=document.getElementById('dashboardView');
  if(!dashboard || dashboard.classList.contains('hidden')) return;
  const panel=ensureReferralPanel();
  if(!panel) return;
  referralRendering=true;
  try{
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
    }else if(profile.role==='admin'){
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
  } finally {
    referralRendering=false;
  }
}

async function renderReferralPanelFromSession(){
  const dashboard=document.getElementById('dashboardView');
  if(!dashboard || dashboard.classList.contains('hidden')) return;
  try{
    const {data:{session}}=await referralDb.auth.getSession();
    if(!session) return;
    const {data,error}=await referralDb.rpc('vote_my_profile');
    if(error) return;
    const profile=Array.isArray(data)?data[0]:data;
    if(profile) await renderReferralPanel(profile);
  }catch(error){
    console.warn('referral panel',error);
  }
}

window.addEventListener('dashboard:loaded',(event)=>{
  const profile=event.detail?.profile || window.currentProfile;
  if(profile) renderReferralPanel(profile);
  else renderReferralPanelFromSession();
});

function initReferralModule(){
  showReferralBanner();
  const dashboard=document.getElementById('dashboardView');
  if(dashboard){
    const observer=new MutationObserver(()=>{
      if(!dashboard.classList.contains('hidden')) setTimeout(renderReferralPanelFromSession,60);
    });
    observer.observe(dashboard,{attributes:true,attributeFilter:['class']});
  }
  setTimeout(renderReferralPanelFromSession,250);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initReferralModule,{once:true});
else initReferralModule();
