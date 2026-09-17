window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

window.addEventListener('DOMContentLoaded', () => {
  for (const href of ['candidate-access.css?v=20260917h', 'admin-tabs-v2.css?v=20260917h']) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    document.head.appendChild(style);
  }

  for (const src of ['referral.js?v=20260917h', 'sprite-helper.js?v=20260917h', 'candidate-dashboard.js?v=20260917h', 'admin-tabs-v2.js?v=20260917h', 'admin-access-direct.js?v=20260917h', 'candidate-auth-no-email.js?v=20260917h']) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
});
