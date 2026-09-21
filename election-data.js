(() => {
  const client = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  let loading = null;

  async function loadElectionDataFast(){
    if(loading) return loading;
    loading = (async () => {
      try{
        const {data,error} = await client.rpc('vote_public_election_data');
        if(error) throw error;
        const nextCandidates = Array.isArray(data?.candidates) ? data.candidates : [];
        const nextLists = Array.isArray(data?.lists) ? data.lists : [];
        candidates = nextCandidates;
        lists = nextLists;
        window.candidates = nextCandidates;
        window.lists = nextLists;
        if(!nextCandidates.length || !nextLists.length) throw new Error('Datos electorales vacíos');
        return true;
      }catch(error){
        console.error('election data', error);
        try{
          const [{data:c,error:ce},{data:l,error:le}] = await Promise.all([
            client.from('vote_candidates').select('*').eq('active',true).order('display_order',{ascending:true}).order('name',{ascending:true}),
            client.from('vote_lists').select('*').eq('active',true).order('display_order',{ascending:true}).order('list_number',{ascending:true})
          ]);
          if(ce || le) throw ce || le;
          candidates = c || [];
          lists = l || [];
          window.candidates = candidates;
          window.lists = lists;
          return candidates.length > 0 && lists.length > 0;
        }catch(fallbackError){
          console.error('election fallback', fallbackError);
          window.showToast?.('No se pudieron cargar los candidatos. Recargá la página.');
          return false;
        }
      }finally{
        loading = null;
      }
    })();
    return loading;
  }

  window.loadElectionData = loadElectionDataFast;

  async function refreshVisibleBallot(){
    const ok = await loadElectionDataFast();
    if(!ok) return;
    const ballot = document.getElementById('ballotSection');
    if(ballot && !ballot.classList.contains('hidden') && typeof window.goStep === 'function'){
      window.goStep(typeof currentStep === 'number' ? currentStep : 1);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshVisibleBallot, {once:true});
  else refreshVisibleBallot();
})();
