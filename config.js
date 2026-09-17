window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

window.addEventListener('DOMContentLoaded', () => {
  for (const href of ['candidate-access.css?v=20260917k', 'admin-tabs-v2.css?v=20260917k', 'ui-audit.css?v=20260917k', 'candidate-social.css?v=20260917k']) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    document.head.appendChild(style);
  }

  for (const src of ['referral.js?v=20260917k', 'sprite-helper.js?v=20260917k', 'candidate-dashboard.js?v=20260917k', 'admin-tabs-v2.js?v=20260917k', 'admin-access-direct.js?v=20260917k', 'candidate-auth-no-email.js?v=20260917k', 'residence-select.js?v=20260917k', 'candidate-social.js?v=20260917k', 'referral-share-social.js?v=20260917k']) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
});
