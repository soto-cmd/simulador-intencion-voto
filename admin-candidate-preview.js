(() => {
  const previewDb = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let rows = [];
  let started = false;

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
    if(adminPanel) adminPanel.insertAdjacentElement('beforebegin',section); else dash.appendChild(section);

    const btn=section.querySelector('#adminCandidatePickerButton');
    const menu=section.querySelector('#adminCandidatePickerMenu');
    const search=section.querySelector('#adminCandidatePickerSearch');
    btn?.addEventListener('click',()=>{
      const open=menu?.classList.contains('hidden');
      menu?.classList.toggle('hidden',!open);
      btn.setAttribute('aria-expanded',open?'true':'false');
      if(open) setTimeout(()=>search?.focus(),20);
    });
    search?.addEventListener('input',()=>renderList(search.value));
    document.addEventListener('click',(ev)=>{
      if(!section.querySelector('#adminCandidatePicker')?.contains(ev.target)){
        menu?.classList.add('hidden'); btn?.setAttribute('aria-expanded','false');
      }
    });
    return section;
  }

  function renderList(query=''){
    const holder=document.getElementById('adminCandidatePickerList');
    if(!holder) return;
    const q=String(query||'').trim().toLowerCase();
    const filtered=rows.filter(c=>candidateLabel(c).toLowerCase().includes(q));
    holder.innerHTML=filtered.length ? filtered.map(c=>`<button type="button" class="candidatePickerOption" data-candidate-id="${c.id}"><span>${esc(c.name)}</span><small>${c.race_type==='intendente'?'Intendente municipal':'Junta municipal'}${c.list_number?` · Lista ${esc(c.list_number)}`:''}${c.option_number?` · Opción ${esc(c.option_number)}`:''}</small></button>`).join('') : '<div class="candidatePickerEmpty">No se encontraron candidatos.</div>';
  }

  async function loadRows(){
    try{
      if(typeof candidates !== 'undefined' && Array.isArray(candidates) && candidates.length){
        rows = candidates.filter(c=>c.active!==false);
      }else{
        const {data,error}=await previewDb.from('vote_candidates').select('id,name,race_type,list_number,option_number,active').eq('active',true).order('race_type').order('list_number').order('option_number');
        if(error) throw error;
        rows=data||[];
      }
      renderList();
    }catch(err){
      console.error('admin preview candidates',err);
      const holder=document.getElementById('adminCandidatePickerList');
      if(holder) holder.innerHTML='<div class="candidatePickerEmpty">No se pudieron cargar los candidatos.</div>';
    }
  }

  function start(){
    if(started || window.__appRole!=='admin') return;
    started=true;
    ensureSection();
    loadRows();
    window.dispatchEvent(new Event('admin-preview:ready'));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});
  else setTimeout(start,0);
  window.addEventListener('dashboard:loaded',start);
})();
