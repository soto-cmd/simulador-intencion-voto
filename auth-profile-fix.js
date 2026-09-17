(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);

  async function getProfile() {
    const { data, error } = await client.rpc('vote_my_profile');
    if (error) throw error;
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  async function openDashboard(profile) {
    if (!profile) return false;
    try {
      window.currentProfile = profile;
      if (typeof window.loadDashboard === 'function') {
        await window.loadDashboard(profile);
        return true;
      }
    } catch (error) {
      console.error('load dashboard', error);
    }
    return false;
  }

  async function robustSignIn() {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const msg = document.getElementById('authMsg');
    const btn = document.getElementById('signInBtn');
    const email = (emailEl?.value || '').trim().toLowerCase();
    const password = passwordEl?.value || '';

    if (!email || !password) {
      if (msg) msg.textContent = 'Ingresá correo y contraseña.';
      return;
    }

    if (btn) btn.disabled = true;
    if (msg) msg.textContent = 'Ingresando…';

    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (msg) msg.textContent = 'No se pudo iniciar sesión. Revisá correo y contraseña.';
        return;
      }

      let profile = await getProfile();

      if (!profile) {
        await client.rpc('vote_claim_candidate_access');
        profile = await getProfile();
      }

      if (!profile) {
        if (msg) msg.textContent = 'Tu cuenta todavía no tiene acceso asignado.';
        return;
      }

      if (msg) msg.textContent = '';
      const opened = await openDashboard(profile);
      if (!opened && typeof window.claimRoleAndDashboard === 'function') {
        await window.claimRoleAndDashboard();
      }
    } catch (error) {
      console.error('robust sign in', error);
      if (msg) msg.textContent = 'No se pudo abrir el panel. Intentá nuevamente.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#signInBtn') : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    robustSignIn();
  }, true);
})();
