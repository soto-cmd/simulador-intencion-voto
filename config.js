window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

(() => {
  const V = '20260921a';
  let authPromise = null;
  let rolePromise = null;
  let previewPromise = null;

  function addStyle(href){
    if(document.querySelector(`link[data-app-style="${href}"]`)) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    style.dataset.appStyle = href;
    document.head.appendChild(style);
  }

  function addScript(src){
    return new Promise((resolve,reject) => {
      if(document.querySelector(`script[data-app-script="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.dataset.appScript = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function loadPublicModules(){
    addStyle(`ui-audit.css?v=${V}`);
    addStyle(`candidate-social.css?v=${V}`);
    for (const src of [
      `election-data.js?v=${V}`,
      `referral.js?v=${V}`,
      `sprite-helper.js?v=${V}`,
      `residence-select.js?v=${V}`,
      `referral-share-social.js?v=${V}`
    ]) {
      try { await addScript(src); } catch (err) { console.error('public module', src, err); }
    }
  }

  function loadAuthModule(){
    if(authPromise) return authPromise;
    authPromise = (async () => {
      addStyle(`candidate-access.css?v=${V}`);
      await addScript(`candidate-auth-no-email.js?v=${V}`);
    })().catch(err => { authPromise = null; throw err; });
    return authPromise;
  }

  function loadAdminPreviewFast(){
    if(previewPromise) return previewPromise;
    previewPromise = addScript(`admin-preview-fast.js?v=${V}`).catch(err => {
      previewPromise = null;
      console.error('admin preview fast',err);
      throw err;
    });
    return previewPromise;
  }

  async function loadRoleModules(role){
    if(!role) return;
    window.__appRole = role;
    if(rolePromise && rolePromise.role === role) return rolePromise.promise;

    const promise = (async () => {
      if(role === 'admin'){
        addStyle(`candidate-access.css?v=${V}`);
        addStyle(`admin-tabs-v2.css?v=${V}`);
        addStyle(`admin-candidate-preview.css?v=${V}`);
        for(const src of [
          `admin-tabs-v2.js?v=${V}`,
          `admin-access-direct.js?v=${V}`,
          `admin-candidate-preview.js?v=${V}`
        ]){
          try { await addScript(src); } catch(err){ console.error('admin module', src, err); }
        }
      } else if(role === 'candidate'){
        addStyle(`candidate-access.css?v=${V}`);
        try { await addScript(`candidate-social.js?v=${V}`); }
        catch(err){ console.error('candidate module', err); }
      }
    })();
    rolePromise = {role,promise};
    return promise;
  }

  window.ensurePrivateModules = loadAuthModule;
  window.ensureRoleModules = loadRoleModules;
  window.ensureAdminPreviewFast = loadAdminPreviewFast;

  async function boot(){
    loadPublicModules();
    document.getElementById('loginBtn')?.addEventListener('click', () => loadAuthModule(), {once:false});
    window.addEventListener('dashboard:loaded', event => {
      const role = event.detail?.profile?.role;
      if(role) loadRoleModules(role);
    });

    if('serviceWorker' in navigator){
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('service worker', err));
      }, {once:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
