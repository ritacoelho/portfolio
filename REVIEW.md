# Portfolio Design Review
_Generated: 2026-03-29 23:48_

## Summary

| Severity   | Count |
|------------|-------|
| 🔴 Critical  | 5 |
| 🟡 Important | 2 |
| 🔵 Advisory  | 28 |
| ✅ Passing   | 8 |

---

## 🔴 Critical

### `Contrast` — --light text on --bg: #9A8E88 on #EBF1F7 → 2.8:1 (need 4.5:1)

**Fix:** Increase foreground brightness until ratio ≥ 4.5:1

### `Contrast` — Footer text (#383E3E) on --bg-dark: #383E3E on #1A0B04 → 1.8:1 (need 4.5:1)

**Fix:** Increase foreground brightness until ratio ≥ 4.5:1

### `Tokens` — Legacy colour aliases still in use: var(--teal) (34×) → --brown, var(--teal-dark) (5×) → --brown-dark, var(--teal-mid) (6×) → --brown-mid, var(--teal-faint) (1×) → --brown-faint

**Fix:** Run a global find-and-replace to unify to the current token names.

### `Focus` — :focus-visible is not defined anywhere in style.css.

**Fix:** Add: :focus-visible { outline: 2px solid var(--burgundy); outline-offset: 3px; border-radius: 4px; }

### `Contrast` — --light (fails 4.5:1) used as text colour in 6 selector(s): .hub__meta, .project-card__year, .timeline__date, .project-nav__label, .work-sort__label

**Fix:** Replace var(--light) with var(--muted) for all text uses.

---

## 🟡 Important

### `Focus` — `outline: none` found near selector "(unknown)" with no visible replacement.

**Fix:** Replace with a :focus-visible rule or a visible border/box-shadow instead.

### `Typography` — 7 selector(s) use font-size below 10.5px:
>   .project-card__lock-label → 0.65rem (10.4px)
>   .project-card__tag → 0.65rem (10.4px)
>   .ctx-option__label → 0.6rem (9.6px)
>   .timeline__badge → 0.6rem (9.6px)
>   .project-meta__label → 0.63rem (10.1px)
>   .process-step__label → 0.65rem (10.4px)
>   .project-nav__label → 0.65rem (10.4px)

**Fix:** Raise informational labels to at least 0.7rem (11.2px).

---

## 🔵 Advisory

### `Structure` — Duplicate @media breakpoints: @media (max-width: 1024px)

**Fix:** Merge duplicate breakpoint blocks for easier maintenance.

### `Navigation` — about.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Consistency` — about.html: 5 long inline style attribute(s) found.

**Fix:** Extract repeated inline styles into named CSS classes.

### `Meta` — about.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — about.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — contact.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — contact.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — contact.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Meta` — index.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — index.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — journey.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — journey.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — journey.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — projects/atlassian.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — projects/atlassian.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — projects/atlassian.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — projects/hexagon.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — projects/hexagon.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — projects/hexagon.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — projects/last-mile.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — projects/last-mile.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — projects/last-mile.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — projects/sonic-link.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — projects/sonic-link.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — projects/sonic-link.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — work.html: Mobile menu has no .active link (current page not marked).

**Fix:** Add "active" class to the matching .mobile-menu__link on each page.

### `Meta` — work.html: No favicon <link> tag.

**Fix:** Add <link rel="icon" href="/favicon.ico">.

### `Meta` — work.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

---

## ✅ Passing Checks

- **Contrast:** Body text (--text) on --bg: 17.3:1 ✓
- **Contrast:** Muted text on --bg: 7.1:1 ✓
- **Contrast:** --brown on --bg: 15.4:1 ✓
- **Contrast:** White on --brown: 17.6:1 ✓
- **Contrast:** --brown on --mist-blue: 11.9:1 ✓
- **Contrast:** White on --bg-dark: 19.2:1 ✓
- **Contrast:** --off-white on --bg-dark: 16.9:1 ✓
- **Contrast:** No opacity-based text dimming found ✓
