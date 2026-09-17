(() => {
  let bundlePromise = null;
  let bundleCache = null;
  let bundleTs = 0;
  const CACHE_MS = 15000;

  function pctFast(v){ return Number(v || 0).toFixed(1).replace('.0','') + '%'; }
  function statCardsFast(items){
    return items.map(([a,b]) => `<div class="statCard"><div class="statLabel">${esc(a)}</div><div class="statValue">${esc(b)}</div></div>`).join('');
  }

  async function getBundle(force=false){
    if(!force && bundleCache && Date.now() - bundleTs < CACHE_MS) return bundleCache;
    if(bundlePromise) return bundlePromise;
    bundlePromise = db.rpc('vote_my_dashboard_bundle').then(({data,error}) => {
      if(error) throw error;
      if(!data?.ok) throw new Error(data?.reason || 'dashboard_unavailable');
      bundleCache = data;
      bundleTs = Date.now();
      window.__dashboardBundle = data;
      return data;
    }).finally(() => { bundlePromise = null; });
    return bundlePromise;
  }

  function renderDemoFast(demo){
    const sections = [
      ['Sexo', demo?.gender || []],
      ['Edad', demo?.age || []],
      ['Residencia', demo?.residence || []],
      ['Barrio', demo?.neighborhood || []]
    ];
    const target = document.getElementById('demographics');
    if(!target) return;
    target.innerHTML = sections.map(([title,rows]) => `<div class="demoSection"><h4>${title}</h4>${rows.length ? rows.map(r => `<div class="demoRow"><div>${esc(r.label)}</div><div class="barTrack"><div class="barFill" style="width:${Math.min(100,Number(r.percentage||0))}%"></div></div><strong>${pctFast(r.percentage)}</strong></div>`).join('') : '<div class="muted">Sin datos todavía.</div>'}</div>`).join('');
  }

  function renderHistoryFast(rows, role){
    const target = document.getElementById('history');
    if(!target) return;
    if(!rows?.length){ target.innerHTML = '<div class="empty">Aún no hay datos suficientes.</div>'; return; }
    target.innerHTML = rows.map(r => `<div class="historyRow"><div>${new Date(r.day + 'T12:00:00').toLocaleDateString('es-PY',{day:'2-digit',month:'short'})}${role === 'admin' ? `<small><br>${esc(r.candidate_name)}</small>` : ''}</div><div class="barTrack"><div class="barFill" style="width:${Math.min(100,Number(r.percentage||0))}%"></div></div><strong>${pctFast(r.percentage)}</strong></div>`).join('');
  }

  async function fastLoadDashboard(profile, force=false){
    setView('dashboard');
    const hintedRole = profile?.role || window.__appRole || null;
    if(hintedRole) document.getElementById('adminPanel')?.classList.toggle('hidden', hintedRole !== 'admin');

    let data;
    try { data = await getBundle(force); }
    catch(err){
      console.error('dashboard bundle',err);
      showToast('No se pudieron cargar las estadísticas.');
      return;
    }

    const p = data.profile || profile || {};
    currentProfile = p;
    window.currentProfile = p;
    window.__appRole = p.role;
    document.getElementById('adminPanel')?.classList.toggle('hidden', p.role !== 'admin');

    const rows = data.dashboard || [];
    const hist = data.history || [];
    const demo = data.demographics || {};
    const refs = data.referral || [];

    if(p.role === 'candidate'){
      const r = rows[0] || {};
      const ref = refs[0] || {};
      document.getElementById('statsGrid').innerHTML = statCardsFast([
        ['Intención de voto', pctFast(r.percentage)],
        ['Simulaciones registradas', r.total_simulations || 0],
        ['Registros para tu candidatura', r.candidate_votes || 0],
        ['Intención de voto hoy', pctFast(r.today_percentage)],
        ['Participantes desde tu enlace', ref.participants_from_link || 0],
        ['Ingresos hoy por tu enlace', ref.today_from_link || 0]
      ]);
      document.getElementById('dashboardTitle').textContent = r.candidate_name || data.candidate?.name || 'Mi panel';
      const code = data.candidate?.referral_code || ref.referral_code;
      const box = document.getElementById('candidateLinkBox');
      const input = document.getElementById('candidateLinkInput');
      if(code && box && input){
        input.value = `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`;
        box.classList.remove('hidden');
      }
    }else{
      const total = rows[0]?.total_simulations || 0;
      document.getElementById('statsGrid').innerHTML = statCardsFast([
        ['Simulaciones registradas', total],
        ['Candidaturas', rows.length],
        ['Participantes', demo.total_participants || 0]
      ]);
      document.getElementById('dashboardTitle').textContent = 'Administración general';
    }

    renderHistoryFast(hist,p.role);
    renderDemoFast(demo);

    window.ensureRoleModules?.(p.role);
    window.dispatchEvent(new CustomEvent('dashboard:loaded',{detail:{profile:p,bundle:data}}));
  }

  async function fastClaimRoleAndDashboard(){
    await fastLoadDashboard(null,false);
  }

  window.getDashboardBundle = getBundle;
  window.refreshDashboardBundle = () => fastLoadDashboard(currentProfile,true);
  window.loadDashboard = fastLoadDashboard;
  window.claimRoleAndDashboard = fastClaimRoleAndDashboard;
  try { loadDashboard = fastLoadDashboard; claimRoleAndDashboard = fastClaimRoleAndDashboard; } catch {}
})();
