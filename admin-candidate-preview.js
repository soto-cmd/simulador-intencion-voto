(() => {
  const previewDb = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => `${Number(v || 0).toFixed(1).replace('.0','')}%`;
  const fmt = v => v ? new Date(v).toLocaleString('es-PY',{dateStyle:'medium',timeStyle:'short'}) : 'Sin vencimiento';
  let candidates = [];
  let selectedCandidateId = '';

  function imageMarkup(c){
    const raw = c?.photo_url || '';
    if(raw.startsWith('sprite:')){
      const i = Number(raw.slice(7));
      if(Number.isInteger(i) && i >= 0 && i < 12){
        const col=i%4,row=Math.floor(i/4);
        return `<div class="spritePortrait adminPreviewSprite" style="--sprite-x:${col};--sprite-y:${row}" role="img" aria-label="${esc(c.name)}"></div>`;
      }
    }
    if(raw){
      const url = /^https?:\/\//i.test(raw) ? raw : raw.startsWith('/') ? `.${raw}` : raw.startsWith('assets/') ? `./${raw}` : raw;
      return `<img src="${esc(url)}" alt="${esc(c.name)}">`;
    }
    const initials=(c?.name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return `<div class="adminPreviewInitials">${esc(initials)}</div>`;
  }

  function socialButtons(c){
    const defs=[['facebook_url','Facebook','f'],['instagram_url','Instagram','◎'],['tiktok_url','TikTok','♪'],['youtube_url','YouTube','▶'],['x_url','X','X'],['whatsapp_url','WhatsApp','wa']];
    const items=defs.filter(([k])=>c?.[k]).map(([k,label,icon])=>`<a class="candidateSocialButton" href="${esc(c[k])}" target="_blank" rel="noopener noreferrer"><span>${icon}</span>${label}</a>`);
    return items.length ? `<div class="candidateSocialPublic">${items.join('')}</div>` : '<p class="muted">Este candidato todavía no cargó redes sociales.</p>';
  }

  function candidateLabel(c){
    return `${c.name} · ${c.race_type==='intendente'?'Intendente':'Junta'}${c.list_number?` · Lista ${c.list_number}`:''}${c.option_number?` · Opción ${c.option_number}`:''}`;
  }

  function ensureSection(){
    let section=document.getElementById('adminCandidatePreview');
    if(section) return section;
    const dash=document.getElementById('dashboardView');
    if(!dash) return null;
    section=document.createElement('section');
    section.id='adminCandidatePreview';
    section.dataset.adminSection='vista-candidato';
    section.style.display='none';
    section.innerHTML=`
      <div class="card adminPreviewChooser">
        <div><p class="eyebrow">VISTA DEL CANDIDATO</p><h3>Ver el panel como lo ve un candidato</h3><p class="muted">Seleccioná una candidatura. Esta vista es de solo lectura y no inicia sesión como el candidato.</p></div>
        <div class="adminPreviewSelectRow">
          <div class="candidatePicker" id="adminCandidatePicker">
            <button id="adminCandidatePickerButton" class="candidatePickerButton" type="button" aria-expanded="false"><span>Seleccionar candidato</span><b>⌄</b></button>
            <div id="adminCandidatePickerMenu" class="candidatePickerMenu hidden">
              <div class="candidatePickerSearchWrap"><input id="adminCandidatePickerSearch" type="search" placeholder="Buscar candidato…" autocomplete="off"></div>
              <div id="adminCandidatePickerList" class="candidatePickerList"></div>
            </div>
          </div>
          <button id="adminPreviewRefresh" type="button" class="btn secondary">Actualizar vista</button>
        </div>
      </div>
      <div id="adminPreviewContent"></div>`;
    const adminPanel=document.getElementById('adminPanel');
    if(adminPanel) adminPanel.insertAdjacentElement('beforebegin',section);
    else dash.appendChild(section);

    const pickerBtn=section.querySelector('#adminCandidatePickerButton');
    const menu=section.querySelector('#adminCandidatePickerMenu');
    const search=section.querySelector('#adminCandidatePickerSearch');
    pickerBtn?.addEventListener('click',()=>{
      const open=menu?.classList.contains('hidden');
      menu?.classList.toggle('hidden',!open);
      pickerBtn.setAttribute('aria-expanded',open?'true':'false');
      if(open) setTimeout(()=>search?.focus(),20);
    });
    search?.addEventListener('input',()=>renderCandidateList(search.value));
    section.querySelector('#adminPreviewRefresh')?.addEventListener('click',renderSelected);
    document.addEventListener('click',(ev)=>{
      if(!section.querySelector('#adminCandidatePicker')?.contains(ev.target)){
        menu?.classList.add('hidden');
        pickerBtn?.setAttribute('aria-expanded','false');
      }
    });
    return section;
  }

  function renderCandidateList(query=''){
    const holder=document.getElementById('adminCandidatePickerList');
    if(!holder) return;
    const q=String(query||'').trim().toLowerCase();
    const rows=candidates.filter(c=>candidateLabel(c).toLowerCase().includes(q));
    holder.innerHTML=rows.length ? rows.map(c=>`<button type="button" class="candidatePickerOption${c.id===selectedCandidateId?' selected':''}" data-candidate-id="${c.id}"><span>${esc(c.name)}</span><small>${c.race_type==='intendente'?'Intendente municipal':'Junta municipal'}${c.list_number?` · Lista ${esc(c.list_number)}`:''}${c.option_number?` · Opción ${esc(c.option_number)}`:''}</small></button>`).join('') : '<div class="candidatePickerEmpty">No se encontraron candidatos.</div>';
    holder.querySelectorAll('[data-candidate-id]').forEach(btn=>btn.addEventListener('click',()=>{
      selectedCandidateId=btn.dataset.candidateId;
      const c=candidates.find(x=>x.id===selectedCandidateId);
      const mainBtn=document.getElementById('adminCandidatePickerButton');
      if(mainBtn && c) mainBtn.querySelector('span').textContent=candidateLabel(c);
      document.getElementById('adminCandidatePickerMenu')?.classList.add('hidden');
      mainBtn?.setAttribute('aria-expanded','false');
      renderCandidateList(document.getElementById('adminCandidatePickerSearch')?.value||'');
      renderSelected();
    }));
  }

  async function loadCandidates(){
    const {data,error}=await previewDb.from('vote_candidates').select('id,name,office,race_type,list_number,option_number,party_name,party_abbr,party_color,photo_url,referral_code,facebook_url,instagram_url,tiktok_url,youtube_url,x_url,whatsapp_url').eq('active',true).order('race_type').order('list_number').order('option_number');
    if(error) throw error;
    candidates=data||[];
    renderCandidateList();
  }

  function metricBar(label,value,color){
    const v=Math.max(0,Math.min(100,Number(value||0)));
    return `<div class="candidateMetric"><div class="candidateMetricHead"><span>${esc(label)}</span><strong>${pct(v)}</strong></div><div class="candidateMetricTrack"><div class="candidateMetricFill" style="width:${v}%;background:${esc(color)}"></div></div></div>`;
  }

  function historyRows(rows,color){
    if(!rows?.length) return '<div class="empty">Sin datos de los últimos 7 días.</div>';
    return rows.map(r=>`<div class="historyRow"><span>${new Date(`${r.day}T12:00:00`).toLocaleDateString('es-PY',{day:'2-digit',month:'short'})}</span><div class="barTrack"><div class="barFill" style="width:${Math.max(0,Math.min(100,Number(r.percentage||0)))}%;background:${esc(color)}"></div></div><strong>${pct(r.percentage)}</strong></div>`).join('');
  }

  function demoRows(rows){
    if(!Array.isArray(rows) || !rows.length) return '<div class="empty">Sin datos demográficos disponibles.</div>';
    const groups={};
    rows.forEach(r=>{ const group=r.dimension||r.category||r.group_name||'Datos'; (groups[group]??=[]).push(r); });
    return Object.entries(groups).map(([group,items])=>`<div class="demoSection"><h4>${esc(group)}</h4>${items.map(r=>`<div class="demoRow"><span>${esc(r.label||r.value||r.category_value||'')}</span><div class="barTrack"><div class="barFill" style="width:${Math.max(0,Math.min(100,Number(r.percentage||0)))}%"></div></div><strong>${r.count??r.total??''}</strong></div>`).join('')}</div>`).join('');
  }

  async function shareLink(link,name){
    const title=`Simulador de intención de voto · ${name}`;
    const text=`Participá en el simulador desde el enlace compartido por ${name}.`;
    if(navigator.share){ try{ await navigator.share({title,text,url:link}); return; }catch(e){ if(e?.name==='AbortError') return; } }
    try{ await navigator.clipboard.writeText(link); window.showToast?.('Enlace copiado.'); }
    catch{ window.prompt('Copiá este enlace:',link); }
  }

  async function renderSelected(){
    const id=selectedCandidateId;
    const holder=document.getElementById('adminPreviewContent');
    if(!holder) return;
    if(!id){ holder.innerHTML=''; return; }
    holder.innerHTML='<div class="card"><p class="muted">Cargando vista del candidato…</p></div>';
    try{
      const candidate=candidates.find(c=>c.id===id);
      const [{data:dashRows,error:dashErr},{data:history,error:histErr},{data:refs,error:refErr},{data:access,error:accessErr},{data:demo,error:demoErr}] = await Promise.all([
        previewDb.rpc('vote_my_dashboard'),
        previewDb.rpc('vote_my_history',{p_days:7}),
        previewDb.rpc('vote_my_referral_summary'),
        previewDb.rpc('vote_admin_candidate_access_status'),
        previewDb.rpc('vote_demographic_summary')
      ]);
      if(dashErr||histErr||refErr||accessErr) throw (dashErr||histErr||refErr||accessErr);
      const row=(dashRows||[]).find(r=>r.candidate_id===id)||{};
      const hist=(history||[]).filter(r=>r.candidate_id===id);
      const ref=(refs||[]).find(r=>r.candidate_id===id)||{};
      const acc=(access||[]).find(r=>r.candidate_id===id)||{};
      const color=candidate?.party_color || (candidate?.party_abbr==='ANR'?'#e31b23':candidate?.party_abbr==='PLRA'?'#1437d1':'#1d4ed8');
      const link=ref.referral_code ? `${location.origin}${location.pathname}?ref=${encodeURIComponent(ref.referral_code)}` : '';
      holder.innerHTML=`
        <div class="adminPreviewNotice">Vista previa del candidato · Solo lectura</div>
        <div class="candidateVisualHero">
          <div class="candidateIdentityCard" style="--candidate-color:${esc(color)}">
            <div class="candidateIdentityPhoto">${imageMarkup(candidate)}</div>
            <div class="candidateIdentityText"><div class="candidateRole">${candidate?.race_type==='intendente'?'Intendente municipal':'Junta municipal'}</div><h3>${esc(candidate?.name||'')}</h3><div class="candidateIdentityMeta"><span class="partyChip">${esc(candidate?.party_name||candidate?.party_abbr||'')}</span>${candidate?.list_number?`<span class="listChip">Lista ${esc(candidate.list_number)}</span>`:''}${candidate?.option_number?`<span class="optionChip">Opción ${esc(candidate.option_number)}</span>`:''}</div></div>
          </div>
          <div class="candidateChartCard" style="--candidate-color:${esc(color)}">
            <div class="candidateDonut" style="--candidate-color:${esc(color)};--candidate-pct:${Number(row.percentage||0)}"><div class="candidateDonutValue">${pct(row.percentage)}<small>Intención de voto</small></div></div>
            <div class="candidateChartInfo"><h4>Resumen de intención</h4>${metricBar('Intención general',row.percentage,color)}${metricBar('Intención hoy',row.today_percentage,color)}</div>
          </div>
        </div>
        <div class="stats adminPreviewStats">
          <div class="statCard"><div class="statLabel">Registros para su candidatura</div><div class="statValue">${Number(row.candidate_votes||0)}</div></div>
          <div class="statCard"><div class="statLabel">Simulaciones válidas</div><div class="statValue">${Number(row.total_simulations||0)}</div></div>
          <div class="statCard"><div class="statLabel">Desde su enlace</div><div class="statValue">${Number(ref.participants_from_link||0)}</div></div>
          <div class="statCard"><div class="statLabel">Hoy desde su enlace</div><div class="statValue">${Number(ref.today_from_link||0)}</div></div>
        </div>
        <div class="card adminPreviewAccess"><strong>Estado del acceso:</strong> ${acc.account_active ? (acc.access_valid?'Activo':'Vencido') : 'Pendiente de activación'}${acc.access_email?` · ${esc(acc.access_email)}`:''}${acc.access_expires_at?` · hasta ${esc(fmt(acc.access_expires_at))}`:''}</div>
        <div class="card candidateLinkBox">
          <h3>Enlace único para participantes</h3>
          ${link?`<div class="candidateLinkRow"><input id="adminPreviewReferralLink" readonly value="${esc(link)}"><button id="adminPreviewCopy" class="btn secondary" type="button">Copiar enlace</button><button id="adminPreviewShare" class="btn" type="button">Compartir</button></div>`:'<p class="muted">Todavía no hay enlace asignado.</p>'}
        </div>
        <div class="card candidateSocialCard"><div class="candidateSocialHead"><div><p class="eyebrow">PERFIL DEL CANDIDATO</p><h3>Redes sociales</h3><p class="muted">Esto es lo que tiene cargado actualmente.</p></div></div>${socialButtons(candidate)}</div>
        <div class="dashboardGrid">
          <div class="card"><h3>Evolución últimos 7 días</h3><div>${historyRows(hist,color)}</div></div>
          <div class="card"><h3>Perfil general de participantes</h3><p class="muted">El candidato ve datos generales, no preferencias individuales.</p><div>${demoErr?'<div class="empty">No se pudo cargar.</div>':demoRows(demo)}</div></div>
        </div>`;
      document.getElementById('adminPreviewCopy')?.addEventListener('click',async()=>{ try{await navigator.clipboard.writeText(link); window.showToast?.('Enlace copiado.');}catch{window.prompt('Copiá este enlace:',link);} });
      document.getElementById('adminPreviewShare')?.addEventListener('click',()=>shareLink(link,candidate?.name||''));
    }catch(err){ console.error('admin candidate preview',err); holder.innerHTML='<div class="card"><p class="muted">No se pudo cargar la vista del candidato.</p></div>'; }
  }

  async function init(){
    const section=ensureSection();
    if(!section) return;
    try{
      const {data:profileData}=await previewDb.rpc('vote_my_profile');
      const profile=Array.isArray(profileData)?profileData[0]:profileData;
      if(profile?.role!=='admin') return;
      if(!candidates.length) await loadCandidates();
    }catch(err){ console.error('admin preview init',err); }
  }

  const observer=new MutationObserver(()=>setTimeout(init,120));
  function start(){
    const dash=document.getElementById('dashboardView');
    if(dash) observer.observe(dash,{attributes:true,attributeFilter:['class']});
    setTimeout(init,350);
  }
  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',start); else start();
})();