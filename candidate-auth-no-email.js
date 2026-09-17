(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);

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

      if (typeof window.claimRoleAndDashboard === 'function') {
        await window.claimRoleAndDashboard();
      }
    } catch (error) {
      console.error('candidate activation', error);
      if (msg) msg.textContent = 'No se pudo activar la cuenta. Intentá nuevamente.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#signUpBtn') : null;
    if (!target) return;
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
