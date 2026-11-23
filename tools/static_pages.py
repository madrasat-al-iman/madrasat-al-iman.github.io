# -*- coding: utf-8 -*-
"""
Static, readable pages for search engines and link previews: one page per topic, Torah portion, sura and Nakh book,
written from the JSON files in data/. Each page holds the full texts in Hebrew and Arabic and links to the
interactive page inside the site. Also writes sitemap.xml and robots.txt.

The public address of the site is read from site.json at the repository root ({"url": "https://…/"}).
"""
import os, re, json, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
E = html.escape


def site_url():
    try:
        return json.load(open(os.path.join(ROOT, 'site.json'), encoding='utf-8'))['url'].rstrip('/') + '/'
    except (OSError, KeyError, ValueError):
        return 'https://madrasat-al-iman.github.io/'


def J(p):
    return json.load(open(os.path.join(DATA, p), encoding='utf-8'))


def clip(t, n):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'


def para(t, lang=None, cls=''):
    if not t:
        return ''
    attr = f' lang="{lang}" dir="rtl"' if lang else ''
    return f'<p class="{cls}"{attr}>' + E(t).replace('\n', '<br>') + '</p>'


def two(he, ar, cls=''):
    if not he and not ar:
        return ''
    return f'<div class="two {cls}"><div class="col-he">{para(he)}</div><div class="col-ar ar" lang="ar">{para(ar)}</div></div>'


def dating(keys, D):
    keys = [k for k in (keys or []) if k in D]
    if not keys:
        return ''
    he = ' · '.join(f'{E(re.split(r", | [(]", D[k][0])[0])} – {E(D[k][2])}' for k in keys)
    ar = ' · '.join(f'{E(re.split(r"، | [(]", D[k][1])[0])} – {E(D[k][3])}' for k in keys)
    return f'<div class="dt"><span class="l-he"><b>תיארוך משוער:</b> {he}</span><span class="l-ar" lang="ar"><b>التأريخ التقريبي:</b> {ar}</span></div>'


def page(site, route, title, title_ar, desc, body, crumbs):
    url = f'{site}{route}.html'
    app_url = f'{site}#/{route}'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": f'{title} · {title_ar}'[:110], "inLanguage": ["he", "ar"], "url": url,
         "description": desc, "isPartOf": {"@type": "WebSite", "name": "מדרשת האמונה · مدرسة الإيمان", "url": site},
         "image": f'{site}assets/og-card.png', "dateModified": datetime.date.today().isoformat()},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": k + 1, "name": n, "item": u} for k, (n, u) in enumerate(crumbs)]}]}
    depth = route.count('/')
    up = '../' * depth
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)} · {E(title_ar)} | מדרשת האמונה · مدرسة الإيمان</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="מדרשת האמונה · مدرسة الإيمان">
<meta property="og:title" content="{E(title)} · {E(title_ar)}"><meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{site}assets/og-card.png">
<meta property="og:locale" content="he_IL"><meta property="og:locale:alternate" content="ar_AR"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="{up}assets/fonts.css"><link rel="stylesheet" href="{up}assets/style.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body class="static">
<header class="top"><div class="brand"><a href="{up}index.html" class="logo">מדרשת האמונה <span class="sep">·</span> <span lang="ar">مدرسة الإيمان</span></a></div>
<nav class="tabs"><a href="{up}index.html#/c"><span class="l-he">נושאים לעיון</span><span class="l-ar" lang="ar">موضوعات للتأمل</span></a><a href="{up}index.html#/a"><span class="l-he">הקוראן ותפסיר עם הספר</span><span class="l-ar" lang="ar">القرآن وتفسير أهل الكتاب</span></a><a href="{up}index.html#/b"><span class="l-he">התורה ופירוש האסלאם</span><span class="l-ar" lang="ar">التوراة وتفسير الإسلام</span></a></nav></header>
<main class="page">
<div class="crumbs">{' · '.join(f'<a href="{E(u)}">{E(n)}</a>' for n, u in crumbs[:-1])}</div>
<h1><span class="l-he">{E(title)}</span><span class="l-ar" lang="ar">{E(title_ar)}</span></h1>
<p><a class="btn primary" href="{E(app_url)}"><span class="l-he">לתצוגה המלאה באתר (חיפוש, השמעה, שיתוף)</span><span class="l-ar" lang="ar">إلى العرض الكامل في الموقع</span></a></p>
{body}
<p><a class="btn" href="{E(app_url)}"><span class="l-he">לתצוגה המלאה באתר</span><span class="l-ar" lang="ar">إلى العرض الكامل في الموقع</span></a></p>
</main>
<footer class="foot"><p>מדרשת האמונה — מאגר דו־לשוני של מקבילות בין המקרא, חז״ל, הקוראן והחדית׳ · <span lang="ar">مدرسة الإيمان — قاعدة بيانات ثنائية اللغة للتوازيات</span></p></footer>
</body></html>
"""


def build(sura_he, nakh_ar):
    site = site_url()
    meta = J('meta.json')
    D = meta.get('dating', {})
    home = ('מדרשת האמונה · مدرسة الإيمان', site)
    pages = []   # (route, html)

    # topics
    for t in J('themes.json')['topics']:
        d = J(f"topics/{t['code']}.json")
        body = [f'<h2>עיקר ההשוואה · <span lang="ar">خلاصة المقارنة</span></h2>', two(d.get('summary'), d.get('summaryAr')),
                dating((d.get('dt') or {}).get('summary'), D)]
        if d.get('sources'):
            body.append(f'<h2>המקורות במלואם · <span lang="ar">نصوص المصادر كاملة</span> ({len(d["sources"])})</h2>')
            for s in d['sources']:
                body.append(f'<section class="src"><h3><span class="l-he">{E(s.get("ref") or "")}</span> '
                            f'<span class="l-ar" lang="ar">{E(s.get("refAr") or "")}</span></h3>'
                            f'{two(s.get("he"), s.get("ar"))}{two(s.get("note"), s.get("noteAr"), "note")}{dating(s.get("dt"), D)}</section>')
        for k, he, ar in (('jewish', 'חז״ל ומקורות יהודיים', 'الحكماء والمصادر اليهودية'), ('nt', 'ברית חדשה וספרות חיצונית', 'العهد الجديد والأدب الخارجي'),
                          ('deepen', 'העמקת הדמיון והשוני', 'تعميق أوجه الشبه والاختلاف')):
            if d.get(k):
                body.append(f'<h2>{he} · <span lang="ar">{ar}</span></h2>{two(d.get(k), d.get(k + "Ar"))}{dating((d.get("dt") or {}).get(k), D)}')
        if d.get('question') or d.get('questionAr'):
            body.append(f'<h2>שאלות ללימוד משותף · <span lang="ar">أسئلة للدراسة المشتركة</span></h2>{two(d.get("question"), d.get("questionAr"))}')
        desc = clip(d.get('summary'), 160) + ' · ' + clip(d.get('summaryAr'), 110)
        route = f"c/{t['code']}"
        pages.append((route, page(site, route, d['title'], d.get('titleAr') or '', desc, '\n'.join(body),
                                  [home, ('נושאים לעיון', site + '#/c'), (d['title'], f'{site}{route}.html')])))

    # Torah portions
    for p in meta['parashot']:
        d = J(f"torah/{p['i']:02d}.json")
        P = d['parasha']
        ar_name = re.sub(r'\s*\(.*?\)', '', P.get('nameAr') or '')
        by = {}
        for x in d['parallels']:
            by.setdefault((x['c'], x['v']), []).append(x)
        body = []
        for v in d['verses']:
            body.append(f'<div class="vrow"><div class="he"><span class="num">{v["c"]}:{v["v"]}</span>{E(v["he"])}</div><div class="ar" lang="ar">{E(v["ar"])}</div></div>')
            for x in by.get((v['c'], v['v']), []):
                body.append(f'<section class="card"><h3>{E(x.get("ref") or "")} ⇄ {E(x.get("src") or "")}</h3>'
                            f'{two(x.get("textHe"), x.get("textAr"))}{two(x.get("note"), x.get("noteAr"), "note")}{dating(x.get("dt"), D)}</section>')
        desc = f"{P['book']} – פרשת {P['name']}: נוסח המסורה ותרגום ון־דייק, עם {len(d['parallels'])} מקבילות מן הקוראן ומן החדית׳ · {P.get('bookAr') or ''} – برشا {ar_name}"
        route = f"b/{p['i']}"
        pages.append((route, page(site, route, f"פרשת {P['name']}", f"برشا {ar_name}", desc, '\n'.join(body),
                                  [home, ('התורה ופירוש האסלאם', site + '#/b'), (f"פרשת {P['name']}", f'{site}{route}.html')])))

    # suras
    for s in meta['suras']:
        d = J(f"quran/{s['n']:03d}.json")
        by = {}
        for x in d['parallels']:
            by.setdefault(int(x.get('b') or x.get('a') or 1), []).append(x)
        body = []
        for v in d['verses']:
            body.append(f'<div class="vrow"><div class="he"><span class="num">{v["v"]}</span>{E(v["he"] or "")}</div><div class="ar q-text" lang="ar">{E(v["ar"] or "")} ﴿{v["v"]}﴾</div></div>')
            for x in by.get(v['v'], []):
                body.append(f'<section class="card"><h3>{s["n"]}:{x.get("a")} ⇄ {E(x.get("ref") or "")}</h3>'
                            f'{two(x.get("srcHe"), x.get("srcAr"))}{two(x.get("note"), x.get("noteAr"), "note")}{dating(x.get("dt"), D)}</section>')
        he_name = sura_he[s['n']]
        desc = f"סורה {s['n']} ({he_name}) בערבית ובתרגום עברי, עם {s['parallels']} מקבילות מן המקרא ומספרות חז״ל · سورة {d['name']} مع التوازيات من المقرا وأدب الحكماء"
        route = f"a/{s['n']}"
        pages.append((route, page(site, route, f"סורה {s['n']}: {he_name}", f"سورة {d['name']}", desc, '\n'.join(body),
                                  [home, ('הקוראן ותפסיר עם הספר', site + '#/a'), (f"סורה {s['n']}", f'{site}{route}.html')])))

    # Nakh books
    for k, b in enumerate(meta['nakh'], 1):
        d = J(f"nakh/{k:02d}.json")
        body = []
        for x in sorted(d['parallels'] + d.get('fromQuran', []), key=lambda x: (x['c'] or 0, x['v'] or 0)):
            src = x.get('src') or (f"קוראן {x['su']}:{x['a']}" if 'su' in x else '')
            body.append(f'<section class="card"><h3>{E(x.get("ref") or "")} ⇄ {E(src)}</h3>{two(x.get("bibleHe"), x.get("bibleAr"))}'
                        f'{two(x.get("textHe") or x.get("qHe"), x.get("textAr") or x.get("qAr"))}{two(x.get("note"), x.get("noteAr"), "note")}{dating(x.get("dt"), D)}</section>')
        desc = f"{b['book']}: {b['count']} מקבילות מן הקוראן ומן החדית׳, בנוסח המקור ובתרגום · {nakh_ar.get(b['book'], '')}: توازيات من القرآن والحديث"
        route = f"n/{k}"
        pages.append((route, page(site, route, b['book'], nakh_ar.get(b['book'], ''), desc, '\n'.join(body),
                                  [home, ('נביאים וכתובים', site + '#/n'), (b['book'], f'{site}{route}.html')])))

    for route, h in pages:
        p = os.path.join(ROOT, route + '.html')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(h)
    today = datetime.date.today().isoformat()
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        f.write(f'  <url><loc>{site}</loc><lastmod>{today}</lastmod></url>\n')
        f.write(''.join(f'  <url><loc>{site}{r}.html</loc><lastmod>{today}</lastmod></url>\n' for r, _ in pages))
        f.write('</urlset>\n')
    with open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(f'User-agent: *\nAllow: /\nSitemap: {site}sitemap.xml\n')
    return len(pages)
