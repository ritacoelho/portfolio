/* =========================================
   RITA COELHO PORTFOLIO v2 — main.js
   =========================================
   1. Nav — scroll behaviour + mobile menu
   2. Typewriter effect (index.html)
   3. Per-project radial context menu (work.html)
   4. Toast notifications
   5. Scroll-triggered fade-up animations
   6. Journey timeline filter
   ========================================= */

(function () {
  'use strict';

  // ==================
  // 1. NAV
  // ==================
  var nav       = document.getElementById('nav');
  var menuBtn   = document.getElementById('menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var menuOpen  = false;

  if (nav) {
    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Active nav link — match current page filename
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(function (link) {
    var href     = link.getAttribute('href') || '';
    var linkPage = href.split('/').pop().split('#')[0];
    if (linkPage && linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  // Mobile menu open / close
  function openMenu() {
    menuOpen = true;
    if (mobileMenu) { mobileMenu.classList.add('open'); }
    if (menuBtn)    { menuBtn.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); }
    document.body.style.overflow = 'hidden';
    if (mobileMenu) {
      var first = mobileMenu.querySelector('a');
      if (first) { first.focus(); }
    }
  }

  function closeMenu() {
    menuOpen = false;
    if (mobileMenu) { mobileMenu.classList.remove('open'); }
    if (menuBtn)    { menuBtn.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    document.body.style.overflow = '';
    if (menuBtn) { menuBtn.focus(); }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      menuOpen ? closeMenu() : openMenu();
    });
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) { closeMenu(); }
  });


  // ==================
  // 2. TYPEWRITER EFFECT
  // ==================
  var typedEl = document.getElementById('typed-role');
  if (typedEl) {
    var roles    = ['UX/UI Designer', 'Interaction Designer', 'Product Designer'];
    var roleIdx  = 0;
    var charIdx  = 0;
    var deleting = false;
    var pausing  = false;

    function typeStep() {
      if (pausing) { return; }
      var word = roles[roleIdx];
      if (!deleting) {
        charIdx++;
        typedEl.textContent = word.slice(0, charIdx);
        if (charIdx === word.length) {
          pausing = true;
          setTimeout(function () { pausing = false; deleting = true; typeStep(); }, 2200);
          return;
        }
      } else {
        charIdx--;
        typedEl.textContent = word.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          roleIdx  = (roleIdx + 1) % roles.length;
        }
      }
      setTimeout(typeStep, deleting ? 55 : 95);
    }
    setTimeout(typeStep, 700);
  }


  // ==================
  // 3. PER-PROJECT RADIAL CONTEXT MENU
  // ==================

  // Likes — in-memory cache, backed by KV API (via admin.js helpers)
  var _likesCache = {};

  function getLikeCount(slug) {
    return _likesCache[slug] || 0;
  }

  // Load like count from API and update context menu label
  function refreshLikeDisplay(slug) {
    var rcGetLikes = window.__rcGetLikes;
    if (!rcGetLikes || !slug) { return; }
    rcGetLikes(slug).then(function (count) {
      _likesCache[slug] = count;
      var loveOpt   = ctxMenu ? ctxMenu.querySelector('[data-action="show-love"]') : null;
      var activeSlug = ctxMenu && ctxMenu.dataset.activeSlug;
      if (loveOpt && activeSlug === slug) {
        var loveLabel = loveOpt.querySelector('.ctx-option__label');
        var loveBtn   = loveOpt.querySelector('.ctx-option__btn');
        if (loveLabel) { loveLabel.textContent = count > 0 ? 'Love \u00b7 ' + count : 'Love'; }
        if (loveBtn) {
          if (count > 0) { loveBtn.classList.add('liked'); }
          else           { loveBtn.classList.remove('liked'); }
        }
      }
    });
  }

  // SVG icons
  var SVG_EYE = [
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">',
      '<path d="M9 3.5C5.5 3.5 2.5 6 1.5 9c1 3 4 5.5 7.5 5.5s6.5-2.5 7.5-5.5C15.5 6 12.5 3.5 9 3.5Z"',
        ' stroke="currentColor" stroke-width="1.5"/>',
      '<circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>',
    '</svg>'
  ].join('');

  var SVG_LINK = [
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">',
      '<path d="M7.5 10.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"',
        ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '<path d="M10.5 7.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"',
        ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    '</svg>'
  ].join('');

  var SVG_HEART = [
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">',
      '<path d="M9 15s-6-4-6-8a4 4 0 0 1 6-3.46A4 4 0 0 1 15 7c0 4-6 8-6 8Z"',
        ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    '</svg>'
  ].join('');

  var SVG_MSG = [
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">',
      '<path d="M2 3h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3l-2 2V4a1 1 0 0 1 1-1Z"',
        ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    '</svg>'
  ].join('');

  // Build shared context menu DOM node
  var ctxMenu = document.getElementById('ctx-menu');
  if (!ctxMenu && document.querySelector('.ctx-trigger')) {

    ctxMenu = document.createElement('div');
    ctxMenu.id        = 'ctx-menu';
    ctxMenu.className = 'ctx-menu';
    ctxMenu.setAttribute('role', 'menu');
    ctxMenu.setAttribute('aria-label', 'Project actions');

    function makeOption(action, icon, label, extraClass) {
      return [
        '<div class="ctx-option" data-action="', action, '">',
          '<button class="ctx-option__btn', extraClass ? ' ' + extraClass : '', '"',
            ' aria-label="', label, '">',
            icon,
          '</button>',
          '<span class="ctx-option__label">', label, '</span>',
        '</div>'
      ].join('');
    }

    ctxMenu.innerHTML = [
      makeOption('inspect',   SVG_EYE,   'Inspect'),
      makeOption('copy-link', SVG_LINK,  'Copy link'),
      makeOption('show-love', SVG_HEART, 'Love', 'ctx-option__btn--love'),
      makeOption('enquire',   SVG_MSG,   'Enquire'),
    ].join('');

    document.body.appendChild(ctxMenu);
  }

  var activeTrigger     = null;
  var activeCard        = null;
  var activeCardLocked  = false;

  function openCtxMenu(trigger, card) {
    if (!ctxMenu) { return; }
    var rect = trigger.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;

    activeTrigger    = trigger;
    activeCard       = card;
    activeCardLocked = card.classList.contains('project-card--is-locked');
    card.classList.add('card--menu-open');

    // Update enquire option label for locked vs unlocked cards
    var enquireOpt = ctxMenu.querySelector('[data-action="enquire"]');
    if (enquireOpt) {
      var enquireLabel = enquireOpt.querySelector('.ctx-option__label');
      var enquireBtn   = enquireOpt.querySelector('button');
      if (activeCardLocked) {
        if (enquireLabel) { enquireLabel.textContent = 'Request'; }
        if (enquireBtn)   { enquireBtn.setAttribute('aria-label', 'Request access'); }
      } else {
        if (enquireLabel) { enquireLabel.textContent = 'Enquire'; }
        if (enquireBtn)   { enquireBtn.setAttribute('aria-label', 'Enquire'); }
      }
    }

    // Update love label — use cached count, then refresh from API async
    var slug     = card.dataset.slug || '';
    ctxMenu.dataset.activeSlug = slug;
    var count    = getLikeCount(slug);
    var loveOpt  = ctxMenu.querySelector('[data-action="show-love"]');
    if (loveOpt) {
      var loveLabel = loveOpt.querySelector('.ctx-option__label');
      var loveBtn   = loveOpt.querySelector('.ctx-option__btn');
      if (loveLabel) { loveLabel.textContent = count > 0 ? 'Love \u00b7 ' + count : 'Love'; }
      if (loveBtn)   {
        if (count > 0) { loveBtn.classList.add('liked'); }
        else           { loveBtn.classList.remove('liked'); }
      }
    }
    // Refresh from KV API (will update label if count differs)
    refreshLikeDisplay(slug);

    // Position ctx-menu at trigger centre in document coordinates
    // (menu is position:absolute so we add scroll offset)
    ctxMenu.style.left = (cx + window.scrollX) + 'px';
    ctxMenu.style.top  = (cy + window.scrollY) + 'px';

    trigger.classList.add('active');
    ctxMenu.classList.add('open');
  }

  function closeCtxMenu() {
    if (!ctxMenu) { return; }
    ctxMenu.classList.remove('open');
    if (activeTrigger) { activeTrigger.classList.remove('active'); activeTrigger = null; }
    if (activeCard)    { activeCard.classList.remove('card--menu-open'); }
    activeCard       = null;
    activeCardLocked = false;
  }

  // Floating hearts animation
  function heartBurst(cx, cy) {
    for (var i = 0; i < 6; i++) {
      (function (idx) {
        var heart = document.createElement('div');
        heart.className = 'ctx-heart-particle';
        heart.textContent = '\u2665';
        heart.style.cssText =
          'position:fixed;left:' + cx + 'px;top:' + cy + 'px;' +
          'font-size:' + (0.9 + Math.random() * 0.6) + 'rem;' +
          'color:#5C0A13;pointer-events:none;z-index:9999;' +
          'transform:translate(-50%,-50%);will-change:transform,opacity;';
        document.body.appendChild(heart);

        var angle   = (-110 + idx * 40 + (Math.random() - 0.5) * 20) * Math.PI / 180;
        var dist    = 50 + Math.random() * 30;
        var tx      = Math.cos(angle) * dist;
        var ty      = Math.sin(angle) * dist;
        var dur     = 650 + idx * 60;
        var start   = null;

        function step(ts) {
          if (!start) { start = ts; }
          var p    = Math.min((ts - start) / dur, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          heart.style.transform =
            'translate(calc(-50% + ' + (ease * tx) + 'px), calc(-50% + ' + (ease * ty) + 'px))' +
            ' scale(' + (0.6 + Math.sin(p * Math.PI) * 0.8) + ')';
          heart.style.opacity = 1 - p * p;
          if (p < 1) { requestAnimationFrame(step); }
          else       { heart.remove(); }
        }
        setTimeout(function () { requestAnimationFrame(step); }, idx * 50);
      })(i);
    }
  }

  // Wire action handlers
  if (ctxMenu) {
    ctxMenu.querySelectorAll('.ctx-option').forEach(function (opt) {
      var btn = opt.querySelector('button');
      if (!btn) { return; }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = opt.dataset.action;
        var card   = activeCard;
        if (!card) { closeCtxMenu(); return; }

        if (action === 'inspect') {
          var link = card.querySelector('[data-project-link]');
          if (link) { window.location.href = link.getAttribute('href'); }
        }

        if (action === 'copy-link') {
          var url   = card.dataset.url || window.location.href;
          var title = card.dataset.title || 'this project';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              showToast('Link to \u201c' + title + '\u201d copied');
            }).catch(function () {
              showToast('Copy: ' + url);
            });
          } else {
            // Fallback
            var ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity  = '0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); showToast('Link to \u201c' + title + '\u201d copied'); }
            catch (err) { showToast('Copy: ' + url); }
            document.body.removeChild(ta);
          }
          btn.classList.add('copied');
          setTimeout(function () { btn.classList.remove('copied'); }, 1500);
        }

        if (action === 'show-love') {
          var slug  = card.dataset.slug || '';
          var title = card.dataset.title || 'this project';

          // Optimistic UI update
          var label = opt.querySelector('.ctx-option__label');
          btn.classList.add('liked');
          var optimisticCount = (_likesCache[slug] || 0) + 1;
          if (label) { label.textContent = 'Love \u00b7 ' + optimisticCount; }

          // Heart burst at trigger position
          if (activeTrigger) {
            var tr = activeTrigger.getBoundingClientRect();
            heartBurst(tr.left + tr.width / 2, tr.top + tr.height / 2);
          }

          // POST to KV API
          var rcLike = window.__rcLike;
          if (rcLike) {
            rcLike(slug).then(function (data) {
              if (data && typeof data.count === 'number') {
                _likesCache[slug] = data.count;
                if (label && ctxMenu.dataset.activeSlug === slug) {
                  label.textContent = 'Love \u00b7 ' + data.count;
                }
                showToast('\u2665 Loved \u201c' + title + '\u201d (' + data.count + ')');
              } else {
                _likesCache[slug] = optimisticCount;
                showToast('\u2665 Loved \u201c' + title + '\u201d');
              }
            });
          } else {
            _likesCache[slug] = optimisticCount;
            showToast('\u2665 Loved \u201c' + title + '\u201d');
          }
          // Don't close so user can see the update
          return;
        }

        if (action === 'enquire') {
          if (activeCardLocked) {
            // Locked project — request NDA access
            window.location.href =
              'mailto:coelho.rita16@gmail.com' +
              '?subject=Hexagon%20Case%20Study%20Access%20Request' +
              '&body=Hi%20Rita%2C%0A%0AI%27d%20love%20to%20see%20your%20Hexagon%20case%20study.' +
              '%20Happy%20to%20share%20context%20about%20who%20I%20am%20and%20why%20I%27m%20asking.';
          } else {
            var title = card.dataset.title || 'your project';
            window.location.href =
              'mailto:coelho.rita16@gmail.com?subject=Enquiry%3A%20' +
              encodeURIComponent(title) +
              '&body=Hi%20Rita%2C%0A%0AI%20saw%20your%20project%20%E2%80%9C' +
              encodeURIComponent(title) +
              '%E2%80%9D%20and%20would%20love%20to%20learn%20more.';
          }
        }

        closeCtxMenu();
      });
    });
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!ctxMenu || !ctxMenu.classList.contains('open')) { return; }
    if (ctxMenu.contains(e.target)) { return; }
    var trigger = e.target.closest('.ctx-trigger');
    if (trigger && trigger === activeTrigger) { return; }
    closeCtxMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ctxMenu && ctxMenu.classList.contains('open')) {
      closeCtxMenu();
    }
  });

  // Wire up all .ctx-trigger buttons on the page
  document.querySelectorAll('.ctx-trigger').forEach(function (trigger) {
    var card = trigger.closest('.project-card');
    if (!card) { return; }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (ctxMenu && ctxMenu.classList.contains('open') && activeTrigger === trigger) {
        closeCtxMenu();
      } else {
        closeCtxMenu();
        openCtxMenu(trigger, card);
      }
    });
  });


  // ==================
  // 4. TOAST NOTIFICATIONS
  // ==================
  var toastEl = document.getElementById('ctx-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id        = 'ctx-toast';
    toastEl.className = 'ctx-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }

  var toastTimeout = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }


  // ==================
  // 5. SCROLL-TRIGGERED FADE-UP ANIMATIONS
  // ==================
  var animEls = document.querySelectorAll('.fade-up, .timeline__item');
  if ('IntersectionObserver' in window) {
    var animObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            animObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    animEls.forEach(function (el) { animObserver.observe(el); });
  } else {
    animEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // Immediately reveal elements already in viewport
  setTimeout(function () {
    document.querySelectorAll('.fade-up').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95) {
        el.classList.add('visible');
      }
    });
  }, 80);


  // ==================
  // 6. JOURNEY TIMELINE FILTER + SORT
  // ==================
  var filterBtns = document.querySelectorAll('.journey-filter');
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.dataset.filter || 'all';
        document.querySelectorAll('.timeline__item').forEach(function (item) {
          var type = item.dataset.type || 'all';
          if (filter === 'all' || type === filter) {
            item.style.display = '';
            item.classList.remove('visible');
            setTimeout(function () { item.classList.add('visible'); }, 30);
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  // ==================
  // CUSTOM SORT SELECT (work + journey)
  // ==================
  document.querySelectorAll('.sort-select').forEach(function (sel) {
    var btn     = sel.querySelector('.sort-select__btn');
    var list    = sel.querySelector('.sort-select__list');
    var valEl   = sel.querySelector('.sort-select__val');
    var options = sel.querySelectorAll('.sort-select__option');

    if (!btn) { return; }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = !sel.classList.contains('is-open');
      // Close all other open selects
      document.querySelectorAll('.sort-select.is-open').forEach(function (s) {
        s.classList.remove('is-open');
        s.querySelector('.sort-select__btn').setAttribute('aria-expanded', 'false');
      });
      if (opening) {
        sel.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        options.forEach(function (o) {
          o.classList.remove('is-active');
          o.setAttribute('aria-selected', 'false');
        });
        opt.classList.add('is-active');
        opt.setAttribute('aria-selected', 'true');
        if (valEl) { valEl.textContent = opt.textContent.trim(); }
        sel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        sel.dispatchEvent(new CustomEvent('sort-change', { detail: { value: opt.dataset.value }, bubbles: true }));
      });
    });
  });

  document.addEventListener('click', function () {
    document.querySelectorAll('.sort-select.is-open').forEach(function (s) {
      s.classList.remove('is-open');
      var b = s.querySelector('.sort-select__btn');
      if (b) { b.setAttribute('aria-expanded', 'false'); }
    });
  });

  // Journey timeline sort
  var journeySortEl = document.getElementById('sort-btn');
  var timeline      = document.querySelector('.timeline');
  if (journeySortEl && timeline) {
    var originalItems = Array.from(timeline.children);
    journeySortEl.addEventListener('sort-change', function (e) {
      var items = originalItems.slice();
      if (e.detail.value === 'oldest') { items.reverse(); }
      items.forEach(function (item) { timeline.appendChild(item); });
    });
  }

})();
