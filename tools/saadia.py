# -*- coding: utf-8 -*-
"""Saadia Gaon's Tafsir (Judeo-Arabic, Hebrew letters; Sefaria "Tafsir Rasag") -> Arabic script, per parasha.

Input:  $CORPORA/saadia/tafsir_rasag.json  ({Genesis: [[verse, ...], ...], ...}, Masoretic numbering)
Output: data/saadia/<pp>.json  {"c:v": [arabic, hebrew-letters]} for every verse of the parasha.

The transliteration is rule-based: letters one-to-one (dotted letters: ג̇=ج, plain ג=غ in this edition),
plus a list for the two hard cases – final ה (ة or the pronoun ه) and final י (ى).
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = {'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy'}
DOT = '̇'
DOTTED = {'ת': 'ث', 'כ': 'خ', 'ך': 'خ', 'ד': 'ذ', 'צ': 'ض', 'ץ': 'ض', 'ט': 'ظ', 'ג': 'ج'}
PLAIN = {'א': 'ا', 'ב': 'ب', 'ג': 'غ', 'ד': 'د', 'ה': 'ه', 'ו': 'و', 'ז': 'ز', 'ח': 'ح', 'ט': 'ط', 'י': 'ي', 'כ': 'ك', 'ך': 'ك',
         'ל': 'ل', 'מ': 'م', 'ם': 'م', 'נ': 'ن', 'ן': 'ن', 'ס': 'س', 'ע': 'ع', 'פ': 'ف', 'ף': 'ف', 'צ': 'ص', 'ץ': 'ص', 'ק': 'ق',
         'ר': 'ر', 'ש': 'ش', 'ת': 'ت'}
# words (without prefixes) whose final ה is ة; everything else that is indefinite gets ه
TAA = set('''סנה סבעה פצ̇ה זוג̇ה ואחדה צנעה כ̇מסה עשרה מראה אמראה נחלה עט̇ימה ג̇מאעה שריעה רפיעה ג̇הה סתה בהימה ת̇לאת̇ה ת̇לת̇ה ארבעה
צנאעה סלאמה שדידה כת̇ירה צ̇יעה לילה חג̇ארה עלאמה כבירה זיאדה חוזה עשירה מרה כת̇רה שאה נג̇סה עדה טאעה ברכה כ̇צומה אמאמה? חצ̇רה
קאעדה קבאלה חסנה קאילה מדה צחיחה מצ̇אג̇עה עאדלה ארמלה ממדודה אג̇נחה כריהה ת̇מרה ממלכה שג̇רה מערפה דכה מסאפה גדאה מסאחה מעתדלה
ממסוחה עקובה מקבולה קריבה סארה רבקה בלהה זלפה עמורה אהליבמה ת̇מאניה עשרה צגירה כבירה טיבה רדיה מיתה חיה ג̇דידה קדימה'''.replace('?', '').split())
NAMES = {'יהודה': 'يهوذا', 'מנשה': 'منسّى', 'לאה': 'ليئة', 'אללה': 'الله', 'ללה': 'لله', 'עשו': 'عيسو', 'לבן': 'لابان', 'הרון': 'هارون',
         'רבקה': 'رفقة', 'רחל': 'راحيل', 'דינה': 'دينة', 'סארה': 'سارة', 'מוסי': 'موسى', 'אסראיל': 'إسرائيل', 'אברהים': 'إبراهيم', 'אסחק': 'إسحاق', 'אלאה': 'إله', 'אלה': 'إله', 'אלאהא': 'إلهًا'}
ALIF_MAQSURA = {'אלי': 'إلى', 'עלי': 'على', 'חתי': 'حتى', 'מתי': 'متى', 'לדי': 'لدى', 'אדני': 'أدنى', 'מוסי': 'موسى', 'עיסי': 'عيسى',
                'יחיי': 'يحيى', 'פואפי': 'فوافى', 'ואפי': 'وافى', 'רמי': 'رمى', 'מצ̇י': 'مضى', 'אתי': 'أتى', 'ואתי': 'وأتى', 'פאתי': 'فأتى',
                'בקי': 'بقى', 'אעטי': 'أعطى', 'ואעטי': 'وأعطى', 'דעי': 'دعا', 'ודעי': 'ودعا', 'סמי': 'سمّى', 'וסמי': 'وسمّى', 'אכ̇רי': 'أخرى', 'אלאכ̇רי': 'الأخرى'}
PREF = re.compile(r'^([ופבלכ]{0,2})(.*)$')


def letters(w):
    out, i = [], 0
    while i < len(w):
        ch = w[i]
        if i + 1 < len(w) and w[i + 1] == DOT:
            out.append(DOTTED.get(ch, PLAIN.get(ch, ch))); i += 2; continue
        out.append(PLAIN.get(ch, ch)); i += 1
    return ''.join(out)


def word(w):
    if w in NAMES: return NAMES[w]
    if w in ALIF_MAQSURA: return ALIF_MAQSURA[w]
    m = PREF.match(w)
    for k in range(len(m.group(1)) + 1):          # try with fewer prefix letters stripped
        p, core = w[:k], w[k:]
        if core in NAMES: return letters(p) + NAMES[core]
        if core in ALIF_MAQSURA: return letters(p) + ALIF_MAQSURA[core]
    a = letters(w)
    if w.endswith('ה') and len(w) > 2:
        definite = re.match(r'^[ופבכ]?(אל|לל)', w) is not None
        core = w
        for k in range(len(m.group(1)) + 1):
            if w[k:] in TAA: core = w[k:]; break
        stem = w[len(m.group(1)):] if not definite else w
        participle = re.match(r'^מ(סת|ת)', stem) is not None and len(stem) >= 5
        if core in TAA or definite or participle:
            a = a[:-1] + 'ة'
    if w.startswith('אל') and len(w) > 3: a = 'ال' + a[2:]
    return a


def translit(s):
    return re.sub(r'[א-ת̇]+', lambda m: word(m.group(0)), s)


def build(corpora):
    src = os.path.join(corpora, 'saadia', 'tafsir_rasag.json')
    if not os.path.exists(src):
        print('saadia: corpus missing, skipped'); return 0
    T = json.load(open(src, encoding='utf-8'))
    out_dir = os.path.join(ROOT, 'data', 'saadia'); os.makedirs(out_dir, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(os.path.join(ROOT, 'data', 'torah'))):
        d = json.load(open(os.path.join(ROOT, 'data', 'torah', f), encoding='utf-8'))
        book = BOOKS.get(d['parasha']['book'])
        if not book: continue
        res = {}
        for v in d['verses']:
            try:
                he = T[book][v['c'] - 1][v['v'] - 1]
            except (IndexError, KeyError):
                continue
            if he:
                res[f"{v['c']}:{v['v']}"] = [translit(he), he]; n += 1
        json.dump(res, open(os.path.join(out_dir, f), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('saadia verses', n)
    return n


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        for s in sys.argv[2:]: print(translit(s))
    else:
        build(os.environ.get('CORPORA', '/home/claude/src/'))
