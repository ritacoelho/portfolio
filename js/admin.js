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
      isOnPage('admin/access-codes.html') ? '' : [
        '<label class="rc-admin-bar__toggle" title="Preview as public user">',
          '<input type="checkbox" id="rc-preview-toggle"' + (isPreviewMode() ? ' checked' : '') + '>',
          '<span>Preview public</span>',
        '</label>',
        '<a class="rc-admin-bar__link" href="/admin/access-codes.html">Access codes</a>'
      ].join(''),
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
    var btn = document.createElement('button');
    btn.id        = 'rc-about-edit-btn';
    btn.className = 'rc-about-edit-btn is-admin-only';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg> Edit page';
    document.body.appendChild(btn);

    var editing = false;
    btn.addEventListener('click', function () {
      editing = !editing;
      document.body.classList.toggle('about-edit-mode', editing);
      btn.innerHTML = editing
        ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Save changes'
        : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg> Edit page';

      document.querySelectorAll('[data-about-field]').forEach(function (el) {
        el.contentEditable = editing ? 'true' : 'false';
      });

      if (!editing) {
        saveAboutContent();
      }
    });
  }

  async function saveAboutContent() {
    var token  = getToken();
    var fields = {};
    document.querySelectorAll('[data-about-field]').forEach(function (el) {
      fields[el.dataset.aboutField] = el.innerHTML.trim();
    });
    // Include photo strip URLs so they persist across page loads
    if (typeof window.__rcGetAboutPhotos === 'function') {
      fields.photos = window.__rcGetAboutPhotos();
    }
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

    var SVG_EDIT    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var SVG_EYE_OFF = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2.5 2.5 0 0 0 9.3 9.5M4.2 4.4C3 5.3 2 6.6 1.5 8c1 2.8 3.8 5 6.5 5 1.1 0 2.2-.3 3.1-.8M6 3.2A6.7 6.7 0 0 1 8 3c2.7 0 5.5 2.2 6.5 5-.4 1.1-1 2-1.8 2.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var SVG_EYE_ON  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C2.5 5.2 5.3 3 8 3s5.5 2.2 6.5 5c-1 2.8-3.8 5-6.5 5S2.5 10.8 1.5 8Z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>';
    var SVG_LOCK    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var SVG_UNLOCK  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var SVG_TRASH   = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5L13 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function makeAdminOpt(action, icon, label) {
      var div = document.createElement('div');
      div.className  = 'ctx-option ctx-admin-only';
      div.dataset.action = action;
      div.innerHTML  =
        '<button class="ctx-option__btn" aria-label="' + label + '">' + icon + '</button>' +
        '<span class="ctx-option__label" id="ctx-admin-label-' + action + '">' + label + '</span>';
      return div;
    }

    var editOpt   = makeAdminOpt('admin-edit',   SVG_EDIT,   'Edit');
    var hideOpt   = makeAdminOpt('admin-hide',   SVG_EYE_OFF,'Hide');
    var lockOpt   = makeAdminOpt('admin-lock',   SVG_LOCK,   'Lock');
    var deleteOpt = makeAdminOpt('admin-delete', SVG_TRASH,  'Delete');

    menu.appendChild(editOpt);
    menu.appendChild(hideOpt);
    menu.appendChild(lockOpt);
    menu.appendChild(deleteOpt);

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

    // ── Edit ──
    editOpt.querySelector('button').addEventListener('click', function () {
      var item = getActiveItem(); if (!item) { return; }
      var type = item.dataset.ctxType || 'project';
      if (type === 'journey') {
        var id = item.dataset.id;
        if (id) { window.dispatchEvent(new CustomEvent('rc-journey-edit', { detail: { id: id } })); }
      } else {
        var slug = item.dataset.slug;
        var isOnProjectPage = window.location.pathname.includes('projects/view');
        if (isOnProjectPage) {
          // Already on project page — toggle edit mode in-place
          window.dispatchEvent(new CustomEvent('rc-project-edit-start'));
        } else if (slug) {
          // Navigate to project page with edit flag so it auto-enters edit mode
          window.location.href = 'projects/view.html?slug=' + encodeURIComponent(slug) + '&edit=1';
        }
      }
      if (typeof window.__rcCloseCtxMenu === 'function') { window.__rcCloseCtxMenu(); }
    });

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

    // ── Delete ──
    deleteOpt.querySelector('button').addEventListener('click', function () {
      var item  = getActiveItem(); if (!item) { return; }
      var type  = item.dataset.ctxType || 'project';
      var label = (item.querySelector('.timeline__title, .project-card__title a') || {}).textContent
                  || item.dataset.title || item.dataset.slug || item.dataset.id || 'this item';
      showConfirm('Deleting <strong>"' + label.trim() + '"</strong> is permanent and cannot be undone.',
        async function () {
          var token = getToken();
          var r;
          if (type === 'journey') {
            r = await fetch('/api/journey', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body:   JSON.stringify({ id: item.dataset.id }),
            });
          } else {
            r = await fetch('/api/projects', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body:   JSON.stringify({ slug: item.dataset.slug }),
            });
          }
          if (r && r.ok) {
            item.remove();
            showToast('Deleted');
            if (type === 'project' && window.location.pathname.includes('projects/view')) {
              window.location.href = '../work.html';
            }
          } else {
            showToast('Could not delete');
          }
        }
      );
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
