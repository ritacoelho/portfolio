/* =========================================
   ADMIN MODE — rita-coelho portfolio
   =========================================
   • Login / logout via footer
   • Session stored in sessionStorage
   • Preview-as-public toggle
   • Inline editing on work / journey / about
   ========================================= */

(function () {
  'use strict';

  var SESSION_KEY    = 'rc_admin_token';
  var PREVIEW_KEY    = 'rc_admin_preview';
  var SESSION_ID_KEY = 'rc_session_id';

  // ── Session ID (for likes deduplication) ─────────────────────
  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  }
  window.__rcSessionId = getSessionId();

  // ── Token helpers ─────────────────────────────────────────────
  function getToken()        { return sessionStorage.getItem(SESSION_KEY); }
  function setToken(t)       { sessionStorage.setItem(SESSION_KEY, t); }
  function clearToken()      { sessionStorage.removeItem(SESSION_KEY); }
  function isAdminLoggedIn() { return !!getToken(); }

  function isPreviewMode() {
    return sessionStorage.getItem(PREVIEW_KEY) === '1';
  }
  function setPreviewMode(on) {
    if (on) sessionStorage.setItem(PREVIEW_KEY, '1');
    else sessionStorage.removeItem(PREVIEW_KEY);
  }

  // ── Verify token on load ──────────────────────────────────────
  async function verifySession() {
    var token = getToken();
    if (!token) { return false; }
    try {
      var r = await fetch('/api/admin/verify', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!r.ok) { clearToken(); return false; }
      return true;
    } catch {
      return false;
    }
  }

  // ── Login ─────────────────────────────────────────────────────
  async function login(password) {
    var r = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password })
    });
    var data = await r.json();
    if (r.ok && data.token) {
      setToken(data.token);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Login failed' };
  }

  function logout() {
    clearToken();
    setPreviewMode(false);
    disableAdminMode();
    updateFooterLink();
  }

  // ── Admin mode UI ─────────────────────────────────────────────
  function enableAdminMode() {
    document.body.classList.add('is-admin');
    if (isPreviewMode()) {
      document.body.classList.add('admin-preview');
    }
    injectAdminBar();
    initInlineEditing();
    window.dispatchEvent(new CustomEvent('rc-admin-enabled'));
  }

  function disableAdminMode() {
    document.body.classList.remove('is-admin', 'admin-preview');
    var bar = document.getElementById('rc-admin-bar');
    if (bar) { bar.remove(); }
  }

  // ── Admin bar ─────────────────────────────────────────────────
  function injectAdminBar() {
    if (document.getElementById('rc-admin-bar')) { return; }

    var bar = document.createElement('div');
    bar.id        = 'rc-admin-bar';
    bar.innerHTML = [
      '<span class="rc-admin-bar__label">',
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">',
          '<rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>',
          '<path d="M4.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
        '</svg>',
        'Admin',
      '</span>',
      '<label class="rc-admin-bar__toggle" title="Preview as public user">',
        '<input type="checkbox" id="rc-preview-toggle"' + (isPreviewMode() ? ' checked' : '') + '>',
        '<span>Preview public</span>',
      '</label>',
      isOnPage('admin/access-codes.html') ? '' :
        '<a class="rc-admin-bar__link" href="/admin/access-codes.html">Access codes</a>',
      '<button class="rc-admin-bar__logout" id="rc-logout">Log out</button>'
    ].join('');

    document.body.insertBefore(bar, document.body.firstChild);

    document.getElementById('rc-logout').addEventListener('click', logout);

    var toggle = document.getElementById('rc-preview-toggle');
    toggle.addEventListener('change', function () {
      setPreviewMode(toggle.checked);
      document.body.classList.toggle('admin-preview', toggle.checked);
    });
  }

  function isOnPage(fragment) {
    return window.location.pathname.includes(fragment);
  }

  // ── Login modal ───────────────────────────────────────────────
  function showLoginModal() {
    var overlay = document.createElement('div');
    overlay.id  = 'rc-login-overlay';
    overlay.innerHTML = [
      '<div class="rc-login-card">',
        '<button class="rc-login-close" id="rc-login-close" aria-label="Close">',
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">',
            '<path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
          '</svg>',
        '</button>',
        '<h2 class="rc-login-title">Admin login</h2>',
        '<form id="rc-login-form" autocomplete="off">',
          '<input class="rc-login-input" type="password" id="rc-login-pw" ',
            'placeholder="Password" autocomplete="current-password" required>',
          '<p class="rc-login-error" id="rc-login-error" aria-live="polite"></p>',
          '<button class="rc-login-btn" type="submit">Log in</button>',
        '</form>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    var form  = document.getElementById('rc-login-form');
    var errEl = document.getElementById('rc-login-error');
    var input = document.getElementById('rc-login-pw');

    setTimeout(function () { input.focus(); }, 50);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled      = true;
      btn.textContent   = 'Logging in…';
      errEl.textContent = '';

      var result = await login(input.value);
      if (result.ok) {
        overlay.remove();
        enableAdminMode();
        updateFooterLink();
      } else {
        errEl.textContent = result.error;
        input.value       = '';
        input.focus();
      }
      btn.disabled    = false;
      btn.textContent = 'Log in';
    });

    document.getElementById('rc-login-close').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { overlay.remove(); }
    });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });
  }

  // ── Footer link ───────────────────────────────────────────────
  function updateFooterLink() {
    var el = document.getElementById('rc-admin-footer-link');
    if (!el) { return; }
    if (isAdminLoggedIn()) {
      el.textContent = 'Log out';
      el.title       = 'Exit admin mode';
    } else {
      el.textContent = '·';
      el.title       = 'Admin login';
    }
  }

  function injectFooterLink() {
    var easter = document.querySelector('.footer__easter');
    if (!easter) { return; }

    var link = document.createElement('button');
    link.id        = 'rc-admin-footer-link';
    link.className = 'rc-admin-footer-btn';
    link.setAttribute('aria-label', 'Admin');
    link.title     = 'Admin login';
    link.textContent = '·';

    easter.appendChild(link);
    updateFooterLink();

    link.addEventListener('click', function () {
      if (isAdminLoggedIn()) {
        logout();
      } else {
        showLoginModal();
      }
    });
  }

  // ── Inline editing ────────────────────────────────────────────
  function initInlineEditing() {
    if (isPreviewMode()) { return; }

    // Make editable text nodes contenteditable
    document.querySelectorAll('[data-editable]').forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      el.classList.add('rc-editable');
      el.addEventListener('blur', function () {
        saveEdit(el.dataset.editable, el.innerHTML.trim());
      });
    });

    // Show hide/delete controls on project cards
    document.querySelectorAll('.project-card').forEach(function (card) {
      injectCardAdminControls(card);
    });

    // Show hide/delete controls on timeline items
    document.querySelectorAll('.timeline__item').forEach(function (item) {
      injectTimelineAdminControls(item);
    });
  }

  function saveEdit(key, value) {
    var token = getToken();
    if (!token) { return; }
    // Persist to localStorage as a lightweight local store
    // (replace with KV API call in future enhancement)
    try {
      var edits = JSON.parse(localStorage.getItem('rc_content_edits') || '{}');
      edits[key] = value;
      localStorage.setItem('rc_content_edits', JSON.stringify(edits));
    } catch (e) {}
  }

  function injectCardAdminControls(card) {
    if (card.querySelector('.rc-card-admin')) { return; }
    var controls = document.createElement('div');
    controls.className = 'rc-card-admin';
    controls.innerHTML = [
      '<button class="rc-card-admin__btn rc-card-admin__hide" title="Hide from public">',
        'Hide',
      '</button>',
    ].join('');

    controls.querySelector('.rc-card-admin__hide').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var hidden = card.dataset.adminHidden === '1';
      card.dataset.adminHidden = hidden ? '0' : '1';
      card.classList.toggle('rc-hidden-card', !hidden);
      this.textContent = hidden ? 'Hide' : 'Show';
    });

    card.appendChild(controls);
  }

  function injectTimelineAdminControls(item) {
    if (item.querySelector('.rc-timeline-admin')) { return; }
    var controls = document.createElement('div');
    controls.className = 'rc-timeline-admin';
    controls.innerHTML = [
      '<button class="rc-timeline-admin__btn" title="Hide entry">Hide</button>',
    ].join('');

    controls.querySelector('button').addEventListener('click', function () {
      var hidden = item.dataset.adminHidden === '1';
      item.dataset.adminHidden = hidden ? '0' : '1';
      item.style.opacity = hidden ? '' : '0.35';
      this.textContent = hidden ? 'Hide' : 'Show';
    });

    item.appendChild(controls);
  }

  // ── Likes via API ─────────────────────────────────────────────
  window.__rcLike = async function (slug) {
    try {
      var r = await fetch('/api/likes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, sessionId: window.__rcSessionId })
      });
      var data = await r.json();
      return data;
    } catch {
      return null;
    }
  };

  window.__rcGetLikes = async function (slug) {
    try {
      var r    = await fetch('/api/likes?slug=' + encodeURIComponent(slug));
      var data = await r.json();
      return data.count || 0;
    } catch {
      return 0;
    }
  };

  // ── Init ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    injectFooterLink();

    var valid = await verifySession();
    if (valid) {
      enableAdminMode();
      updateFooterLink();
    }
  });

})();
