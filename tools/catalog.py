#!/usr/bin/env python3
"""Compact plain-text catalogue of what the database already holds (ids, references, titles only, no texts).
Written to catalog/*.txt so that collaborators (e.g. Gemini) can check for duplicates before proposing additions.
Run after build_data.py (it reads the built data/ folder)."""
import json, os, glob, datetime
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'catalog')


def J(p):
    return json.load(open(os.path.join(D, p), encoding='utf-8'))


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = J('meta.json')
    head = f"# מדרשת האמונה – קטלוג המאגר (נבנה {meta['built']}). מזהים ומראי מקום בלבד, בלי טקסטים.\n"
    files = {}
    # topics
    th = J('themes.json')
    lines = [head, '# נושאים: קוד | קבוצה | כותרת | عنوان | מספר מקורות']
    for t in th['topics']:
        lines.append(f"{t['code']} | {t.get('group') or ''} | {t.get('title') or ''} | {t.get('titleAr') or ''} | {t.get('nsources') or 0}")
    files['topics.txt'] = lines
    # appendices
    app = J('appendices.json')
    lines = [head]
    for slug, a in app.items():
        lines.append(f"\n# {a['title']} ({slug}): {' | '.join(a['headers'][:4])}")
        for r in a['rows']:
            lines.append(' | '.join((str(c) if c is not None else '')[:90].replace('\n', ' ') for c in r[:4]))
    files['appendices.txt'] = lines
    # quran: per sura, verse range → source reference
    lines = [head, '# קוראן: סורה:פסוקים | מזהה | קורפוס | מראה המקום המקביל']
    for f in sorted(glob.glob(os.path.join(D, 'quran', '*.json'))):
        q = json.load(open(f, encoding='utf-8'))
        for p in sorted(q.get('parallels', []), key=lambda x: (x['a'], x['b'])):
            rng = f"{q['n']}:{p['a']}" + (f"–{p['b']}" if p['b'] != p['a'] else '')
            lines.append(f"{rng} | {p['id']} | {p.get('corpus') or ''} | {p.get('ref') or ''}")
        for p in sorted(q.get('bible', []), key=lambda x: (x['a'], x['b'])):   # story-level biblical links (sheet "מקרא וחז״ל ↔ קוראן")
            rng = f"{q['n']}:{p['a']}" + (f"–{p['b']}" if p['b'] != p['a'] else '')
            lines.append(f"{rng} | (סיפור) | מקרא | {p.get('ref') or ''}")
    files['quran.txt'] = lines
    # torah and nakh
    for sub, name, title in (('torah', 'torah.txt', 'תורה: מזהה | פרשה | הפניה במקרא | סוג | המקור האסלאמי'),
                             ('nakh', 'nakh.txt', 'נביאים וכתובים: מזהה | ספר | הפניה במקרא | סוג | המקור האסלאמי')):
        lines = [head, '# ' + title]
        for f in sorted(glob.glob(os.path.join(D, sub, '*.json'))):
            b = json.load(open(f, encoding='utf-8'))
            nm = b['parasha']['name'] if isinstance(b.get('parasha'), dict) else (b['book'].get('name') if isinstance(b.get('book'), dict) else b.get('book'))
            for p in b.get('parallels', []):
                lines.append(f"{p.get('id')} | {nm} | {p.get('ref') or ''} | {p.get('type') or ''} | {p.get('src') or ''}")
        if sub == 'torah':      # one file per book keeps each file small
            for k, bk in enumerate(['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'], 1):
                files[f'torah{k}.txt'] = lines[:2] + [l for l in lines[2:] if l.split(' | ')[2].startswith(bk)]
        else:
            files[name] = lines
    # hadith translated
    lines = [head, '# חדית׳ מתורגמים לעברית: אוסף | מספר']
    for f in sorted(glob.glob(os.path.join(D, 'hadith', '*.json'))):
        h = json.load(open(f, encoding='utf-8'))
        nums = [str(x['n']) for x in h['items'] if x.get('he')]
        if nums:
            lines.append(f"{h['collection']}: {', '.join(nums)}")
    files['hadith.txt'] = lines
    idx = [head, '# קבצים:'] + [f'- {k} ({len(v) - 2} שורות)' for k, v in files.items()]
    files['index.txt'] = idx
    for k, v in files.items():
        with open(os.path.join(OUT, k), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(v) + '\n')
    return {k: len(v) for k, v in files.items()}


if __name__ == '__main__':
    print(main())
