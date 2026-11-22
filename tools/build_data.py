# -*- coding: utf-8 -*-
"""
בניית קובצי הנתונים של האתר משלושת קובצי המאגר.

שימוש:
  python3 tools/build_data.py A.xlsx B.xlsx C.xlsx

A = עם הספר לקוראן · B = פירוש האסלאם לתורה (תורה ונ״ך) · C = מדרשת האמונה (מקבילות לפי נושאים)
נוסח המקרא (מסורה, ללא טעמים) ותרגום ון־דייק נלקחים מקורפוס מקומי (bible.py).
הפלט נכתב לתיקייה data/ שליד tools/.
"""
import sys, os, re, json, datetime, unicodedata
from collections import defaultdict
from openpyxl import load_workbook

sys.path.insert(0, '/home/claude/work')
sys.path.insert(0, '/home/claude/work/par')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bible  # noqa: E402
import hebref  # noqa: E402
import dating  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data')

BOOKS = [('Gen', 'בראשית', 'التكوين'), ('Exod', 'שמות', 'الخروج'), ('Lev', 'ויקרא', 'اللاويين'),
         ('Num', 'במדבר', 'العدد'), ('Deut', 'דברים', 'التثنية')]
HE2EN = {h: e for e, h, a in BOOKS}
BOOKAR = {h: a for e, h, a in BOOKS}
ACTIVE = {'פעיל', None, ''}


def S(x):
    """cell -> clean string or None"""
    if x is None:
        return None
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    s = str(x).strip()
    if s.startswith("'"):
        s = s[1:]
    return s or None


def I(x):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def rows(wb, name):
    if name not in wb.sheetnames:
        return [], []
    it = list(wb[name].iter_rows(values_only=True))
    if not it:
        return [], []
    return [S(h) for h in it[0]], [r for r in it[1:] if any(c is not None for c in r)]


INTERNAL = {'origin', 'verify'}  # working metadata: kept in the spreadsheets, not published to readers


def public(o):
    if isinstance(o, dict):
        return {k: public(v) for k, v in o.items() if k not in INTERNAL}
    if isinstance(o, list):
        return [public(v) for v in o]
    return o


def edition(ed):
    """Reader-facing edition line (he, ar) instead of internal tool notes."""
    if not ed:
        return None, None
    he, ar = [], []
    if 'tafsir_api' in ed or ed.startswith('תפסיר'):
        he.append('תפסיר: הנוסח הערבי לפי הדפוס המקובל'); ar.append('التفسير: النص العربي حسب الطبعة المتداولة')
    elif 'רייטר' in ed:
        m = re.search(r'נספח[^.]*', ed)
        he.append('איתור המקור: רייטר ודימנט (עורכים), סלע קיומנו / סלע קיומם, 2021' + (', ' + m.group(0) if m else '') + '. הנוסח הערבי הוקלד מחדש')
        ar.append('تحديد المصدر: رايتر وديمنط (محرران)، «صخرة وجودنا / صخرة وجودهم»، 2021. أُعيدت طباعة النص العربي')
    elif 'הכתיב העות׳מאני' in ed:
        he.append('הקוראן: הכתיב העות׳מאני'); ar.append('القرآن: الرسم العثماني')
    elif 'ון־דייק' in ed:
        he.append('המקרא: נוסח המסורה; בערבית – תרגום ון־דייק (1865)'); ar.append('المقرا: النص الماسوري؛ وبالعربية ترجمة فان دايك (1865)')
    elif 'sunnah.com' in ed:
        he.append('החדית׳: לפי מספור sunnah.com'); ar.append('الحديث: حسب ترقيم sunnah.com')
    elif 'ספריא' in ed or 'Sefaria' in ed:
        he.append('הנוסח העברי: ספריא'); ar.append('النص العبري: سفاريا')
    else:
        he.append(ed); ar.append('')
    if 'התרגום העברי' in ed or 'התרגום לעברית' in ed:
        he.append('התרגום לעברית: תרגום המאגר'); ar.append('الترجمة العبرية: ترجمة القاعدة')
    elif 'התרגום לערבית' in ed:
        he.append('התרגום לערבית: תרגום המאגר'); ar.append('الترجمة العربية: ترجمة القاعدة')
    if 'מקוצר' in ed or 'מקצר' in ed:
        he.append('התרגום מקוצר במקומות המסומנים'); ar.append('الترجمة مختصرة في المواضع المشار إليها')
    return ' · '.join(he), ' · '.join(x for x in ar if x)


def dump(path, obj):
    obj = public(obj)
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))


QREF = re.compile(r'(?<![\d:.])(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?(?![\d:])')


def quran_refs(s):
    out = []
    for m in QREF.finditer(s or ''):
        su, a = int(m.group(1)), int(m.group(2))
        b = int(m.group(3)) if m.group(3) else a
        if 1 <= su <= 114 and 1 <= a <= 286 and b >= a and b - a < 60:
            out.append((su, a, b))
    return out


def norm(s):
    """normalisation for search: strip niqqud/harakat, unify letters"""
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub('[֑-ׇؐ-ًؚ-ٰٟۖ-ۭـ]', '', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    s = s.replace('״', '"').replace('׳', "'").replace('־', ' ')
    return re.sub(r'\s+', ' ', s).strip().lower()


def main(fa, fb, fc):
    A = load_workbook(fa, read_only=True)
    B = load_workbook(fb, read_only=True)
    C = load_workbook(fc, read_only=True)
    search = []  # [kind, label, route, text]

    # ---------------- dating of post-biblical works (C: תיארוך מקורות) ----------------
    _, dtr = rows(C, 'תיארוך מקורות')
    DT = dating.load([[S(c) for c in r] for r in dtr])

    used_dt = set()

    def dt(*texts):
        ks = [k for k in dating.find(*texts) if k in DT]
        used_dt.update(ks)
        return ks or None

    # ---------------- A rows anchored in the Tanakh, shown in reverse on Torah / Nakh pages ----------------
    bnames = sorted(bible.HE_NAME.values(), key=len, reverse=True)
    from_quran = defaultdict(list)   # bookHe -> rows

    def bible_segs(ref):
        out, book = [], None
        for part in re.split(r'\s*;\s*', ref or ''):
            nm = next((n for n in bnames if part.startswith(n + ' ')), None)
            if nm:
                book, body = nm, part[len(nm) + 1:]
            elif book and re.match(r'^[א-ת]{1,3}[׳״]?, ', part):
                body = part
            else:
                book = None
                continue
            try:
                for (c1, v1, c2, v2) in hebref.parse(book + ' ' + body):
                    out.append((book, c1, v1, c2, v2))
            except Exception:
                pass
        return out
    _, vpA = rows(A, 'מקבילות לפי פסוק – סבבים 2–3')
    for r in vpA:
        if S(r[20]) not in ACTIVE or S(r[8]) != 'תנ״ך':
            continue
        m = re.match(r'(\d+):(\d+)(?:-(\d+))?', S(r[5]) or '')
        if not m:
            continue
        su, a = I(r[3]), int(m.group(2))
        b = int(m.group(3)) if m.group(3) else a
        for (book, c1, v1, c2, v2) in bible_segs(S(r[9])):
            from_quran[book].append({'id': S(r[0]), 'c': c1, 'v': v1, 'c2': c2, 'v2': v2, 'su': su, 'a': a, 'b': b,
                                     'ref': S(r[9]), 'refAr': S(r[10]), 'note': S(r[12]), 'noteAr': S(r[13]),
                                     'qAr': S(r[15]), 'qHe': S(r[16]), 'bibleHe': S(r[17]), 'bibleAr': S(r[18]),
                                     'strength': S(r[21]), 'topic': S(r[6])})
            break   # anchor each A row once, at its first Tanakh passage

    def fq_dedupe(fq, pars):
        have = set()
        for x in pars:
            for (su, a, b) in quran_refs(x.get('src') or ''):
                have.add((x['c'], x['v'], su, a))
        return [y for y in fq if not any((y['c'], y['v'], y['su'], k) in have for k in range(y['a'], y['b'] + 1))]

    # ---------------- themes key (A: נושאים) ----------------
    _, th = rows(A, 'נושאים')
    themes = [{'code': S(r[0]), 'he': S(r[1]), 'ar': S(r[2]), 'group': S(r[3])} for r in th if S(r[0])]

    # ---------------- Torah structure ----------------
    _, par = rows(B, 'תורה – פרשות')
    _, uni = rows(B, 'תורה – יחידות ופרשות')
    parashot = []
    for r in par:
        if not S(r[0]) or S(r[1]) not in HE2EN:
            continue
        parashot.append({'i': len(parashot) + 1, 'name': S(r[0]), 'nameAr': S(r[13]) if len(r) > 13 else None,
                         'book': S(r[1]), 'bookAr': BOOKAR.get(S(r[1])), 'from': [I(r[2]), I(r[3])],
                         'to': [I(r[4]), I(r[5])], 'verses': I(r[6]), 'themes': S(r[9]),
                         'questions': S(r[12]) if len(r) > 12 else None, 'questionsAr': S(r[14]) if len(r) > 14 else None})
    units = []
    for r in uni:
        if S(r[0]) not in HE2EN:
            continue
        units.append({'book': S(r[0]), 'from': [I(r[1]), I(r[2])], 'to': [I(r[10]), I(r[11])], 'name': S(r[3]),
                      'nameAr': S(r[14]) if len(r) > 14 else None,
                      'type': S(r[4]), 'themes': S(r[6]), 'group': S(r[7])})

    # Torah parallels (B)
    h, tor = rows(B, 'תורה ← קוראן וחדית׳')
    col = {k: i for i, k in enumerate(h)}

    def g(r, name):
        i = col.get(name)
        return S(r[i]) if i is not None and i < len(r) else None
    tpar = defaultdict(list)
    for r in tor:
        if g(r, 'מצב') not in ACTIVE:
            continue
        bk = S(r[0])
        if bk not in HE2EN:
            continue
        p = {'id': g(r, 'מזהה'), 'c': I(r[1]), 'v': I(r[2]), 'ref': g(r, 'הפניה במקרא'), 'refAr': g(r, 'المرجع'),
             'bibleHe': g(r, 'מקרא – עברית'), 'bibleAr': g(r, 'مقرا – عربي (ون دايك)'),
             'type': g(r, 'סוג'), 'src': g(r, 'המקור האסלאמי'), 'srcAr': g(r, 'المصدر'), 'origin': g(r, 'מקור הזיהוי'),
             'note': g(r, 'הקשר / הערה'), 'noteAr': g(r, 'الصلة / ملاحظة'), 'textAr': g(r, 'טקסט ערבי (קוראן / חדית׳)'),
             'textHe': g(r, 'תרגום עברי (טיוטה)'), 'verify': g(r, 'אימות'), 'strength': g(r, 'עוצמת הקשר'),
             'unit': g(r, 'יחידה בתורה (סיפור/חוק)'), 'themes': g(r, 'נושאים'),
             'hadithHe': g(r, 'חדית׳ מתורגמים נוספים (מאגר המועמדים, 17.11)'),
             'hadithAr': g(r, 'أحاديث مترجمة إضافية (مجموعة المرشحين)')}
        p['dt'] = dt(p['src'], p['note'])
        tpar[bk].append(p)

    # Saadia notes
    _, sa = rows(B, 'תפסיר רס״ג – הערות')
    saadia = defaultdict(list)
    for r in sa:
        saadia[S(r[0])].append({'c': I(r[1]), 'v': I(r[2]), 'ref': S(r[3]), 'phrase': S(r[4]), 'vd': S(r[5]),
                                'sa': S(r[6]), 'saHeb': S(r[7]), 'tr': S(r[8]), 'note': S(r[9]), 'verify': S(r[10]),
                                'trAr': S(r[12]) if len(r) > 12 else None, 'noteAr': S(r[13]) if len(r) > 13 else None})

    def inrange(c, v, fr, to):
        return tuple(fr) <= (c, v) <= tuple(to)

    reverse_q = defaultdict(list)   # (sura) -> list of bible parallels
    plist = []
    nfq_t = 0
    for p in parashot:
        en = HE2EN[p['book']]
        vs = []
        for (_, c, v) in bible.expand_heb(en, p['from'][0], p['from'][1], p['to'][0], p['to'][1]):
            he, ar = bible.verse_heb(en, c, v)
            ec, ev = bible.heb2eng(en, c, v)
            vs.append({'c': c, 'v': v, 'he': he, 'ar': ar, 'vd': None if (ec, ev) == (c, v) else f'{ec}:{ev}'})
        us = [u for u in units if u['book'] == p['book'] and inrange(u['from'][0], u['from'][1], p['from'], p['to'])
              or (u['book'] == p['book'] and inrange(p['from'][0], p['from'][1], u['from'], u['to']))]
        pars = sorted([x for x in tpar[p['book']] if x['c'] and inrange(x['c'], x['v'], p['from'], p['to'])],
                      key=lambda x: (x['c'], x['v']))
        sas = [x for x in saadia[p['book']] if x['c'] and inrange(x['c'], x['v'], p['from'], p['to'])]
        fq = fq_dedupe(sorted([x for x in from_quran[p['book']] if inrange(x['c'], x['v'], p['from'], p['to'])],
                              key=lambda x: (x['c'], x['v'])), pars)
        dump(f'torah/{p["i"]:02d}.json', {'parasha': p, 'units': us, 'verses': vs, 'parallels': pars, 'saadia': sas, 'fromQuran': fq})
        plist.append(dict(p, parallels=len(pars) + len(fq), saadia=len(sas)))
        nfq_t += len(fq)
        for x in pars:
            for (su, a, b) in quran_refs((x['src'] or '') if 'קוראן' in (x['type'] or '') or re.match(r'^\d', x['src'] or '') else ''):
                reverse_q[su].append({'a': a, 'b': b, 'ref': x['ref'], 'route': f'b/{p["i"]}/{x["c"]}:{x["v"]}',
                                      'note': x['note'], 'noteAr': x['noteAr'], 'strength': x['strength'],
                                      'refAr': x['refAr'], 'bibleHe': x['bibleHe'], 'bibleAr': x['bibleAr']})
            search.append(['b', f'{x["ref"]} ⇄ {x["src"] or ""}', f'b/{p["i"]}/{x["c"]}:{x["v"]}',
                           norm(' '.join(filter(None, [x['ref'], x['src'], x['srcAr'], x['note'], x['noteAr'], x['textHe']])))])
        for x in sas:
            search.append(['s', f'רס״ג: {x["ref"]} – {x["phrase"]}', f'b/{p["i"]}/{x["c"]}:{x["v"]}',
                           norm(' '.join(filter(None, [x['phrase'], x['sa'], x['tr'], x['note']])))])

    # Nakh
    h2, nak = rows(B, 'נביאים וכתובים ← קוראן וחדית׳')
    col2 = {k: i for i, k in enumerate(h2)}
    nbooks = defaultdict(list)
    for r in nak:
        def g2(name):
            i = col2.get(name)
            return S(r[i]) if i is not None and i < len(r) else None
        if g2('מצב') not in ACTIVE:
            continue
        nbooks[S(r[0])].append({'id': g2('מזהה'), 'c': I(r[1]), 'v': I(r[2]), 'ref': g2('הפניה במקרא'), 'refAr': g2('المرجع'),
                                'bibleHe': g2('מקרא – עברית'), 'bibleAr': g2('مقرا – عربي (ون دايك)'), 'type': g2('סוג'),
                                'src': g2('המקור האסלאמי'), 'srcAr': g2('المصدر'), 'origin': g2('מקור הזיהוי'),
                                'note': g2('הקשר / הערה'), 'noteAr': g2('الصلة / ملاحظة'),
                                'textAr': g2('טקסט ערבי (קוראן / חדית׳)'), 'textHe': g2('תרגום עברי (טיוטה)'),
                                'verify': g2('אימות'), 'strength': g2('עוצמת הקשר'),
                                'dt': dt(g2('המקור האסלאמי'), g2('הקשר / הערה'))})
    order = [v for k, v in bible.HE_NAME.items() if k in bible.HEFILE][5:]
    nak_list = []
    nfq_n = 0
    for bk in sorted(set(nbooks) | {b for b in from_quran if b in order}, key=lambda b: order.index(b) if b in order else 99):
        lst = sorted(nbooks[bk], key=lambda x: (x['c'] or 0, x['v'] or 0))
        fq = fq_dedupe(sorted(from_quran.get(bk, []), key=lambda x: (x['c'], x['v'])), lst)
        nfq_n += len(fq)
        nak_list.append({'book': bk, 'count': len(lst) + len(fq)})
        dump(f'nakh/{len(nak_list):02d}.json', {'book': bk, 'parallels': lst, 'fromQuran': fq})
        for x in fq:
            search.append(['n', f'{x["ref"]} ⇄ {x["su"]}:{x["a"]}', f'n/{len(nak_list)}/{x["c"]}:{x["v"]}',
                           norm(' '.join(filter(None, [x['ref'], x['note'], x['noteAr'], x['topic']])))])
        for x in lst:
            for (su, a, b) in quran_refs(x['src'] if 'קוראן' in (x['type'] or '') or re.match(r'^\d', x['src'] or '') else ''):
                reverse_q[su].append({'a': a, 'b': b, 'ref': x['ref'], 'route': f'n/{len(nak_list)}/{x["c"]}:{x["v"]}',
                                      'note': x['note'], 'noteAr': x['noteAr'], 'strength': x['strength'],
                                      'refAr': x['refAr'], 'bibleHe': x['bibleHe'], 'bibleAr': x['bibleAr']})
            search.append(['n', f'{x["ref"]} ⇄ {x["src"] or ""}', f'n/{len(nak_list)}/{x["c"]}:{x["v"]}',
                           norm(' '.join(filter(None, [x['ref'], x['src'], x['srcAr'], x['note'], x['noteAr'], x['textHe']])))])

    # ---------------- Quran (A) ----------------
    hq, q = rows(A, 'קוראן')
    _, tn = rows(A, 'הערות תרגום')
    tnotes = defaultdict(list)
    for r in tn:
        m = re.match(r'(\d+):(\d+)', S(r[0]) or '')
        if m:
            tnotes[(int(m.group(1)), int(m.group(2)))].append(S(r[1]))
    hv, vp = rows(A, 'מקבילות לפי פסוק – סבבים 2–3')
    vpar = defaultdict(list)
    for r in vp:
        if S(r[20]) not in ACTIVE:
            continue
        su = I(r[3])
        rng = S(r[5]) or ''
        m = re.match(r'(\d+):(\d+)(?:-(\d+))?', rng)
        a = int(m.group(2)) if m else None
        b = int(m.group(3)) if m and m.group(3) else a
        vpar[su].append({'id': S(r[0]), 'a': a, 'b': b, 'corpus': S(r[8]), 'ref': S(r[9]), 'refAr': S(r[10]),
                         'note': S(r[12]), 'noteAr': S(r[13]), 'srcHe': S(r[17]), 'srcAr': S(r[18]),
                         'context': S(r[19]), 'strength': S(r[21]), 'topic': S(r[6]),
                         'dt': dt(S(r[9]), S(r[12]))})
    hp, pp = rows(A, 'מקבילות')
    for r in pp:
        anc = quran_refs(S(r[1]))
        if not anc:
            continue
        su, a, b = anc[0]
        vpar[su].append({'id': S(r[0]), 'a': a, 'b': b, 'corpus': S(r[8]), 'ref': S(r[3]), 'refAr': None,
                         'note': S(r[6]), 'noteAr': S(r[7]), 'srcHe': S(r[10]), 'srcAr': S(r[11]),
                         'context': None, 'strength': S(r[4]), 'topic': None, 'edition': S(r[13]),
                         'dt': dt(S(r[3]), S(r[6]))})
    suras = defaultdict(list)
    names = {}
    for r in q:
        su, v = I(r[0]), I(r[2])
        if not su:
            continue
        names[su] = S(r[1])
        suras[su].append({'v': v, 'ar': S(r[3]), 'he': S(r[4]), 'topics': S(r[5]), 'story': S(r[6]),
                          'notes': tnotes.get((su, v)) or None, 'hadith': S(r[10])})
    sura_list = []
    for su in sorted(suras):
        dump(f'quran/{su:03d}.json', {'n': su, 'name': names[su], 'verses': suras[su],
                                      'parallels': sorted(vpar[su], key=lambda x: (x['a'] or 0)),
                                      'bible': sorted(reverse_q[su], key=lambda x: x['a'])})
        sura_list.append({'n': su, 'name': names[su], 'verses': len(suras[su]),
                          'parallels': len(vpar[su]) + len(reverse_q[su])})
        for x in vpar[su]:
            search.append(['a', f'{su}:{x["a"]} ⇄ {x["ref"] or ""}', f'a/{su}/{x["a"]}',
                           norm(' '.join(filter(None, [x['ref'], x['refAr'], x['note'], x['noteAr'], x['topic']])))])
        for (k, notes) in [(k, n) for k, n in tnotes.items() if k[0] == su]:
            search.append(['t', f'הערת תרגום {su}:{k[1]}', f'a/{su}/{k[1]}', norm(' '.join(notes))])

    # Quran full text search index (separate, larger)
    qsearch = [[su, x['v'], norm(x['ar']), norm(x['he'])] for su in sorted(suras) for x in suras[su]]
    dump('search_quran.json', qsearch)

    # ---------------- Hadith texts (A) ----------------
    _, ht = rows(A, 'טקסטים – חדית׳')
    hadith = defaultdict(list)
    for i, r in enumerate(ht, 2):
        if not S(r[0]):
            continue
        hadith[S(r[0])].append({'row': i, 'n': S(r[2]), 'book': S(r[3]), 'ar': S(r[4]),
                                'he': S(r[5]) if len(r) > 5 else None})
    coll_list = []
    for k, (coll, lst) in enumerate(sorted(hadith.items(), key=lambda kv: -len(kv[1])), 1):
        dump(f'hadith/{k:02d}.json', {'collection': coll, 'items': lst})
        coll_list.append({'i': k, 'collection': coll, 'count': len(lst), 'translated': sum(1 for x in lst if x['he'])})
        for x in lst:
            if x['he']:
                search.append(['h', f'{coll} {x["n"]}', f'h/{k}/{x["n"]}', norm((x['he'] or '')[:600])])

    # ---------------- Book C ----------------
    hc, tc = rows(C, 'מקבילות נושאיות')
    keys = ['code', 'group', 'kind', 'title', 'titleAr', 'quran', 'hadith', 'torah', 'nakh', 'jewish', 'nt',
            'summary', 'summaryAr', 'themeCodes', 'quranVerses', None, None, None, 'origin', 'linksHe', 'linksAr',
            'question', 'verify', 'moreIslam', 'moreJewish', 'deepen', 'questionAr', 'deepenAr', 'related']
    ctopics = []
    for r in tc:
        d = {k: S(r[i]) for i, k in enumerate(keys) if k and i < len(r)}
        if d.get('code'):
            d['dt'] = {k: v for k in ('quran', 'hadith', 'torah', 'nakh', 'jewish', 'nt', 'moreIslam', 'moreJewish', 'deepen', 'summary')
                       for v in [dt(d.get(k))] if v} or None
            ctopics.append(d)
            search.append(['c', f'{d["code"]} {d.get("title") or ""}', f'c/{d["code"]}',
                           norm(' '.join(filter(None, [d.get(k) for k in ('title', 'titleAr', 'summary', 'summaryAr', 'quran',
                                                                          'hadith', 'torah', 'nakh', 'jewish', 'deepen', 'question')])))])
    _, srcs = rows(C, 'מקורות מלאים לנושאים')
    bycode = defaultdict(list)
    for r in srcs:
        bycode[S(r[0])].append({'kind': S(r[1]), 'kindAr': S(r[2]), 'ref': S(r[3]), 'refAr': S(r[4]), 'he': S(r[5]),
                                'ar': S(r[6]), 'note': S(r[7]), 'noteAr': S(r[8]), 'dt': dt(S(r[3]), S(r[7])),
                                'ed': edition(S(r[9]) + ('; התרגום לערבית' if S(r[6]) and S(r[1]) == 'משנה' else ''))[0],
                                'edAr': edition(S(r[9]) + ('; התרגום לערבית' if S(r[6]) and S(r[1]) == 'משנה' else ''))[1]})
    for d in ctopics:
        dump(f'topics/{d["code"]}.json', dict(d, sources=bycode.get(d['code'], [])))
        d['nsources'] = len(bycode.get(d['code'], []))
    dump('themes.json', {'topics': [{k: d.get(k) for k in ('code', 'group', 'kind', 'title', 'titleAr', 'summary', 'summaryAr', 'nsources')} for d in ctopics],
                         'key': themes})
    app = {}
    for name, slug in [('מחלוקות יסוד עתיקות', 'disputes'), ('שורשים תאומים', 'roots'),
                       ('פנינים מקבילות', 'pearls'), ('צומתי מפגש היסטוריים', 'crossroads')]:
        h, rr = rows(C, name)
        keep = [j for j, x in enumerate(h) if x and not str(x).startswith('אימות') and x != 'מקור']
        app[slug] = {'title': name, 'headers': [h[j] for j in keep], 'rows': [[S(r[j]) if j < len(r) else None for j in keep] for r in rr],
                     'dt': [dt(*[S(r[j]) for j in keep if j < len(r) and not re.search(r'ערבית|عربي', h[j] or '')]) for r in rr]}
        for r in rr:
            search.append(['x', f'{name}: {S(r[0])} {S(r[1]) or ""}', f'x/{slug}',
                           norm(' '.join(filter(None, [S(c) for c in r])))])
    dump('appendices.json', app)

    used_dt.add('saadia')
    meta = {'built': datetime.date.today().isoformat(), 'dating': {k: v for k, v in DT.items() if k in used_dt},
            'parashot': plist, 'nakh': nak_list, 'suras': sura_list, 'hadith': coll_list, 'themes': themes,
            'counts': {'torahParallels': sum(len(v) for v in tpar.values()), 'nakhParallels': sum(len(v) for v in nbooks.values()),
                       'quranParallels': sum(len(v) for v in vpar.values()), 'topics': len(ctopics),
                       'fromQuranOnBible': nfq_n + nfq_t,
                       'hadith': sum(len(v) for v in hadith.values()),
                       'hadithTranslated': sum(c['translated'] for c in coll_list)}}
    dump('meta.json', meta)
    dump('search.json', search)
    print(json.dumps(meta['counts'], ensure_ascii=False))


if __name__ == '__main__':
    main(*sys.argv[1:4])
