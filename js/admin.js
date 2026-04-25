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

  // ── Confirm modal ─────────────────────────────────────────────
  function showConfirm(msg, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'rc-confirm-overlay';
    overlay.innerHTML = [
      '<div class="rc-confirm-card">',
        '<p class="rc-confirm-title">Are you sure?</p>',
        '<p class="rc-confirm-msg">' + msg + '</p>',
        '<div class="rc-confirm-actions">',
          '<button class="ac-btn ac-btn--ghost" id="rc-confirm-cancel">Cancel</button>',
          '<button class="ac-btn ac-btn--danger" id="rc-confirm-ok">Delete</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    document.getElementById('rc-confirm-cancel').onclick = function () { overlay.remove(); };
    document.getElementById('rc-confirm-ok').onclick = function () { overlay.remove(); onConfirm(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { overlay.remove(); } });
  }
  window.__rcShowConfirm = showConfirm;

  // ── Admin mode UI ─────────────────────────────────────────────
  function enableAdminMode() {
    document.body.classList.add('is-admin');
    if (isPreviewMode()) {
      document.body.classList.add('admin-preview');
    }
    injectAdminBar();
    initInlineEditing();
    addCtxMenuAdminItems();
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
      '<button class="rc-admin-bar__link" id="rc-ac-btn">Access codes</button>',
      '<button class="rc-admin-bar__logout" id="rc-logout">Log out</button>'
    ].join('');

    document.body.insertBefore(bar, document.body.firstChild);

    document.getElementById('rc-logout').addEventListener('click', logout);

    var toggle = document.getElementById('rc-preview-toggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        setPreviewMode(toggle.checked);
        document.body.classList.toggle('admin-preview', toggle.checked);
      });
    }

    var acBtn = document.getElementById('rc-ac-btn');
    if (acBtn) { acBtn.addEventListener('click', showAccessCodesModal); }
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
    // Footer link is always just a discrete dot — no text change needed
  }

  function injectFooterLink() {
    var easter = document.querySelector('.footer__easter');
    if (!easter) { return; }

    var link = document.createElement('button');
    link.id        = 'rc-admin-footer-link';
    link.className = 'rc-admin-footer-btn';
    link.setAttribute('aria-label', 'Admin login');
    link.title     = '';
    link.textContent = '·';

    easter.appendChild(link);

    link.addEventListener('click', function () {
      if (isAdminLoggedIn()) {
        // Already logged in — do nothing (logout is in the admin bar)
        return;
      }
      showLoginModal();
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

    // Show hide/delete controls on project cards (populated dynamically via __rcInitCards)
    window.__rcInitCards = function () {
      if (!isAdminLoggedIn() || isPreviewMode()) { return; }
      document.querySelectorAll('.project-card').forEach(function (card) {
        injectCardAdminControls(card);
      });
    };

    // About page: inject edit button
    if (document.querySelector('.about-bio')) {
      injectAboutEditButton();
    }

  }

  function saveEdit(key, value) {
    var token = getToken();
    if (!token) { return; }
    try {
      var edits = JSON.parse(localStorage.getItem('rc_content_edits') || '{}');
      edits[key] = value;
      localStorage.setItem('rc_content_edits', JSON.stringify(edits));
    } catch (e) {}
  }

  // ── About page inline edit ─────────────────────────────────────
  function injectAboutEditButton() {
    if (document.getElementById('rc-about-edit-btn')) { return; }

    var SVG_EDIT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var SVG_SAVE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // Edit FAB (shown when not editing)
    var btn = document.createElement('button');
    btn.id        = 'rc-about-edit-btn';
    btn.className = 'rc-about-edit-btn is-admin-only';
    btn.innerHTML = SVG_EDIT + ' Edit page';
    document.body.appendChild(btn);

    // Save bar: Cancel + Save changes (shown when editing)
    var saveBar = document.createElement('div');
    saveBar.id        = 'rc-about-save-bar';
    saveBar.className = 'rc-about-save-bar';
    saveBar.innerHTML =
      '<button class="rc-edit-cancel-btn" id="rc-about-cancel-btn">Cancel</button>' +
      '<button class="rc-edit-save-btn"   id="rc-about-save-btn">' + SVG_SAVE + ' Save changes</button>';
    document.body.appendChild(saveBar);

    var _snapshot = {};

    function enterEdit() {
      _snapshot = {};
      document.querySelectorAll('[data-about-field]').forEach(function (el) {
        _snapshot[el.dataset.aboutField] = el.innerHTML;
        el.contentEditable = 'true';
      });
      document.body.classList.add('about-edit-mode');
    }

    function exitEdit() {
      document.querySelectorAll('[data-about-field]').forEach(function (el) {
        el.contentEditable = 'false';
      });
      document.body.classList.remove('about-edit-mode');
    }

    btn.addEventListener('click', enterEdit);

    document.getElementById('rc-about-cancel-btn').addEventListener('click', function () {
      document.querySelectorAll('[data-about-field]').forEach(function (el) {
        var key = el.dataset.aboutField;
        if (_snapshot[key] !== undefined) { el.innerHTML = _snapshot[key]; }
      });
      exitEdit();
    });

    document.getElementById('rc-about-save-btn').addEventListener('click', function () {
      exitEdit();
      saveAboutContent();
    });
  }

  async function saveAboutContent() {
    var token  = getToken();
    var fields = {};
    document.querySelectorAll('[data-about-field]').forEach(function (el) {
      fields[el.dataset.aboutField] = el.innerHTML.trim();
    });
    try {
      await fetch('/api/about', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body:    JSON.stringify(fields),
      });
      showToast('About page saved');
    } catch (e) {
      showToast('Save failed — changes kept locally');
    }
  }

  // ── Context menu admin extension ──────────────────────────────
  function addCtxMenuAdminItems() {
    var menu = document.getElementById('ctx-menu');
    if (!menu || menu.querySelector('.ctx-admin-only')) { return; }

    var SVG_EYE_OFF = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2.5 2.5 0 0 0 9.3 9.5M4.2 4.4C3 5.3 2 6.6 1.5 8c1 2.8 3.8 5 6.5 5 1.1 0 2.2-.3 3.1-.8M6 3.2A6.7 6.7 0 0 1 8 3c2.7 0 5.5 2.2 6.5 5-.4 1.1-1 2-1.8 2.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var SVG_EYE_ON  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C2.5 5.2 5.3 3 8 3s5.5 2.2 6.5 5c-1 2.8-3.8 5-6.5 5S2.5 10.8 1.5 8Z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>';
    var SVG_LOCK    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var SVG_UNLOCK  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    function makeAdminOpt(action, icon, label) {
      var div = document.createElement('div');
      div.className  = 'ctx-option ctx-admin-only';
      div.dataset.action = action;
      div.innerHTML  =
        '<button class="ctx-option__btn" aria-label="' + label + '">' + icon + '</button>' +
        '<span class="ctx-option__label" id="ctx-admin-label-' + action + '">' + label + '</span>';
      return div;
    }

    var hideOpt = makeAdminOpt('admin-hide', SVG_EYE_OFF, 'Hide');
    var lockOpt = makeAdminOpt('admin-lock', SVG_LOCK,    'Lock');

    menu.appendChild(hideOpt);
    menu.appendChild(lockOpt);

    // Sync hide + lock labels/icons when menu opens
    window.__rcOnCtxOpen = function (item) {
      var isHidden = item && item.dataset.adminHidden === '1';
      var isLocked = item && item.dataset.isLocked    === '1';

      var hideLabelEl = document.getElementById('ctx-admin-label-admin-hide');
      var hideBtn     = hideOpt.querySelector('button');
      if (hideLabelEl) { hideLabelEl.textContent = isHidden ? 'Show' : 'Hide'; }
      if (hideBtn)     { hideBtn.innerHTML = isHidden ? SVG_EYE_ON : SVG_EYE_OFF;
                         hideBtn.setAttribute('aria-label', isHidden ? 'Show' : 'Hide'); }

      var lockLabelEl = document.getElementById('ctx-admin-label-admin-lock');
      var lockBtn     = lockOpt.querySelector('button');
      if (lockLabelEl) { lockLabelEl.textContent = isLocked ? 'Unlock' : 'Lock'; }
      if (lockBtn)     { lockBtn.innerHTML = isLocked ? SVG_UNLOCK : SVG_LOCK;
                         lockBtn.setAttribute('aria-label', isLocked ? 'Unlock' : 'Lock'); }
    };

    function getActiveItem() { return window.__rcActiveCard || null; }

    // ── Hide / Show ──
    hideOpt.querySelector('button').addEventListener('click', async function () {
      var item   = getActiveItem(); if (!item) { return; }
      var type   = item.dataset.ctxType || 'project';
      var hidden = item.dataset.adminHidden === '1';
      var token  = getToken();
      var newHidden = !hidden;

      try {
        if (type === 'journey') {
          await fetch('/api/journey', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body:    JSON.stringify({ id: item.dataset.id, isHidden: newHidden }),
          });
          item.dataset.adminHidden = newHidden ? '1' : '0';
          item.classList.toggle('rc-hidden-entry', newHidden);
        } else {
          await fetch('/api/projects', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body:    JSON.stringify({ slug: item.dataset.slug, isHidden: newHidden }),
          });
          item.dataset.adminHidden = newHidden ? '1' : '0';
          item.classList.toggle('rc-hidden-card', newHidden);
        }
        showToast(newHidden ? 'Hidden from public' : 'Now visible to public');
      } catch (e) { showToast('Could not update visibility'); }

      if (typeof window.__rcCloseCtxMenu === 'function') { window.__rcCloseCtxMenu(); }
    });

    // ── Lock / Unlock ──
    lockOpt.querySelector('button').addEventListener('click', async function () {
      var item     = getActiveItem(); if (!item) { return; }
      var type     = item.dataset.ctxType || 'project';
      if (type === 'journey') {
        // Lock doesn't apply to journey entries
        showToast('Lock is for projects only');
        if (typeof window.__rcCloseCtxMenu === 'function') { window.__rcCloseCtxMenu(); }
        return;
      }
      var isLocked = item.dataset.isLocked === '1';
      var newLocked = !isLocked;
      var token    = getToken();
      try {
        await fetch('/api/projects', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body:    JSON.stringify({ slug: item.dataset.slug, isLocked: newLocked }),
        });
        item.dataset.isLocked = newLocked ? '1' : '0';
        showToast(newLocked ? 'Project locked (NDA)' : 'Project unlocked');
      } catch (e) { showToast('Could not update lock'); }
      if (typeof window.__rcCloseCtxMenu === 'function') { window.__rcCloseCtxMenu(); }
    });

  }

  function showToast(msg) {
    var t = document.createElement('div'); t.className = 'rc-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }

  function injectCardAdminControls(card) {
    // Card admin actions are now in the context menu — nothing extra needed on the card itself
  }

  // ── Access Codes Modal ────────────────────────────────────────
  function showAccessCodesModal() {
    if (document.getElementById('rc-ac-overlay')) { return; }

    var SVG_CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

    var overlay = document.createElement('div');
    overlay.id        = 'rc-ac-overlay';
    overlay.className = 'rc-modal-overlay';
    overlay.innerHTML = [
      '<div class="rc-modal-card rc-ac-card">',
        '<button class="rc-modal-close" id="rc-ac-close" aria-label="Close">' + SVG_CLOSE + '</button>',
        '<h2 class="rc-modal-title">Access Codes</h2>',
        '<p class="ac-page__subtitle">Manage access codes for protected content on the portfolio.</p>',
        '<div class="ac-create">',
          '<p class="ac-create__title">Generate new code</p>',
          '<form class="ac-form" id="rc-ac-form" autocomplete="off">',
            '<div class="ac-form__field">',
              '<label class="ac-form__label" for="rc-ac-recipient">Recipient *</label>',
              '<input class="ac-form__input" type="text" id="rc-ac-recipient" placeholder="e.g. Jane Smith / Google" required>',
            '</div>',
            '<div class="ac-form__field">',
              '<label class="ac-form__label" for="rc-ac-expiry">Expiry date (optional)</label>',
              '<input class="ac-form__input" type="date" id="rc-ac-expiry">',
            '</div>',
            '<div class="ac-form__field ac-form__field--full">',
              '<label class="ac-form__label" for="rc-ac-desc-input">Description (optional)</label>',
              '<input class="ac-form__input" type="text" id="rc-ac-desc-input" placeholder="e.g. Recruiter at Google — applied via LinkedIn">',
            '</div>',
            '<div class="ac-form__submit">',
              '<button class="ac-btn ac-btn--primary" type="submit" id="rc-ac-submit">Generate code</button>',
              '<span class="ac-create__status" id="rc-ac-status"></span>',
            '</div>',
          '</form>',
          '<div id="rc-ac-new-wrap" style="display:none;margin-top:1rem;">',
            '<p style="font-size:0.78rem;color:var(--muted);margin:0 0 0.5rem;">New code (click to copy):</p>',
            '<button class="ac-new-code" id="rc-ac-new-btn" type="button">',
              '<span id="rc-ac-new-val">—</span>',
              '<span class="ac-new-code__copy" id="rc-ac-copy-hint">Click to copy</span>',
            '</button>',
          '</div>',
        '</div>',
        '<div class="ac-table-wrap">',
          '<table class="ac-table">',
            '<thead><tr>',
              '<th>Code</th><th>Recipient</th><th>Description</th>',
              '<th>Status</th><th>Uses</th><th>Last used</th><th>Expires</th><th>Actions</th>',
            '</tr></thead>',
            '<tbody id="rc-ac-tbody"><tr><td colspan="8" class="ac-loading">Loading…</td></tr></tbody>',
          '</table>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    document.getElementById('rc-ac-close').addEventListener('click', hideAccessCodesModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { hideAccessCodesModal(); }
    });

    var escHandler = function (e) {
      if (e.key === 'Escape') { hideAccessCodesModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    var newBtn = document.getElementById('rc-ac-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', function () {
        var val  = document.getElementById('rc-ac-new-val');
        var hint = document.getElementById('rc-ac-copy-hint');
        if (val) { acCopyText(val.textContent); }
        if (hint) {
          hint.textContent = 'Copied!';
          setTimeout(function () { hint.textContent = 'Click to copy'; }, 1800);
        }
      });
    }

    var form = document.getElementById('rc-ac-form');
    if (form) { form.addEventListener('submit', acHandleCreate); }

    acLoadCodes();
  }

  function hideAccessCodesModal() {
    var overlay = document.getElementById('rc-ac-overlay');
    if (overlay) { overlay.remove(); }
  }

  function acAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken() || '') };
  }

  function acCopyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
    }
  }

  function acFormatDate(iso) {
    if (!iso) { return '—'; }
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function acStatusBadge(entry) {
    var now = new Date();
    if (!entry.isActive) {
      return '<span class="ac-status-badge ac-status-badge--inactive">Inactive</span>';
    }
    if (entry.expiryDate && new Date(entry.expiryDate) < now) {
      return '<span class="ac-status-badge ac-status-badge--expired">Expired</span>';
    }
    return '<span class="ac-status-badge ac-status-badge--active">Active</span>';
  }

  function acEscHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function acLoadCodes() {
    var tbody = document.getElementById('rc-ac-tbody');
    if (!tbody) { return; }
    tbody.innerHTML = '<tr><td colspan="8" class="ac-loading">Loading…</td></tr>';
    try {
      var r = await fetch('/api/access-codes', { headers: acAuthHeaders() });
      if (r.status === 401) { hideAccessCodesModal(); return; }
      var data = await r.json();
      acRenderTable(data);
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" class="ac-empty">Failed to load codes. Check your connection.</td></tr>';
    }
  }

  function acRenderTable(entries) {
    var tbody = document.getElementById('rc-ac-tbody');
    if (!tbody) { return; }
    if (!entries || !entries.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="ac-empty">No codes yet. Generate one above.</td></tr>';
      return;
    }

    var SVG_COPY       = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="5" y="5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M9 5V3.5A1.5 1.5 0 0 0 7.5 2h-4A1.5 1.5 0 0 0 2 3.5v4A1.5 1.5 0 0 0 3.5 9H5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    var SVG_ACTIVATE   = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var SVG_DEACTIVATE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var SVG_DELETE     = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5h11M4.5 3.5V2.5A.5.5 0 0 1 5 2h4a.5.5 0 0 1 .5.5V3.5M5.5 6.5v3M8.5 6.5v3M2.5 3.5l.8 8.1A.5.5 0 0 0 3.8 12h6.4a.5.5 0 0 0 .5-.4l.8-8.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    tbody.innerHTML = '';
    entries.forEach(function (entry) {
      var tr = document.createElement('tr');
      tr.innerHTML = [
        '<td><button class="ac-code-pill" data-copy="' + acEscHtml(entry.code) + '" title="Click to copy">' + acEscHtml(entry.code) + '</button></td>',
        '<td>' + acEscHtml(entry.recipient || '—') + '</td>',
        '<td><span class="ac-desc-editable" contenteditable="true" data-code="' + acEscHtml(entry.code) + '" title="Click to edit">' + acEscHtml(entry.description || '') + '</span></td>',
        '<td>' + acStatusBadge(entry) + '</td>',
        '<td>' + (entry.usageCount || 0) + '</td>',
        '<td>' + acFormatDate(entry.lastUsedAt) + '</td>',
        '<td>' + acFormatDate(entry.expiryDate) + '</td>',
        '<td><div class="ac-table__actions">',
          '<button class="ac-icon-btn" data-action="copy-code" data-code="' + acEscHtml(entry.code) + '" data-tooltip="Copy code" aria-label="Copy code">' + SVG_COPY + '</button>',
          entry.isActive
            ? '<button class="ac-icon-btn ac-icon-btn--active" data-action="deactivate" data-code="' + acEscHtml(entry.code) + '" data-tooltip="Deactivate" aria-label="Deactivate">' + SVG_DEACTIVATE + '</button>'
            : '<button class="ac-icon-btn" data-action="activate" data-code="' + acEscHtml(entry.code) + '" data-tooltip="Activate" aria-label="Activate">' + SVG_ACTIVATE + '</button>',
          '<button class="ac-icon-btn ac-icon-btn--danger" data-action="delete" data-code="' + acEscHtml(entry.code) + '" data-tooltip="Delete" aria-label="Delete">' + SVG_DELETE + '</button>',
        '</div></td>'
      ].join('');
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        acCopyText(btn.dataset.copy);
        showToast('Copied ' + btn.dataset.copy);
      });
    });

    tbody.querySelectorAll('.ac-desc-editable').forEach(function (el) {
      el.addEventListener('blur', async function () {
        var code = el.dataset.code;
        var desc = el.textContent.trim();
        try {
          await fetch('/api/access-codes', {
            method: 'PATCH', headers: acAuthHeaders(),
            body: JSON.stringify({ code: code, description: desc })
          });
        } catch (e) { showToast('Could not save description'); }
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
    });

    tbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var code   = btn.dataset.code;
        if (action === 'copy-code')  { acCopyText(code); showToast('Copied ' + code); }
        if (action === 'deactivate') { acToggleActive(code, false); }
        if (action === 'activate')   { acToggleActive(code, true); }
        if (action === 'delete')     { acDeleteCode(code); }
      });
    });
  }

  async function acToggleActive(code, isActive) {
    try {
      await fetch('/api/access-codes', {
        method: 'PATCH', headers: acAuthHeaders(),
        body: JSON.stringify({ code: code, isActive: isActive })
      });
      showToast(isActive ? 'Code activated' : 'Code deactivated');
      acLoadCodes();
    } catch (e) { showToast('Error updating code'); }
  }

  function acDeleteCode(code) {
    showConfirm('Delete access code ' + code + '? This cannot be undone.', async function () {
      try {
        await fetch('/api/access-codes', {
          method: 'DELETE', headers: acAuthHeaders(),
          body: JSON.stringify({ code: code })
        });
        showToast('Code deleted');
        acLoadCodes();
      } catch (e) { showToast('Error deleting code'); }
    });
  }

  async function acHandleCreate(e) {
    e.preventDefault();
    var recipient = document.getElementById('rc-ac-recipient');
    var expiry    = document.getElementById('rc-ac-expiry');
    var desc      = document.getElementById('rc-ac-desc-input');
    var submitBtn = document.getElementById('rc-ac-submit');
    var statusEl  = document.getElementById('rc-ac-status');
    var newWrap   = document.getElementById('rc-ac-new-wrap');
    var newVal    = document.getElementById('rc-ac-new-val');
    var copyHint  = document.getElementById('rc-ac-copy-hint');

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Generating…';
    statusEl.textContent  = '';
    statusEl.className    = 'ac-create__status';
    if (newWrap) { newWrap.style.display = 'none'; }

    try {
      var r = await fetch('/api/access-codes', {
        method:  'POST',
        headers: acAuthHeaders(),
        body:    JSON.stringify({
          recipient:   recipient ? recipient.value.trim() : '',
          description: desc      ? desc.value.trim()      : '',
          expiryDate:  expiry && expiry.value ? expiry.value : null
        })
      });
      var data = await r.json();

      if (r.ok && data.code) {
        statusEl.textContent = 'Code created successfully';
        statusEl.className   = 'ac-create__status is-success';
        if (newVal)   { newVal.textContent    = data.code; }
        if (newWrap)  { newWrap.style.display = 'block'; }
        if (copyHint) { copyHint.textContent  = 'Click to copy'; }
        e.target.reset();
        acLoadCodes();
      } else {
        statusEl.textContent = data.error || 'Failed to create code';
        statusEl.className   = 'ac-create__status is-error';
      }
    } catch (err) {
      statusEl.textContent = 'Error — check connection';
      statusEl.className   = 'ac-create__status is-error';
    }

    submitBtn.disabled    = false;
    submitBtn.textContent = 'Generate code';
  }

  function injectTimelineCtxTrigger(item) {
    if (item.querySelector('.timeline-ctx-trigger')) { return; }
    // Mark as journey type so admin actions know which API to call
    item.dataset.ctxType = 'journey';

    var btn = document.createElement('button');
    btn.className = 'timeline-ctx-trigger ctx-trigger';
    btn.setAttribute('aria-label', 'Entry actions');
    // No innerHTML — diamond visual comes from .ctx-trigger::before (consistent with project cards)
    item.appendChild(btn);

    // Wire up immediately via main.js helper if available
    if (typeof window.__rcInitCtx === 'function') { window.__rcInitCtx(); }
  }

  // ── Expose timeline init hook for journey.html ─────────────────
  window.__rcInitTimeline = function () {
    if (!isAdminLoggedIn() || isPreviewMode()) { return; }
    document.querySelectorAll('.timeline__item').forEach(function (item) {
      injectTimelineCtxTrigger(item);
    });
  };

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
