(() => {
  const socialDb = (typeof db !== 'undefined' && db) ? db : supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
  const escSocial = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let rendering = false;
  let started = false;
  let cachedCandidate = null;

  function cleanUrl(value, platform){
    let v = String(value || '').trim();
    if(!v) return '';
    if(platform === 'whatsapp' && !/^https?:\/\//i.test(v)){
      const digits = v.replace(/\D/g,'');
      if(digits.length >= 8) return `https://wa.me/${digits}`;
    }
    if(!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v;
  }

  function getProfile(){
    try { return window.currentProfile || (typeof currentProfile !== 'undefined' ? currentProfile : null) || window.__dashboardBundle?.profile || null; }
    catch { return window.currentProfile || window.__dashboardBundle?.profile || null; }
  }

  function getLoadedCandidate(profile){
    if(cachedCandidate?.id === profile?.candidate_id) return cachedCandidate;
    const bundled = window.__dashboardBundle?.candidate;
    if(bundled?.id === profile?.candidate_id){ cachedCandidate=bundled; return cachedCandidate; }
    try{
      if(typeof candidates !== 'undefined' && Array.isArray(candidates)){
        const found=candidates.find(c=>c.id===profile?.candidate_id);
        if(found){ cachedCandidate=found; return found; }
      }
    }catch{}
    return null;
  }

  function socialButtons(c){
    const defs = [['facebook_url','Facebook','f'],['instagram_url','Instagram','◎'],['tiktok_url','TikTok','♪'],['youtube_url','YouTube','▶'],['x_url','X','X'],['whatsapp_url','WhatsApp','wa']];
    const items = defs.filter(([key]) => c?.[key]).map(([key,label,icon]) => `<a class="candidateSocialButton" href="${escSocial(c[key])}" target="_blank" rel="noopener noreferrer" aria-label="${label}"><span>${icon}</span>${label}</a>`);
    return items.length ? `<div class="candidateSocialPublic">${items.join('')}</div>` : '<p class="muted candidateSocialEmpty">Todavía no agregaste redes sociales.</p>';
  }

  function ensureCard(){
    const dash = document.getElementById('dashboardView');
    if(!dash || dash.classList.contains('hidden')) return null;
    let card = document.getElementById('candidateSocialCard');
    if(card) return card;
    card = document.createElement('section');
    card.id = 'candidateSocialCard';
    card.className = 'card candidateSocialCard hidden';
    const referral = document.getElementById('referralPanel');
    if(referral) referral.insertAdjacentElement('afterend', card); else document.getElementById('statsGrid')?.insertAdjacentElement('afterend', card);
    return card;
  }

  async function resolveCandidate(){
    const profile=getProfile();
    if(!profile || profile.role!=='candidate' || !profile.candidate_id) return {profile:null,candidate:null};
    let candidate=getLoadedCandidate(profile);
    if(candidate) return {profile,candidate};
    const {data,error}=await socialDb.from('vote_candidates').select('id,name,facebook_url,instagram_url,tiktok_url,youtube_url,x_url,whatsapp_url').eq('id',profile.candidate_id).maybeSingle();
    if(error) throw error;
    cachedCandidate=data||null;
    return {profile,candidate:cachedCandidate};
  }

  async function saveLinks(candidate){
    const msg = document.getElementById('candidateSocialMsg');
    const btn = document.getElementById('saveCandidateSocials');
    const payload = {
      p_facebook_url: cleanUrl(document.getElementById('socialFacebook')?.value,'facebook') || null,
      p_instagram_url: cleanUrl(document.getElementById('socialInstagram')?.value,'instagram') || null,
      p_tiktok_url: cleanUrl(document.getElementById('socialTiktok')?.value,'tiktok') || null,
      p_youtube_url: cleanUrl(document.getElementById('socialYoutube')?.value,'youtube') || null,
      p_x_url: cleanUrl(document.getElementById('socialX')?.value,'x') || null,
      p_whatsapp_url: cleanUrl(document.getElementById('socialWhatsapp')?.value,'whatsapp') || null
    };
    if(btn) btn.disabled = true;
    if(msg) msg.textContent = 'Guardando…';
    try{
      const {data,error} = await socialDb.rpc('vote_update_my_social_links',payload);
      if(error) throw error;
      if(!data?.ok){ if(msg) msg.textContent = data?.reason === 'access_expired' ? 'Tu acceso está vencido.' : 'No se pudieron guardar los enlaces.'; return; }
      Object.assign(candidate, {
        facebook_url: payload.p_facebook_url, instagram_url: payload.p_instagram_url, tiktok_url: payload.p_tiktok_url,
        youtube_url: payload.p_youtube_url, x_url: payload.p_x_url, whatsapp_url: payload.p_whatsapp_url
      });
      cachedCandidate=candidate;
      if(window.__dashboardBundle?.candidate?.id===candidate.id) Object.assign(window.__dashboardBundle.candidate,candidate);
      if(msg) msg.textContent = 'Redes sociales actualizadas.';
      render(true);
    }catch(err){ console.error('candidate socials',err); if(msg) msg.textContent = 'No se pudieron guardar los enlaces. Revisá que sean válidos.'; }
    finally{ if(btn) btn.disabled = false; }
  }

  async function render(force=false){
    if(rendering || window.__appRole!=='candidate') return;
    const card = ensureCard();
    if(!card) return;
    rendering = true;
    try{
      const {profile,candidate} = await resolveCandidate();
      if(!profile || !candidate){ card.classList.add('hidden'); return; }
      card.classList.remove('hidden');
      card.innerHTML = `
        <div class="candidateSocialHead"><div><p class="eyebrow">PERFIL DEL CANDIDATO</p><h3>Redes sociales</h3><p class="muted">Agregá tus enlaces públicos. Se mostrarán a quienes ingresen al simulador desde tu enlace único.</p></div></div>
        <div id="candidateSocialPreview">${socialButtons(candidate)}</div>
        <div class="candidateSocialForm">
          <div><label for="socialFacebook">Facebook</label><input id="socialFacebook" type="url" placeholder="https://facebook.com/..." value="${escSocial(candidate.facebook_url || '')}"></div>
          <div><label for="socialInstagram">Instagram</label><input id="socialInstagram" type="url" placeholder="https://instagram.com/..." value="${escSocial(candidate.instagram_url || '')}"></div>
          <div><label for="socialTiktok">TikTok</label><input id="socialTiktok" type="url" placeholder="https://tiktok.com/@..." value="${escSocial(candidate.tiktok_url || '')}"></div>
          <div><label for="socialYoutube">YouTube</label><input id="socialYoutube" type="url" placeholder="https://youtube.com/@..." value="${escSocial(candidate.youtube_url || '')}"></div>
          <div><label for="socialX">X</label><input id="socialX" type="url" placeholder="https://x.com/..." value="${escSocial(candidate.x_url || '')}"></div>
          <div><label for="socialWhatsapp">WhatsApp</label><input id="socialWhatsapp" type="text" placeholder="+595... o https://wa.me/..." value="${escSocial(candidate.whatsapp_url || '')}"></div>
        </div>
        <div class="candidateSocialActions"><button id="saveCandidateSocials" class="btn" type="button">Guardar redes sociales</button><span id="candidateSocialMsg" class="muted"></span></div>`;
      document.getElementById('saveCandidateSocials')?.addEventListener('click',()=>saveLinks(candidate));
    }catch(err){ console.error('render candidate socials',err); }
    finally{ rendering = false; }
  }

  function start(){
    if(started) return;
    started = true;
    window.addEventListener('dashboard:loaded',()=>setTimeout(render,0));
    setTimeout(render,80);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
