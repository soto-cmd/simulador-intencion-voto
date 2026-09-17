(() => {
  const fastDb = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const CACHE_KEY = 'admin_preview_bulk_v1';
  const CACHE_MS = 60000;
  let bulkData = null;
  let bulkPromise = null;
  let selectedId = '';

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => `${Number(v || 0).toFixed(1).replace('.0','')}%`;
  const fmt = v => v ? new Date(v).toLocaleString('es-PY',{dateStyle:'medium',timeStyle:'short'}) : 'Sin vencimiento';

  function readCache(){
    try{
      const raw=sessionStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      if(!parsed?.ts || !parsed?.data || Date.now()-parsed.ts > CACHE_MS) return null;
      return parsed.data;
    }catch{return null;}
  }

  function writeCache(data){
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(),data})); }catch{}
  }

  async function fetchBulk(force=false){
    if(!force){
      if(bulkData) return bulkData;
      const cached=readCache();
      if(cached){ bulkData=cached; return bulkData; }
      if(bulkPromise) return bulkPromise;
    }
    bulkPromise = fastDb.rpc('vote_admin_candidate_preview_all').then(({data,error})=>{
      bulkPromise=null;
      if(error) throw error;
      if(!data?.ok) throw new Error('preview_bulk_failed');
      bulkData=data;
      writeCache(data);
      return data;
    }).catch(err=>{bulkPromise=null; throw err;});
    return bulkPromise;
  }

  function spriteMarkup(c,index,asset){
    if(!Number.isInteger(index)||index<0||index>11) return '';
    const col=index%4,row=Math.floor(index/4),x=(col/3)*100,y=(row/2)*100;
    return `<div class="candidateSpritePortrait adminPreviewSprite" role="img" aria-label="${esc(c?.name||'')}" style="width:100%;height:100%;background:#fff url('./${asset}') no-repeat ${x}% ${y}%;background-size:400% 300%;background-position:${x}% ${y}%"></div>`;
  }

  function imageMarkup(c){
    const raw=c?.photo_url||'';
    if(raw.startsWith('sprite:')) return spriteMarkup(c,Number(raw.slice(7)),'assets/candidates/anr-sprite.webp');
    if(raw.startsWith('sprite-plra:')) return spriteMarkup(c,Number(raw.slice(12)),'assets/candidates/plra-sprite.webp');
    if(raw){
      const url=/^https?:\/\//i.test(raw)?raw:raw.startsWith('/')?`.${raw}`:raw.startsWith('assets/')?`./${raw}`:raw;
      return `<img src="${esc(url)}" alt="${esc(c?.name||'')}">`;
    }
    const initials=(c?.name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return `<div class="adminPreviewInitials">${esc(initials)}</div>`;
  }

  function socialButtons(c){
    const defs=[['facebook_url','Facebook','f'],['instagram_url','Instagram','◎'],['tiktok_url','TikTok','♪'],['youtube_url','YouTube','▶'],['x_url','X','X'],['whatsapp_url','WhatsApp','wa']];
    const items=defs.filter(([k])=>c?.[k]).map(([k,label,icon])=>`<a class="candidateSocialButton" href="${esc(c[k])}" target="_blank" rel="noopener noreferrer"><span>${icon}</span>${label}</a>`);
    return items.length?`<div class="candidateSocialPublic">${items.join('')}</div>`:'<p class="muted">Este candidato todavía no cargó redes sociales.</p>';
  }

  function metricBar(label,value,color){
    const v=Math.max(0,Math.min(100,Number(value||0)));
    return `<div class="candidateMetric"><div class="candidateMetricHead"><span>${esc(label)}</span><strong>${pct(v)}</strong></div><div class="candidateMetricTrack"><div class="candidateMetricFill" style="width:${v}%;background:${esc(color)}"></div></div></div>`;
  }

  function historyRows(rows,color){
    if(!rows?.length) return '<div class="empty">Sin datos de los últimos 7 días.</div>';
    return rows.map(r=>`<div class="historyRow"><span>${new Date(`${r.day}T12:00:00`).toLocaleDateString('es-PY',{day:'2-digit',month:'short'})}</span><div class="barTrack"><div class="barFill" style="width:${Math.max(0,Math.min(100,Number(r.percentage||0)))}%;background:${esc(color)}"></div></div><strong>${pct(r.percentage)}</strong></div>`).join('');
  }

  function demoRows(data){
    if(!data||typeof data!=='object') return '<div class="empty">Sin datos demográficos disponibles.</div>';
    return [['Sexo',data.gender],['Edad',data.age],['Residencia',data.residence]].map(([group,items])=>{
      if(!Array.isArray(items)||!items.length) return '';
      return `<div class="demoSection"><h4>${group}</h4>${items.map(r=>`<div class="demoRow"><span>${esc(r.label||'')}</span><div class="barTrack"><div class="barFill" style="width:${Math.max(0,Math.min(100,Number(r.percentage||0)))}%"></div></div><strong>${r.count??''}</strong></div>`).join('')}</div>`;
    }).join('')||'<div class="empty">Sin datos demográficos disponibles.</div>';
  }

  function attachActions(link,name){
    document.getElementById('adminPreviewCopy')?.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(link); window.showToast?.('Enlace copiado.');}
      catch{window.prompt('Copiá este enlace:',link);}
    });
    document.getElementById('adminPreviewShare')?.addEventListener('click',async()=>{
      if(navigator.share){try{await navigator.share({title:`Simulador de intención de voto · ${name}`,text:`Participá en el simulador desde el enlace compartido por ${name}.`,url:link});return;}catch(e){if(e?.name==='AbortError')return;}}
      try{await navigator.clipboard.writeText(link); window.showToast?.('Enlace copiado.');}catch{window.prompt('Copiá este enlace:',link);}
    });
  }

  function renderPayload(payload,demographics){
    const holder=document.getElementById('adminPreviewContent');
    if(!holder||!payload) return;
    const candidate=payload.candidate||{}, row=payload.stats||{}, hist=payload.history||[], ref=payload.referral||{}, acc=payload.access||{};
    const color=candidate.party_color||(candidate.party_abbr==='ANR'?'#e31b23':candidate.party_abbr==='PLRA'?'#1437d1':'#1d4ed8');
    const link=ref.referral_code?`${location.origin}${location.pathname}?ref=${encodeURIComponent(ref.referral_code)}`:'';
    holder.innerHTML=`
      <div class="adminPreviewNotice">Vista previa del candidato · Solo lectura</div>
      <div class="candidateVisualHero">
        <div class="candidateIdentityCard" style="--candidate-color:${esc(color)}"><div class="candidateIdentityPhoto">${imageMarkup(candidate)}</div><div class="candidateIdentityText"><div class="candidateRole">${candidate.race_type==='intendente'?'Intendente municipal':'Junta municipal'}</div><h3>${esc(candidate.name||'')}</h3><div class="candidateIdentityMeta"><span class="partyChip">${esc(candidate.party_name||candidate.party_abbr||'')}</span>${candidate.list_number?`<span class="listChip">Lista ${esc(candidate.list_number)}</span>`:''}${candidate.option_number?`<span class="optionChip">Opción ${esc(candidate.option_number)}</span>`:''}</div></div></div>
        <div class="candidateChartCard" style="--candidate-color:${esc(color)}"><div class="candidateDonut" style="--candidate-color:${esc(color)};--candidate-pct:${Number(row.percentage||0)}"><div class="candidateDonutValue">${pct(row.percentage)}<small>Intención de voto</small></div></div><div class="candidateChartInfo"><h4>Resumen de intención</h4>${metricBar('Intención general',row.percentage,color)}${metricBar('Intención hoy',row.today_percentage,color)}</div></div>
      </div>
      <div class="stats adminPreviewStats"><div class="statCard"><div class="statLabel">Registros para su candidatura</div><div class="statValue">${Number(row.candidate_votes||0)}</div></div><div class="statCard"><div class="statLabel">Simulaciones válidas</div><div class="statValue">${Number(row.total_simulations||0)}</div></div><div class="statCard"><div class="statLabel">Desde su enlace</div><div class="statValue">${Number(ref.participants_from_link||0)}</div></div><div class="statCard"><div class="statLabel">Hoy desde su enlace</div><div class="statValue">${Number(ref.today_from_link||0)}</div></div></div>
      <div class="card adminPreviewAccess"><strong>Estado del acceso:</strong> ${acc.account_active?(acc.access_valid?'Activo':'Vencido'):'Pendiente de activación'}${acc.access_email?` · ${esc(acc.access_email)}`:''}${acc.access_expires_at?` · hasta ${esc(fmt(acc.access_expires_at))}`:''}</div>
      <div class="card candidateLinkBox"><h3>Enlace único para participantes</h3>${link?`<div class="candidateLinkRow"><input id="adminPreviewReferralLink" readonly value="${esc(link)}"><button id="adminPreviewCopy" class="btn secondary" type="button">Copiar enlace</button><button id="adminPreviewShare" class="btn" type="button">Compartir</button></div>`:'<p class="muted">Todavía no hay enlace asignado.</p>'}</div>
      <div class="card candidateSocialCard"><div class="candidateSocialHead"><div><p class="eyebrow">PERFIL DEL CANDIDATO</p><h3>Redes sociales</h3><p class="muted">Esto es lo que tiene cargado actualmente.</p></div></div>${socialButtons(candidate)}</div>
      <div class="dashboardGrid"><div class="card"><h3>Evolución últimos 7 días</h3><div>${historyRows(hist,color)}</div></div><div class="card"><h3>Perfil general de participantes</h3><p class="muted">El candidato ve datos generales, no preferencias individuales.</p><div>${demoRows(demographics)}</div></div></div>`;
    attachActions(link,candidate.name||'');
  }

  function renderImmediate(name,meta){
    const holder=document.getElementById('adminPreviewContent');
    if(!holder) return;
    holder.innerHTML=`<div class="card adminPreviewLoading"><div><strong>${esc(name||'Candidato')}</strong><p class="muted">${esc(meta||'Cargando estadísticas…')}</p></div></div>`;
  }

  async function showCandidate(id,name,meta,force=false){
    selectedId=id;
    if(bulkData?.candidates?.[id]) renderPayload(bulkData.candidates[id],bulkData.demographics||{});
    else renderImmediate(name,meta);
    try{
      const data=await fetchBulk(force);
      if(selectedId!==id) return;
      const payload=data?.candidates?.[id];
      if(payload) renderPayload(payload,data.demographics||{});
      else document.getElementById('adminPreviewContent').innerHTML='<div class="card"><p class="muted">No se encontraron datos para este candidato.</p></div>';
    }catch(err){
      console.error('fast candidate preview',err);
      if(selectedId===id) document.getElementById('adminPreviewContent').innerHTML='<div class="card adminPreviewError"><strong>No se pudo cargar la vista.</strong><p class="muted">Intentá nuevamente.</p></div>';
    }
  }

  document.addEventListener('click',(ev)=>{
    const option=ev.target.closest?.('#adminCandidatePreview [data-candidate-id]');
    if(option){
      ev.preventDefault(); ev.stopImmediatePropagation();
      const id=option.dataset.candidateId;
      const name=option.querySelector('span')?.textContent?.trim()||'';
      const meta=option.querySelector('small')?.textContent?.trim()||'';
      const mainBtn=document.getElementById('adminCandidatePickerButton');
      if(mainBtn) mainBtn.querySelector('span').textContent=`${name} · ${meta}`;
      document.getElementById('adminCandidatePickerMenu')?.classList.add('hidden');
      showCandidate(id,name,meta,false);
      return;
    }
    const refresh=ev.target.closest?.('#adminPreviewRefresh');
    if(refresh && selectedId){
      ev.preventDefault(); ev.stopImmediatePropagation();
      const current=document.getElementById('adminCandidatePickerButton')?.querySelector('span')?.textContent||'';
      sessionStorage.removeItem(CACHE_KEY); bulkData=null;
      showCandidate(selectedId,current,'Actualizando datos…',true);
    }
  },true);

  function prefetch(){
    const dash=document.getElementById('dashboardView');
    if(!dash||dash.classList.contains('hidden')) return;
    fetchBulk(false).catch(()=>{});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(prefetch,900));
  else setTimeout(prefetch,900);
})();