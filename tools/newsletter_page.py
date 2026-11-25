"""פרסום גיליון שבועי שנשלח – דף עצמאי בארכיון האתר.

שימוש:
  python3 tools/newsletter_page.py <sent_body.html> <YYYY-MM-DD> "<כותרת בעברית>" "<العنوان بالعربية>"

הקלט: גוף ה־HTML של המייל כפי שנשלח בפועל (מתיקיית „נשלח“).
הפלט: newsletter/<date>.html, שורה ב־newsletter/index.json (החדש ראשון, בלי כפילות), ושורה ב־sitemap.xml.
הדף לא יכיל שום כתובת מייל: כל כתובת נמחקת, ושורות ההסרה במייל מוחלפות בקישור להרשמה ולארכיון.
"""
import html, json, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = html.escape


def site_url():
    try:
        return json.load(open(os.path.join(ROOT, 'site.json'), encoding='utf-8'))['url'].rstrip('/') + '/'
    except Exception:
        return 'https://madrasat-al-iman.github.io/'


def clean(body):
    # Gmail sometimes wraps links: https://www.google.com/url?q=<target>&source=gmail...
    def unwrap(m):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(html.unescape(m.group(1))).query).get('q')
        return 'href="' + E(q[0]) + '"' if q else m.group(0)
    body = re.sub(r'href="(https://www\.google\.com/url\?[^"]+)"', unwrap, body)
    # mailto links and any e-mail address
    body = re.sub(r'<a[^>]+href="mailto:[^"]*"[^>]*>(.*?)</a>', r'\1', body, flags=re.S)
    body = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '', body)
    # quoted reply / gmail signature wrappers, if any
    body = re.sub(r'<div class="gmail_quote.*$', '', body, flags=re.S)
    # unsubscribe lines are for e-mail readers only
    body = re.sub(r'وصلتك هذه النشرة[^<]*<br\s*/?>', '', body)
    body = re.sub(r'קיבלת את הגיליון[^<]*<br\s*/?>', '', body)
    return body.strip()


def main(src, date, title_he, title_ar):
    site = site_url()
    body = clean(open(src, encoding='utf-8').read())
    route = f'newsletter/{date}.html'
    url = site + route
    d = '.'.join(reversed(date.split('-')))
    t_full = f'{title_ar} · {title_he}'
    text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', body))).strip()
    desc = text[:220]
    page = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(t_full)} | مدرسة الإيمان · מדרשת האמונה</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="מדרשת האמונה · مدرسة الإيمان">
<meta property="og:title" content="{E(t_full)}"><meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{site}assets/og-card.png">
<meta property="og:locale" content="ar_AR"><meta property="og:locale:alternate" content="he_IL"><meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="{date}">
<link rel="icon" href="../favicon.ico" sizes="16x16 32x32 48x48"><link rel="icon" type="image/png" sizes="192x192" href="../assets/icon-192.png"><link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<link rel="stylesheet" href="../assets/fonts.css">
<style>body{{margin:0;background:#f7f3ea;color:#222}} .nlnav{{max-width:680px;margin:0 auto;padding:14px 18px 0;font-family:Arial,sans-serif;font-size:14px;display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between}} .nlnav a{{color:#1f2a44}} img{{max-width:100%;height:auto}}</style>
</head><body>
<nav class="nlnav" dir="rtl"><a href="../index.html">مدرسة الإيمان · מדרשת האמונה</a><a href="../index.html#/news">أرشيف النشرات · ארכיון הגיליונות</a></nav>
{body}
<p dir="rtl" style="max-width:680px;margin:0 auto 30px;padding:0 18px;text-align:center;font-family:Arial,sans-serif;font-size:13px;color:#555">
<a href="../index.html#/news" style="color:#1f2a44;font-weight:bold">للاشتراك في النشرة الأسبوعية · להרשמה לגיליון השבועי</a> · {d}</p>
</body></html>
"""
    assert '@' not in re.sub(r'<style>.*?</style>', '', page, flags=re.S).replace('@context', ''), 'e-mail address left in page'
    os.makedirs(os.path.join(ROOT, 'newsletter'), exist_ok=True)
    open(os.path.join(ROOT, route), 'w', encoding='utf-8').write(page)

    ip = os.path.join(ROOT, 'newsletter', 'index.json')
    try:
        idx = json.load(open(ip, encoding='utf-8'))
    except Exception:
        idx = []
    idx = [x for x in idx if x.get('date') != date]
    idx.append({'date': date, 'title': title_he, 'titleAr': title_ar, 'url': route})
    idx.sort(key=lambda x: x['date'], reverse=True)
    json.dump(idx, open(ip, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    sp = os.path.join(ROOT, 'sitemap.xml')
    if os.path.exists(sp):
        sm = open(sp, encoding='utf-8').read()
        if url not in sm:
            sm = sm.replace('</urlset>', f'  <url><loc>{url}</loc><lastmod>{date}</lastmod></url>\n</urlset>')
            open(sp, 'w', encoding='utf-8').write(sm)
    print(url)


if __name__ == '__main__':
    main(*sys.argv[1:5])
