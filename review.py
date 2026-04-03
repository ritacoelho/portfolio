#!/usr/bin/env python3
"""
Portfolio Design Review Script
================================
Runs a quick automated check against the Rita Coelho portfolio source files
and writes a Markdown summary of any issues found.

Usage:
    python3 review.py

Output:
    REVIEW.md  — written next to this script
"""

import os, re, math, glob
from datetime import datetime

PORTFOLIO = os.path.dirname(os.path.abspath(__file__))
CSS_FILE  = os.path.join(PORTFOLIO, 'css', 'style.css')
HTML_GLOB = os.path.join(PORTFOLIO, '**', '*.html')

findings  = []   # list of (severity, category, message, suggestion)
passes    = []   # list of (category, message)

def issue(severity, category, message, suggestion=''):
    findings.append((severity, category, message, suggestion))

def ok(category, message):
    passes.append((category, message))


# ── Contrast helpers ──────────────────────────────────────────────────────────

def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def linearise(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(r, g, b):
    rl, gl, bl = linearise(r), linearise(g), linearise(b)
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl

def contrast(hex1, hex2):
    l1 = luminance(*hex_to_rgb(hex1))
    l2 = luminance(*hex_to_rgb(hex2))
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def check_contrast(label, fg, bg, threshold=4.5, size='normal'):
    ratio = contrast(fg, bg)
    if ratio < threshold:
        req = f'{threshold}:1' if threshold != 3.0 else '3:1 (large text)'
        issue('CRITICAL' if ratio < 3.0 else 'IMPORTANT',
              'Contrast',
              f'{label}: {fg} on {bg} → {ratio:.1f}:1 (need {req})',
              f'Increase foreground brightness until ratio ≥ {threshold}:1')
    else:
        ok('Contrast', f'{label}: {ratio:.1f}:1 ✓')


# ── CSS checks ────────────────────────────────────────────────────────────────

def check_css(css):

    # 1. Known contrast pairs
    # Read token values from :root
    tokens = {}
    for m in re.finditer(r'--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})', css):
        tokens[m.group(1)] = m.group(2)

    def tok(name, fallback):
        return tokens.get(name, fallback)

    bg       = tok('bg',       '#EBF1F7')
    bg_dark  = tok('bg-dark',  '#1A0B04')
    card     = tok('card',     '#F7FBFD')
    text     = tok('text',     '#0F0A06')
    muted    = tok('muted',    '#5A4E46')
    light    = tok('light',    '#9A8E88')
    brown    = tok('brown',    '#251605')
    burgundy = tok('burgundy', '#5C0A13')
    mist_blue= tok('mist-blue','#C7D6E5')
    off_white= tok('off-white','#EBF1F7')

    check_contrast('Body text (--text) on --bg',       text,    bg,      4.5)
    check_contrast('Muted text on --bg',               muted,   bg,      4.5)
    check_contrast('--light text on --bg',             light,   bg,      4.5)
    check_contrast('Footer text (#383E3E) on --bg-dark','#383E3E', bg_dark, 4.5)
    check_contrast('--brown on --bg',                  brown,   bg,      4.5)
    check_contrast('White on --brown',                 '#FFFFFF',brown,  4.5)
    check_contrast('--brown on --mist-blue',           brown,   mist_blue,4.5)
    check_contrast('White on --bg-dark',               '#FFFFFF',bg_dark, 4.5)
    check_contrast('--off-white on --bg-dark',         off_white,bg_dark, 4.5)

    # 2. Legacy token usage (renamed tokens that should no longer appear)
    legacy_map = {
        'var(--teal)':        '--brown',
        'var(--teal-dark)':   '--brown-dark',
        'var(--teal-mid)':    '--brown-mid',
        'var(--teal-faint)':  '--brown-faint',
        'var(--maroon)':      '--burgundy',
        'var(--maroon-dark)': '--burgundy-dark',
        'var(--maroon-faint)':'--burgundy-faint',
        'var(--grey)':        '--mauve',
    }
    legacy_found = {}
    for old, new in legacy_map.items():
        count = len(re.findall(re.escape(old), css))
        if count:
            legacy_found[old] = (count, new)

    if legacy_found:
        detail = ', '.join(f'{old} ({n}×) → {new}' for old, (n, new) in legacy_found.items())
        issue('CRITICAL', 'Tokens',
              f'Legacy colour aliases still in use: {detail}',
              'Run a global find-and-replace to unify to the current token names.')
    else:
        ok('Tokens', 'No legacy token aliases found ✓')

    # 3. :focus-visible
    if ':focus-visible' in css:
        # Count meaningful rules (not just comments)
        fv_rules = re.findall(r':focus-visible\s*\{[^}]+\}', css)
        if len(fv_rules) >= 1:
            ok('Focus', f':focus-visible defined ({len(fv_rules)} rule(s)) ✓')
        else:
            issue('IMPORTANT', 'Focus',
                  ':focus-visible appears in CSS but no complete rule block found.',
                  'Add a complete :focus-visible rule, e.g. :focus-visible { outline: 2px solid var(--burgundy); outline-offset: 3px; }')
    else:
        issue('CRITICAL', 'Focus',
              ':focus-visible is not defined anywhere in style.css.',
              'Add: :focus-visible { outline: 2px solid var(--burgundy); outline-offset: 3px; border-radius: 4px; }')

    # 4. outline: none without a replacement
    outline_none = [m.start() for m in re.finditer(r'outline\s*:\s*none', css)]
    for pos in outline_none:
        # Get surrounding rule block (scan backwards for selector, forward for })
        snippet = css[max(0, pos-200):pos+50]
        selector_match = re.findall(r'([\w\-\.#:,\s\[\]"=^~*>+]+)\s*\{[^{]*$', snippet)
        selector = selector_match[-1].strip() if selector_match else '(unknown)'
        issue('IMPORTANT', 'Focus',
              f'`outline: none` found near selector "{selector}" with no visible replacement.',
              'Replace with a :focus-visible rule or a visible border/box-shadow instead.')

    # 5. Duplicate media query breakpoints
    breakpoints = re.findall(r'@media\s*\([^)]+\)', css)
    seen_bps, dupes = {}, set()
    for bp in breakpoints:
        norm = re.sub(r'\s+', ' ', bp.strip())
        seen_bps[norm] = seen_bps.get(norm, 0) + 1
        if seen_bps[norm] > 1:
            dupes.add(norm)
    if dupes:
        issue('ADVISORY', 'Structure',
              f'Duplicate @media breakpoints: {", ".join(dupes)}',
              'Merge duplicate breakpoint blocks for easier maintenance.')
    else:
        ok('Structure', 'No duplicate media query blocks ✓')

    # 6. Very small font sizes (< 0.68rem or < 11px)
    small_fonts = re.findall(
        r'([^\n{]+)\{[^}]*font-size\s*:\s*(0\.[0-6][0-9]?\s*rem|[0-9]+px)[^}]*\}',
        css, re.DOTALL
    )
    tiny_selectors = []
    for sel, size in small_fonts:
        val = size.strip()
        # Parse value
        if 'rem' in val:
            num = float(re.search(r'[\d.]+', val).group())
            px  = num * 16
        else:
            px = float(re.search(r'[\d.]+', val).group())
        if px < 10.5:
            tiny_selectors.append(f'{sel.strip()} → {val} ({px:.1f}px)')
    if tiny_selectors:
        issue('IMPORTANT', 'Typography',
              f'{len(tiny_selectors)} selector(s) use font-size below 10.5px:\n  ' +
              '\n  '.join(tiny_selectors[:8]),
              'Raise informational labels to at least 0.7rem (11.2px).')
    else:
        ok('Typography', 'All font sizes ≥ 10.5px ✓')

    # 7. --light used as a text colour property
    light_text_uses = re.findall(
        r'([^\n{]+)\{[^}]*color\s*:\s*var\(--light\)[^}]*\}',
        css, re.DOTALL
    )
    if light_text_uses:
        selectors = [s.strip() for s in light_text_uses]
        issue('CRITICAL', 'Contrast',
              f'--light (fails 4.5:1) used as text colour in {len(selectors)} selector(s): '
              + ', '.join(selectors[:5]),
              'Replace var(--light) with var(--muted) for all text uses.')
    else:
        ok('Contrast', '--light not used as text colour ✓')

    # 8. opacity on text (fragile contrast)
    opacity_text = re.findall(
        r'([^\n{]+)\{[^}]*(?:color\s*:\s*inherit|color\s*:\s*currentColor)[^}]*opacity\s*:\s*0\.[0-9]+[^}]*\}',
        css, re.DOTALL
    )
    if opacity_text:
        issue('ADVISORY', 'Contrast',
              'opacity used with inherited text colour — actual contrast depends on background.',
              'Use an explicit colour token so contrast can be verified independently.')
    else:
        ok('Contrast', 'No opacity-based text dimming found ✓')


# ── HTML checks ───────────────────────────────────────────────────────────────

def check_html_files():
    html_files = glob.glob(HTML_GLOB, recursive=True)
    if not html_files:
        issue('ADVISORY', 'Files', 'No HTML files found at expected path.', '')
        return

    for path in sorted(html_files):
        rel  = os.path.relpath(path, PORTFOLIO)
        with open(path, encoding='utf-8') as f:
            src = f.read()

        # a. lang attribute
        if not re.search(r'<html[^>]+lang=', src):
            issue('IMPORTANT', 'Accessibility',
                  f'{rel}: <html> missing lang attribute.',
                  'Add lang="en" (or appropriate language code).')

        # b. viewport meta
        if 'name="viewport"' not in src:
            issue('IMPORTANT', 'Responsive',
                  f'{rel}: Missing <meta name="viewport">.',
                  'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.')

        # c. Images without alt text
        img_no_alt = re.findall(r'<img(?![^>]*\balt\b)[^>]*>', src)
        if img_no_alt:
            issue('IMPORTANT', 'Accessibility',
                  f'{rel}: {len(img_no_alt)} <img> element(s) with no alt attribute.',
                  'Add descriptive alt text or alt="" for decorative images.')

        # d. Active nav link present
        if 'class="nav__link active"' not in src and 'nav__link' in src:
            issue('ADVISORY', 'Navigation',
                  f'{rel}: No .nav__link.active found — current page not highlighted in nav.',
                  'Add class="nav__link active" to the matching link for this page.')

        # e. Mobile menu active link
        if 'mobile-menu__link' in src and 'mobile-menu__link active' not in src:
            issue('ADVISORY', 'Navigation',
                  f'{rel}: Mobile menu has no .active link (current page not marked).',
                  'Add "active" class to the matching .mobile-menu__link on each page.')

        # f. Inline style count (warning if heavy)
        inline_count = len(re.findall(r'\bstyle\s*=\s*"[^"]{60,}"', src))
        if inline_count > 4:
            issue('ADVISORY', 'Consistency',
                  f'{rel}: {inline_count} long inline style attribute(s) found.',
                  'Extract repeated inline styles into named CSS classes.')

        # g. Favicon / theme-color
        if 'rel="icon"' not in src and 'rel="shortcut icon"' not in src:
            issue('ADVISORY', 'Meta',
                  f'{rel}: No favicon <link> tag.',
                  'Add <link rel="icon" href="/favicon.ico">.')

        if 'theme-color' not in src:
            issue('ADVISORY', 'Meta',
                  f'{rel}: No <meta name="theme-color">.',
                  'Add <meta name="theme-color" content="#251605">.')


# ── Run all checks ────────────────────────────────────────────────────────────

if os.path.exists(CSS_FILE):
    with open(CSS_FILE, encoding='utf-8') as f:
        css = f.read()
    check_css(css)
else:
    issue('CRITICAL', 'Files', f'style.css not found at {CSS_FILE}', '')

check_html_files()


# ── Report ────────────────────────────────────────────────────────────────────

SEV_ORDER = {'CRITICAL': 0, 'IMPORTANT': 1, 'ADVISORY': 2}
findings.sort(key=lambda x: SEV_ORDER.get(x[0], 9))

critical  = [f for f in findings if f[0] == 'CRITICAL']
important = [f for f in findings if f[0] == 'IMPORTANT']
advisory  = [f for f in findings if f[0] == 'ADVISORY']

now = datetime.now().strftime('%Y-%m-%d %H:%M')

lines = [
    f'# Portfolio Design Review',
    f'_Generated: {now}_',
    '',
    '## Summary',
    '',
    f'| Severity   | Count |',
    f'|------------|-------|',
    f'| 🔴 Critical  | {len(critical)} |',
    f'| 🟡 Important | {len(important)} |',
    f'| 🔵 Advisory  | {len(advisory)} |',
    f'| ✅ Passing   | {len(passes)} |',
    '',
]

def section(title, emoji, items):
    if not items: return []
    out = [f'---', f'', f'## {emoji} {title}', '']
    for sev, cat, msg, fix in items:
        out.append(f'### `{cat}` — {msg.splitlines()[0]}')
        for extra in msg.splitlines()[1:]:
            out.append(f'> {extra}')
        if fix:
            out.append(f'')
            out.append(f'**Fix:** {fix}')
        out.append('')
    return out

lines += section('Critical', '🔴', critical)
lines += section('Important', '🟡', important)
lines += section('Advisory', '🔵', advisory)

if passes:
    lines += ['---', '', '## ✅ Passing Checks', '']
    for cat, msg in passes:
        lines.append(f'- **{cat}:** {msg}')
    lines.append('')

report = '\n'.join(lines)
out_path = os.path.join(PORTFOLIO, 'REVIEW.md')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(report)

# Console summary
print(f'\n{"="*60}')
print(f'  Portfolio Design Review  —  {now}')
print(f'{"="*60}')
print(f'  🔴 Critical : {len(critical)}')
print(f'  🟡 Important: {len(important)}')
print(f'  🔵 Advisory : {len(advisory)}')
print(f'  ✅ Passing  : {len(passes)}')
print(f'{"="*60}')
print(f'  Full report → {out_path}')
print()

if critical:
    print('Critical issues:')
    for _, cat, msg, _ in critical:
        print(f'  • [{cat}] {msg.splitlines()[0]}')
    print()
