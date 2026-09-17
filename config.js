window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

window.addEventListener('DOMContentLoaded', () => {
  for (const href of ['candidate-access.css?v=20260917o', 'admin-tabs-v2.css?v=20260917o', 'ui-audit.css?v=20260917o', 'candidate-social.css?v=20260917o', 'admin-candidate-preview.css?v=20260917o']) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    document.head.appendChild(style);
  }

  for (const src of ['referral.js?v=20260917o', 'sprite-helper.js?v=20260917o', 'candidate-dashboard.js?v=20260917o', 'admin-tabs-v2.js?v=20260917o', 'admin-access-direct.js?v=20260917o', 'candidate-auth-no-email.js?v=20260917o', 'residence-select.js?v=20260917o', 'candidate-social.js?v=20260917o', 'referral-share-social.js?v=20260917o', 'admin-candidate-preview.js?v=20260917o']) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
});