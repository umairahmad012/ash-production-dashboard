/* ==========================================================================
   Auth · Clerk sign-in gate + authenticated fetch wrapper

   Loads after Clerk.js (which auto-boots via its own <script> tag). Waits for
   Clerk to be ready, then:
     - if signed out      → mount the Clerk SignIn widget
     - if signed in       → call /api/me to check CRM authorization
         - authorized     → expose user, hide gate, resolve as authorized
         - not authorized → show "pending approval" state + sign-out button

   Exposes:
     Auth.user        { email, role, firstName, lastName, imageUrl } when authed
     Auth.init()      → { authorized: true|false }
     Auth.signOut()
     Auth.apiFetch(path, options)   fetch wrapper that sets Authorization + auto-retries on 401
========================================================================== */

const Auth = {
  user: null,
  _token: null,
  _refreshTimer: null,

  async init() {
    try {
      await this._waitForClerk();
      await window.Clerk.load();
    } catch (e) {
      this._showError('Auth library failed to load. Check your network.');
      return { authorized: false, reason: 'clerk-load-failed' };
    }

    // Clerk re-emits auth state changes; on sign-out we reload.
    window.Clerk.addListener(({ user }) => {
      if (!user && this.user) {
        // User signed out mid-session
        location.reload();
      }
    });

    if (!window.Clerk.user) {
      this._showSignIn();
      return { authorized: false, reason: 'signed-out' };
    }

    // Grab a session token and check server-side authorization
    try {
      this._token = await window.Clerk.session.getToken();
    } catch (e) {
      this._showError('Could not get session token: ' + e.message);
      return { authorized: false, reason: 'token-failed' };
    }

    let meResp;
    try {
      meResp = await fetch('/api/me', {
        headers: { Authorization: 'Bearer ' + this._token }
      });
    } catch (e) {
      this._showError('Server unreachable: ' + e.message);
      return { authorized: false, reason: 'network' };
    }

    if (meResp.status === 403) {
      const email = window.Clerk.user.primaryEmailAddress?.emailAddress || '(unknown)';
      this._showPending(email);
      return { authorized: false, reason: 'not-authorized' };
    }
    if (!meResp.ok) {
      this._showError('Authorization check failed: ' + meResp.status);
      return { authorized: false, reason: 'error' };
    }

    this.user = await meResp.json();
    this._scheduleTokenRefresh();
    this._showApp();
    return { authorized: true };
  },

  async signOut() {
    try { await window.Clerk.signOut(); } catch {}
    location.reload();
  },

  /**
   * Fetch wrapper that attaches Authorization. Retries once if server returns
   * 401 (token may have expired between our refresh cycles).
   */
  async apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', 'Bearer ' + this._token);
    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    let resp = await fetch(path, { ...options, headers });
    if (resp.status === 401) {
      try {
        this._token = await window.Clerk.session.getToken({ skipCache: true });
        headers.set('Authorization', 'Bearer ' + this._token);
        resp = await fetch(path, { ...options, headers });
      } catch {}
    }
    return resp;
  },

  // ─── private ─────────────────────────────────────────────────────────────

  _waitForClerk() {
    return new Promise((resolve, reject) => {
      if (window.Clerk && typeof window.Clerk.load === 'function') return resolve();
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        if (window.Clerk && typeof window.Clerk.load === 'function') {
          clearInterval(timer);
          resolve();
        } else if (tries > 200) {  // ~10s
          clearInterval(timer);
          reject(new Error('Clerk.js never loaded'));
        }
      }, 50);
    });
  },

  _scheduleTokenRefresh() {
    clearInterval(this._refreshTimer);
    // Clerk session tokens expire in 60s by default. Refresh every 50s.
    this._refreshTimer = setInterval(async () => {
      try {
        this._token = await window.Clerk.session.getToken({ skipCache: true });
      } catch (e) {
        console.warn('Token refresh failed', e);
      }
    }, 50_000);
  },

  _showSignIn() {
    document.body.classList.remove('is-auth-loading');
    document.body.classList.add('is-signed-out');
    document.getElementById('authLoading').hidden = true;
    document.getElementById('authSignIn').hidden = false;
    try {
      window.Clerk.mountSignIn(document.getElementById('clerkSignInSlot'), {
        appearance: {
          elements: { rootBox: 'ra-clerk-rootbox' }
        }
      });
    } catch (e) {
      this._showError('Sign-in widget failed: ' + e.message);
    }
  },

  _showPending(email) {
    document.body.classList.remove('is-auth-loading');
    document.body.classList.add('is-pending');
    document.getElementById('authLoading').hidden = true;
    document.getElementById('authPending').hidden = false;
    document.getElementById('authPendingEmail').textContent = email;
    document.getElementById('authSignOutBtn').addEventListener('click', () => this.signOut());
  },

  _showApp() {
    document.body.classList.remove('is-auth-loading');
    document.body.classList.add('is-signed-in');
  },

  _showError(message) {
    document.body.classList.remove('is-auth-loading');
    document.body.classList.add('is-auth-error');
    const loader = document.getElementById('authLoading');
    if (loader) {
      loader.innerHTML = `<div class="auth-gate__error">${message}</div>`;
      loader.hidden = false;
    }
  }
};

window.Auth = Auth;
