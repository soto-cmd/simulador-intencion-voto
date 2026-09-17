window.APP_CONFIG = {
  SUPABASE_URL: 'https://oxirewjzmnfnbwiugoac.supabase.co',
  SUPABASE_KEY: 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC'
};

window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'candidate-access.css';
  document.head.appendChild(style);

  for (const src of ['referral.js', 'sprite-helper.js', 'candidate-dashboard.js']) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
});
