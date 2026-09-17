const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let candidates = [];
let selectedCandidate = null;
let voteToken = sessionStorage.getItem('vote_token') || null;

function showToast(message){ const el=$('toast'); el.textContent=message; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),3200); }
function initials(name=''){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?'; }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function pct(v){ return Number(v||0).toFixed(1).replace('.0','')+'%'; }
function setView(name){ $('publicView').classList.toggle('hidden',name!=='public'); $('authView').classList.toggle('hidden',name!=='auth'); $('dashboardView').classList.toggle('hidden',name!=='dashboard'); }

async function loadCandidates(){
  const {data,error}=await db.from('vote_candidates').select('*').eq('active',true).order('name');
  if(error){showToast('No se pudieron cargar las candidaturas.');return;}
  candidates=data||[];
  $('candidateGrid').innerHTML=candidates.length?candidates.map(c=>`
    <article class="candidateCard" data-id="${c.id}">
      <div class="candidatePhoto">${c.photo_url?`<img src="${esc(c.photo_url)}" alt="${esc(c.name)}">`:`<div class="avatarFallback">${initials(c.name)}</div>`}</div>
      <div class="candidateBody"><h3>${esc(c.name)}</h3><div class="candidateMeta">${esc(c.office||'')} ${c.list_number?`· Lista ${esc(c.list_number)}`:''}</div><button class="btn candidateAction" type="button">Elegir</button></div>
    </article>`).join(''):'<div class="empty">Todavía no hay candidaturas activas.</div>';
  document.querySelectorAll('.candidateCard').forEach(card=>card.addEventListener('click',()=>openVote(card.dataset.id)));
}

async function registerParticipant(){
  const cedula=$('cedula').value.trim(), gender=$('gender').value, age=$('ageBand').value, residence=$('residence').value.trim();
  if(!cedula||!gender||!age||!residence){$('registrationMsg').textContent='Completá todos los campos.';return;}
  if(!$('consent').checked){$('registrationMsg').textContent='Necesitás aceptar la participación voluntaria.';return;}
  $('startBtn').disabled=true; $('registrationMsg').textContent='Validando participación…';
  const {data,error}=await db.rpc('vote_register_participant',{p_cedula:cedula,p_gender:gender,p_age_band:age,p_residence_zone:residence});
  $('startBtn').disabled=false;
  if(error){$('registrationMsg').textContent='No pudimos validar los datos. Revisalos e intentá otra vez.';return;}
  if(!data?.ok){$('registrationMsg').textContent=data?.reason==='already_participated'?'Esta cédula ya participó en el simulador.':'No se pudo iniciar la simulación.';return;}
  voteToken=data.token; sessionStorage.setItem('vote_token',voteToken); $('registrationCard').classList.add('hidden'); $('ballotSection').classList.remove('hidden'); $('cedula').value='';
  await loadCandidates(); window.scrollTo({top:$('ballotSection').offsetTop-80,behavior:'smooth'});
}

function openVote(id){
  if(!voteToken){showToast('Primero completá los datos de participación.');return;}
  selectedCandidate=candidates.find(c=>c.id===id); if(!selectedCandidate)return;
  $('modalCandidate').innerHTML=`<div class="modalCandidate"><div class="miniAvatar">${initials(selectedCandidate.name)}</div><div><strong>${esc(selectedCandidate.name)}</strong><div class="candidateMeta">${esc(selectedCandidate.office||'')} ${selectedCandidate.list_number?`· Lista ${esc(selectedCandidate.list_number)}`:''}</div></div></div>`;
  $('voteModal').classList.remove('hidden');
}
async function confirmVote(){
  if(!selectedCandidate||!voteToken)return;
  $('confirmVoteBtn').disabled=true;
  const {data,error}=await db.rpc('vote_record_intention_with_token',{p_token:voteToken,p_candidate_id:selectedCandidate.id});
  $('confirmVoteBtn').disabled=false;
  if(error||!data?.ok){showToast(data?.reason==='token_used'?'Esta participación ya fue utilizada.':'No se pudo registrar la simulación.');return;}
  sessionStorage.removeItem('vote_token'); voteToken=null; $('voteModal').classList.add('hidden'); $('ballotSection').classList.add('hidden'); $('completedCard').classList.remove('hidden'); window.scrollTo({top:$('completedCard').offsetTop-90,behavior:'smooth'});
}

async function signUp(){
  const email=$('email').value.trim(), password=$('password').value;
  if(!email||password.length<6){$('authMsg').textContent='Ingresá un correo válido y una contraseña de al menos 6 caracteres.';return;}
  const {data,error}=await db.auth.signUp({email,password});
  if(error){$('authMsg').textContent=error.message;return;}
  if(data.session){await claimRoleAndDashboard();} else {$('authMsg').textContent='Cuenta creada. Revisá tu correo para confirmar el acceso y luego ingresá.';}
}
async function signIn(){
  const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error){$('authMsg').textContent='No se pudo iniciar sesión. Revisá correo y contraseña.';return;}
  await claimRoleAndDashboard();
}
async function claimRoleAndDashboard(){
  let {data:profile}=await db.from('vote_candidate_users').select('role,candidate_id').maybeSingle();
  if(!profile){ const {data:adminClaim}=await db.rpc('vote_claim_first_admin'); if(!adminClaim?.ok) await db.rpc('vote_claim_candidate_access'); ({data:profile}=await db.from('vote_candidate_users').select('role,candidate_id').maybeSingle()); }
  if(!profile){$('authMsg').textContent='Tu cuenta no tiene una candidatura asignada todavía.';return;}
  await loadDashboard(profile);
}
async function loadDashboard(profile){
  setView('dashboard'); $('adminPanel').classList.toggle('hidden',profile.role!=='admin'); $('dashboardTitle').textContent=profile.role==='admin'?'Administración general':'Mi intención de voto';
  const [{data:dash,error:dashErr},{data:hist},{data:demo}]=await Promise.all([db.rpc('vote_my_dashboard'),db.rpc('vote_my_history',{p_days:7}),db.rpc('vote_demographic_summary')]);
  if(dashErr){showToast('No se pudieron cargar las estadísticas.');return;}
  const rows=dash||[];
  if(profile.role==='candidate'){
    const r=rows[0]||{}; $('statsGrid').innerHTML=statCards([['Intención de voto',pct(r.percentage)],['Simulaciones registradas',r.total_simulations||0],['Registros para tu candidatura',r.candidate_votes||0],['Intención de voto hoy',pct(r.today_percentage)]]); $('dashboardTitle').textContent=r.candidate_name||'Mi panel';
  } else { const total=rows[0]?.total_simulations||0; $('statsGrid').innerHTML=statCards([['Simulaciones registradas',total],['Candidaturas activas',rows.length],['Participantes',demo?.total_participants||0]]); }
  renderHistory(hist||[],profile.role); renderDemographics(demo||{}); if(profile.role==='admin') await loadAdminCandidates();
}
function statCards(items){return items.map(([a,b])=>`<div class="statCard"><div class="statLabel">${esc(a)}</div><div class="statValue">${esc(b)}</div></div>`).join('');}
function renderHistory(rows,role){ if(!rows.length){$('history').innerHTML='<div class="empty">Aún no hay datos suficientes.</div>';return;} $('history').innerHTML=rows.map(r=>`<div class="historyRow"><div>${new Date(r.day+'T12:00:00').toLocaleDateString('es-PY',{day:'2-digit',month:'short'})}${role==='admin'?`<small><br>${esc(r.candidate_name)}</small>`:''}</div><div class="barTrack"><div class="barFill" style="width:${Math.min(100,Number(r.percentage||0))}%"></div></div><strong>${pct(r.percentage)}</strong></div>`).join(''); }
function renderDemographics(demo){ const sections=[['Sexo',demo.gender||[]],['Edad',demo.age||[]],['Residencia',demo.residence||[]]]; $('demographics').innerHTML=sections.map(([title,rows])=>`<div class="demoSection"><h4>${title}</h4>${rows.length?rows.map(r=>`<div class="demoRow"><div>${esc(r.label)}</div><div class="barTrack"><div class="barFill" style="width:${Math.min(100,Number(r.percentage||0))}%"></div></div><strong>${pct(r.percentage)}</strong></div>`).join(''):'<div class="muted">Sin datos todavía.</div>'}</div>`).join(''); }

async function addCandidate(){
  const name=$('candName').value.trim(), office=$('candOffice').value.trim(), list=$('candList').value.trim(), photo=$('candPhoto').value.trim(), email=$('candEmail').value.trim().toLowerCase();
  if(!name||!email){$('adminMsg').textContent='Nombre y correo del candidato son obligatorios.';return;}
  $('addCandidateBtn').disabled=true;
  const {data:c,error}=await db.from('vote_candidates').insert({name,office:office||'Intendente municipal',list_number:list||null,photo_url:photo||null}).select().single();
  if(error){$('adminMsg').textContent='No se pudo crear la candidatura.';$('addCandidateBtn').disabled=false;return;}
  const {error:ierr}=await db.from('vote_candidate_invites').insert({candidate_id:c.id,email}); $('addCandidateBtn').disabled=false;
  if(ierr){$('adminMsg').textContent='Candidatura creada, pero no se pudo registrar el correo de acceso.';return;}
  $('adminMsg').textContent='Candidatura creada correctamente.'; ['candName','candList','candPhoto','candEmail'].forEach(id=>$(id).value=''); await loadAdminCandidates();
}
async function loadAdminCandidates(){
  const {data}=await db.from('vote_candidates').select('*').order('created_at',{ascending:false});
  $('adminCandidates').innerHTML=(data||[]).map(c=>`<div class="adminRow"><div><strong>${esc(c.name)}</strong><div class="adminMeta">${esc(c.office||'')} ${c.list_number?`· Lista ${esc(c.list_number)}`:''} · ${c.active?'Activo':'Inactivo'}</div></div><button class="btn ${c.active?'danger':'secondary'}" data-toggle="${c.id}" data-active="${c.active}">${c.active?'Desactivar':'Activar'}</button></div>`).join('')||'<div class="empty">Sin candidaturas.</div>';
  document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>toggleCandidate(b.dataset.toggle,b.dataset.active==='true')));
}
async function toggleCandidate(id,isActive){ const {error}=await db.from('vote_candidates').update({active:!isActive,updated_at:new Date().toISOString()}).eq('id',id); if(error){showToast('No se pudo actualizar la candidatura.');return;} await loadAdminCandidates(); }

$('startBtn').addEventListener('click',registerParticipant); $('loginBtn').addEventListener('click',()=>{setView('auth');$('authMsg').textContent='';}); $('cancelAuthBtn').addEventListener('click',()=>setView('public')); $('signInBtn').addEventListener('click',signIn); $('signUpBtn').addEventListener('click',signUp); $('logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();setView('public');}); $('cancelVoteBtn').addEventListener('click',()=>$('voteModal').classList.add('hidden')); $('confirmVoteBtn').addEventListener('click',confirmVote); $('addCandidateBtn').addEventListener('click',addCandidate);

db.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_IN'&&session) await claimRoleAndDashboard();});
(async()=>{await loadCandidates(); const {data:{session}}=await db.auth.getSession(); if(session) await claimRoleAndDashboard();})();
