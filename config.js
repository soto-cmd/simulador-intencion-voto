window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

window.addEventListener('DOMContentLoaded', () => {
  for (const href of ['candidate-access.css?v=20260917l', 'admin-tabs-v2.css?v=20260917l', 'ui-audit.css?v=20260917l', 'candidate-social.css?v=20260917l', 'admin-candidate-preview.css?v=20260917l']) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    document.head.appendChild(style);
  }

  for (const src of ['referral.js?v=20260917l', 'sprite-helper.js?v=20260917l', 'candidate-dashboard.js?v=20260917l', 'admin-tabs-v2.js?v=20260917l', 'admin-access-direct.js?v=20260917l', 'candidate-auth-no-email.js?v=20260917l', 'residence-select.js?v=20260917l', 'candidate-social.js?v=20260917l', 'referral-share-social.js?v=20260917l', 'admin-candidate-preview.js?v=20260917l']) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
});