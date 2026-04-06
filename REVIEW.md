# Portfolio Design Review
_Generated: 2026-04-06 11:44_

## Summary

| Severity   | Count |
|------------|-------|
| 🔴 Critical  | 1 |
| 🟡 Important | 2 |
| 🔵 Advisory  | 8 |
| ✅ Passing   | 12 |

---

## 🔴 Critical

### `Contrast` — Footer text (#383E3E) on --bg-dark: #383E3E on #1A0B04 → 1.8:1 (need 4.5:1)

**Fix:** Increase foreground brightness until ratio ≥ 4.5:1

---

## 🟡 Important

### `Contrast` — --light text on --bg: #9A8E88 on #FFFFFF → 3.2:1 (need 4.5:1)

**Fix:** Increase foreground brightness until ratio ≥ 4.5:1

### `Typography` — 1 selector(s) use font-size below 10.5px:
>   .ctx-option__label → 0.65rem (10.4px)

**Fix:** Raise informational labels to at least 0.7rem (11.2px).

---

## 🔵 Advisory

### `Navigation` — admin/access-codes.html: No .nav__link.active found — current page not highlighted in nav.

**Fix:** Add class="nav__link active" to the matching link for this page.

### `Meta` — admin/access-codes.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — admin/journey.html: No .nav__link.active found — current page not highlighted in nav.

**Fix:** Add class="nav__link active" to the matching link for this page.

### `Meta` — admin/journey.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Navigation` — admin/projects.html: No .nav__link.active found — current page not highlighted in nav.

**Fix:** Add class="nav__link active" to the matching link for this page.

### `Meta` — admin/projects.html: No <meta name="theme-color">.

**Fix:** Add <meta name="theme-color" content="#251605">.

### `Consistency` — journey.html: 23 long inline style attribute(s) found.

**Fix:** Extract repeated inline styles into named CSS classes.

### `Consistency` — work.html: 15 long inline style attribute(s) found.

**Fix:** Extract repeated inline styles into named CSS classes.

---

## ✅ Passing Checks

- **Contrast:** Body text (--text) on --bg: 19.7:1 ✓
- **Contrast:** Muted text on --bg: 8.0:1 ✓
- **Contrast:** --brown on --bg: 17.6:1 ✓
- **Contrast:** White on --brown: 17.6:1 ✓
- **Contrast:** --brown on --mist-blue: 8.7:1 ✓
- **Contrast:** White on --bg-dark: 19.2:1 ✓
- **Contrast:** --off-white on --bg-dark: 17.6:1 ✓
- **Tokens:** No legacy token aliases found ✓
- **Focus:** :focus-visible defined (1 rule(s)) ✓
- **Structure:** No duplicate media query blocks ✓
- **Contrast:** --light not used as text colour ✓
- **Contrast:** No opacity-based text dimming found ✓
