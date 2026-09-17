(() => {
  let currentTab = 'resumen';
  let started = false;

  function setVisible(el, visible){
    if(!el) return;
    el.style.display = visible ? '' : 'none';
  }

  function ensureNav(){
    const dash = document.getElementById('dashboardView');
    const head = dash?.querySelector('.dashboardHead');
    if(!dash || !head) return null;
    let nav = document.getElementById('adminTabsV2');
    if(!nav){
      nav = document.createElement('nav');
      nav.id = 'adminTabsV2';
      nav.className = 'adminTabsV2';
      nav.innerHTML = `
        <button type="button" data-admin-tab="resumen" class="active"><span class="tabIcon">▦</span><span><strong>Resumen</strong><small>Estadísticas y evolución</small></span></button>
        <button type="button" data-admin-tab="enlaces"><span class="tabIcon">↗</span><span><strong>Enlaces</strong><small>Invitaciones de candidatos</small></span></button>
        <button type="button" data-admin-tab="vista-candidato"><span class="tabIcon">◉</span><span><strong>Vista candidato</strong><small>Ver lo que ve cada candidato</small></span></button>
        <button type="button" data-admin-tab="candidaturas"><span class="tabIcon">◎</span><span><strong>Candidatos</strong><small>Accesos y administración</small></span></button>`;
      head.insertAdjacentElement('afterend', nav);
      nav.querySelectorAll('[data-admin-tab]').forEach(btn => btn.addEventListener('click', () => {
        currentTab = btn.dataset.adminTab;
        applyTab();
      }));
    }
    return nav;
  }

  function labelSections(){
    const stats = document.getElementById('statsGrid');
    const visual = document.getElementById('visualDashboard');
    const grid = document.querySelector('#dashboardView > .dashboardGrid');
    const referral = document.getElementById('referralPanel');
    const admin = document.getElementById('adminPanel');
    const preview = document.getElementById('adminCandidatePreview');
    const candidateLink = document.getElementById('candidateLinkBox');
    if(stats) stats.dataset.adminSection='resumen';
    if(visual) visual.dataset.adminSection='resumen';
    if(grid) grid.dataset.adminSection='resumen';
    if(referral) referral.dataset.adminSection='enlaces';
    if(admin) admin.dataset.adminSection='candidaturas';
    if(preview) preview.dataset.adminSection='vista-candidato';
    if(candidateLink) candidateLink.dataset.adminSection='candidate-only';
  }

  function applyTab(){
    if(window.__appRole !== 'admin') return;
    const nav = ensureNav();
    if(!nav) return;
    labelSections();
    nav.querySelectorAll('[data-admin-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminTab === currentTab));
    document.querySelectorAll('#dashboardView [data-admin-section]').forEach(el => {
      const section = el.dataset.adminSection;
      if(section === 'candidate-only') return;
      setVisible(el, section === currentTab);
    });
    const title = document.getElementById('dashboardTitle');
    if(title){
      title.textContent = currentTab === 'resumen' ? 'Administración general' : currentTab === 'enlaces' ? 'Enlaces de candidatos' : currentTab === 'vista-candidato' ? 'Vista de candidatos' : 'Acceso de candidatos';
    }
  }

  function activate(){
    const dash = document.getElementById('dashboardView');
    if(!dash || dash.classList.contains('hidden') || window.__appRole !== 'admin') return;
    ensureNav();
    applyTab();
  }

  function start(){
    if(started) return;
    started = true;
    const dash = document.getElementById('dashboardView');
    if(!dash) return;
    const observer = new MutationObserver(() => requestAnimationFrame(activate));
    observer.observe(dash,{attributes:true,attributeFilter:['class']});
    window.addEventListener('dashboard:loaded', activate);
    setTimeout(activate,80);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
