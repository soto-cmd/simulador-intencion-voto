(() => {
  const client = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);

  async function getProfile() {
    const { data, error } = await client.rpc('vote_my_profile');
    if (error) throw error;
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }

  async function openDashboard(profile) {
    if (!profile) return false;
    window.currentProfile = profile;
    if (typeof window.loadDashboard === 'function') {
      await window.loadDashboard(profile);
      return true;
    }
    if (typeof window.claimRoleAndDashboard === 'function') {
      await window.claimRoleAndDashboard();
      return true;
    }
    return false;
  }

  function ensureActivationField() {
    const passwordEl = document.getElementById('password');
    if (!passwordEl || document.getElementById('activationCode')) return;
    const label = document.createElement('label');
    label.id = 'activationCodeLabel';
    label.setAttribute('for', 'activationCode');
    label.textContent = 'Código de activación';
    const input = document.createElement('input');
    input.id = 'activationCode';
    input.type = 'text';
    input.inputMode = 'text';
    input.autocomplete = 'one-time-code';
    input.maxLength = 8;
    input.placeholder = 'Ej.: A1B2C3D4';
    input.style.textTransform = 'uppercase';
    passwordEl.insertAdjacentElement('afterend', input);
    input.insertAdjacentElement('beforebegin', label);
  }

  async function robustSignIn() {
    const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
    const password = document.getElementById('password')?.value || '';
    const msg = document.getElementById('authMsg');
    const btn = document.getElementById('signInBtn');
    if (!email || !password) { if (msg) msg.textContent = 'Ingresá correo y contraseña.'; return; }

    if (btn) btn.disabled = true;
    if (msg) msg.textContent = 'Ingresando…';
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { if (msg) msg.textContent = 'No se pudo iniciar sesión. Revisá correo y contraseña.'; return; }
      const profile = await getProfile();
      if (!profile) {
        await client.auth.signOut();
        if (msg) msg.textContent = 'Esta cuenta no tiene acceso al simulador.';
        return;
      }
      if (profile.role !== 'admin' && profile.access_active === false) {
        await client.auth.signOut();
        const until = profile.access_expires_at ? new Date(profile.access_expires_at).toLocaleString('es-PY',{dateStyle:'medium',timeStyle:'short'}) : '';
        if (msg) msg.textContent = `Tu acceso está vencido${until ? ` desde ${until}` : ''}. Contactá al administrador para renovarlo.`;
        return;
      }
      if (msg) msg.textContent = '';
      await openDashboard(profile);
    } catch (error) {
      console.error('robust sign in', error);
      if (msg) msg.textContent = 'No se pudo abrir el panel. Intentá nuevamente.';
    } finally { if (btn) btn.disabled = false; }
  }

  async function activateCandidateAccount() {
    ensureActivationField();
    const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
    const password = document.getElementById('password')?.value || '';
    const activationCode = (document.getElementById('activationCode')?.value || '').trim().toUpperCase();
    const msg = document.getElementById('authMsg');
    const btn = document.getElementById('signUpBtn');

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      if (msg) msg.textContent = 'Ingresá el correo autorizado y una contraseña de al menos 8 caracteres.';
      return;
    }
    if (!/^[A-F0-9]{8}$/.test(activationCode)) {
      if (msg) msg.textContent = 'Ingresá el código de activación de 8 caracteres entregado por el administrador.';
      return;
    }

    if (btn) btn.disabled = true;
    if (msg) msg.textContent = 'Activando cuenta…';
    try {
      const response = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/candidate-activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': window.APP_CONFIG.SUPABASE_KEY },
        body: JSON.stringify({ email, password, activationCode })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        const messages = {
          not_invited: 'Este correo no fue habilitado por el administrador.',
          candidate_already_active: 'Esta candidatura ya tiene una cuenta activa.',
          email_in_use: 'Este correo ya está vinculado a otra cuenta. Usá otro correo.',
          invalid_credentials: 'Revisá el correo, la contraseña y el código de activación.',
          invalid_code: 'El código de activación no es correcto.',
          code_expired: 'El código venció. Pedí al administrador que genere uno nuevo.',
          access_expired: 'El período de acceso ya venció. Pedí al administrador que lo renueve.',
          too_many_attempts: 'Se alcanzó el límite de intentos. Pedí un código nuevo.',
          candidate_inactive: 'Esta candidatura no está habilitada.'
        };
        if (msg) msg.textContent = messages[result?.reason] || 'No se pudo activar la cuenta.';
        return;
      }

      if (msg) msg.textContent = 'Cuenta activada. Iniciando sesión…';
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) { if (msg) msg.textContent = 'La cuenta quedó activada. Pulsá Ingresar para acceder.'; return; }
      const profile = await getProfile();
      if (!profile || profile.access_active === false) {
        await client.auth.signOut();
        if (msg) msg.textContent = 'La cuenta se activó, pero el período de acceso ya no está vigente.';
        return;
      }
      await openDashboard(profile);
    } catch (error) {
      console.error('candidate activation', error);
      if (msg) msg.textContent = 'No se pudo activar la cuenta. Intentá nuevamente.';
    } finally { if (btn) btn.disabled = false; }
  }

  document.addEventListener('click', (event) => {
    const signIn = event.target instanceof Element ? event.target.closest('#signInBtn') : null;
    if (signIn) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      robustSignIn(); return;
    }
    const activate = event.target instanceof Element ? event.target.closest('#signUpBtn') : null;
    if (!activate) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    activateCandidateAccount();
  }, true);

  function adjustCopy() {
    ensureActivationField();
    const btn = document.getElementById('signUpBtn');
    if (btn) btn.textContent = 'Activar cuenta';
    const auth = document.getElementById('authView');
    if (auth && !document.getElementById('noEmailVerificationHelp')) {
      const p = document.createElement('p');
      p.id = 'noEmailVerificationHelp';
      p.className = 'muted';
      p.textContent = 'Los candidatos activan su cuenta con el correo y el código entregados por el administrador. El acceso puede tener una fecha de vencimiento.';
      auth.querySelector('.card')?.appendChild(p);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adjustCopy);
  else adjustCopy();
})();
