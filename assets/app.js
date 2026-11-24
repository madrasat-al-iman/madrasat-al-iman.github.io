/* מדרשת האמונה · مدرسة الإيمان — אתר המאגר (קוד לקוח, ללא תלות חיצונית) */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const cache = {};
let META = null;

/* ---------- helpers ---------- */
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pre = s => esc(s).replace(/\n/g, '<br>');
/** bilingual label */
// Arabic first everywhere, except the Torah / Nakh sections (DB B), where Hebrew leads
let HEF = false;
const L = (he, ar) => HEF ? `<span class="l-he">${he}</span><span class="l-ar" lang="ar">${ar}</span>` : `<span class="l-ar" lang="ar">${ar}</span><span class="l-he">${he}</span>`;
const NEWS_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSe1PneLa7cO6eKE2X4e95ls7tM-3C8emGgp_rlZvDlTSaRG2w/viewform';
const newsBox = (head = true) => `<div class="newsbox" id="newsletter">${head ? `<h2>${L('הגיליון השבועי', 'النشرة الأسبوعية')}</h2>` : ''}
  <div class="two"><p class="col-he">גיליון שבועי דו־לשוני בנושאי אמונה בין־דתיים – בין האסלאם ליהדות. אפשר להסיר את ההרשמה בכל עת בתשובה לגיליון במילה „הסר“. כתובתך לא תועבר לאיש.</p>
  <p class="col-ar ar" lang="ar">نشرة أسبوعية ثنائية اللغة في قضايا الإيمان بين الأديان – بين الإسلام واليهودية. يمكن إلغاء الاشتراك في أي وقت بالرد على النشرة بكلمة «إلغاء». لا نشارك عنوانك مع أي جهة.</p></div>
  <p><a class="btn primary" href="${NEWS_FORM}" target="_blank" rel="noopener">${L('להרשמה לגיליון', 'للاشتراك في النشرة')}</a> <a class="btn" href="#/news">${L('ארכיון הגיליונות', 'أرشيف النشرات')}</a></p></div>`;
const flipT = t => HEF ? t : t.split(' · ').reverse().join(' · ');
const PENDING = `<span class="pending" lang="ar">الترجمة العربية قيد الإعداد</span>`;
const PENDING_HE = `<span class="pending">התרגום לעברית – בהכנה</span>`;
async function J(path) {
  if (!cache[path]) cache[path] = fetch('data/' + path).then(r => { if (!r.ok) throw new Error(path); return r.json(); });
  return cache[path];
}
const pad = (n, w) => String(n).padStart(w, '0');
function gem(n) {
  if (n == null) return '';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  let s = n >= 100 ? 'ק' : ''; n %= 100;
  if (n === 15) return s + 'טו'; if (n === 16) return s + 'טז';
  return s + tens[Math.floor(n / 10)] + ones[n % 10];
}
const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); }
function copy(text) { navigator.clipboard.writeText(text).then(() => toast('הועתק · تم النسخ'), () => toast('ההעתקה נכשלה · فشل النسخ')); }
const QREF = /(?<![\d:.])(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?(?![\d:])/g;
function quranRefs(s) {
  const out = []; if (!s) return out;
  for (const m of s.matchAll(QREF)) { const su = +m[1], a = +m[2]; if (su >= 1 && su <= 114 && a >= 1 && a <= 286) out.push([su, a, m[3] ? +m[3] : a]); }
  return out;
}
function linkQuran(s) {
  return esc(s).replace(/(?<![\d:.])(\d{1,3}):(\d{1,3})((?:\s*[–-]\s*\d{1,3})?)(?![\d:])/g, (m, su, a, rest) =>
    (+su >= 1 && +su <= 114) ? `<a href="#/a/${su}/${a}"><bdi dir="ltr">${su}:${a}${rest}</bdi></a>` : m);
}
function norm(s) {
  return (s || '').normalize('NFKD').replace(/[̀-֑ͯ-ׇؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/״/g, '"').replace(/׳/g, "'").replace(/־/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
const STRENGTH_AR = { 'מובהקת': 'صريحة', 'נושאית': 'موضوعية', 'נושאי': 'موضوعي', 'אפשרית': 'محتملة', 'מקבילה ישירה': 'توازٍ مباشر', 'רקע': 'خلفية', 'רקע / השפעה': 'خلفية / تأثير',
  'הד לשוני': 'صدى لغوي', 'לשוני': 'لغوي', 'פרשנות מקבילה': 'تفسير موازٍ', 'הגשמה': 'تحقّق', 'ניגוד': 'تضاد' };
const TYPE_AR = { 'קוראן': 'قرآن', 'חדית׳': 'حديث', 'קוראן וחדית׳': 'قرآن وحديث', 'תנ״ך': 'التناخ', 'בבלי': 'التلمود البابلي', 'ירושלמי': 'التلمود الأورشليمي',
  'משנה': 'المشنا', 'מדרש': 'المدراش', 'ברית חדשה': 'العهد الجديد', 'תנ״ך – כתובים': 'التناخ – الكتب', 'תנ״ך – נביאים': 'التناخ – الأنبياء', 'תורה': 'التوراة',
  'סיפור': 'قصة', 'חוק': 'شريعة', 'אפוקריפה נוצרית': 'أبوكريفا مسيحية', 'חז״ל': 'أدب الحكماء', 'יהודי-הלניסטי': 'يهودي هلنستي',
  'מחקר – לשון': 'بحث لغوي', 'נוצרי סורי': 'سرياني مسيحي', 'ספרות סורית': 'أدب سرياني', 'קוראן (פנימי)': 'قرآن (داخلي)', 'תורה + מדרש': 'توراة ومدراش',
  'תפסיר': 'تفسير', 'תרגום': 'ترجوم', 'קוראן ותפסיר': 'قرآن وتفسير', 'מקרא': 'مقرا', 'נושא': 'موضوع', 'פרשנות': 'تفسير', 'ספרות חיצונית': 'أدب خارجي', 'מקבילה ישירה': 'توازٍ مباشر', 'ניגוד': 'تضاد' };
const tr = (he, map) => he ? L(esc(he), esc(map[he] || he)) : '';
/* estimated dating of post-biblical works (Tanakh, Quran and hadith are left undated on purpose) */
const shortName = (n, ar) => (n || '').split(ar ? /،\s| \(/ : /,\s| \(/)[0];
function dtLine(keys) {
  const D = (META && META.dating) || {}; keys = (keys || []).filter(k => D[k]);
  if (!keys.length) return '';
  const tip = (k, ar) => esc([D[k][ar ? 1 : 0], D[k][ar ? 5 : 4]].filter(Boolean).join(' · '));
  return `<div class="dt"><span class="l-he"><b>תיארוך משוער:</b> ${keys.map(k => `<span title="${tip(k)}">${esc(shortName(D[k][0]))} – ${esc(D[k][2])}</span>`).join(' · ')}</span><span class="l-ar" lang="ar"><b>التأريخ التقريبي:</b> ${keys.map(k => `<span title="${tip(k, 1)}">${esc(shortName(D[k][1], 1))} – ${esc(D[k][3])}</span>`).join(' · ')}</span></div>`;
}
const dtShort = k => { const D = (META && META.dating) || {}; return D[k] ? L(esc(D[k][2]), esc(D[k][3])) : ''; };
function strengthChip(s) {
  if (!s || s === 'לא סווג') return '';
  return `<span class="chip ${s === 'מובהקת' ? 'strong' : (/^נושאי/.test(s) ? '' : 'weak')}">${tr(s, STRENGTH_AR)}</span>`;
}
/* Hebrew reference → Arabic (Tanakh, Mishnah, Talmud) */
const gemVal = g => [...(g || '').replace(/[״׳"']/g, '')].reduce((n, ch) => n + ({ 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 }[ch] || 0), 0);
const TRACT_AR = { 'ברכות': 'براخوت', 'שבת': 'شبات', 'עירובין': 'عيروفين', 'פסחים': 'بساحيم', 'יומא': 'يوما', 'סוכה': 'سوكا', 'ביצה': 'بيتسا', 'ראש השנה': 'روش هشناه', 'תענית': 'تعنيت', 'מגילה': 'مجيلاه',
  'מועד קטן': 'موعيد قاطان', 'חגיגה': 'حجيجا', 'יבמות': 'يفاموت', 'כתובות': 'كتوبوت', 'נדרים': 'ندريم', 'נזיר': 'نازير', 'סוטה': 'سوطا', 'גיטין': 'جيطين', 'קידושין': 'قيدوشين', 'בבא קמא': 'بابا قاما',
  'בבא מציעא': 'بابا متسيعا', 'בבא בתרא': 'بابا بترا', 'סנהדרין': 'سنهدرين', 'מכות': 'ماكوت', 'שבועות': 'شفوعوت', 'עבודה זרה': 'عفوداه زاراه', 'הוריות': 'هورايوت', 'זבחים': 'زفاحيم', 'מנחות': 'مناحوت',
  'חולין': 'حولين', 'בכורות': 'بخوروت', 'ערכין': 'عراخين', 'תמורה': 'تموراه', 'כריתות': 'كريتوت', 'מעילה': 'مِعيلا', 'תמיד': 'تاميد', 'מידות': 'ميدوت', 'נדה': 'نيداه', 'אבות': 'أبوت (فصول الآباء)', 'פאה': 'بيئا', 'ביכורים': 'بيكوريم' };
const BOOK_AR = { 'בראשית': 'التكوين', 'שמות': 'الخروج', 'ויקרא': 'اللاويين', 'במדבר': 'العدد', 'דברים': 'التثنية' };
function refAr(he) {
  if (!he) return '';
  const s = he.trim();
  let m = s.match(/^(בבלי|ירושלמי)\s+(.+?)\s+([א-ת״׳"']+)\s*ע(?:״|")?([אב])/);
  if (m && TRACT_AR[m[2]]) return `${m[1] === 'בבלי' ? 'التلمود البابلي' : 'التلمود الأورشليمي'}، ${TRACT_AR[m[2]]} ${arNum(gemVal(m[3]))}${m[4] === 'א' ? 'أ' : 'ب'}`;
  m = s.match(/^משנה\s+(.+?)\s+([א-ת״׳"']+),\s*([א-ת״׳"']+)/);
  if (m && TRACT_AR[m[1]]) return `المشنا، ${TRACT_AR[m[1]]} ${arNum(gemVal(m[2]))}: ${arNum(gemVal(m[3]))}`;
  const books = Object.assign({}, BOOK_AR, NAKH_AR);
  const name = Object.keys(books).sort((a, b) => b.length - a.length).find(b => s.startsWith(b + ' '));
  if (!name) return '';
  m = s.slice(name.length).match(/^\s+([א-ת״׳"']+),\s*([א-ת״׳"']+)(?:\s*[–-]\s*([א-ת״׳"']+)(?:,\s*([א-ת״׳"']+))?)?/);
  if (!m) return '';
  let r = `${books[name]} ${arNum(gemVal(m[1]))}: ${arNum(gemVal(m[2]))}`;
  if (m[3]) r += m[4] ? `–${arNum(gemVal(m[3]))}: ${arNum(gemVal(m[4]))}` : `–${arNum(gemVal(m[3]))}`;
  return r;
}
/* cut at a word boundary */
function clip(t, n) { t = t || ''; if (t.length <= n) return t; const c = t.slice(0, n); const i = c.lastIndexOf(' '); return (i > n * .6 ? c.slice(0, i) : c).replace(/[\s,.;:–-]+$/, '') + '…'; }
const stripPar = s => (s || '').replace(/\s*\(.*\)/, '');
function setTitle(t) { const site = flipT('מדרשת האמונה · مدرسة الإيمان'); t = t ? flipT(t) : ''; document.title = (t ? t + ' · ' : '') + site; const a = $('#announce'); if (a) a.textContent = t || site; }
function focusMain() { const h = $('#app h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
function markTab(t) {
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t));
  $('#moreBtn').classList.toggle('on', ['n', 'x', 'h'].includes(t));
  setMore(false);
}
const setMore = open => { $('#more').classList.toggle('open', open); $('#moreBtn').setAttribute('aria-expanded', open ? 'true' : 'false'); };
$('#moreBtn').onclick = e => { e.stopPropagation(); setMore(!$('#more').classList.contains('open')); };
document.addEventListener('click', () => setMore(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMore(false); if (!$('#modal').hidden) { $('#modal').hidden = true; } } });

/* ---------- settings ---------- */
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('mh_' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mh_' + k, JSON.stringify(v)); } catch { } } };
let LANG = store.get('lang', 'both'), FS = store.get('fs', 1), DARK = store.get('dark', false);
function applySettings() {
  document.body.classList.toggle('lang-he', LANG === 'he');
  document.body.classList.toggle('lang-ar', LANG === 'ar');
  document.body.classList.toggle('darkmode', !!DARK);
  document.documentElement.style.setProperty('--fs', FS);
  $$('.seg button').forEach(b => { b.classList.toggle('on', b.dataset.lang === LANG); b.setAttribute('aria-pressed', b.dataset.lang === LANG ? 'true' : 'false'); });
  document.documentElement.lang = LANG === 'ar' ? 'ar' : 'he';
  $('#dark').setAttribute('aria-pressed', DARK ? 'true' : 'false');
}
$$('.seg button').forEach(b => b.onclick = () => { LANG = b.dataset.lang; store.set('lang', LANG); applySettings(); });
$('#fontUp').onclick = () => { FS = Math.min(1.6, +(FS + .1).toFixed(2)); store.set('fs', FS); applySettings(); };
$('#fontDown').onclick = () => { FS = Math.max(.8, +(FS - .1).toFixed(2)); store.set('fs', FS); applySettings(); };
$('#dark').onclick = () => { DARK = !DARK; store.set('dark', DARK); applySettings(); };
$('#searchForm').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.hash = '#/search/' + encodeURIComponent(q); };
$('#modalClose').onclick = () => { $('#modal').hidden = true; };
$('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').hidden = true; };
function modal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; $('#modalClose').focus(); }

/* ---------- study / share ---------- */
$('#study').onclick = () => {
  const url = location.href;
  const room = 'https://meet.jit.si/madrasat-al-iman-' + Math.random().toString(36).slice(2, 8);
  const where = document.title.replace(' · מדרשת האמונה · مدرسة الإيمان', '');
  const text = `הזמנה ללימוד בחברותא · دعوة إلى دراسة مشتركة — מדרשת האמונה · مدرسة الإيمان\n${where}\n${url}\nחדר וידאו · غرفة فيديو (Jitsi): ${room}`;
  modal(`<h2>${L('לימוד בחברותא', 'دراسة مشتركة (حَبروتا)')}</h2>
    <p class="small muted">${L('חדר וידאו חינמי ב־Jitsi Meet, ללא צורך בחשבון. שלחו את ההזמנה ולחצו "כנסו לחדר".', 'غرفة فيديو مجانية في Jitsi Meet دون حاجة إلى حساب. أرسلوا الدعوة ثم اضغطوا «ادخلوا الغرفة».')}</p>
    <textarea id="inv">${esc(text)}</textarea>
    <div><a class="btn primary" href="${room}" target="_blank" rel="noopener">${L('כנסו לחדר', 'ادخلوا الغرفة')}</a>
    <button class="btn" type="button" id="invCopy">${L('העתק הזמנה', 'انسخ الدعوة')}</button>
    <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">${ICON('whatsapp')} ${L('שלח בוואטסאפ', 'أرسل عبر واتساب')}</a></div>`);
  $('#invCopy').onclick = () => copy($('#inv').value);
};

/* ---------- cards ---------- */
const CARDTXT = {};
function cardActs(copyText, link, extra = '') {
  const id = 'c' + Math.random().toString(36).slice(2, 9);
  CARDTXT[id] = link ? `${copyText}\n${shareUrl(link)}` : copyText;
  return `<div class="acts">${extra}<button type="button" class="ib" data-copy="${id}" ${tip('העתק את המקבילה עם מראי המקום וקישור', 'انسخ التوازي مع المراجع والرابط')}>${COPY_SVG}</button>${link ? `<button type="button" class="ib" data-link="${esc(link)}" ${tip('העתק קישור', 'انسخ الرابط')}>${LINK_SVG}</button>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]'); if (c) { copy(CARDTXT[c.dataset.copy] || ''); return; }
  const l = e.target.closest('[data-link]'); if (l) { copy(shareUrl(l.dataset.link)); return; }
  const p = e.target.closest('[data-play]'); if (p) { play(p.dataset.play, p); return; }
  if (e.target.closest('[data-print]')) { window.print(); return; }
  const ct = e.target.closest('[data-cite]'); if (ct) { copy(citation(ct.dataset.cite, ct.dataset.citeAr, ct.dataset.citeRoute ? shareUrl(ct.dataset.citeRoute) : location.origin + location.pathname.replace(/index\.html$/, ''))); }
});
let AUDIO = null, AUDIO_BTN = null;
function play(key, btn) {
  if (AUDIO && AUDIO.key === key && !AUDIO.paused) { AUDIO.pause(); btn.textContent = '▶'; return; }
  if (AUDIO) AUDIO.pause();
  if (AUDIO_BTN && AUDIO_BTN !== btn) AUDIO_BTN.textContent = '▶';
  AUDIO_BTN = btn;
  const [s, a] = key.split(':');
  AUDIO = new Audio(`https://everyayah.com/data/Alafasy_128kbps/${pad(s, 3)}${pad(a, 3)}.mp3`); AUDIO.key = key;
  AUDIO.play().catch(() => toast('לא ניתן להשמיע · تعذّر التشغيل')); btn.textContent = '❚❚';
  AUDIO.onended = () => { btn.textContent = '▶'; };
}

function parallelCard(p, route, showBible, o = {}) {
  const q = quranRefs(p.src);
  const jump = q.length ? `<a href="#/a/${q[0][0]}/${q[0][1]}">${L('לקוראן', 'إلى القرآن')}</a>` : '';
  const txt = [`${p.ref || ''} ⇄ ${p.src || ''}`, p.refAr && p.srcAr ? `${p.refAr} ⇄ ${p.srcAr}` : '', p.textHe, p.textAr, p.note, p.noteAr].filter(Boolean).join('\n');
  return foldCard(o, 'card', `${o.pre || 'p'}-${esc(p.id)}`, `<div>
      <span class="t col-he">${esc(p.ref || '')} <span class="muted">⇄</span> ${linkQuran(p.src || '')}</span>
      ${p.refAr || p.srcAr ? `<div class="t col-ar ar" lang="ar">${esc(p.refAr || '')} <span class="muted">⇄</span> ${esc(p.srcAr || '')}</div>` : ''}
      <div class="chips">${p.type ? `<span class="chip">${tr(p.type, TYPE_AR)}</span>` : ''}${strengthChip(p.strength)}</div>${dtLine(p.dt)}${o.fold ? teaser(p.note, p.noteAr) : ''}</div>
      ${cardActs(txt, route, jump)}`, `
    ${showBible && (p.bibleHe || p.bibleAr) ? `<div class="two"><div class="he col-he">${esc(p.bibleHe)}</div><div class="ar col-ar" lang="ar">${esc(p.bibleAr)}</div></div><hr style="border:0;border-top:1px dashed var(--line)">` : ''}
    ${(p.textHe || p.textAr) ? `<div class="two"><div class="he col-he">${p.textHe ? pre(p.textHe) : PENDING_HE}</div><div class="ar col-ar${p.type === 'קוראן' ? ' q-text' : ''}" lang="ar">${pre(p.textAr)}</div></div>` : ''}
    ${p.note || p.noteAr ? `<div class="two note"><div class="col-he"><b>הקשר:</b> ${linkQuran(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>` : ''}
    ${(p.hadithHe || p.hadithAr) ? `<div class="two note small"><div class="col-he pre"><b>חדית׳ מתורגמים:</b> ${esc(p.hadithHe || '')}</div><div class="col-ar ar pre" lang="ar"><b>أحاديث مترجمة:</b> ${esc(p.hadithAr || '')}</div></div>` : ''}
    ${p.unit || p.themes || p.id ? `<details class="more"><summary>${L('פרטים', 'تفاصيل')}</summary>${p.unit ? `<div>${L('יחידה', 'الوحدة')}: ${esc(p.unit)}</div>` : ''}${p.themes ? `<div>${L('נושאים', 'الموضوعات')}: ${esc(p.themes)}</div>` : ''}${p.id ? `<div>${L('מזהה', 'المعرّف')}: ${esc(p.id)}</div>` : ''}<div>${reportLink(p.id, route)}</div></details>` : ''}${o.goto ? gotoLink(o.goto) : ''}`);
}

function fqCard(p, showBible, o = {}) {
  const q = `${p.su}:${p.a}${p.b !== p.a ? '–' + p.b : ''}`;
  return foldCard(o, 'card fq', `${o.pre || 'q'}-${esc(p.id)}`, `<div><span class="t col-he">${esc(p.ref || '')} <span class="muted">⇄</span> קוראן <a href="#/a/${p.su}/${p.a}"><bdi dir="ltr">${q}</bdi></a></span>
      ${p.refAr ? `<div class="t col-ar ar" lang="ar">${esc(p.refAr)} <span class="muted">⇄</span> <a href="#/a/${p.su}/${p.a}">${arNum(p.su)}: ${arNum(p.a)}${p.b !== p.a ? '–' + arNum(p.b) : ''}</a></div>` : ''}
      <div class="chips"><span class="chip">${L('מתוך „עם הספר לקוראן״', 'من «أهل الكتاب والقرآن»')}</span>${strengthChip(p.strength)}</div>${o.fold ? teaser(p.note, p.noteAr) : ''}</div>
      ${cardActs([`${p.ref} ⇄ ${q}`, p.refAr, p.qHe, p.qAr, p.note, p.noteAr].filter(Boolean).join('\n'), `a/${p.su}/${p.a}`, `<a href="#/a/${p.su}/${p.a}">${L('לקוראן', 'إلى القرآن')}</a>`)}`, `
    ${showBible && (p.bibleHe || p.bibleAr) ? `<div class="two"><div class="he col-he">${esc(p.bibleHe || '')}</div><div class="ar col-ar" lang="ar">${esc(p.bibleAr || '')}</div></div><hr style="border:0;border-top:1px dashed var(--line)">` : ''}
    ${(p.qHe || p.qAr) ? `<div class="two"><div class="he col-he">${esc(p.qHe || '')}</div><div class="ar col-ar q-text" lang="ar">${esc(p.qAr || '')}</div></div>` : ''}
    ${p.note || p.noteAr ? `<div class="two note"><div class="col-he"><b>הקשר:</b> ${linkQuran(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>` : ''}${o.goto ? gotoLink(o.goto) : ''}`);
}

/* ---------- folding (collapsed cards and sections) ---------- */
const FOLDED = { fold: true };
function foldCard(o, cls, id, head, body) {
  return o.fold ? `<details class="${cls} fold" id="${id}"><summary class="card-h">${head}</summary><div class="cb">${body}</div></details>`
    : `<div class="${cls}" id="${id}"><div class="card-h">${head}</div>${body}</div>`;
}
const teaser = (he, ar) => he || ar ? `<div class="teaser">${HEF ? `${he ? `<div class="col-he">${esc(he)}</div>` : ''}${ar ? `<div class="col-ar ar" lang="ar">${esc(ar)}</div>` : ''}` : `${ar ? `<div class="col-ar ar" lang="ar">${esc(ar)}</div>` : ''}${he ? `<div class="col-he">${esc(he)}</div>` : ''}`}</div>` : '';
const gotoLink = id => `<div class="goto"><a href="#${id}" data-goto="${id}">${L('במקומה בפרשה ←', 'في موضعه من البرشا ←')}</a></div>`;
const FOLD_OPEN = () => SVGI('<path d="M7 9l5-5 5 5"/><path d="M7 15l5 5 5-5"/>'), FOLD_CLOSE = () => SVGI('<path d="M7 4l5 5 5-5"/><path d="M7 20l5-5 5 5"/>');
const foldAllBtn = () => `<button type="button" class="ib" data-foldall ${tip('פתח הכל', 'افتح الكل')}>${FOLD_OPEN()}</button>`;
/* open every <details> around an element so that anchors and in-page links land on visible text */
function reveal(el) { for (let d = el && el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; if (el && el.tagName === 'DETAILS') el.open = true; }
document.addEventListener('click', e => {
  if (e.target.closest('summary button')) e.preventDefault();   /* copy/link buttons in a card header must not fold it */
  const g = e.target.closest('[data-goto]');
  if (g) { e.preventDefault(); const el = document.getElementById(g.dataset.goto); if (el) { reveal(el); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2500); } return; }
  const fa = e.target.closest('[data-foldall]');
  if (fa) { const ds = $$('.page details:not(.more)'); const open = !ds.every(d => d.open); ds.forEach(d => d.open = open);
    $$('[data-foldall]').forEach(b => { b.innerHTML = open ? FOLD_CLOSE() : FOLD_OPEN(); const t = open ? ['סגור הכל', 'أغلق الكل'] : ['פתח הכל', 'افتح الكل']; b.title = `${t[1]} · ${t[0]}`; b.setAttribute('aria-label', b.title); }); }
}, true);
/* printing / saving as PDF: everything open, then back to how it was */
let PRINT_CLOSED = [];
window.addEventListener('beforeprint', () => { PRINT_CLOSED = $$('details:not([open])'); PRINT_CLOSED.forEach(d => d.open = true); });
window.addEventListener('afterprint', () => { PRINT_CLOSED.forEach(d => d.open = false); PRINT_CLOSED = []; });

/* report an error / suggest a translation: opens a pre-filled GitHub issue */
const ISSUES = 'https://github.com/madrasat-al-iman/madrasat-al-iman.github.io/issues/new';
function reportLink(id, route) {
  const url = location.origin + location.pathname + '#/' + (route || '');
  const q = `?title=${encodeURIComponent(`תיקון · تصويب: ${id || route || ''}`)}&body=${encodeURIComponent(`${url}\n\nמה צריך לתקן? · ما الذي يحتاج إلى تصويب؟\n`)}`;
  return `<a href="${ISSUES + q}" target="_blank" rel="noopener">${L('דווח על טעות או הצע תרגום', 'أبلغ عن خطأ أو اقترح ترجمة')}</a>`;
}

/* ---------- views ---------- */
/* this week's Torah portion (Land of Israel cycle), from the table built into meta.json */
function weeklyParasha() {
  const t = new Date(); const today = `${t.getFullYear()}-${pad(t.getMonth() + 1, 2)}-${pad(t.getDate(), 2)}`;
  const w = (META.weekly || []).find(([d]) => d >= today);
  if (!w || !w[1].length) return null;
  return { date: w[0], ps: w[1].map(i => META.parashot.find(p => p.i === i)).filter(Boolean) };
}
async function viewHome() {
  markTab(''); setTitle('');
  const c = META.counts;
  const wk = weeklyParasha(), vayeshev = META.parashot.find(p => p.name === 'וישב');
  const th = await J('themes.json').catch(() => null);
  const star = th && th.topics.find(t => t.code === STARTERS[0]);
  const gates = [
    wk && wk.ps.length ? `<a class="bigcard gate" href="#/b/${wk.ps[0].i}"><div class="muted small">${L('פרשת השבוע', 'برشا الأسبوع')}</div><h3>${L(esc(wk.ps.map(p => p.name).join('–')), esc(wk.ps.map(p => stripPar(p.nameAr || '')).join('–')))}</h3><div class="muted">${L('הפרשה עם המקבילות מן הקוראן ומן החדית׳', 'البرشا مع توازياتها من القرآن والحديث')}</div></a>` : '',
    vayeshev ? `<a class="bigcard gate" href="#/a/12"><div class="muted small">${L('סיפור אחד, שני ספרים', 'قصة واحدة في كتابين')}</div><h3>${L('יוסף: סורה 12 מול פרשת וישב', 'يوسف: سورة ١٢ قبالة برشا «فَيِّيشِف»')}</h3><div class="muted">${L('הסורה כולה לצד ספר בראשית, פסוק מול פסוק', 'السورة كلها إلى جانب سفر التكوين، آيةً آية')}</div></a>` : '',
    star ? `<a class="bigcard gate" href="#/c/${star.code}"><div class="muted small">${L('נושא מומלץ לחברותא', 'موضوع مقترح للدراسة المشتركة')}</div><h3>${L(esc(star.title), esc(star.titleAr || ''))}</h3><div class="muted">${L(`${star.nsources} מקורות במלואם, עם שאלות לשיחה`, `${arNum(star.nsources)} مصدرًا كاملًا، مع أسئلة للحوار`)}</div></a>` : '',
    `<a class="bigcard gate" href="#/x/pearls"><div class="muted small">${L('קצר ומפתיע', 'قصير ومدهش')}</div><h3>${L('פנינים מקבילות', 'لآلئ متوازية')}</h3><div class="muted">${L('מאמר חז״ל וחדית׳ שאומרים כמעט אותו דבר', 'قول من أدب الحكماء وحديث يقولان الشيء نفسه تقريبًا')}</div></a>`].filter(Boolean);
  app.innerHTML = `<div class="page">
    <h1><span class="ar" lang="ar" style="color:var(--gold)">مدرسة الإيمان</span> מדרשת האמונה</h1>
    <div class="two"><p class="col-he">מאגר דו־לשוני, עברית וערבית, של מקבילות בין התורה, הנביאים והכתובים וספרות חז״ל לבין הקוראן והחדית׳. כל מקבילה מובאת בנוסח המקור ובתרגום, עם הסבר הקשר ותיעוד המקורות.</p>
    <p class="col-ar ar" lang="ar">قاعدة بيانات ثنائية اللغة، بالعبرية والعربية، للتوازيات بين التوراة والأنبياء والكتب وأدب الحكماء وبين القرآن والحديث. يُعرض كل توازٍ بنصه الأصلي وترجمته، مع بيان الصلة وتوثيق المصادر.</p></div>
    <h2>${L('מאיפה מתחילים?', 'من أين نبدأ؟')}</h2><div class="grid-cards gates">${gates.join('')}</div>
    <h2>${L('במאגר', 'في القاعدة')}</h2>
    <div class="grid-cards">
      <a class="bigcard" href="#/c"><h3>${L('נושאים לעיון', 'موضوعات للتأمل')}</h3><div class="stat">${c.topics}</div><div class="muted">${L('נושאים וסיפורים, עם המקורות במלואם בשתי השפות', 'موضوعات وقصص مع نصوص المصادر كاملة باللغتين')}</div></a>
      <a class="bigcard" href="#/a"><h3>${L('הקוראן ותפסיר עם הספר', 'القرآن وتفسير أهل الكتاب')}</h3><div class="stat">114</div><div class="muted">${L(`סורות בערבית ובתרגום עברי, עם ${c.quranParallels} מקבילות לפי פסוק`, `سورة بالعربية وبترجمة عبرية، مع ${arNum(c.quranParallels)} توازيًا حسب الآية`)}</div></a>
      <a class="bigcard" href="#/b"><h3>${L('התורה ופירוש האסלאם', 'التوراة وتفسير الإسلام')}</h3><div class="stat">${c.torahParallels}</div><div class="muted">${L('מקבילות ב־54 פרשות, לצד נוסח המסורה ותרגום ון־דייק', 'توازيات في ٥٤ برشا، إلى جانب نص المسوراه وترجمة فان دايك')}</div></a>
      <a class="bigcard" href="#/n"><h3>${L('נביאים וכתובים', 'الأنبياء والكتب')}</h3><div class="stat">${c.nakhParallels}</div><div class="muted">${L('מקבילות מן הקוראן ומן החדית׳ לספרי הנביאים והכתובים', 'توازيات من القرآن والحديث لأسفار الأنبياء والكتب')}</div></a>
      <a class="bigcard" href="#/x"><h3>${L('נספחים', 'ملاحق')}</h3><div class="muted">${L('מחלוקות יסוד · שורשים תאומים · פנינים · צמתים היסטוריים', 'خلافات أساسية · جذور توأم · لآلئ · ملتقيات تاريخية')}</div></a>
      <a class="bigcard" href="#/h"><h3>${L('חדית׳', 'الحديث')}</h3><div class="stat">${c.hadithTranslated}</div><div class="muted">${L(`חדית׳ מתורגמים לעברית, מתוך ${c.hadith} בנוסח הערבי`, `حديثًا مترجمًا إلى العبرية، من أصل ${arNum(c.hadith)} بالنص العربي`)}</div></a>
    </div>
    ${newsBox()}
  </div>`;
}

async function viewNews() {
  markTab('news'); setTitle('הגיליון השבועי · النشرة الأسبوعية');
  const list = await fetch('newsletter/index.json').then(r => r.ok ? r.json() : []).catch(() => []);
  app.innerHTML = `<div class="page"><h1>${L('הגיליון השבועי', 'النشرة الأسبوعية')}</h1>${newsBox(false)}
    <h2>${L('ארכיון הגיליונות', 'أرشيف النشرات')}</h2>
    ${list.length ? `<ul class="newslist">${list.map(n => `<li><a href="${esc(n.url)}">${L(esc(n.title || ''), esc(n.titleAr || ''))}</a> <span class="muted small">${esc(n.date || '')}</span></li>`).join('')}</ul>` : `<p class="muted">${L('הגיליון הראשון יתפרסם כאן בקרוב.', 'سيُنشر العدد الأول هنا قريبًا.')}</p>`}</div>`;
}

async function viewAbout(anchor) {
  markTab('about'); setTitle('אודות · عن المشروع');
  const home = location.origin + location.pathname.replace(/index\.html$/, '');
  const c = META.counts;
  app.innerHTML = `<div class="page"><h1>${L('אודות', 'عن المشروع')}</h1>
  <div class="two">
   <div class="col-he">
    <p><b>מדרשת האמונה</b> היא מאגר דו־לשוני, בעברית ובערבית, המציב זה מול זה את מקורות היהדות והאסלאם: התורה, הנביאים והכתובים וספרות חז״ל מול הקוראן והחדית׳. המאגר נועד ללימוד משותף, בחברותא, של יהודים ומוסלמים, ולעיון מכבד בדמיון ובשוני שבין שתי המסורות.</p>
    <h3>חלקי המאגר</h3>
    <ul><li><b>נושאים לעיון</b> – ${c.topics} נושאים וסיפורים, עם המקורות במלואם בשתי השפות.</li>
    <li><b>הקוראן ותפסיר עם הספר</b> – הקוראן לפי הסדר, בערבית ובתרגום עברי, עם המקבילות מן המקרא ומספרות חז״ל.</li>
    <li><b>התורה ופירוש האסלאם</b> – התורה לפי הפרשות, בנוסח המסורה ובתרגום ון־דייק, עם המקבילות מן הקוראן ומן החדית׳ והערות מתפסיר רס״ג.</li>
    <li><b>נביאים וכתובים, נספחים וחדית׳</b>.</li></ul>
    <h3 id="method">עקרונות העבודה והתרגום</h3>
    <ul><li><b>מקור ותרגום זה לצד זה.</b> כל טקסט מובא בלשון המקור ובתרגום: המקרא בנוסח המסורה ובתרגום ון־דייק לערבית; הקוראן בכתיב העות׳מאני ובתרגום עברי חדש שהוכן למאגר; החדית׳ בנוסח הערבי ובתרגום עברי של המאגר; מקורות חז״ל בלשונם ובתרגום לערבית.</li>
    <li><b>ציטוט מלא.</b> המקורות מובאים ברצף עד סוף העניין, בלי השמטות באמצע. קיצור נעשה רק כשההמשך אינו נוגע לעניין, ולעולם לא בגלל אורך.</li>
    <li><b>סיווג המקבילה והסבר הקשר.</b> כל מקבילה מסווגת לפי מידת הקרבה (מובהקת, נושאית, אפשרית ועוד), ולצדה הסבר קצר של הקשר בין המקורות.</li>
    <li><b>תיארוך.</b> לספרות שלאחר המקרא (חז״ל, תרגומים, ספרות חיצונית, ברית חדשה, פרשנות) מצוין תיארוך משוער; למקרא, לקוראן ולחדית׳ לא ניתן תיארוך.</li>
    <li><b>מראי מקום.</b> מקרא – ספר, פרק ופסוק; קוראן – סורה:פסוק; חדית׳ – אוסף ומספר לפי sunnah.com; תלמוד – מסכת, דף ועמוד.</li></ul>
    <h3>מקורות ומהדורות</h3>
    <ul><li>נוסח המקרא: מקרא על פי המסורה, ללא טעמים.</li><li>התרגום הערבי למקרא: ון־דייק (1865), נחלת הכלל.</li><li>נוסח הקוראן: הכתיב העות׳מאני.</li>
    <li>החדית׳: לפי מספור sunnah.com; במוסלם – מספור עבד אל־באקי.</li><li>תפסיר רס״ג: לפי הנוסח שבספריא.</li><li>התרגומים לעברית של הקוראן ושל החדית׳: תרגום המאגר.</li></ul>
    <h3>איך נבדק המאגר</h3>
    <ul><li>מראי המקום בקוראן נבדקו אוטומטית מול נוסח הקוראן.</li><li>כל ציטוט מן החדית׳ אותר מילה במילה בנוסח sunnah.com.</li><li>נוסח התפסיר (אבן כת׳יר, אלטברי, אבן עאשור) נשלף מקבצים פתוחים (spa5k/tafsir_api) ונבדק מול הדפוס המקובל.</li><li>מקורות חז״ל נבדקו מול ספריא. העבודה נעשתה בסיוע כלי בינה מלאכותית, ונבדקת בידי אדם.</li></ul>
    <h3 id="cite">איך לצטט את המאגר</h3>
    <p>תבנית מוצעת:</p><div class="cite">מדרשת האמונה: מאגר דו־לשוני של מקבילות בין מקורות היהדות והאסלאם, ${esc(home)} (נצפה ב־<i>תאריך</i>).</div>
    <p class="small">לציטוט עמוד מסוים מוסיפים את שם העמוד בראש הציטוט ואת הקישור הקבוע שלו. בכל נושא, פרשה וסורה, הכפתור „ציטוט“ שבסרגל השיתוף מעתיק ציטוט מוכן בעברית ובערבית.</p>
    <p><button type="button" class="btn" data-cite="" data-cite-ar="" data-cite-route="">${L('העתק ציטוט למאגר', 'انسخ الإحالة إلى القاعدة')}</button></p>
    <p class="small muted">גופנים: Amiri, Amiri Quran, Frank Ruhl Libre, Heebo – ברישיון SIL Open Font License.</p>
    <p>המאגר מתעדכן ומתרחב כל הזמן. הערות ותיקונים יתקבלו בברכה: <a href="${ISSUES}" target="_blank" rel="noopener">דיווח על טעות או הצעת תרגום</a> (דרך GitHub). גם בכל כרטיס מקבילה, תחת „פרטים“, יש קישור לדיווח.</p>
    <p>הגיליון השבועי – בנושאי אמונה בין האסלאם ליהדות: <a href="${NEWS_FORM}" target="_blank" rel="noopener">הרשמה</a> · <a href="#/news">ארכיון הגיליונות</a></p>
    <p>ליצירת קשר במייל: <a href="mailto:madrasataliman@gmail.com" dir="ltr">madrasataliman@gmail.com</a></p>
   </div>
   <div class="col-ar ar" lang="ar">
    <p><b>مدرسة الإيمان</b> قاعدة بيانات ثنائية اللغة، بالعبرية والعربية، تضع مصادر اليهودية والإسلام بعضها قبالة بعض: التوراة والأنبياء والكتب وأدب الحكماء قبالة القرآن والحديث. وهي معدّة للدراسة المشتركة («الحَبروتا») بين اليهود والمسلمين، وللتأمل باحترام في أوجه الشبه والاختلاف بين التقليدين.</p>
    <h3>أقسام القاعدة</h3>
    <ul><li><b>موضوعات للتأمل</b> – ${arNum(c.topics)} موضوعًا وقصة، مع نصوص المصادر كاملة باللغتين.</li>
    <li><b>القرآن وتفسير أهل الكتاب</b> – القرآن حسب ترتيبه، بالعربية وبترجمة عبرية، مع التوازيات من المقرا وأدب الحكماء.</li>
    <li><b>التوراة وتفسير الإسلام</b> – التوراة حسب البرشيوت، بنص المسوراه وترجمة فان دايك، مع التوازيات من القرآن والحديث وملاحظات من تفسير سعديا الفيومي.</li>
    <li><b>الأنبياء والكتب، والملاحق، والحديث</b>.</li></ul>
    <h3>مبادئ العمل والترجمة</h3>
    <ul><li><b>النص الأصلي والترجمة جنبًا إلى جنب.</b> يُعرض كل نص بلغته الأصلية وبترجمة: المقرا بنص المسوراه وبترجمة فان دايك العربية؛ والقرآن بالرسم العثماني وبترجمة عبرية جديدة أُعدّت للمشروع؛ والحديث بنصه العربي وبترجمة عبرية من إعداد القاعدة؛ ومصادر الحكماء بلغتها وبترجمة عربية.</li>
    <li><b>الاقتباس الكامل.</b> تُورَد المصادر متصلةً حتى نهاية المعنى، دون حذف في وسطها. ولا يُختصر النص إلا حين لا يتعلق ما بعده بالموضوع، ولا يُختصر لطوله أبدًا.</li>
    <li><b>تصنيف التوازي وبيان الصلة.</b> يُصنَّف كل توازٍ بحسب درجة القرب (صريح، موضوعي، محتمل وغير ذلك)، ويرافقه بيان موجز للصلة بين المصادر.</li>
    <li><b>التأريخ.</b> يُذكر تأريخ تقريبي للأدب اللاحق للمقرا (أدب الحكماء، والترجمات، والأدب الخارجي، والعهد الجديد، والتفاسير)؛ أما المقرا والقرآن والحديث فلا تُؤرَّخ.</li>
    <li><b>الإحالات.</b> المقرا: السفر والإصحاح والآية؛ القرآن: السورة:الآية؛ الحديث: الكتاب والرقم حسب sunnah.com؛ التلمود: المسكيت والورقة والصفحة.</li></ul>
    <h3>المصادر والطبعات</h3>
    <ul><li>نص المقرا: حسب المسوراه، دون علامات النغم.</li><li>الترجمة العربية للمقرا: فان دايك (1865)، ملك عام.</li><li>نص القرآن: الرسم العثماني.</li>
    <li>الحديث: حسب ترقيم sunnah.com؛ وفي صحيح مسلم حسب ترقيم محمد فؤاد عبد الباقي.</li><li>تفسير سعديا: حسب النص في «سفاريا».</li><li>الترجمات العبرية للقرآن والحديث: ترجمة القاعدة.</li></ul>
    <h3>كيف رُوجعت القاعدة</h3>
    <ul><li>رُوجعت الإحالات القرآنية آليًّا على نص المصحف.</li><li>كل نص حديث عُثر عليه حرفيًّا في نص sunnah.com.</li><li>نص التفسير (ابن كثير والطبري وابن عاشور) مأخوذ من ملفات مفتوحة (spa5k/tafsir_api) ومراجَع على الطبعة المتداولة.</li><li>رُوجعت مصادر الحكماء على «سفاريا». أُنجز العمل بمساعدة أدوات ذكاء اصطناعي، ويخضع لمراجعة بشرية.</li></ul>
    <h3>كيف تستشهد بالقاعدة</h3>
    <p>صيغة مقترحة:</p><div class="cite">مدرسة الإيمان: قاعدة بيانات ثنائية اللغة للتوازيات بين مصادر اليهودية والإسلام، ${esc(home)} (تاريخ الاطلاع: <i>التاريخ</i>).</div>
    <p class="small">للإحالة إلى صفحة بعينها يُضاف اسم الصفحة في أول الإحالة ورابطها الثابت. وفي كل موضوع وبرشا وسورة، يَنسخ زر «إحالة» في شريط المشاركة إحالةً جاهزة بالعبرية والعربية.</p>
    <p class="small muted">الخطوط: Amiri وAmiri Quran وFrank Ruhl Libre وHeebo – برخصة SIL Open Font License.</p>
    <p>القاعدة تُحدَّث وتتوسّع باستمرار، والملاحظات والتصويبات موضع ترحيب: <a href="${ISSUES}" target="_blank" rel="noopener">الإبلاغ عن خطأ أو اقتراح ترجمة</a> (عبر GitHub). وفي كل بطاقة توازٍ، تحت «تفاصيل»، رابط للإبلاغ أيضًا.</p>
    <p>النشرة الأسبوعية – في قضايا الإيمان بين الإسلام واليهودية: <a href="${NEWS_FORM}" target="_blank" rel="noopener">الاشتراك</a> · <a href="#/news">أرشيف النشرات</a></p>
    <p>للتواصل بالبريد الإلكتروني: <a href="mailto:madrasataliman@gmail.com" dir="ltr">madrasataliman@gmail.com</a></p>
   </div></div></div>`;
  if (anchor === 'cite' || anchor === 'method') scrollToAnchor(anchor);
}

function torahSide(cur) {
  const byBook = {};
  META.parashot.forEach(p => (byBook[p.book] = byBook[p.book] || []).push(p));
  return `<aside class="side">${Object.entries(byBook).map(([b, ps]) => `<h4>${L(esc(b), esc(ps[0].bookAr || ''))}</h4>${ps.map(p =>
    `<a href="#/b/${p.i}" class="${p.i === cur ? 'on' : ''}"><span class="nm"><span>${L(esc(p.name), esc(stripPar(p.nameAr)))}</span><span class="sub l-ar" lang="ar">${esc(parMeaning(p))}</span></span><span class="n">${p.parallels || ''}</span></a>`).join('')}`).join('')}</aside>`;
}
const parMeaning = p => { const m = (p.nameAr || '').match(/\(([^)]*)\)/); return `${m ? m[1] + ' · ' : ''}${p.bookAr || ''} ${arNum(p.from[0])}–${arNum(p.to[0])}`; };
const NAV = '<nav class="secnav" aria-label="מפת העמוד · خريطة الصفحة"></nav>';
function buildNav(page, defs, unitSel) {
  const nav = $('.secnav', page); if (!nav) return;
  const secs = [];
  const links = defs.map(([sel, he, ar, layer]) => { const el = $(sel, page); if (!el) return '';
    if (!el.id) el.id = 'sec-' + Math.random().toString(36).slice(2, 8);
    secs.push([el.id, he, ar]);
    return `<span class="sn"><a href="#${el.id}" data-go="${el.id}">${L(he, ar)}</a>${layer ? `<label class="lay" title="הצג/הסתר שכבה זו · إظهار/إخفاء هذه الطبقة"><input type="checkbox" checked data-layer="${layer}">${L('מוצג', 'ظاهر')}</label>` : ''}</span>`; }).filter(Boolean);
  const units = unitSel ? $$(unitSel, page) : [];
  units.forEach((u, k) => { if (!u.id) u.id = 'u-' + k; });
  const unitLabel = unitSel === '.src-kind' ? ['סוג מקור', 'نوع المصدر'] : ['יחידה בפרשה', 'وحدة في البرشا'];
  nav.innerHTML = `<span class="nt">${L('מפת העמוד', 'خريطة الصفحة')}:</span>${links.join('')}<select class="units" aria-label="קפיצה · انتقال"><option value="">${units.length > 1 ? `קפיצה ל${unitLabel[0]}… · انتقال إلى ${unitLabel[1]}…` : 'קפיצה ל… · انتقال إلى…'}</option>
    <optgroup label="חלקי העמוד · أقسام الصفحة">${secs.map(([id, he, ar]) => `<option value="${id}">${he} · ${ar}</option>`).join('')}</optgroup>
    ${units.length > 1 ? `<optgroup label="${unitLabel[0]} · ${unitLabel[1]}">${units.map(u => `<option value="${u.id}">${esc(u.dataset.unit)}${u.dataset.unitAr ? ' · ' + esc(u.dataset.unitAr) : ''}</option>`).join('')}</optgroup>` : ''}</select>`;
  nav.onclick = e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); const el = document.getElementById(a.dataset.go); reveal(el); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  nav.onchange = e => { if (e.target.matches('select.units') && e.target.value) { const el = document.getElementById(e.target.value); reveal(el); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); e.target.value = ''; }
    if (e.target.dataset.layer) page.classList.toggle('hide-' + e.target.dataset.layer, !e.target.checked); };
}
async function viewTorah(i, anchor) {
  markTab('b');
  if (!i) i = (weeklyParasha()?.ps[0] || META.parashot[0]).i;
  app.innerHTML = `<div class="layout">${torahSide(i)}<div class="page"><div class="loading">טוען… · جارٍ التحميل…</div></div></div>`;
  const d = await J(`torah/${pad(i, 2)}.json`);
  const P = d.parasha; setTitle(`פרשת ${P.name} · ${stripPar(P.nameAr)}`);
  const key = (c, v) => c * 1000 + v;
  const inR = (c, v, f, t) => key(c, v) >= key(f[0], f[1]) && key(c, v) <= key(t[0], t[1]);
  const units = d.units.length ? d.units : [{ name: P.name, nameAr: P.nameAr, from: P.from, to: P.to }];
  const sa = {}; d.saadia.forEach(s => (sa[key(s.c, s.v)] = sa[key(s.c, s.v)] || []).push(s));
  const used = new Set();
  const ref = (c, v) => `${gem(c)}, ${gem(v)}`;
  const refAr = (c, v) => `${arNum(c)}: ${arNum(v)}`;
  let body = '';
  for (const u of units) {
    const vs = d.verses.filter(v => inR(v.c, v.v, u.from, u.to));
    if (!vs.length) continue;
    const ps = d.parallels.filter(p => !used.has(p.id) && inR(p.c, p.v, u.from, u.to)); ps.forEach(p => used.add(p.id));
    const fq = (d.fromQuran || []).filter(p => !used.has('q' + p.id) && inR(p.c, p.v, u.from, u.to)); fq.forEach(p => used.add('q' + p.id));
    const np = ps.length + fq.length;
    body += `<details class="unit" data-unit="${esc(u.name)}" data-unit-ar="${esc(stripPar(u.nameAr || ''))}"><summary class="unit-h"><h2>${L(esc(u.name), esc(u.nameAr || ''))}</h2>
      <span class="muted small">${L(`${esc(P.book)} ${ref(vs[0].c, vs[0].v)} – ${ref(vs.at(-1).c, vs.at(-1).v)}`, `${esc(P.bookAr || '')} ${refAr(vs[0].c, vs[0].v)} – ${refAr(vs.at(-1).c, vs.at(-1).v)}`)}</span>${u.type ? `<span class="chip">${tr(u.type, TYPE_AR)}</span>` : ''}<span class="cnt">${L(`${vs.length} פסוקים${np ? ` · ${np} מקבילות` : ''}`, `${arNum(vs.length)} آية${np ? ` · ${arNum(np)} توازيًا` : ''}`)}</span></summary>
      <details class="vfold"><summary>${L(`קריאת הפסוקים (${vs.length})`, `قراءة الآيات (${arNum(vs.length)})`)}</summary><div class="verses layer-text">${vs.map(v => `<div class="vrow" id="v-${v.c}-${v.v}">
        <div class="he"><a class="num" href="#/b/${i}/${v.c}:${v.v}">${ref(v.c, v.v)}</a>${esc(v.he)}</div>
        <div class="ar" lang="ar">${esc(v.ar)} <span class="num">(${arNum(v.vd ? v.vd.replace(':', ': ') : v.v)})</span></div>
        ${(sa[key(v.c, v.v)] || []).map(s => `<details class="saadia layer-note"><summary><b>${L(`תפסיר רס״ג על „${esc(s.phrase)}״`, 'تفسير سعديا الفيومي')}</b> <span class="muted small">(${dtShort('saadia')})</span></summary>
          <div class="two small"><div>${L('ון־דייק', 'فان دايك')}: <span lang="ar" class="ar">${esc(s.vd)}</span></div><div>${L('רס״ג', 'سعديا')}: <span lang="ar" class="ar">${esc(s.sa)}</span> <span class="muted col-he">(${esc(s.tr)})</span></div></div>
          <div class="two small"><div class="col-he">${esc(s.note)}</div><div class="col-ar ar" lang="ar">${s.noteAr ? esc(s.noteAr) : PENDING}</div></div></details>`).join('')}
      </div>`).join('')}</div></details>
      ${np ? `<div class="layer-par"><h3 class="par-h">${L('פירוש האסלאם', 'تفسير الإسلام')} <span class="muted small">(${np})</span></h3>${ps.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`, true, FOLDED)).join('')}${fq.map(p => fqCard(p, true, FOLDED)).join('')}</div>` : ''}
    </details>`;
  }
  const rest = d.parallels.filter(p => !used.has(p.id)), restQ = (d.fromQuran || []).filter(p => !used.has('q' + p.id));
  if (rest.length || restQ.length) body += `<details class="unit"><summary class="unit-h"><h2>${L('מקבילות נוספות', 'توازيات أخرى')}</h2><span class="cnt">${L(`${rest.length + restQ.length} מקבילות`, `${arNum(rest.length + restQ.length)} توازيًا`)}</span></summary><div class="layer-par">${rest.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`, true, FOLDED)).join('')}${restQ.map(p => fqCard(p, true, FOLDED)).join('')}</div></details>`;
  /* key parallels: the clear-cut ones first, spread over the units of the parasha */
  const unitOf = p => units.findIndex(u => inR(p.c, p.v, u.from, u.to));
  const rank = s => s === 'מובהקת' ? 0 : /^נושאי/.test(s || '') ? 1 : 2;
  const cand = [...d.parallels.map(p => ['p', p]), ...(d.fromQuran || []).map(p => ['q', p])];
  const keyP = [];
  if (cand.length >= 4) for (const r of [0, 1]) {
    let pool = cand.filter(x => rank(x[1].strength) === r), seen = new Set(keyP.map(x => unitOf(x[1])));
    while (keyP.length < 5 && pool.length) {
      const pick = pool.find(x => !seen.has(unitOf(x[1]))) || pool[0];
      keyP.push(pick); seen.add(unitOf(pick[1])); pool = pool.filter(x => x !== pick);
      if (units.every((u, k) => seen.has(k))) seen = new Set();
    }
    if (keyP.length >= 3) break;
  }
  keyP.sort((x, y) => key(x[1].c, x[1].v) - key(y[1].c, y[1].v));
  const keyHtml = keyP.length ? `<section class="keypar"><h2>${L('מקבילות מרכזיות', 'أبرز التوازيات')}</h2>
    <p class="muted small">${L('לחצו על מקבילה כדי לקרוא אותה במלואה. כל המקבילות – לפי יחידות הפרשה, למטה.', 'اضغطوا على أي توازٍ لقراءته كاملًا. جميع التوازيات – حسب وحدات البرشا – في الأسفل.')}</p>
    ${keyP.map(([k, p]) => k === 'p' ? parallelCard(p, `b/${i}/${p.c}:${p.v}`, true, { fold: true, pre: 'k', goto: `p-${p.id}` }) : fqCard(p, true, { fold: true, pre: 'kq', goto: `q-${p.id}` })).join('')}</section>` : '';
  const prev = META.parashot.find(p => p.i === i - 1), next = META.parashot.find(p => p.i === i + 1);
  $('.page', app).innerHTML = `<div class="crumbs">${L('התורה ופירוש האסלאם', 'التوراة وتفسير الإسلام')} · ${L(esc(P.book), esc(P.bookAr || ''))}</div>
    <h1>${L(`פרשת ${esc(P.name)}`, `برشا ${esc(P.nameAr || '')}`)}</h1>
    <div class="muted">${L(`${esc(P.book)} ${ref(P.from[0], P.from[1])} – ${ref(P.to[0], P.to[1])} · ${P.verses} פסוקים · ${d.parallels.length + (d.fromQuran || []).length} מקבילות${d.saadia.length ? ` · ${d.saadia.length} הערות רס״ג` : ''}`,
      `${esc(P.bookAr || '')} ${refAr(P.from[0], P.from[1])} – ${refAr(P.to[0], P.to[1])} · ${arNum(P.verses)} آية · ${arNum(d.parallels.length + (d.fromQuran || []).length)} توازيًا`)}</div>
    ${shareBar(`פרשת ${P.name}`, `برشا ${stripPar(P.nameAr || '')}`, `${P.book} ${ref(P.from[0], P.from[1])} – ${ref(P.to[0], P.to[1])}: התורה עם המקבילות מן הקוראן ומן החדית׳`, `${P.bookAr || ''} – التوراة مع توازياتها من القرآن والحديث`, `b/${i}`)}
    ${NAV}
    ${keyHtml}
    <div class="units-h"><h2>${L('הפרשה לפי יחידות', 'البرشا حسب الوحدات')}</h2>${foldAllBtn()}</div>
    ${body}
    ${P.questions || P.questionsAr ? `<div class="qs" id="sec-qs"><h3>${L('לשולחן שבת: שאלות לשיחה וללימוד משותף', 'لمائدة السبت: أسئلة للحوار والدراسة المشتركة')}</h3><div class="two"><div class="pre col-he">${esc(P.questions || '')}</div><div class="pre col-ar ar" lang="ar">${P.questionsAr ? esc(P.questionsAr) : PENDING}</div></div></div>` : ''}
    <div class="pager">${prev ? `<a class="btn" href="#/b/${prev.i}">→ ${L(esc(prev.name), esc(stripPar(prev.nameAr)))}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/b/${next.i}">${L(esc(next.name), esc(stripPar(next.nameAr)))} ←</a>` : ''}</div>`;
  buildNav($('.page', app), [['.keypar', 'מקבילות מרכזיות', 'أبرز التوازيات'], ['.verses', 'הטקסט המקורי: תורה', 'النص الأصلي: التوراة', 'text'], ['.par-h', 'פירוש האסלאם', 'تفسير الإسلام', 'par'], ['.saadia', 'הערות: תפסיר רס״ג', 'ملاحظات: تفسير سعديا', 'note'], ['#sec-qs', 'שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة']], '.unit[data-unit]');
  $('.side a.on')?.scrollIntoView({ block: 'nearest' });
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

const SURA_HE = ["", "הפתיחה", "הפרה", "משפחת עמראן", "הנשים", "השולחן", "הבהמות", "המחיצות", "השלל", "התשובה", "יונס", "הוד", "יוסף", "הרעם", "אברהים", "אלחִג׳ר", "הדבורה", "המסע הלילי", "המערה", "מרים", "טא הא", "הנביאים", "העלייה לרגל", "המאמינים", "האור", "ההבחנה", "המשוררים", "הנמלה", "הסיפור", "העכביש", "הרומאים", "לֻקמאן", "ההשתחוויה", "הפלגים", "סבא", "הבורא", "יא סין", "העומדים בשורות", "צאד", "ההמונים", "הסולח", "המפורטות", "ההתייעצות", "קישוטי הזהב", "העשן", "הכורעת", "הדיונות", "מוחמד", "הניצחון", "החדרים", "קאף", "הזורות", "ההר", "הכוכב", "הירח", "הרחמן", "המאורע", "הברזל", "המתווכחת", "הכינוס", "הנבחנת", "השורה", "יום ההתכנסות", "הצבועים", "ההונאה ההדדית", "הגירושין", "האיסור", "המלכות", "הקולמוס", "הוודאית", "המעלות", "נוח", "הג׳ין", "המתעטף", "המתכסה", "התקומה", "האדם", "השלוחות", "הבשורה", "התולשות", "הזעיף פניו", "הקיפול", "הבקיעה", "המקמצים במידה", "ההתבקעות", "המזלות", "כוכב הלילה", "העליון", "המכסה", "השחר", "העיר", "השמש", "הלילה", "שעת הבוקר", "הרחבת הלב", "התאנה", "קריש הדם", "ליל הגורל", "הראיה הברורה", "הרעידה", "הדוהרות", "המכה", "ההתחרות בריבוי", "העת", "המלעיז", "הפיל", "קורייש", "הסיוע", "השפע", "הכופרים", "העזרה", "הסיבים", "הטוהר", "עלות השחר", "בני האדם"];
function quranSide(cur) {
  return `<aside class="side"><input type="search" id="sfilter" placeholder="סינון סורות · تصفية السور" aria-label="סינון סורות · تصفية السور" style="width:100%;margin-bottom:6px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">
  <div id="slist">${META.suras.map(s => `<a href="#/a/${s.n}" class="${s.n === cur ? 'on' : ''}" data-f="${esc(norm(s.name + ' ' + SURA_HE[s.n] + ' ' + s.n))}"><span>${s.n}. ${L(esc(SURA_HE[s.n]), esc(s.name))}</span><span class="n">${s.parallels || ''}</span></a>`).join('')}</div></aside>`;
}
async function viewQuran(su, v) {
  markTab('a');
  su = su || 1;
  app.innerHTML = `<div class="layout">${quranSide(su)}<div class="page"><div class="loading">טוען… · جارٍ التحميل…</div></div></div>`;
  $('#sfilter').oninput = e => { const q = norm(e.target.value); $$('#slist a').forEach(a => a.style.display = a.dataset.f.includes(q) ? '' : 'none'); };
  const d = await J(`quran/${pad(su, 3)}.json`);
  setTitle(`סורה ${su}, ${SURA_HE[su]} · ${d.name}`);
  const after = {};
  d.parallels.forEach(p => { const k = p.b || p.a || 1; (after[k] = after[k] || []).push(['p', p]); });
  d.bible.forEach(p => { const k = p.b || p.a; (after[k] = after[k] || []).push(['b', p]); });
  const rng = p => `<bdi dir="ltr">${su}:${p.a}${p.b && p.b !== p.a ? '–' + p.b : ''}</bdi>`;
  const cards = list => `<div class="layer-par">${list.map(([k, p]) => k === 'p' ? `<div class="card">
      <div class="card-h"><div><span class="t col-he">${rng(p)} <span class="muted">⇄</span> ${esc(p.ref || '')}</span>${(p.refAr || refAr(p.ref)) ? `<div class="t col-ar ar" lang="ar">${esc(d.name)} ${rng(p)} ⇄ ${esc(p.refAr || refAr(p.ref))}</div>` : ''}
      <div class="chips">${p.corpus ? `<span class="chip">${tr(p.corpus, TYPE_AR)}</span>` : ''}${strengthChip(p.strength)}</div>${dtLine(p.dt)}</div>
      ${cardActs([`${su}:${p.a} ⇄ ${p.ref}`, p.refAr, p.srcHe, p.srcAr, p.note, p.noteAr].filter(Boolean).join('\n'), `a/${su}/${p.a}`)}</div>
      ${(p.srcHe || p.srcAr) ? `<div class="two"><div class="he col-he">${esc(p.srcHe)}</div><div class="ar col-ar" lang="ar">${p.srcAr ? esc(p.srcAr) : PENDING}</div></div>` : ''}
      ${p.note || p.noteAr ? `<div class="two note"><div class="col-he"><b>הקשר:</b> ${esc(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>` : ''}
      <details class="more"><summary>${L('פרטים', 'تفاصيل')}</summary>${p.context ? `<div>${L('הקשר רחב', 'السياق الأوسع')}: ${esc(p.context)}</div>` : ''}${p.edition ? `<div>${L('מהדורה', 'الطبعة')}: ${esc(p.edition)}</div>` : ''}${p.id ? `<div>${L('מזהה', 'المعرّف')}: ${esc(p.id)}</div>` : ''}<div>${reportLink(p.id, `a/${su}/${p.a}`)}</div></details>
    </div>` : `<div class="card">
      <div class="card-h"><div><span class="t col-he">${rng(p)} <span class="muted">⇄</span> <a href="#/${p.route}">${esc(p.ref)}</a></span>${(p.refAr || refAr(p.ref)) ? `<div class="t col-ar ar" lang="ar">${esc(d.name)} ${rng(p)} ⇄ <a href="#/${p.route}">${esc(p.refAr || refAr(p.ref))}</a></div>` : ''}
      <div class="chips"><span class="chip">${tr('תנ״ך', TYPE_AR)}</span>${strengthChip(p.strength)}</div></div>
      ${cardActs([`${su}:${p.a} ⇄ ${p.ref}`, p.refAr, p.bibleHe, p.bibleAr, p.note, p.noteAr].filter(Boolean).join('\n'), p.route)}</div>
      ${(p.bibleHe || p.bibleAr) ? `<div class="two"><div class="he col-he">${esc(p.bibleHe || '')}</div><div class="ar col-ar" lang="ar">${p.bibleAr ? esc(p.bibleAr) : PENDING}</div></div>` : ''}
      ${p.note || p.noteAr ? `<div class="two note"><div class="col-he"><b>הקשר:</b> ${esc(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>` : ''}
    </div>`).join('')}</div>`;
  $('.page', app).innerHTML = `<div class="crumbs">${L('הקוראן ותפסיר עם הספר', 'القرآن وتفسير أهل الكتاب')}</div>
    <h1>${L(`סורה ${su}: ${esc(SURA_HE[su])}`, `سورة ${arNum(su)}: ${esc(d.name)}`)}</h1>
    <div class="muted">${L(`${d.verses.length} פסוקים · ${d.parallels.length + d.bible.length} מקבילות`, `${arNum(d.verses.length)} آية · ${arNum(d.parallels.length + d.bible.length)} توازيًا`)}</div>
    ${shareBar(`סורה ${su}: ${SURA_HE[su]}`, `سورة ${d.name}`, 'הסורה בערבית ובתרגום עברי, עם המקבילות מן המקרא ומספרות חז״ל', 'السورة بالعربية وبترجمة عبرية، مع التوازيات من المقرا وأدب الحكماء', `a/${su}`)}
    ${NAV}
    <div class="verses">${d.verses.map(x => `<div class="vrow" id="v-${x.v}">
      <div class="he layer-text"><a class="num" href="#/a/${su}/${x.v}">${x.v}</a>${esc(x.he)}</div>
      <div class="ar q-text layer-text" lang="ar">${esc(x.ar)} <span class="num">﴿${arNum(x.v)}﴾</span><button type="button" class="play" data-play="${su}:${x.v}" title="השמע · استمع" aria-label="השמע פסוק ${su}:${x.v} · استمع إلى الآية ${arNum(su)}:${arNum(x.v)}">▶</button></div>
      ${x.notes ? `<div class="saadia layer-note"><b>${L('הערת תרגום', 'ملاحظة الترجمة')}:</b> <span class="col-he">${esc(x.notes.join(' · '))}</span> <span class="col-ar ar muted" lang="ar">(ملاحظة على صياغة الترجمة العبرية)</span></div>` : ''}
    </div>${after[x.v] ? cards(after[x.v]) : ''}`).join('')}</div>
    <div class="pager">${su > 1 ? `<a class="btn" href="#/a/${su - 1}">→ ${L(`סורה ${su - 1}: ${SURA_HE[su - 1]}`, `سورة ${arNum(su - 1)}`)}</a>` : '<span></span>'}${su < 114 ? `<a class="btn" href="#/a/${su + 1}">${L(`סורה ${su + 1}: ${SURA_HE[su + 1]}`, `سورة ${arNum(su + 1)}`)} ←</a>` : ''}</div>`;
  buildNav($('.page', app), [['.verses', 'הטקסט המקורי: קוראן', 'النص الأصلي: القرآن', 'text'], ['.layer-par', 'תפסיר עם הספר', 'تفسير أهل الكتاب', 'par'], ['.layer-note', 'הערות תרגום', 'ملاحظات الترجمة', 'note']]);
  $('#slist a.on')?.scrollIntoView({ block: 'nearest' });
  scrollToAnchor(v && `v-${v}`);
}

const NAKH_AR = { 'יהושע': 'يشوع', 'שופטים': 'القضاة', 'רות': 'راعوث', 'שמואל א': 'صموئيل الأول', 'שמואל ב': 'صموئيل الثاني', 'מלכים א': 'الملوك الأول', 'מלכים ב': 'الملوك الثاني',
  'דברי הימים א': 'أخبار الأيام الأول', 'דברי הימים ב': 'أخبار الأيام الثاني', 'עזרא': 'عزرا', 'נחמיה': 'نحميا', 'אסתר': 'أستير', 'איוב': 'أيوب', 'תהלים': 'المزامير', 'משלי': 'الأمثال',
  'קהלת': 'الجامعة', 'שיר השירים': 'نشيد الأنشاد', 'ישעיהו': 'إشعياء', 'ירמיהו': 'إرميا', 'איכה': 'مراثي إرميا', 'יחזקאל': 'حزقيال', 'דניאל': 'دانيال', 'הושע': 'هوشع', 'יואל': 'يوئيل',
  'עמוס': 'عاموس', 'עובדיה': 'عوبديا', 'יונה': 'يونان', 'מיכה': 'ميخا', 'נחום': 'ناحوم', 'חבקוק': 'حبقوق', 'צפניה': 'صفنيا', 'חגי': 'حجي', 'זכריה': 'زكريا', 'מלאכי': 'ملاخي' };
async function viewNakh(i, anchor) {
  markTab('n');
  i = i || 1;
  const side = `<aside class="side">${META.nakh.map((b, k) => `<a href="#/n/${k + 1}" class="${k + 1 === i ? 'on' : ''}"><span>${L(esc(b.book), esc(NAKH_AR[b.book] || ''))}</span><span class="n">${b.count}</span></a>`).join('')}</aside>`;
  app.innerHTML = `<div class="layout">${side}<div class="page"><div class="loading">טוען… · جارٍ التحميل…</div></div></div>`;
  const d = await J(`nakh/${pad(i, 2)}.json`);
  setTitle(`${d.book} · ${NAKH_AR[d.book] || ''}`);
  const all = [...d.parallels.map(p => ['b', p]), ...(d.fromQuran || []).map(p => ['q', p])].sort((x, y) => (x[1].c - y[1].c) || (x[1].v - y[1].v));
  const seenV = new Set();
  $('.page', app).innerHTML = `<div class="crumbs">${L('נביאים וכתובים', 'الأنبياء والكتب')}</div><h1>${L(esc(d.book), esc(NAKH_AR[d.book] || ''))}</h1><div class="muted">${L(`${all.length} מקבילות`, `${arNum(all.length)} توازيًا`)}</div>
    ${all.map(([k, p]) => { const id = `v-${p.c}-${p.v}`; const a = seenV.has(id) ? '' : ` id="${id}"`; seenV.add(id); return `<div${a}>${k === 'b' ? parallelCard(p, `n/${i}/${p.c}:${p.v}`, true) : fqCard(p, true)}</div>`; }).join('')}`;
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

const relLinks = t => (t || '').replace(/\b([NS]\d{1,3})\b/g, '<a href="#/c/$1">$1</a>');
const CFIELDS = [['quran', 'קוראן', 'القرآن'], ['hadith', 'חדית׳', 'الحديث'], ['torah', 'תורה', 'التوراة'], ['nakh', 'נביאים וכתובים', 'الأنبياء والكتب'],
  ['jewish', 'חז״ל ומקורות יהודיים', 'الحكماء والمصادر اليهودية'], ['nt', 'ברית חדשה וספרות חיצונית', 'العهد الجديد والأدب الخارجي'],
  ['moreIslam', 'מראי מקום נוספים – קוראן, חדית׳ ותפסיר', 'مراجع إضافية – قرآن وحديث وتفسير'], ['moreJewish', 'מראי מקום נוספים – תורה, נ״ך, חז״ל והגות', 'مراجع إضافية – توراة وأنبياء وحكماء وفكر'],
  ['deepen', 'העמקת הדמיון והשוני', 'تعميق أوجه الشبه والاختلاف']];
const GROUP_AR = { 'אמונה': 'الإيمان', 'פולחן': 'العبادة', 'סיפורים': 'القصص', 'מוסר': 'الأخلاق', 'משפט': 'الشريعة والقضاء', 'משפחה וחברה': 'الأسرة والمجتمع', 'אחרית הימים': 'آخر الزمان', 'ארץ ומקום': 'الأرض والمكان', 'חברה ומשפט': 'المجتمع والشريعة', 'נבואה וכתבי הקודש': 'النبوة والكتب المقدسة', 'מלחמה ושלום': 'الحرب والسلام', 'צדקה וכלכלה': 'الصدقة والاقتصاد' };
const STARTERS = ['N09', 'S04', 'N02', 'N04', 'N29', 'S09'];
/* pages that have a static share page (with their own title and description for WhatsApp / search engines) */
const shareUrl = route => /^(c\/[A-Z]\d+|b\/\d+|a\/\d+|n\/\d+)$/.test(route)
  ? location.origin + location.pathname.replace(/index\.html$/, '') + route + '.html' : location.origin + location.pathname + '#/' + route;
/* bibliographic citation for a page (about page, "how to cite") */
function citation(title, titleAr, url) {
  const t = new Date(), d = `${t.getDate()}.${t.getMonth() + 1}.${t.getFullYear()}`;
  return `${title ? `„${title}“, ` : ''}מדרשת האמונה: מאגר דו־לשוני של מקבילות בין מקורות היהדות והאסלאם, ${url} (נצפה ב־${d}).\n`
    + `${titleAr ? `«${titleAr}»، ` : ''}مدرسة الإيمان: قاعدة بيانات ثنائية اللغة للتوازيات بين مصادر اليهودية والإسلام، ${url} (تاريخ الاطلاع: ${d}).`;
}
const ICON = n => `<img class="ico" src="assets/icons/${n}.svg" alt="" width="16" height="16">`;
const SVGI = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</g>${extra}</svg>`;
const LINK_SVG = SVGI('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>');
const COPY_SVG = SVGI('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>');
const QUOTE_SVG = SVGI('<path d="M7 7H4v6h4v-2c0 3-1 5-4 6M17 7h-3v6h4v-2c0 3-1 5-4 6"/>');
const PRINT_SVG = SVGI('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>');
const tip = (he, ar) => `title="${ar} · ${he}" aria-label="${ar} · ${he}"`;
const SHARE_SVG = '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></g></svg>';
const MAIL_SVG = '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></g></svg>';
function shareMenu(d) {
  const u = encodeURIComponent(d.url), tt = encodeURIComponent(d.title), t = encodeURIComponent(d.both);
  const item = (href, icon, he, ar) => `<a class="shr-item" href="${href}" target="_blank" rel="noopener">${icon}${L(he, ar)}</a>`;
  const wa = k => `https://wa.me/?text=${encodeURIComponent(d[k])}`;
  modal(`<h2>${L('שיתוף', 'مشاركة')}</h2>
    <div class="shr-wa"><span class="shr-h">${ICON('whatsapp')}${L('וואטסאפ', 'واتساب')}</span>
      <a class="shr-item" href="${wa('ar')}" target="_blank" rel="noopener" lang="ar">بالعربية</a><a class="shr-item" href="${wa('he')}" target="_blank" rel="noopener">בעברית</a><a class="shr-item" href="${wa('both')}" target="_blank" rel="noopener">${L('דו־לשוני', 'ثنائي اللغة')}</a></div>
    <div class="shr-list">
    ${item(`https://t.me/share/url?url=${u}&text=${tt}`, ICON('telegram'), 'טלגרם', 'تيليغرام')}
    ${item(`https://www.facebook.com/sharer/sharer.php?u=${u}`, ICON('facebook'), 'פייסבוק', 'فيسبوك')}
    ${item(`https://x.com/intent/post?text=${tt}&url=${u}`, ICON('x'), 'X', 'X')}
    ${item(`mailto:?subject=${tt}&body=${t}`, MAIL_SVG, 'מייל', 'البريد الإلكتروني')}
    <button type="button" class="shr-item" id="shrCopy">${L('העתק קישור', 'انسخ الرابط')}</button>
    ${navigator.share ? `<button type="button" class="shr-item" id="shrMore">${SHARE_SVG}${L('אפשרויות נוספות', 'خيارات أخرى')}</button>` : ''}</div>`);
  $('#shrCopy').onclick = () => copy(d.url);
  const m = $('#shrMore'); if (m) m.onclick = () => navigator.share({ title: d.title, text: d.both, url: d.url }).catch(() => { });
}
const SHARES = {};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  const d = SHARES[b.dataset.share]; if (d) shareMenu(d);
});
function shareBar(title, titleAr, summary, summaryAr, route) {
  const base = shareUrl(route), sep = '?';
  const msg = {
    he: `${title}\n${clip(summary, 220)}\nמדרשת האמונה – לימוד משותף:\n${base}${sep}l=he`,
    ar: `${titleAr}\n${clip(summaryAr, 220)}\nمدرسة الإيمان – دراسة مشتركة:\n${base}${sep}l=ar`,
    both: HEF ? `${title} · ${titleAr}\n${clip(summary, 160)}\n${clip(summaryAr, 160)}\nמדרשת האמונה · مدرسة الإيمان:\n${base}${sep}l=both`
      : `${titleAr} · ${title}\n${clip(summaryAr, 160)}\n${clip(summary, 160)}\nمدرسة الإيمان · מדרשת האמונה:\n${base}${sep}l=both` };
  const key = route || 'home';
  SHARES[key] = { title: `${titleAr} · ${title}`, url: `${base}${sep}l=both`, ...msg };
  return `<div class="sharebar">
    <button type="button" class="ib" data-share="${esc(key)}" ${tip('שיתוף', 'مشاركة')}>${SHARE_SVG}</button><button type="button" class="ib" data-link="${esc(route)}" ${tip('העתק קישור', 'انسخ الرابط')}>${LINK_SVG}</button><button type="button" class="ib" data-cite="${esc(title)}" data-cite-ar="${esc(titleAr)}" data-cite-route="${esc(route)}" ${tip('העתק ציטוט ביבליוגרפי לעמוד זה', 'انسخ إحالة مرجعية لهذه الصفحة')}>${QUOTE_SVG}</button><button type="button" class="ib" data-print ${tip('הדפסה או שמירה כ־PDF', 'طباعة أو حفظ بصيغة PDF')}>${PRINT_SVG}</button></div>
    <div class="print-head">מדרשת האמונה · <span lang="ar">مدرسة الإيمان</span> — ${esc(base)}</div>`;
}
async function viewThemes(code, anchor) {
  markTab('c');
  if (code) {
    const t = await J(`topics/${code}.json`).catch(() => null);
    if (!t) { app.innerHTML = `<div class="page">${L('לא נמצא', 'غير موجود')}</div>`; return; }
    const list = (await J('themes.json')).topics;
    setTitle(`${t.title} · ${t.titleAr || ''}`);
    const idx = list.findIndex(x => x.code === code), prev = list[idx - 1], next = list[idx + 1];
    const byKind = {}; (t.sources || []).forEach((s, k) => { s.k = k; (byKind[s.kind] = byKind[s.kind] || []).push(s); });
    const KIND_ORDER = [['קוראן', 'القرآن'], ['מקרא', 'المقرا'], ['חדית׳', 'الحديث'], ['משנה', 'المشنا'], ['תלמוד ומדרש', 'التلمود والمدراش'], ['תפסיר', 'التفسير'], ['ספרות "מעלות ירושלים" ומקורות היסטוריים', 'أدب الفضائل والمصادر التاريخية'], ['הגות והלכה', 'الفكر والشريعة اليهودية']];
    Object.keys(byKind).forEach(k => { if (!KIND_ORDER.some(([x]) => x === k)) KIND_ORDER.push([k, byKind[k][0].kindAr || '']); });
    const kinds = KIND_ORDER.filter(([k]) => byKind[k]);
    const many = (t.sources || []).length > 6;
    const firstQ = (s => s ? s.split(/\n|(?<=\?)\s/)[0] : '')(t.question), firstQAr = (s => s ? s.split(/\n|(?<=؟)\s/)[0] : '')(t.questionAr);
    const srcCard = s => `<div class="src" id="s-${s.k}">
          <div class="h"><div class="refs"><span class="col-he">${linkQuran(s.ref)}</span><span class="col-ar ar" lang="ar">${esc(s.refAr || '')}</span></div>
          ${cardActs([s.ref, s.refAr, s.he, s.ar].filter(Boolean).join('\n'), `c/${code}/s-${s.k}`)}</div>
          <div class="two"><div class="he col-he">${s.he ? pre(s.he) : PENDING_HE}</div><div class="ar col-ar${s.kind === 'קוראן' ? ' q-text' : ''}" lang="ar">${s.ar ? pre(s.ar) : PENDING}</div></div>
          ${s.note || s.noteAr ? `<div class="two small note"><div class="col-he">${esc(s.note || '')}</div><div class="col-ar ar" lang="ar">${esc(s.noteAr || '')}</div></div>` : ''}
          ${dtLine(s.dt)}${s.ed ? `<div class="ed">${L(esc(s.ed), esc(s.edAr || ''))}</div>` : ''}</div>`;
    app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/c">${L('נושאים לעיון', 'موضوعات للتأمل')}</a> · ${t.group ? tr(t.group, GROUP_AR) : ''}</div>
      <h1>${L(esc(t.title), esc(t.titleAr || ''))}</h1>
      <div class="chips"><span class="chip">${esc(t.code)}</span>${t.kind ? `<span class="chip">${tr(t.kind, TYPE_AR)}</span>` : ''}${t.sources?.length ? `<span class="chip">${L(`${t.sources.length} מקורות`, `${arNum(t.sources.length)} مصدرًا`)}</span>` : ''}</div>
      ${shareBar(t.title, t.titleAr || t.title, t.summary || '', t.summaryAr || '', `c/${code}`)}
      ${NAV}
      <h2 id="sec-sum">${L('עיקר ההשוואה', 'خلاصة المقارنة')}</h2>
      <div class="two"><p class="col-he">${linkQuran(t.summary || '')}</p><p class="col-ar ar" lang="ar">${t.summaryAr ? esc(t.summaryAr) : PENDING}</p></div>${dtLine(t.dt?.summary)}
      ${firstQ || firstQAr ? `<div class="opening"><div class="two"><div class="col-he"><b>שאלת פתיחה לחברותא:</b> ${esc(firstQ)}</div><div class="col-ar ar" lang="ar"><b>سؤال افتتاحي للدراسة المشتركة:</b> ${firstQAr ? esc(firstQAr) : PENDING}</div></div></div>` : ''}
      ${kinds.length ? `<h2 id="sec-src">${L('המקורות במלואם', 'نصوص المصادر كاملة')} <span class="muted small">(${t.sources.length})</span>
        ${many ? `<button type="button" class="btn" id="openAll">${L('פתח הכל', 'افتح الكل')}</button>` : ''}</h2>
        ${kinds.map(([k, ka], j) => `<details class="kind src-kind" data-unit="${esc(k)}" data-unit-ar="${esc(ka)}" ${!many || j < 2 ? 'open' : ''}><summary>${L(k, ka)} <span class="muted small">(${byKind[k].length})</span></summary>${byKind[k].map(srcCard).join('')}</details>`).join('')}` : ''}
      <h2 id="sec-refs">${L('מראי מקום והעמקה', 'المراجع والتعمّق')}</h2>
      ${CFIELDS.filter(([k]) => t[k]).map(([k, l, la]) => `<div class="fieldrow"><h3>${L(l, la)}</h3><div class="two"><p class="pre col-he">${linkQuran(t[k])}</p><p class="col-ar ar" lang="ar">${t[k + 'Ar'] ? esc(t[k + 'Ar']) : PENDING}</p></div>${dtLine(t.dt?.[k])}</div>`).join('')}
      ${t.related ? `<div class="fieldrow"><h3>${L('נושאים קשורים', 'موضوعات ذات صلة')}</h3><p>${relLinks(esc(t.related))}</p></div>` : ''}
      ${t.quranVerses ? `<div class="fieldrow"><h3>${L('פסוקי קוראן בנושא', 'آيات قرآنية في الموضوع')}</h3><p>${linkQuran(t.quranVerses)}</p></div>` : ''}
      ${t.linksHe ? `<div class="fieldrow"><h3>${L('חדית׳ מתורגמים', 'أحاديث مترجمة')}</h3><div class="two"><div class="col-he pre">${esc(t.linksHe)}</div><div class="col-ar ar pre" lang="ar">${esc(t.linksAr || '')}</div></div></div>` : ''}
      ${t.question || t.questionAr ? `<div class="qs" id="sec-qs"><h3>${L('שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة')}</h3><div class="two"><div class="pre col-he">${esc(t.question || '')}</div><div class="pre col-ar ar" lang="ar">${t.questionAr ? esc(t.questionAr) : PENDING}</div></div></div>` : ''}
      <div class="pager">${prev ? `<a class="btn" href="#/c/${prev.code}">→ ${L(esc(prev.title), esc(prev.titleAr || ''))}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/c/${next.code}">${L(esc(next.title), esc(next.titleAr || ''))} ←</a>` : ''}</div></div>`;
    buildNav($('.page', app), [['#sec-sum', 'עיקר ההשוואה', 'خلاصة المقارنة'], ['#sec-src', 'המקורות במלואם', 'نصوص المصادر'], ['#sec-refs', 'מראי מקום והעמקה', 'المراجع والتعمّق'], ['#sec-qs', 'שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة']], '.src-kind');
    const oa = $('#openAll'); if (oa) oa.onclick = () => { const all = $$('details.kind'); const open = !all.every(d => d.open); all.forEach(d => d.open = open); oa.innerHTML = open ? L('סגור הכל', 'أغلق الكل') : L('פתח הכל', 'افتح الكل'); };
    if (anchor) { const el = document.getElementById(anchor); if (el) { const d = el.closest('details'); if (d) d.open = true; } }
    scrollToAnchor(anchor); return;
  }
  const d = await J('themes.json');
  setTitle('נושאים לעיון · موضوعات للتأمل');
  const gcount = {}; d.topics.forEach(t => { if (t.group) gcount[t.group] = (gcount[t.group] || 0) + 1; });
  const groups = Object.keys(gcount).sort((a, b) => gcount[b] - gcount[a]);
  const starters = STARTERS.map(c => d.topics.find(t => t.code === c)).filter(Boolean);
  app.innerHTML = `<div class="page"><h1>${L('נושאים לעיון', 'موضوعات للتأمل')}</h1>
    <div class="starters"><h2>${L('מומלצים למפגש ראשון', 'مقترحة للقاء الأول')}</h2><div class="grid-cards">${starters.map(t => `<a class="bigcard" href="#/c/${t.code}"><h3>${L(esc(t.title), esc(t.titleAr || ''))}</h3><div class="muted small">${L(`${t.nsources} מקורות · ${esc(t.group || '')}`, `${arNum(t.nsources)} مصدرًا · ${esc(GROUP_AR[t.group] || '')}`)}</div></a>`).join('')}</div></div>
    <div class="gchips" role="group" aria-label="קבוצות · المجموعات"><button type="button" class="on" data-g="">${L(`הכל (${d.topics.length})`, `الكل (${arNum(d.topics.length)})`)}</button>${groups.map(g => `<button type="button" data-g="${esc(g)}">${L(`${esc(g)} (${gcount[g]})`, `${esc(GROUP_AR[g] || g)} (${arNum(gcount[g])})`)}</button>`).join('')}</div>
    <div class="filter"><input id="tf" type="search" placeholder="סינון לפי מילה · تصفية بكلمة" aria-label="סינון · تصفية"><span class="muted small" id="tc"></span></div>
    <div id="tl">${d.topics.map(t => `<a class="tl-row" href="#/c/${t.code}" data-g="${esc(t.group || '')}" data-f="${esc(norm([t.code, t.title, t.titleAr, t.summary, t.summaryAr].join(' ')))}">
      <span class="tt">${L(esc(t.title), esc(t.titleAr || ''))}</span><span class="meta"><span>${tr(t.group, GROUP_AR) || ''}</span><span>${L(`${t.nsources} מקורות`, `${arNum(t.nsources)} مصدرًا`)}</span><span>${esc(t.code)}</span></span>
      <span class="sm ar l-ar" lang="ar">${esc(clip(t.summaryAr, 170))}</span><span class="sm l-he">${esc(clip(t.summary, 170))}</span></a>`).join('')}</div></div>`;
  let G = '';
  const f = () => { const q = norm($('#tf').value); let n = 0; $$('#tl a').forEach(a => { const ok = a.dataset.f.includes(q) && (!G || a.dataset.g === G); a.style.display = ok ? '' : 'none'; n += ok; }); $('#tc').innerHTML = L(`${n} נושאים`, `${arNum(n)} موضوعًا`); };
  $('.gchips').onclick = e => { const b = e.target.closest('button'); if (!b) return; G = b.dataset.g; $$('.gchips button').forEach(x => x.classList.toggle('on', x === b)); f(); };
  $('#tf').oninput = f; f();
}

const DT_CAT_AR = { 'חז״ל': 'أدب الحكماء', 'תרגום': 'الترجوم', 'יהודי – ימי הביניים': 'اليهودية – العصور الوسطى', 'יהודי – עת חדשה': 'اليهودية – العصر الحديث', 'ספרות חיצונית': 'الأدب الخارجي',
  'יהודי־הלניסטי': 'يهودي هلنستي', 'אפוקריפה נוצרית': 'أبوكريفا مسيحية', 'נוצרי סורי': 'سرياني مسيحي', 'ברית חדשה': 'العهد الجديد', 'אסלאמי': 'مؤلفات إسلامية' };
const APP_AR = { disputes: 'خلافات أساسية قديمة', roots: 'جذور توأم', pearls: 'لآلئ متوازية', crossroads: 'ملتقيات تاريخية' };
const HDR_AR = { 'קוד': 'الرمز', 'סוגיית המחלוקת (עברית)': 'قضية الخلاف (بالعبرية)', 'שאלת היסוד': 'السؤال الأساسي',
  'העמדה הקלאסית ביהדות (ומראי מקום)': 'الموقف الكلاسيكي في اليهودية (ومراجعه)', 'העמדה הקלאסית באסלאם (ומראי מקום)': 'الموقف الكلاسيكي في الإسلام (ومراجعه)',
  'שורש הפער התיאולוגי / הפרשני': 'جذر الفجوة اللاهوتية / التفسيرية', 'מפתח ללימוד מכבד בחברותא': 'مفتاح لدراسة مشتركة محترمة', 'אימות מראי המקום (19.11)': 'التحقق من المراجع',
  'מקור': 'المصدر', 'המונח בעברית': 'المصطلح بالعبرية', 'המונח בערבית': 'المصطلح بالعربية', 'השורש השמי המשותף': 'الجذر السامي المشترك',
  'משמעות ומראי מקום ביהדות': 'المعنى والمراجع في اليهودية', 'משמעות ומראי מקום באסלאם': 'المعنى والمراجع في الإسلام', 'נקודת המפגש והמשמעות הרעיונית': 'نقطة الالتقاء والمعنى الفكري',
  'נושא הפנינה': 'موضوع اللؤلؤة', 'המקור היהודי (עברית)': 'المصدر اليهودي (بالعبرية)', 'מראה מקום יהודי': 'المرجع اليهودي', 'המקור האסלאמי (ערבית + תרגום עברי)': 'المصدر الإسلامي (بالعربية مع ترجمة عبرية)',
  'מראה מקום אסלאמי': 'المرجع الإسلامي', 'הארה להשוואה': 'إضاءة للمقارنة', 'תקופה': 'الحقبة', 'מרכז גיאוגרפי': 'المركز الجغرافي', 'דמויות מפתח ביהדות': 'شخصيات محورية في اليهودية',
  'דמויות מפתח באסלאם': 'شخصيات محورية في الإسلام', 'חיבורים מרכזיים': 'مؤلفات رئيسية', 'מוקד ההשפעה והדיאלוג ההדדי': 'محور التأثير والحوار المتبادل' };
async function viewAppendix(slug, anchor) {
  markTab('x');
  const d = await J('appendices.json');
  const DT = META.dating || {};
  if (slug === 'dating') {
    setTitle('תיארוך המקורות · تأريخ المصادر');
    const CAT_ORDER = ['ספרות חיצונית', 'יהודי־הלניסטי', 'ברית חדשה', 'חז״ל', 'תרגום', 'אפוקריפה נוצרית', 'נוצרי סורי', 'יהודי – ימי הביניים', 'יהודי – עת חדשה', 'אסלאמי'];
    const cats = {}; CAT_ORDER.forEach(c => (cats[c] = [])); Object.entries(DT).forEach(([k, v]) => { const c = v[6] || 'אחר'; (cats[c] = cats[c] || []).push([k, v]); });
    Object.keys(cats).forEach(c => { if (!cats[c].length) delete cats[c]; });
    app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/x">${L('נספחים', 'ملاحق')}</a></div><h1>${L('תיארוך המקורות', 'تأريخ المصادر')}</h1>
      <p class="muted">${L('זמן החיבור המשוער של המקורות המאוחרים המופיעים באתר. התנ״ך, הקוראן וקובצי החדית׳ אינם מתוארכים. התאריכים הם הערכות מקובלות במחקר, ורבים מהם שנויים במחלוקת.',
        'الزمن التقريبي لتأليف المصادر المتأخرة الواردة في الموقع. لا يُؤرَّخ التناخ ولا القرآن ولا مجاميع الحديث. التواريخ تقديرات شائعة في البحث، وكثير منها موضع خلاف.')}</p>
      ${Object.entries(cats).map(([c, list]) => `<h2>${L(esc(c), esc(DT_CAT_AR[c] || ''))}</h2><div class="dtt">${list.map(([k, v]) => `<div class="dtr"><span class="col-he">${esc(v[0])}</span><span class="col-ar ar" lang="ar">${esc(v[1])}</span><span class="col-he"><b>${esc(v[2])}</b>${v[4] ? ` <span class="muted small">(${esc(v[4])})</span>` : ''}</span><span class="col-ar ar" lang="ar"><b>${esc(v[3])}</b>${v[5] ? ` <span class="muted small">(${esc(v[5])})</span>` : ''}</span></div>`).join('')}</div>`).join('')}</div>`;
    return;
  }
  if (!slug || !d[slug]) {
    setTitle('נספחים · ملاحق');
    app.innerHTML = `<div class="page"><h1>${L('נספחים', 'ملاحق')}</h1><div class="grid-cards">${Object.entries(d).map(([k, v]) => `<a class="bigcard" href="#/x/${k}"><h3>${L(esc(v.title), APP_AR[k])}</h3><div class="stat">${v.rows.length}</div></a>`).join('')}<a class="bigcard" href="#/x/dating"><h3>${L('תיארוך המקורות', 'تأريخ المصادر')}</h3><div class="stat">${Object.keys(DT).length}</div></a></div></div>`;
    return;
  }
  const t = d[slug]; setTitle(`${t.title} · ${APP_AR[slug]}`);
  const isAr = h => /[؀-ۿ]/.test(h || '');
  const H = t.headers;
  const side = h => /יהדות|יהודי|בעברית/.test(h) ? 'j' : (/אסלאם|אסלאמי|בערבית|عربي/.test(h) ? 'i' : '');
  const lab = h => isAr(h) ? `<span lang="ar">${esc(h)}</span>` : L(esc(h), esc(HDR_AR[h] || ''));
  const hasCode = H[0] === 'קוד';
  const AR_OF = { 'משמעות ומראי מקום ביהדות': 'משמעות ביהדות – ערבית', 'משמעות ומראי מקום באסלאם': 'משמעות באסלאם – ערבית', 'נקודת המפגש והמשמעות הרעיונית': 'נקודת המפגש – ערבית',
    'העמדה הקלאסית ביהדות (ומראי מקום)': 'העמדה ביהדות – ערבית', 'העמדה הקלאסית באסלאם (ומראי מקום)': 'העמדה באסלאם – ערבית', 'שורש הפער התיאולוגי / הפרשני': 'שורש הפער – ערבית',
    'מפתח ללימוד מכבד בחברותא': 'מפתח ללימוד – ערבית', 'המקור היהודי (עברית)': 'המקור היהודי – ערבית', 'מוקד ההשפעה והדיאלוג ההדדי': 'מוקד ההשפעה – ערבית' };
  const arIdx = j => H.indexOf(AR_OF[H[j]] || (H[j] + ' – ערבית'));
  const card = (r, ri) => {
    const code = hasCode ? r[0] : '';
    const start = hasCode ? 1 : 0;
    const used = new Set([start]); H.forEach((h, x) => { if (/ – ערבית$/.test(h || '')) used.add(x); });
    let titleIdx = start; let titleAr = -1;
    if (hasCode && side(H[start + 1]) === 'i' && side(H[start]) === 'j') { titleAr = start + 1; used.add(start + 1); }
    if (hasCode && isAr(H[start + 1])) { titleAr = start + 1; used.add(start + 1); }
    let titleTr = titleAr < 0 ? arIdx(titleIdx) : -1;
    const pairs = [], rest = [];
    for (let j = start; j < H.length; j++) {
      if (used.has(j) || !r[j]) continue;
      const sd = side(H[j]);
      if (sd === 'j') { const k = H.findIndex((h, x) => x > j && side(h) === 'i' && !used.has(x)); if (k > 0) { pairs.push([j, k]); used.add(j); used.add(k); continue; } }
      if (!used.has(j)) { rest.push(j); used.add(j); }
    }
    const fv = j => { const a = arIdx(j); const arTxt = a >= 0 ? r[a] : null; const isArCell = isAr(H[j]) || /^[^א-ת]*[؀-ۿ]/.test(r[j] || '');
      if (isArCell) return `<div class="fv ar" lang="ar">${linkQuran(r[j] || '')}</div>`;
      return `<div class="fv"><div class="col-he">${linkQuran(r[j] || '')}</div>${arTxt ? `<div class="col-ar ar" lang="ar">${esc(arTxt)}</div>` : ''}</div>`; };
    return `<div class="apx" id="${esc(code || '')}" data-f="${esc(norm(r.join(' ')))}">
      <div class="ah">${code ? `<span class="chip">${esc(code)}</span>` : ''}<span class="ttl col-he">${esc(r[titleIdx] || '')}</span>${titleAr > 0 && r[titleAr] ? `<span class="ttl ar" lang="ar">${esc(r[titleAr])}</span>` : ''}${titleTr >= 0 && r[titleTr] ? `<span class="ttl ar col-ar" lang="ar">${esc(r[titleTr])}</span>` : ''}${code ? cardActs([r[titleIdx], r[titleAr]].filter(Boolean).join(' · ') + '\n' + r.slice(1).filter(Boolean).join('\n'), `x/${slug}/${code}`) : ''}</div>
      ${pairs.map(([j, k]) => `<div class="two"><div><span class="fl">${lab(H[j])}</span>${fv(j)}</div><div><span class="fl">${lab(H[k])}</span>${fv(k)}</div></div>`).join('')}
      ${rest.map(j => `<div><span class="fl">${lab(H[j])}</span>${fv(j)}</div>`).join('')}${dtLine((t.dt || [])[ri])}</div>`;
  };
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/x">${L('נספחים', 'ملاحق')}</a></div><h1>${L(esc(t.title), APP_AR[slug])}</h1>
    <div class="filter"><input id="af" type="search" placeholder="סינון · تصفية" aria-label="סינון · تصفية"><span class="muted small" id="ac"></span></div>
    <div id="apl">${t.rows.map((r, ri) => card(r, ri)).join('')}</div></div>`;
  const fl = () => { const q = norm($('#af').value); let n = 0; $$('#apl .apx').forEach(x => { const ok = x.dataset.f.includes(q); x.style.display = ok ? '' : 'none'; n += ok; }); $('#ac').innerHTML = L(`${n} רשומות`, `${arNum(n)} سجلًا`); };
  $('#af').oninput = fl; fl();
  scrollToAnchor(anchor);
}

const COLL_AR = { 'בוח׳ארי': 'صحيح البخاري', 'מוסלם': 'صحيح مسلم', 'תרמד׳י': 'سنن الترمذي', 'אבו דאוד': 'سنن أبي داود', 'נסאאי': 'سنن النسائي', 'אבן מאג׳ה': 'سنن ابن ماجه', 'מאלכ': 'موطأ مالك', 'דארמי': 'سنن الدارمي' };
async function viewHadith(i, n) {
  markTab('h');
  if (!i) {
    setTitle('חדית׳ · الحديث');
    app.innerHTML = `<div class="page"><h1>${L('חדית׳', 'الحديث')}</h1><p class="muted">${L('הנוסח הערבי לפי sunnah.com (במוסלם – מספור עבד אל־באקי).', 'النص العربي حسب sunnah.com (وفي صحيح مسلم حسب ترقيم محمد فؤاد عبد الباقي).')}</p>
      <div class="grid-cards">${META.hadith.map(c => `<a class="bigcard" href="#/h/${c.i}"><h3>${L(esc(c.collection), esc(COLL_AR[c.collection] || ''))}</h3><div class="stat">${c.count}</div><div class="muted">${L(`${c.translated} מתורגמים`, `${arNum(c.translated)} مترجمًا`)}</div></a>`).join('')}</div></div>`;
    return;
  }
  const d = await J(`hadith/${pad(i, 2)}.json`);
  const cAr = COLL_AR[d.collection] || '';
  setTitle(`${d.collection} · ${cAr}`);
  let only = store.get('hTr', true), LIMIT = 200;
  const render = () => {
    const q = norm($('#hf')?.value || '');
    const items = d.items.filter(x => (!only || x.he) && (!q || norm(x.n + ' ' + (x.he || '') + ' ' + x.ar).includes(q)));
    $('#hl').innerHTML = items.slice(0, LIMIT).map(x => `<div class="card" id="h-${esc(x.n)}"><div class="card-h"><div><span class="t">${L(`${esc(d.collection)} ${esc(x.n)}`, `${esc(cAr)} ${esc(x.n)}`)}</span> ${x.book ? `<span class="chip weak">${L(esc(x.book), esc(x.bookAr || ''))}</span>` : ''}</div>${cardActs([`${d.collection} ${x.n} · ${cAr} ${x.n}`, x.he, x.ar].filter(Boolean).join('\n'), `h/${i}/${x.n}`)}</div>
      <div class="two"><div class="he col-he">${x.he ? esc(x.he) : PENDING_HE}</div><div class="ar col-ar" lang="ar">${esc(x.ar)}</div></div></div>`).join('') + (items.length > LIMIT ? `<p class="muted">${L(`מוצגים ${LIMIT} מתוך ${items.length}`, `يُعرض ${arNum(LIMIT)} من ${arNum(items.length)}`)} <button type="button" class="btn" id="hmore">${L('טען עוד', 'اعرض المزيد')}</button></p>` : '');
    const hm = $('#hmore'); if (hm) hm.onclick = () => { LIMIT += 200; render(); };
    $('#hc').innerHTML = L(`${items.length} חדית׳`, `${arNum(items.length)} حديثًا`);
  };
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/h">${L('חדית׳', 'الحديث')}</a></div><h1>${L(esc(d.collection), esc(cAr))}</h1>
    <div class="filter"><input id="hf" type="search" placeholder="מספר או מילה · رقم أو كلمة" value="${n ? esc(n) : ''}"><label><input type="checkbox" id="ho" ${only ? 'checked' : ''}> ${L('רק מתורגמים', 'المترجمة فقط')}</label><span class="muted small" id="hc"></span></div><div id="hl"></div></div>`;
  if (n) { only = false; $('#ho').checked = false; }
  $('#hf').oninput = () => { LIMIT = 200; render(); }; $('#ho').onchange = e => { only = e.target.checked; store.set('hTr', only); render(); };
  render();
  if (n) { const el = document.getElementById('h-' + n); el && el.scrollIntoView({ block: 'start' }); }
}

const KIND = { b: ['תורה', 'التوراة'], n: ['נ״ך', 'الأنبياء والكتب'], a: ['קוראן – מקבילה', 'القرآن – توازٍ'], t: ['הערת תרגום', 'ملاحظة ترجمة'], c: ['נושא', 'موضوع'],
  x: ['נספח', 'ملحق'], h: ['חדית׳', 'حديث'], s: ['רס״ג', 'سعديا'] };
async function viewSearch(q) {
  markTab(''); setTitle('חיפוש · بحث: ' + q);
  $('#q').value = q;
  app.innerHTML = `<div class="page"><h1>${L('חיפוש', 'بحث')}: ${esc(q)}</h1><div class="loading">…</div></div>`;
  const idx = await J('search.json');
  if (!idx.folded) idx.folded = idx.map(r => fold(r[3]));
  const words = norm(q).split(' ').filter(Boolean);
  const hit = t => words.every(w => t.includes(w));
  const res = []; idx.forEach((r, k) => { if (hit(idx.folded[k]) || hit(norm(r[1]))) res.push([...r, idx.folded[k]]); });
  const byKind = {}; res.forEach(r => (byKind[r[0]] = byKind[r[0]] || []).push(r));
  const kinds = Object.keys(byKind);
  let only = '';
  const draw = qv => {
    const shown = kinds.filter(k => !only || only === k);
    $('#sres').innerHTML = `${shown.map(k => `<h2>${L(...KIND[k])} <span class="muted small">(${byKind[k].length})</span></h2><div class="results">${byKind[k].slice(0, 150).map(r =>
      `<a class="r" href="#/${r[2]}"><span class="k">${L(...KIND[r[0]])}</span>${esc(r[1])}<span class="s">${snip(r[3], r[4], words)}</span></a>`).join('')}</div>`).join('')}
      ${(!only || only === 'q') && qv && qv.length ? `<h2>${L('פסוקי קוראן', 'آيات قرآنية')} <span class="muted small">(${qv.length})</span></h2><div class="results">${qv.slice(0, 150).map(r => `<a class="r" href="#/a/${r[0]}/${r[1]}"><span class="k"><bdi dir="ltr">${r[0]}:${r[1]}</bdi></span><span class="s"><span class="l-ar" lang="ar">${snip(r[2], fold(r[2]), words, 200)}</span><span class="l-he">${snip(r[3], fold(r[3]), words, 200)}</span></span></a>`).join('')}</div>` : ''}
      ${qv === null ? `<p class="muted">${L('מחפש גם בפסוקי הקוראן…', 'جارٍ البحث في آيات القرآن أيضًا…')}</p>` : ''}
      ${qv && !res.length && !qv.length ? `<p>${L('לא נמצאו תוצאות. נסו מילה אחרת, בלי ניקוד.', 'لم يُعثر على نتائج. جرّبوا كلمة أخرى دون تشكيل.')}</p>` : ''}`;
  };
  const chips = qv => `<div class="gchips" role="group" aria-label="סינון תוצאות · تصفية النتائج"><button type="button" class="${only ? '' : 'on'}" data-k="">${L(`הכל (${res.length + (qv ? qv.length : 0)})`, `الكل (${arNum(res.length + (qv ? qv.length : 0))})`)}</button>${kinds.map(k => `<button type="button" data-k="${k}" class="${only === k ? 'on' : ''}">${L(`${KIND[k][0]} (${byKind[k].length})`, `${KIND[k][1]} (${arNum(byKind[k].length)})`)}</button>`).join('')}${qv && qv.length ? `<button type="button" data-k="q" class="${only === 'q' ? 'on' : ''}">${L(`פסוקי קוראן (${qv.length})`, `آيات قرآنية (${arNum(qv.length)})`)}</button>` : ''}</div>`;
  const paint = qv => {
    $('.page', app).innerHTML = `<h1>${L('חיפוש', 'بحث')}: ${esc(q)}</h1>${chips(qv)}<div id="sres"></div>`;
    $('.gchips', app).onclick = e => { const b = e.target.closest('button'); if (!b) return; only = b.dataset.k; $$('.gchips button', app).forEach(x => x.classList.toggle('on', x === b)); draw(qv); };
    draw(qv);
  };
  paint(null);                                   // the large Quran index is fetched after the first results are on screen
  const qi = await J('search_quran.json');
  if (!qi.folded) qi.folded = qi.map(r => [fold(r[2]), fold(r[3])]);
  const qv = qi.filter((r, k) => hit(qi.folded[k][0]) || hit(qi.folded[k][1]));
  if (location.hash.startsWith('#/search/')) paint(qv);
}
/* letter folding that keeps string length, so a match in the folded text marks the same span in the displayed text */
const FOLD = { 'إ': 'ا', 'أ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ئ': 'ي', 'ى': 'ي', 'ة': 'ه', '״': '"', '׳': "'", '־': ' ' };
const fold = t => (t || '').toLowerCase().replace(/[إأآٱؤئىة״׳־]/g, c => FOLD[c]);
function snip(t, f, words, n = 140) {
  t = t || ''; f = f || fold(t);
  const i = Math.max(0, f.indexOf(words[0]));
  const a = Math.max(0, i - 60), b = Math.min(t.length, i + n);
  let out = '', pos = a;
  const marks = [];
  words.forEach(w => { let j = f.indexOf(w, a); while (j >= 0 && j < b) { marks.push([j, Math.min(b, j + w.length)]); j = f.indexOf(w, j + w.length); } });
  marks.sort((x, y) => x[0] - y[0]);
  for (const [x, y] of marks) { if (x < pos) continue; out += esc(t.slice(pos, x)) + '<mark>' + esc(t.slice(x, y)) + '</mark>'; pos = y; }
  return (a > 0 ? '… ' : '') + out + esc(t.slice(pos, b)) + (b < t.length ? ' …' : '');
}

function scrollToAnchor(id) {
  if (!id) { window.scrollTo(0, 0); return; }
  const el = document.getElementById(id);
  if (el) { reveal(el); el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2500); }
}

/* ---------- router ---------- */
async function route() {
  for (const k in CARDTXT) delete CARDTXT[k];
  if (AUDIO) { AUDIO.pause(); AUDIO = null; }
  let h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const lm = h.match(/\?l=(he|ar|both)$/);
  if (lm) { h = h.slice(0, lm.index); LANG = lm[1]; store.set('lang', LANG); applySettings(); }
  const [v, a, b] = h.split('/');
  HEF = v === 'b' || v === 'n'; document.body.classList.toggle('he-first', HEF);
  try {
    if (!v) await viewHome();
    else if (v === 'c') await viewThemes(a, b);
    else if (v === 'a') await viewQuran(+a || 1, b ? +b : 0);
    else if (v === 'b') await viewTorah(+a || 0, b);
    else if (v === 'n') await viewNakh(+a || 1, b);
    else if (v === 'x') await viewAppendix(a, b);
    else if (v === 'h') await viewHadith(+a || 0, b);
    else if (v === 'about') await viewAbout(a);
    else if (v === 'news') await viewNews();
    else if (v === 'search') await viewSearch(h.slice(7));
    else await viewHome();
    if (!b) focusMain();
  } catch (e) { console.error(e); app.innerHTML = `<div class="page">${L('אירעה שגיאה בטעינה.', 'حدث خطأ في التحميل.')} <a href="#/">${L('לדף הבית', 'إلى الصفحة الرئيسية')}</a></div>`; }
}
window.addEventListener('hashchange', route);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
(async () => {
  applySettings();
  META = await J('meta.json');
  $('#built').innerHTML = L(`עדכון אחרון: ${META.built}`, `آخر تحديث: ${META.built}`);
  route();
})();
// keep the page map just under the sticky header
const setTopH = () => { const h = document.querySelector('.top'); if (h) document.documentElement.style.setProperty('--toph', h.offsetHeight + 'px'); };
window.addEventListener('resize', setTopH); setTopH(); setTimeout(setTopH, 500);
