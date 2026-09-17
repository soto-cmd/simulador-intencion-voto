(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);

  async function getProfile() {
    const { data, error } = await client.rpc('vote_my_profile');
    if (error) throw error;
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }

  async function openDashboard(profile) {
    if (!profile) return false;
    if (typeof window.loadDashboard === 'function') {
      window.currentProfile = profile;
      await window.loadDashboard(profile);
      return true;
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
      if (!opened && typeof window.claimRoleAndDashboard === 'function') await window.claimRoleAndDashboard();
    } catch (error) {
      console.error('robust sign in', error);
      if (msg) msg.textContent = 'No se pudo abrir el panel. Intentá nuevamente.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function activateCandidateAccount() {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const msg = document.getElementById('authMsg');
    const btn = document.getElementById('signUpBtn');
    const email = (emailEl?.value || '').trim().toLowerCase();
    const password = passwordEl?.value || '';

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      if (msg) msg.textContent = 'Ingresá el correo autorizado y una contraseña de al menos 6 caracteres.';
      return;
    }

    if (btn) btn.disabled = true;
    if (msg) msg.textContent = 'Activando cuenta…';

    try {
      const response = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/candidate-activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.APP_CONFIG.SUPABASE_KEY
        },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        const messages = {
          not_invited: 'Este correo no fue habilitado por el administrador.',
          candidate_already_active: 'Esta candidatura ya tiene una cuenta activa.',
          email_in_use: 'Este correo ya está vinculado a otra cuenta.',
          invalid_credentials: 'Revisá el correo y la contraseña.'
        };
        if (msg) msg.textContent = messages[result?.reason] || 'No se pudo activar la cuenta.';
        return;
      }

      if (msg) msg.textContent = 'Cuenta activada. Iniciando sesión…';
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error(signInError);
        if (msg) msg.textContent = 'La cuenta quedó activada. Pulsá Ingresar para acceder.';
        return;
      }

      let profile = await getProfile();
      if (!profile) {
        await client.rpc('vote_claim_candidate_access');
        profile = await getProfile();
      }
      if (profile) await openDashboard(profile);
    } catch (error) {
      console.error('candidate activation', error);
      if (msg) msg.textContent = 'No se pudo activar la cuenta. Intentá nuevamente.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const signIn = event.target instanceof Element ? event.target.closest('#signInBtn') : null;
    if (signIn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      robustSignIn();
      return;
    }

    const activate = event.target instanceof Element ? event.target.closest('#signUpBtn') : null;
    if (!activate) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    activateCandidateAccount();
  }, true);

  function adjustCopy() {
    const btn = document.getElementById('signUpBtn');
    if (btn) btn.textContent = 'Activar cuenta';
    const auth = document.getElementById('authView');
    if (auth && !document.getElementById('noEmailVerificationHelp')) {
      const p = document.createElement('p');
      p.id = 'noEmailVerificationHelp';
      p.className = 'muted';
      p.textContent = 'Usá el correo habilitado por el administrador y elegí tu contraseña. No se requiere verificación por correo.';
      auth.querySelector('.card')?.appendChild(p);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adjustCopy);
  else adjustCopy();
})();
