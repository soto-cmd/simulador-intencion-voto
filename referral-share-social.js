(() => {
  const shareDb = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const escShare = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let started=false;

  const networks = [
    ['facebook_url','Facebook','f'],['instagram_url','Instagram','◎'],['tiktok_url','TikTok','♪'],
    ['youtube_url','YouTube','▶'],['x_url','X','X'],['whatsapp_url','WhatsApp','wa']
  ];

  function buttons(candidate){
    return networks.filter(([key])=>candidate?.[key]).map(([key,label,icon])=>`<a class="candidateSocialButton" href="${escShare(candidate[key])}" target="_blank" rel="noopener noreferrer"><span>${icon}</span>${label}</a>`).join('');
  }

  async function shareLink(link, name=''){
    const title = name ? `Simulador de intención de voto · ${name}` : 'Simulador de intención de voto';
    const text = name ? `Participá en el simulador desde el enlace compartido por ${name}.` : 'Participá en el simulador de intención de voto.';
    if(navigator.share){
      try{ await navigator.share({title,text,url:link}); return; }catch(err){ if(err?.name === 'AbortError') return; }
    }
    try{ await navigator.clipboard.writeText(link); window.showToast?.('Enlace copiado para compartir.'); }
    catch{ window.prompt('Copiá este enlace:',link); }
  }

  function enhanceCandidateReferralPanel(){
    const input = document.getElementById('candidateReferralLink');
    const copy = document.getElementById('copyReferralBtn');
    if(!input || !copy || document.getElementById('shareReferralBtn')) return;
    const wrap = copy.parentElement;
    if(!wrap) return;
    wrap.classList.add('referralShareActions');
    const btn=document.createElement('button');
    btn.id='shareReferralBtn'; btn.type='button'; btn.className='btn shareReferralBtn'; btn.textContent='Compartir';
    btn.addEventListener('click',()=>{
      const candidateName = document.querySelector('.candidateIdentityText h3,.candidateVisualHeader h3')?.textContent?.trim() || '';
      shareLink(input.value,candidateName);
    });
    copy.insertAdjacentElement('afterend',btn);
  }

  async function renderPublicSocials(){
    const code=(new URLSearchParams(location.search).get('ref')||'').trim().toLowerCase();
    if(!code || document.getElementById('referralSocialCard')) return;
    let data = window.__referralCandidate || null;
    if(!data || String(data.referral_code||'').toLowerCase() !== code){
      const result=await shareDb.from('vote_candidates')
        .select('name,referral_code,facebook_url,instagram_url,tiktok_url,youtube_url,x_url,whatsapp_url')
        .eq('referral_code',code).eq('active',true).maybeSingle();
      if(result.error || !result.data) return;
      data=result.data;
      window.__referralCandidate=data;
    }
    const links=buttons(data); if(!links) return;
    const card=document.createElement('div'); card.id='referralSocialCard'; card.className='card referralSocialCard';
    card.innerHTML=`<div><p class="eyebrow">PERFIL DEL CANDIDATO</p><h3 style="margin:0 0 5px">Redes de ${escShare(data.name)}</h3><p class="muted" style="margin:0">Enlaces públicos cargados por la candidatura.</p></div><div class="referralSocialStrip"><div class="candidateSocialPublic">${links}</div></div>`;
    const registration=document.getElementById('registrationCard'); registration?.parentNode?.insertBefore(card,registration);
  }

  function start(){
    if(started) return;
    started=true;
    setTimeout(renderPublicSocials,100);
    setTimeout(enhanceCandidateReferralPanel,200);
    window.addEventListener('dashboard:loaded',()=>setTimeout(enhanceCandidateReferralPanel,60));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
