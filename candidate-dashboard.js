(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let running = false;

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => `${Number(v || 0).toFixed(1).replace('.0','')}%`;

  function ensurePanel(){
    const dash = document.getElementById('dashboardView');
    const stats = document.getElementById('statsGrid');
    if(!dash || !stats) return null;
    let panel = document.getElementById('visualDashboard');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'visualDashboard';
      panel.className = 'visualDashboard';
      stats.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function donut(percent, color, label){
    const p = Math.max(0, Math.min(100, Number(percent || 0)));
    return `<div class="donutWrap">
      <div class="donutChart" style="--value:${p};--chart-color:${esc(color || '#1d4ed8')}">
        <div class="donutCenter"><strong>${pct(p)}</strong><span>${esc(label)}</span></div>
      </div>
    </div>`;
  }

  function bar(label, value, color){
    const v = Math.max(0, Math.min(100, Number(value || 0)));
    return `<div class="colorBarRow"><div class="colorBarHead"><span>${esc(label)}</span><strong>${pct(v)}</strong></div><div class="colorBarTrack"><div class="colorBarFill" style="width:${v}%;background:${esc(color)}"></div></div></div>`;
  }

  function candidateVisual(candidate, row){
    const color = candidate?.party_color || (candidate?.party_abbr === 'ANR' ? '#e31b23' : candidate?.party_abbr === 'PLRA' ? '#1437d1' : '#1d4ed8');
    const party = candidate?.party_abbr || candidate?.party_name || 'Candidatura';
    const total = Number(row?.total_simulations || 0);
    const votes = Number(row?.candidate_votes || 0);
    const today = Number(row?.today_percentage || 0);
    const main = Number(row?.percentage || 0);
    return `<div class="candidateVisualCard">
      <div class="candidateVisualHeader" style="--party:${esc(color)}">
        <div class="candidateIdentity">
          <span class="candidatePartyDot" style="background:${esc(color)}"></span>
          <div><small>${esc(party)} · ${esc(candidate?.office || '')}</small><h3>${esc(candidate?.name || row?.candidate_name || 'Mi candidatura')}</h3></div>
        </div>
        <span class="candidateListBadge" style="background:${esc(color)}">${candidate?.list_number ? `Lista ${esc(candidate.list_number)}` : esc(party)}</span>
      </div>
      <div class="candidateVisualBody">
        ${donut(main, color, 'Intención de voto')}
        <div class="candidateVisualMetrics">
          ${bar('Intención general', main, color)}
          ${bar('Intención hoy', today, color)}
          <div class="candidateMiniStats"><div><span>Registros para tu candidatura</span><strong>${votes}</strong></div><div><span>Simulaciones válidas</span><strong>${total}</strong></div></div>
        </div>
      </div>
    </div>`;
  }

  function adminVisual(rows, candidates){
    const valid = (rows || []).map(r => {
      const c = candidates.find(x => x.id === r.candidate_id) || {};
      return { name: r.candidate_name || c.name || 'Candidato', value: Number(r.percentage || 0), color: c.party_color || (c.party_abbr === 'ANR' ? '#e31b23' : c.party_abbr === 'PLRA' ? '#1437d1' : '#64748b'), race: c.race_type || '' };
    }).sort((a,b)=>b.value-a.value);
    if(!valid.length) return '';
    return `<div class="adminVisualCard"><div class="visualSectionTitle"><div><span class="eyebrow">PANORAMA GENERAL</span><h3>Intención de voto por candidatura</h3></div><div class="chartLegend"><span><i style="background:#e31b23"></i>ANR</span><span><i style="background:#1437d1"></i>PLRA</span></div></div><div class="adminColorBars">${valid.map(x=>bar(`${x.name}${x.race ? ` · ${x.race}` : ''}`,x.value,x.color)).join('')}</div></div>`;
  }

  async function render(){
    if(running) return;
    const dash = document.getElementById('dashboardView');
    if(!dash || dash.classList.contains('hidden')) return;
    running = true;
    try{
      const {data:{session}} = await client.auth.getSession();
      if(!session) return;
      const {data:profile} = await client.from('vote_candidate_users').select('role,candidate_id').maybeSingle();
      if(!profile) return;
      const [{data:rows},{data:cands}] = await Promise.all([
        client.rpc('vote_my_dashboard'),
        client.from('vote_candidates').select('id,name,office,list_number,party_name,party_abbr,party_color,race_type').eq('active',true)
      ]);
      const panel = ensurePanel();
      if(!panel) return;
      if(profile.role === 'candidate'){
        const candidate = (cands || []).find(c => c.id === profile.candidate_id) || {};
        panel.innerHTML = candidateVisual(candidate, (rows || [])[0] || {});
        panel.classList.add('candidateMode');
        panel.classList.remove('adminMode');
      }else{
        panel.innerHTML = adminVisual(rows || [], cands || []);
        panel.classList.add('adminMode');
        panel.classList.remove('candidateMode');
      }
    }catch(err){ console.error('visual dashboard',err); }
    finally{ running = false; }
  }

  const observer = new MutationObserver(() => setTimeout(render, 60));
  window.addEventListener('DOMContentLoaded', () => {
    const dash = document.getElementById('dashboardView');
    if(dash) observer.observe(dash,{attributes:true,attributeFilter:['class']});
    document.getElementById('signInBtn')?.addEventListener('click',()=>setTimeout(render,500));
    document.getElementById('signUpBtn')?.addEventListener('click',()=>setTimeout(render,700));
    setTimeout(render,350);
  });
})();