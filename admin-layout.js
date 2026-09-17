(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let lastRole = null;

  function el(tag, cls, html='') {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    node.innerHTML = html;
    return node;
  }

  function waitFor(id, timeout=7000){
    return new Promise(resolve=>{
      const found=document.getElementById(id); if(found) return resolve(found);
      const start=Date.now(); const t=setInterval(()=>{
        const x=document.getElementById(id);
        if(x || Date.now()-start>timeout){clearInterval(t);resolve(x||null)}
      },80);
    });
  }

  function setActive(tab){
    document.querySelectorAll('.adminTabBtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.adminTabPane').forEach(p=>p.classList.toggle('hidden',p.dataset.pane!==tab));
  }

  function intro(title, text){
    const box=el('div','adminSectionIntro');
    box.innerHTML=`<div><span class="adminSectionKicker">ADMINISTRACIÓN</span><h3>${title}</h3><p>${text}</p></div>`;
    return box;
  }

  async function arrangeAdmin(){
    const dash=await waitFor('dashboardView');
    const stats=await waitFor('statsGrid');
    const adminPanel=await waitFor('adminPanel');
    if(!dash||!stats||!adminPanel) return;

    dash.classList.add('adminDashboardMode');
    dash.classList.remove('candidateDashboardMode');
    const title=document.getElementById('dashboardTitle');
    if(title) title.textContent='Administración del simulador';

    let shell=document.getElementById('adminWorkspace');
    if(!shell){
      shell=el('div','adminWorkspace'); shell.id='adminWorkspace';
      const nav=el('nav','adminTabs',`
        <button class="adminTabBtn active" data-tab="summary" type="button"><span>01</span> Resumen</button>
        <button class="adminTabBtn" data-tab="links" type="button"><span>02</span> Enlaces</button>
        <button class="adminTabBtn" data-tab="manage" type="button"><span>03</span> Candidaturas</button>`);
      const summary=el('section','adminTabPane',''); summary.dataset.pane='summary'; summary.id='adminSummaryPane';
      const links=el('section','adminTabPane hidden',''); links.dataset.pane='links'; links.id='adminLinksPane';
      const manage=el('section','adminTabPane hidden',''); manage.dataset.pane='manage'; manage.id='adminManagePane';
      shell.append(nav,summary,links,manage);
      dash.querySelector('.dashboardHead')?.insertAdjacentElement('afterend',shell);
      nav.querySelectorAll('.adminTabBtn').forEach(btn=>btn.addEventListener('click',()=>setActive(btn.dataset.tab)));
    }

    const summary=document.getElementById('adminSummaryPane');
    const links=document.getElementById('adminLinksPane');
    const manage=document.getElementById('adminManagePane');

    if(!summary.querySelector('.adminSectionIntro')) summary.prepend(intro('Resumen general','Resultados agregados y actividad del simulador. Esta vista es solo administrativa.'));
    if(!links.querySelector('.adminSectionIntro')) links.prepend(intro('Enlaces de candidatos','Copiá y controlá los enlaces únicos asignados a cada candidatura.'));
    if(!manage.querySelector('.adminSectionIntro')) manage.prepend(intro('Gestión de candidaturas','Agregá, activá o desactivá candidaturas. Estos controles no aparecen en las cuentas de candidatos.'));

    if(stats.parentElement!==summary) summary.appendChild(stats);
    const visual=document.getElementById('visualDashboard'); if(visual && visual.parentElement!==summary) summary.appendChild(visual);
    const grid=dash.querySelector('.dashboardGrid'); if(grid && grid.parentElement!==summary) summary.appendChild(grid);

    const referral=document.getElementById('referralPanel'); if(referral && referral.parentElement!==links) links.appendChild(referral);
    if(adminPanel.parentElement!==manage) manage.appendChild(adminPanel);
    adminPanel.classList.remove('hidden');

    const legacy=document.getElementById('candidateLinkBox'); if(legacy) legacy.classList.add('hidden');
  }

  async function arrangeCandidate(profile){
    const dash=await waitFor('dashboardView'); if(!dash) return;
    dash.classList.remove('adminDashboardMode');
    dash.classList.add('candidateDashboardMode');
    document.getElementById('adminWorkspace')?.remove();
    document.getElementById('adminPanel')?.classList.add('hidden');
    const title=document.getElementById('dashboardTitle');
    if(title && title.textContent==='Administración del simulador') title.textContent='Mi panel';

    const head=dash.querySelector('.dashboardHead');
    const stats=document.getElementById('statsGrid');
    const visual=document.getElementById('visualDashboard');
    const referral=document.getElementById('referralPanel');
    const grid=dash.querySelector('.dashboardGrid');
    if(head){
      if(visual) head.insertAdjacentElement('afterend',visual);
      if(stats) visual ? visual.insertAdjacentElement('afterend',stats) : head.insertAdjacentElement('afterend',stats);
      if(referral) stats ? stats.insertAdjacentElement('afterend',referral) : head.insertAdjacentElement('afterend',referral);
      if(grid) referral ? referral.insertAdjacentElement('afterend',grid) : head.insertAdjacentElement('afterend',grid);
    }
  }

  async function apply(){
    const dash=document.getElementById('dashboardView');
    if(!dash || dash.classList.contains('hidden')) return;
    const {data:{session}}=await client.auth.getSession(); if(!session) return;
    const {data:profile}=await client.from('vote_candidate_users').select('role,candidate_id').maybeSingle(); if(!profile) return;
    lastRole=profile.role;
    if(profile.role==='admin') await arrangeAdmin(); else await arrangeCandidate(profile);
  }

  const observer=new MutationObserver(()=>setTimeout(apply,100));
  window.addEventListener('DOMContentLoaded',()=>{
    const dash=document.getElementById('dashboardView');
    if(dash) observer.observe(dash,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
    document.getElementById('signInBtn')?.addEventListener('click',()=>setTimeout(apply,900));
    setTimeout(apply,1200);
  });
})();