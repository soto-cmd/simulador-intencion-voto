window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

(() => {
  const V = '20260917r';
  let privateLoadPromise = null;

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
      `referral.js?v=${V}`,
      `sprite-helper.js?v=${V}`,
      `residence-select.js?v=${V}`,
      `referral-share-social.js?v=${V}`
    ]) {
      try { await addScript(src); } catch (err) { console.error('public module', src, err); }
    }
  }

  async function loadPrivateModules(){
    if(privateLoadPromise) return privateLoadPromise;
    privateLoadPromise = (async () => {
      addStyle(`candidate-access.css?v=${V}`);
      addStyle(`admin-tabs-v2.css?v=${V}`);
      addStyle(`admin-candidate-preview.css?v=${V}`);
      for (const src of [
        `candidate-auth-no-email.js?v=${V}`,
        `candidate-dashboard.js?v=${V}`,
        `admin-tabs-v2.js?v=${V}`,
        `admin-access-direct.js?v=${V}`,
        `candidate-social.js?v=${V}`,
        `admin-candidate-preview.js?v=${V}`,
        `admin-preview-fast.js?v=${V}`
      ]) {
        try { await addScript(src); } catch (err) { console.error('private module', src, err); }
      }
    })();
    return privateLoadPromise;
  }

  window.ensurePrivateModules = loadPrivateModules;

  async function boot(){
    loadPublicModules();

    document.getElementById('loginBtn')?.addEventListener('click', () => loadPrivateModules(), { once:false });

    setTimeout(async () => {
      try {
        const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
        const {data:{session}} = await client.auth.getSession();
        if(session) loadPrivateModules();
      } catch (err) { console.warn('session preload', err); }
    }, 250);

    if('serviceWorker' in navigator){
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('service worker', err));
      }, {once:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
