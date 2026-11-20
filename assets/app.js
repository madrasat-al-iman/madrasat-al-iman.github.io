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
const L = (he, ar) => `<span class="l-he">${he}</span><span class="l-ar" lang="ar">${ar}</span>`;
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
const STRENGTH_AR = { 'מובהקת': 'صريحة', 'נושאית': 'موضوعية', 'אפשרית': 'محتملة' };
const TYPE_AR = { 'קוראן': 'قرآن', 'חדית׳': 'حديث', 'קוראן וחדית׳': 'قرآن وحديث', 'תנ״ך': 'التناخ', 'בבלי': 'التلمود البابلي', 'ירושלמי': 'التلمود الأورشليمي',
  'משנה': 'المشنا', 'מדרש': 'المدراش', 'ברית חדשה': 'العهد الجديد', 'תנ״ך – כתובים': 'التناخ – الكتب', 'תנ״ך – נביאים': 'التناخ – الأنبياء', 'תורה': 'التوراة',
  'סיפור': 'قصة', 'חוק': 'شريعة', 'מקרא': 'مقرا', 'נושא': 'موضوع', 'פרשנות': 'تفسير', 'ספרות חיצונית': 'أدب خارجي', 'מקבילה ישירה': 'توازٍ مباشر', 'ניגוד': 'تضاد' };
const tr = (he, map) => he ? L(esc(he), esc(map[he] || he)) : '';
function strengthChip(s) {
  if (!s || s === 'לא סווג') return '';
  return `<span class="chip ${s === 'מובהקת' ? 'strong' : (s === 'נושאית' ? '' : 'weak')}">${tr(s, STRENGTH_AR)}</span>`;
}
const stripPar = s => (s || '').replace(/\s*\(.*\)/, '');
function setTitle(t) { document.title = (t ? t + ' · ' : '') + 'מדרשת האמונה · مدرسة الإيمان'; }
function markTab(t) {
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t));
  $('#moreBtn').classList.toggle('on', ['n', 'x', 'h'].includes(t));
  $('#more').classList.remove('open');
}
$('#moreBtn').onclick = e => { e.stopPropagation(); $('#more').classList.toggle('open'); };
document.addEventListener('click', () => $('#more').classList.remove('open'));

/* ---------- settings ---------- */
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('mh_' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mh_' + k, JSON.stringify(v)); } catch { } } };
let LANG = store.get('lang', 'both'), FS = store.get('fs', 1), DARK = store.get('dark', false);
function applySettings() {
  document.body.classList.toggle('lang-he', LANG === 'he');
  document.body.classList.toggle('lang-ar', LANG === 'ar');
  document.body.classList.toggle('darkmode', !!DARK);
  document.documentElement.style.setProperty('--fs', FS);
  $$('.seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}
$$('.seg button').forEach(b => b.onclick = () => { LANG = b.dataset.lang; store.set('lang', LANG); applySettings(); });
$('#fontUp').onclick = () => { FS = Math.min(1.6, +(FS + .1).toFixed(2)); store.set('fs', FS); applySettings(); };
$('#fontDown').onclick = () => { FS = Math.max(.8, +(FS - .1).toFixed(2)); store.set('fs', FS); applySettings(); };
$('#dark').onclick = () => { DARK = !DARK; store.set('dark', DARK); applySettings(); };
$('#searchForm').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.hash = '#/search/' + encodeURIComponent(q); };
$('#modalClose').onclick = () => { $('#modal').hidden = true; };
$('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').hidden = true; };
function modal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; }

/* ---------- study / share ---------- */
$('#study').onclick = () => {
  const url = location.href;
  const room = 'https://meet.jit.si/midreshet-haemuna-' + Math.random().toString(36).slice(2, 8);
  const where = document.title.replace(' · מדרשת האמונה · مدرسة الإيمان', '');
  const text = `הזמנה ללימוד בחברותא · دعوة إلى دراسة مشتركة — מדרשת האמונה · مدرسة الإيمان\n${where}\n${url}\nחדר וידאו · غرفة فيديو (Jitsi): ${room}`;
  modal(`<h2>${L('לימוד בחברותא', 'دراسة مشتركة (حَبروتا)')}</h2>
    <p class="small muted">${L('חדר וידאו חינמי ב־Jitsi Meet, ללא צורך בחשבון. שלחו את ההזמנה ולחצו "כנסו לחדר".', 'غرفة فيديو مجانية في Jitsi Meet دون حاجة إلى حساب. أرسلوا الدعوة ثم اضغطوا «ادخلوا الغرفة».')}</p>
    <textarea id="inv">${esc(text)}</textarea>
    <div><a class="btn primary" href="${room}" target="_blank" rel="noopener">${L('כנסו לחדר', 'ادخلوا الغرفة')}</a>
    <button class="btn" type="button" id="invCopy">${L('העתק הזמנה', 'انسخ الدعوة')}</button>
    <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">${L('שלח בוואטסאפ', 'أرسل عبر واتساب')}</a></div>`);
  $('#invCopy').onclick = () => copy($('#inv').value);
};

/* ---------- cards ---------- */
const CARDTXT = {};
function cardActs(copyText, link, extra = '') {
  const id = 'c' + Math.random().toString(36).slice(2, 9);
  CARDTXT[id] = copyText;
  return `<div class="acts">${extra}<button type="button" data-copy="${id}">${L('העתק', 'نسخ')}</button>${link ? `<button type="button" data-link="${esc(link)}">${L('קישור', 'رابط')}</button>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]'); if (c) { copy(CARDTXT[c.dataset.copy] || ''); return; }
  const l = e.target.closest('[data-link]'); if (l) { copy(location.origin + location.pathname + '#/' + l.dataset.link); return; }
  const p = e.target.closest('[data-play]'); if (p) { play(p.dataset.play, p); }
});
let AUDIO = null;
function play(key, btn) {
  if (AUDIO && AUDIO.key === key && !AUDIO.paused) { AUDIO.pause(); btn.textContent = '▶'; return; }
  if (AUDIO) AUDIO.pause();
  const [s, a] = key.split(':');
  AUDIO = new Audio(`https://everyayah.com/data/Alafasy_128kbps/${pad(s, 3)}${pad(a, 3)}.mp3`); AUDIO.key = key;
  AUDIO.play().catch(() => toast('לא ניתן להשמיע · تعذّر التشغيل')); btn.textContent = '❚❚';
  AUDIO.onended = () => { btn.textContent = '▶'; };
}

function parallelCard(p, route, showBible) {
  const q = quranRefs(p.src);
  const jump = q.length ? `<a href="#/a/${q[0][0]}/${q[0][1]}">${L('לקוראן', 'إلى القرآن')}</a>` : '';
  const txt = [`${p.ref || ''} ⇄ ${p.src || ''}`, p.refAr && p.srcAr ? `${p.refAr} ⇄ ${p.srcAr}` : '', p.textHe, p.textAr, p.note, p.noteAr].filter(Boolean).join('\n');
  return `<div class="card" id="p-${esc(p.id)}">
    <div class="card-h"><div>
      <span class="t col-he">${esc(p.ref || '')} <span class="muted">⇄</span> ${linkQuran(p.src || '')}</span>
      ${p.refAr || p.srcAr ? `<div class="t col-ar ar" lang="ar">${esc(p.refAr || '')} <span class="muted">⇄</span> ${esc(p.srcAr || '')}</div>` : ''}
      <div class="chips">${p.type ? `<span class="chip">${tr(p.type, TYPE_AR)}</span>` : ''}${strengthChip(p.strength)}</div></div>
      ${cardActs(txt, route, jump)}</div>
    ${showBible && (p.bibleHe || p.bibleAr) ? `<div class="two"><div class="he col-he">${esc(p.bibleHe)}</div><div class="ar col-ar" lang="ar">${esc(p.bibleAr)}</div></div><hr style="border:0;border-top:1px dashed var(--line)">` : ''}
    ${(p.textHe || p.textAr) ? `<div class="two"><div class="he col-he">${p.textHe ? pre(p.textHe) : PENDING_HE}</div><div class="ar col-ar" lang="ar">${pre(p.textAr)}</div></div>` : ''}
    <div class="two note"><div class="col-he"><b>הקשר:</b> ${linkQuran(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>
    ${(p.hadithHe || p.hadithAr) ? `<div class="two note small"><div class="col-he pre"><b>חדית׳ מתורגמים:</b> ${esc(p.hadithHe || '')}</div><div class="col-ar ar pre" lang="ar"><b>أحاديث مترجمة:</b> ${esc(p.hadithAr || '')}</div></div>` : ''}
    <details class="more"><summary>${L('מקור ואימות', 'المصدر والتحقق')}</summary>${p.unit ? `<div>${L('יחידה', 'الوحدة')}: ${esc(p.unit)}</div>` : ''}${p.origin ? `<div>${L('מקור הזיהוי', 'مصدر التعرّف')}: ${esc(p.origin)}</div>` : ''}${p.verify ? `<div>${L('אימות', 'التحقق')}: ${esc(p.verify)}</div>` : ''}${p.themes ? `<div>${L('נושאים', 'الموضوعات')}: ${esc(p.themes)}</div>` : ''}${p.id ? `<div>${L('מזהה', 'المعرّف')}: ${esc(p.id)}</div>` : ''}</details>
  </div>`;
}

/* ---------- views ---------- */
async function viewHome() {
  markTab(''); setTitle('');
  const c = META.counts;
  const vay = META.parashot.find(p => p.name === 'ויצא');
  app.innerHTML = `<div class="page">
    <h1>מדרשת האמונה <span class="ar" lang="ar" style="color:var(--gold)">مدرسة الإيمان</span></h1>
    <div class="two"><p class="col-he">מאגר דו־לשוני, עברית וערבית, של מקבילות בין התורה, הנביאים והכתובים וספרות חז״ל לבין הקוראן והחדית׳. כל מקבילה מובאת בנוסח המקור ובתרגום, עם הקשר, מקור הזיהוי ואימות.</p>
    <p class="col-ar ar" lang="ar">قاعدة بيانات ثنائية اللغة، بالعبرية والعربية، للتوازيات بين التوراة والأنبياء والكتب وأدب الحكماء وبين القرآن والحديث. يُعرض كل توازٍ بنصه الأصلي وترجمته، مع الصلة ومصدر التعرّف والتحقق.</p></div>
    <div class="grid-cards">
      <a class="bigcard" href="#/c"><h3>${L('נושאים לעיון', 'موضوعات للتأمل')}</h3><div class="stat">${c.topics}</div><div class="muted">${L('נושאים וסיפורים, עם המקורות במלואם בשתי השפות', 'موضوعات وقصص مع نصوص المصادر كاملة باللغتين')}</div></a>
      <a class="bigcard" href="#/a"><h3>${L('הקוראן ותפסיר עם הספר', 'القرآن وتفسير أهل الكتاب')}</h3><div class="stat">114</div><div class="muted">${L(`סורות בערבית ובתרגום עברי, עם ${c.quranParallels} מקבילות לפי פסוק`, `سورة بالعربية وبترجمة عبرية، مع ${arNum(c.quranParallels)} توازيًا حسب الآية`)}</div></a>
      <a class="bigcard" href="#/b"><h3>${L('התורה ופירוש האסלאם', 'التوراة وتفسير الإسلام')}</h3><div class="stat">${c.torahParallels}</div><div class="muted">${L('מקבילות ב־54 פרשות, לצד נוסח המסורה ותרגום ון־דייק', 'توازيات في ٥٤ برشا، إلى جانب نص المسوراه وترجمة فان دايك')}</div></a>
      <a class="bigcard" href="#/n"><h3>${L('נביאים וכתובים', 'الأنبياء والكتب')}</h3><div class="stat">${c.nakhParallels}</div></a>
      <a class="bigcard" href="#/x"><h3>${L('נספחים', 'ملاحق')}</h3><div class="muted">${L('מחלוקות יסוד · שורשים תאומים · פנינים · צמתים היסטוריים', 'خلافات أساسية · جذور توأم · لآلئ · ملتقيات تاريخية')}</div></a>
      <a class="bigcard" href="#/h"><h3>${L('חדית׳', 'الحديث')}</h3><div class="stat">${c.hadith}</div><div class="muted">${L(`${c.hadithTranslated} מתורגמים לעברית`, `${arNum(c.hadithTranslated)} مترجمًا إلى العبرية`)}</div></a>
    </div>
    ${vay ? `<h2>${L('פרשת ויצא', 'برشا «فيّيتسي»')}</h2><p><a class="btn primary" href="#/b/${vay.i}">${L('לפרשת ויצא', 'إلى برشا «فيّيتسي»')}</a></p>` : ''}
  </div>`;
}

async function viewAbout() {
  markTab('about'); setTitle('אודות · عن المشروع');
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
    <h3>מקורות ומהדורות</h3>
    <ul><li>נוסח המקרא: מקרא על פי המסורה, ללא טעמים.</li><li>התרגום הערבי למקרא: ון־דייק (1865), נחלת הכלל.</li><li>נוסח הקוראן: הכתיב העות׳מאני.</li>
    <li>החדית׳: לפי מספור sunnah.com; במוסלם – מספור עבד אל־באקי.</li><li>תפסיר רס״ג: לפי הנוסח שבספריא.</li><li>התרגומים לעברית של הקוראן ושל החדית׳: תרגום המאגר.</li></ul>
    <p>המאגר מתעדכן ומתרחב כל הזמן. הערות ותיקונים יתקבלו בברכה.</p>
   </div>
   <div class="col-ar ar" lang="ar">
    <p><b>مدرسة الإيمان</b> قاعدة بيانات ثنائية اللغة، بالعبرية والعربية، تضع مصادر اليهودية والإسلام بعضها قبالة بعض: التوراة والأنبياء والكتب وأدب الحكماء قبالة القرآن والحديث. وهي معدّة للدراسة المشتركة («الحَبروتا») بين اليهود والمسلمين، وللتأمل باحترام في أوجه الشبه والاختلاف بين التقليدين.</p>
    <h3>أقسام القاعدة</h3>
    <ul><li><b>موضوعات للتأمل</b> – ${arNum(c.topics)} موضوعًا وقصة، مع نصوص المصادر كاملة باللغتين.</li>
    <li><b>القرآن وتفسير أهل الكتاب</b> – القرآن حسب ترتيبه، بالعربية وبترجمة عبرية، مع التوازيات من المقرا وأدب الحكماء.</li>
    <li><b>التوراة وتفسير الإسلام</b> – التوراة حسب البرشيوت، بنص المسوراه وترجمة فان دايك، مع التوازيات من القرآن والحديث وملاحظات من تفسير سعديا الفيومي.</li>
    <li><b>الأنبياء والكتب، والملاحق، والحديث</b>.</li></ul>
    <h3>المصادر والطبعات</h3>
    <ul><li>نص المقرا: حسب المسوراه، دون علامات النغم.</li><li>الترجمة العربية للمقرا: فان دايك (1865)، ملك عام.</li><li>نص القرآن: الرسم العثماني.</li>
    <li>الحديث: حسب ترقيم sunnah.com؛ وفي صحيح مسلم حسب ترقيم محمد فؤاد عبد الباقي.</li><li>تفسير سعديا: حسب النص في «سفاريا».</li><li>الترجمات العبرية للقرآن والحديث: ترجمة القاعدة.</li></ul>
    <p>القاعدة تُحدَّث وتتوسّع باستمرار، والملاحظات والتصويبات موضع ترحيب.</p>
   </div></div></div>`;
}

function torahSide(cur) {
  const byBook = {};
  META.parashot.forEach(p => (byBook[p.book] = byBook[p.book] || []).push(p));
  return `<aside class="side">${Object.entries(byBook).map(([b, ps]) => `<h4>${L(esc(b), esc(ps[0].bookAr || ''))}</h4>${ps.map(p =>
    `<a href="#/b/${p.i}" class="${p.i === cur ? 'on' : ''}"><span>${L(esc(p.name), esc(stripPar(p.nameAr)))}</span><span class="n">${p.parallels || ''}</span></a>`).join('')}`).join('')}</aside>`;
}
const NAV = '<nav class="secnav" aria-label="מפת העמוד"></nav>';
function buildNav(page, defs, unitSel) {
  const nav = $('.secnav', page); if (!nav) return;
  const links = defs.map(([sel, he, ar, layer]) => { const el = $(sel, page); if (!el) return '';
    if (!el.id) el.id = 'sec-' + Math.random().toString(36).slice(2, 8);
    return `<a href="javascript:void 0" data-go="${el.id}">${L(he, ar)}</a>${layer ? `<label class="lay" title="הצג/הסתר · إظهار/إخفاء"><input type="checkbox" checked data-layer="${layer}"></label>` : ''}`; }).filter(Boolean);
  const units = unitSel ? $$(unitSel, page) : [];
  units.forEach((u, k) => { if (!u.id) u.id = 'u-' + k; });
  nav.innerHTML = `<span class="nt">${L('מפת העמוד', 'خريطة الصفحة')}:</span>${links.join('')}${units.length > 1 ? `<select class="units"><option value="">קפיצה ל… · انتقال إلى…</option>${units.map(u => `<option value="${u.id}">${esc(u.dataset.unit)}${u.dataset.unitAr ? ' · ' + esc(u.dataset.unitAr) : ''}</option>`).join('')}</select>` : ''}`;
  nav.onclick = e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); document.getElementById(a.dataset.go)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  nav.onchange = e => { if (e.target.matches('select.units') && e.target.value) { document.getElementById(e.target.value)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); e.target.value = ''; }
    if (e.target.dataset.layer) page.classList.toggle('hide-' + e.target.dataset.layer, !e.target.checked); };
}
async function viewTorah(i, anchor) {
  markTab('b');
  if (!i) i = (META.parashot.find(p => p.name === 'ויצא') || META.parashot[0]).i;
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
    body += `<section class="unit" data-unit="${esc(u.name)}" data-unit-ar="${esc(stripPar(u.nameAr || ''))}"><div class="unit-h"><h2>${L(esc(u.name), esc(u.nameAr || ''))}</h2>
      <span class="muted small">${L(`${esc(P.book)} ${ref(vs[0].c, vs[0].v)} – ${ref(vs.at(-1).c, vs.at(-1).v)}`, `${esc(P.bookAr || '')} ${refAr(vs[0].c, vs[0].v)} – ${refAr(vs.at(-1).c, vs.at(-1).v)}`)}</span>${u.type ? `<span class="chip">${tr(u.type, TYPE_AR)}</span>` : ''}</div>
      <div class="verses layer-text">${vs.map(v => `<div class="vrow" id="v-${v.c}-${v.v}">
        <div class="he"><a class="num" href="#/b/${i}/${v.c}:${v.v}">${ref(v.c, v.v)}</a>${esc(v.he)}</div>
        <div class="ar" lang="ar">${esc(v.ar)} <span class="num">(${arNum(v.vd ? v.vd.replace(':', ': ') : v.v)})</span></div>
        ${(sa[key(v.c, v.v)] || []).map(s => `<div class="saadia layer-note"><b>${L(`תפסיר רס״ג על „${esc(s.phrase)}״`, 'تفسير سعديا الفيومي')}</b>
          <div class="two small"><div>${L('ון־דייק', 'فان دايك')}: <span lang="ar" class="ar">${esc(s.vd)}</span></div><div>${L('רס״ג', 'سعديا')}: <span lang="ar" class="ar">${esc(s.sa)}</span> <span class="muted col-he">(${esc(s.tr)})</span></div></div>
          <div class="two small"><div class="col-he">${esc(s.note)}</div><div class="col-ar ar" lang="ar">${s.noteAr ? esc(s.noteAr) : PENDING}</div></div></div>`).join('')}
      </div>`).join('')}</div>
      ${ps.length ? `<div class="layer-par"><h3 class="par-h">${L('פירוש האסלאם', 'تفسير الإسلام')} <span class="muted small">(${ps.length})</span></h3>${ps.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`)).join('')}</div>` : ''}
    </section>`;
  }
  const rest = d.parallels.filter(p => !used.has(p.id));
  if (rest.length) body += `<section class="unit"><h2>${L('מקבילות נוספות', 'توازيات أخرى')}</h2>${`<div class="layer-par">${rest.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`)).join('')}</div>`}</section>`;
  const prev = META.parashot.find(p => p.i === i - 1), next = META.parashot.find(p => p.i === i + 1);
  $('.page', app).innerHTML = `<div class="crumbs">${L('התורה ופירוש האסלאם', 'التوراة وتفسير الإسلام')} · ${L(esc(P.book), esc(P.bookAr || ''))}</div>
    <h1>${L(`פרשת ${esc(P.name)}`, `برشا ${esc(P.nameAr || '')}`)}</h1>
    <div class="muted">${L(`${esc(P.book)} ${ref(P.from[0], P.from[1])} – ${ref(P.to[0], P.to[1])} · ${P.verses} פסוקים · ${d.parallels.length} מקבילות${d.saadia.length ? ` · ${d.saadia.length} הערות רס״ג` : ''}`,
      `${esc(P.bookAr || '')} ${refAr(P.from[0], P.from[1])} – ${refAr(P.to[0], P.to[1])} · ${arNum(P.verses)} آية · ${arNum(d.parallels.length)} توازيًا`)}</div>
    ${NAV}
    ${body}
    ${P.questions || P.questionsAr ? `<div class="qs" id="sec-qs"><h3>${L('לשולחן שבת: שאלות לשיחה וללימוד משותף', 'لمائدة السبت: أسئلة للحوار والدراسة المشتركة')}</h3><div class="two"><div class="pre col-he">${esc(P.questions || '')}</div><div class="pre col-ar ar" lang="ar">${P.questionsAr ? esc(P.questionsAr) : PENDING}</div></div></div>` : ''}
    <div class="pager">${prev ? `<a class="btn" href="#/b/${prev.i}">→ ${L(esc(prev.name), esc(stripPar(prev.nameAr)))}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/b/${next.i}">${L(esc(next.name), esc(stripPar(next.nameAr)))} ←</a>` : ''}</div>`;
  buildNav($('.page', app), [['.verses', 'הטקסט המקורי: תורה', 'النص الأصلي: التوراة', 'text'], ['.par-h', 'פירוש האסלאם', 'تفسير الإسلام', 'par'], ['.saadia', 'הערות: תפסיר רס״ג', 'ملاحظات: تفسير سعديا', 'note'], ['#sec-qs', 'שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة']], '.unit[data-unit]');
  $('.side a.on')?.scrollIntoView({ block: 'nearest' });
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

function quranSide(cur) {
  return `<aside class="side"><input type="search" id="sfilter" placeholder="סינון · تصفية" style="width:100%;margin-bottom:6px">
  <div id="slist">${META.suras.map(s => `<a href="#/a/${s.n}" class="${s.n === cur ? 'on' : ''}" data-f="${esc(norm(s.name + ' ' + s.n))}"><span>${s.n}. <span lang="ar" class="ar">${esc(s.name)}</span></span><span class="n">${s.parallels || ''}</span></a>`).join('')}</div></aside>`;
}
async function viewQuran(su, v) {
  markTab('a');
  su = su || 1;
  app.innerHTML = `<div class="layout">${quranSide(su)}<div class="page"><div class="loading">טוען… · جارٍ التحميل…</div></div></div>`;
  $('#sfilter').oninput = e => { const q = norm(e.target.value); $$('#slist a').forEach(a => a.style.display = a.dataset.f.includes(q) ? '' : 'none'); };
  const d = await J(`quran/${pad(su, 3)}.json`);
  setTitle(`${su} · ${d.name}`);
  const after = {};
  d.parallels.forEach(p => { const k = p.b || p.a || 1; (after[k] = after[k] || []).push(['p', p]); });
  d.bible.forEach(p => { const k = p.b || p.a; (after[k] = after[k] || []).push(['b', p]); });
  const rng = p => `<bdi dir="ltr">${su}:${p.a}${p.b && p.b !== p.a ? '–' + p.b : ''}</bdi>`;
  const cards = list => `<div class="layer-par">${list.map(([k, p]) => k === 'p' ? `<div class="card">
      <div class="card-h"><div><span class="t col-he">${rng(p)} <span class="muted">⇄</span> ${esc(p.ref || '')}</span>${p.refAr ? `<div class="t col-ar ar" lang="ar">${esc(d.name)} ${rng(p)} ⇄ ${esc(p.refAr)}</div>` : ''}
      <div class="chips">${p.corpus ? `<span class="chip">${tr(p.corpus, TYPE_AR)}</span>` : ''}${strengthChip(p.strength)}</div></div>
      ${cardActs([`${su}:${p.a} ⇄ ${p.ref}`, p.refAr, p.srcHe, p.srcAr, p.note, p.noteAr].filter(Boolean).join('\n'), `a/${su}/${p.a}`)}</div>
      ${(p.srcHe || p.srcAr) ? `<div class="two"><div class="he col-he">${esc(p.srcHe)}</div><div class="ar col-ar" lang="ar">${p.srcAr ? esc(p.srcAr) : PENDING}</div></div>` : ''}
      <div class="two note"><div class="col-he"><b>הקשר:</b> ${esc(p.note || '')}</div><div class="col-ar ar" lang="ar"><b>الصلة:</b> ${p.noteAr ? esc(p.noteAr) : PENDING}</div></div>
      ${p.context || p.edition ? `<details class="more"><summary>${L('הקשר רחב ומהדורה', 'السياق والطبعة')}</summary>${esc(p.context || '')} ${esc(p.edition || '')}</details>` : ''}
    </div>` : `<div class="card small"><div><span class="t">${rng(p)}</span> <span class="muted">⇄</span> <a class="t" href="#/${p.route}">${esc(p.ref)}</a> ${strengthChip(p.strength)}</div><div class="muted">${esc(p.note || '')}</div></div>`).join('')}</div>`;
  $('.page', app).innerHTML = `<div class="crumbs">${L('הקוראן ותפסיר עם הספר', 'القرآن وتفسير أهل الكتاب')}</div>
    <h1>${L(`סורה ${su}`, `سورة ${arNum(su)}`)}: <span class="ar" lang="ar">${esc(d.name)}</span></h1>
    <div class="muted">${L(`${d.verses.length} פסוקים · ${d.parallels.length + d.bible.length} מקבילות`, `${arNum(d.verses.length)} آية · ${arNum(d.parallels.length + d.bible.length)} توازيًا`)}</div>
    ${NAV}
    <div class="verses">${d.verses.map(x => `<div class="vrow" id="v-${x.v}">
      <div class="he layer-text"><a class="num" href="#/a/${su}/${x.v}">${x.v}</a>${esc(x.he)}</div>
      <div class="ar layer-text" lang="ar">${esc(x.ar)} <span class="num">﴿${arNum(x.v)}﴾</span><button type="button" class="play" data-play="${su}:${x.v}" title="השמע · استمع">▶</button></div>
      ${x.notes ? `<div class="saadia layer-note"><b>${L('הערת תרגום', 'ملاحظة الترجمة')}:</b> <span class="col-he">${esc(x.notes.join(' · '))}</span> <span class="col-ar">${PENDING}</span></div>` : ''}
    </div>${after[x.v] ? cards(after[x.v]) : ''}`).join('')}</div>
    <div class="pager">${su > 1 ? `<a class="btn" href="#/a/${su - 1}">→ ${L(`סורה ${su - 1}`, `سورة ${arNum(su - 1)}`)}</a>` : '<span></span>'}${su < 114 ? `<a class="btn" href="#/a/${su + 1}">${L(`סורה ${su + 1}`, `سورة ${arNum(su + 1)}`)} ←</a>` : ''}</div>`;
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
  $('.page', app).innerHTML = `<div class="crumbs">${L('נביאים וכתובים', 'الأنبياء والكتب')}</div><h1>${L(esc(d.book), esc(NAKH_AR[d.book] || ''))}</h1><div class="muted">${L(`${d.parallels.length} מקבילות`, `${arNum(d.parallels.length)} توازيًا`)}</div>
    ${d.parallels.map(p => `<div id="v-${p.c}-${p.v}">${parallelCard(p, `n/${i}/${p.c}:${p.v}`, true)}</div>`).join('')}`;
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

const relLinks = t => (t || '').replace(/\b([NS]\d{1,3})\b/g, '<a href="#/c/$1">$1</a>');
const CFIELDS = [['quran', 'קוראן', 'القرآن'], ['hadith', 'חדית׳', 'الحديث'], ['torah', 'תורה', 'التوراة'], ['nakh', 'נביאים וכתובים', 'الأنبياء والكتب'],
  ['jewish', 'חז״ל ומקורות יהודיים', 'الحكماء والمصادر اليهودية'], ['nt', 'ברית חדשה וספרות חיצונית', 'العهد الجديد والأدب الخارجي'],
  ['moreIslam', 'מראי מקום נוספים – קוראן, חדית׳ ותפסיר', 'مراجع إضافية – قرآن وحديث وتفسير'], ['moreJewish', 'מראי מקום נוספים – תורה, נ״ך, חז״ל והגות', 'مراجع إضافية – توراة وأنبياء وحكماء وفكر'],
  ['deepen', 'העמקת הדמיון והשוני', 'تعميق أوجه الشبه والاختلاف']];
const GROUP_AR = { 'אמונה': 'الإيمان', 'פולחן': 'العبادة', 'סיפורים': 'القصص', 'מוסר': 'الأخلاق', 'משפט': 'الشريعة والقضاء', 'משפחה וחברה': 'الأسرة والمجتمع', 'אחרית הימים': 'آخر الزمان', 'ארץ ומקום': 'الأرض والمكان', 'חברה ומשפט': 'المجتمع والشريعة', 'נבואה וכתבי הקודש': 'النبوة والكتب المقدسة', 'מלחמה ושלום': 'الحرب والسلام', 'צדקה וכלכלה': 'الصدقة والاقتصاد' };
async function viewThemes(code) {
  markTab('c');
  if (code) {
    const t = await J(`topics/${code}.json`).catch(() => null);
    if (!t) { app.innerHTML = `<div class="page">${L('לא נמצא', 'غير موجود')}</div>`; return; }
    const list = (await J('themes.json')).topics;
    setTitle(`${t.title} · ${t.titleAr || ''}`);
    const idx = list.findIndex(x => x.code === code), prev = list[idx - 1], next = list[idx + 1];
    const byKind = {}; (t.sources || []).forEach(s => (byKind[s.kind] = byKind[s.kind] || []).push(s));
    const KIND_ORDER = [['קוראן', 'القرآن'], ['חדית׳', 'الحديث'], ['תפסיר', 'التفسير'], ['ספרות "מעלות ירושלים" ומקורות היסטוריים', 'أدب الفضائل والمصادر التاريخية'], ['מקרא', 'المقرا'], ['משנה', 'المشنا'], ['תלמוד ומדרש', 'التلمود والمدراش'], ['הגות והלכה', 'الفكر والشريعة اليهودية']];
    Object.keys(byKind).forEach(k => { if (!KIND_ORDER.some(([x]) => x === k)) KIND_ORDER.push([k, byKind[k][0].kindAr || '']); });
    app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/c">${L('נושאים לעיון', 'موضوعات للتأمل')}</a> · ${t.group ? tr(t.group, GROUP_AR) : ''}</div>
      <h1>${L(esc(t.title), esc(t.titleAr || ''))}</h1>
      <div class="chips"><span class="chip">${esc(t.code)}</span>${t.kind ? `<span class="chip">${tr(t.kind, TYPE_AR)}</span>` : ''}</div>
      ${NAV}
      <h2 id="sec-sum">${L('עיקר ההשוואה', 'خلاصة المقارنة')}</h2>
      <div class="two"><p class="col-he">${linkQuran(t.summary || '')}</p><p class="col-ar ar" lang="ar">${t.summaryAr ? esc(t.summaryAr) : PENDING}</p></div>
      ${t.sources && t.sources.length ? `<h2 id="sec-src">${L('המקורות במלואם', 'نصوص المصادر كاملة')} <span class="muted small">(${t.sources.length})</span></h2>
        ${KIND_ORDER.filter(([k]) => byKind[k]).map(([k, ka]) => `<h3 class="src-kind" data-unit="${esc(k)}" data-unit-ar="${esc(ka)}">${L(k, ka)} <span class="muted small">(${byKind[k].length})</span></h3>${byKind[k].map(s => `<div class="src">
          <div class="h"><span class="col-he">${linkQuran(s.ref)}</span><span class="col-ar ar" lang="ar">${esc(s.refAr || '')}</span></div>
          <div class="two"><div class="he col-he">${s.he ? esc(s.he) : PENDING_HE}</div><div class="ar col-ar" lang="ar">${s.ar ? esc(s.ar) : PENDING}</div></div>
          ${s.note || s.noteAr ? `<div class="two small note"><div class="col-he">${esc(s.note || '')}</div><div class="col-ar ar" lang="ar">${esc(s.noteAr || '')}</div></div>` : ''}
          ${s.ed ? `<div class="muted small">${esc(s.ed)}</div>` : ''}</div>`).join('')}`).join('')}` : ''}
      <h2 id="sec-refs">${L('מראי מקום והעמקה', 'المراجع والتعمّق')}</h2>
      ${CFIELDS.filter(([k]) => t[k]).map(([k, l, la]) => `<div class="fieldrow"><h3>${L(l, la)}</h3><div class="two"><p class="pre col-he">${linkQuran(t[k])}</p><p class="col-ar ar" lang="ar">${t[k + 'Ar'] ? esc(t[k + 'Ar']) : PENDING}</p></div></div>`).join('')}
      ${t.related ? `<div class="fieldrow"><h3>${L('נושאים קשורים', 'موضوعات ذات صلة')}</h3><p>${relLinks(esc(t.related))}</p></div>` : ''}
      ${t.quranVerses ? `<div class="fieldrow"><h3>${L('פסוקי קוראן בנושא', 'آيات قرآنية في الموضوع')}</h3><p>${linkQuran(t.quranVerses)}</p></div>` : ''}
      ${t.linksHe ? `<div class="fieldrow"><h3>${L('חדית׳ מתורגמים', 'أحاديث مترجمة')}</h3><div class="two"><div class="col-he pre">${esc(t.linksHe)}</div><div class="col-ar ar pre" lang="ar">${esc(t.linksAr || '')}</div></div></div>` : ''}
      ${t.question || t.questionAr ? `<div class="qs" id="sec-qs"><h3>${L('שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة')}</h3><div class="two"><div class="pre col-he">${esc(t.question || '')}</div><div class="pre col-ar ar" lang="ar">${t.questionAr ? esc(t.questionAr) : PENDING}</div></div></div>` : ''}
      <details class="more"><summary>${L('מקור ואימות', 'المصدر والتحقق')}</summary><div>${esc(t.origin || '')}</div><div>${esc(t.verify || '')}</div></details>
      <div class="pager">${prev ? `<a class="btn" href="#/c/${prev.code}">→ ${L(esc(prev.title), esc(prev.titleAr || ''))}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/c/${next.code}">${L(esc(next.title), esc(next.titleAr || ''))} ←</a>` : ''}</div></div>`;
    buildNav($('.page', app), [['#sec-sum', 'עיקר ההשוואה', 'خلاصة المقارنة'], ['#sec-src', 'המקורות במלואם', 'نصوص المصادر'], ['#sec-refs', 'מראי מקום והעמקה', 'المراجع والتعمّق'], ['#sec-qs', 'שאלות ללימוד משותף', 'أسئلة للدراسة المشتركة']], '.src-kind');
    window.scrollTo(0, 0); return;
  }
  const d = await J('themes.json');
  setTitle('נושאים לעיון · موضوعات للتأمل');
  const groups = [...new Set(d.topics.map(t => t.group).filter(Boolean))];
  app.innerHTML = `<div class="page"><h1>${L('נושאים לעיון', 'موضوعات للتأمل')}</h1>
    <div class="filter"><input id="tf" type="search" placeholder="סינון · تصفية"><select id="tg"><option value="">כל הקבוצות · كل المجموعات</option>${groups.map(g => `<option value="${esc(g)}">${esc(g)} · ${esc(GROUP_AR[g] || '')}</option>`).join('')}</select><span class="muted small" id="tc"></span></div>
    <div class="results" id="tl">${d.topics.map(t => `<a class="r" href="#/c/${t.code}" data-g="${esc(t.group || '')}" data-f="${esc(norm([t.code, t.title, t.titleAr, t.summary, t.summaryAr].join(' ')))}"><span class="k">${esc(t.code)}</span>${L(esc(t.title), esc(t.titleAr || ''))}
      <span class="s"><span class="l-he">${esc((t.summary || '').slice(0, 160))}</span><span class="l-ar" lang="ar">${esc((t.summaryAr || '').slice(0, 160))}</span></span></a>`).join('')}</div></div>`;
  const f = () => { const q = norm($('#tf').value), g = $('#tg').value; let n = 0; $$('#tl a').forEach(a => { const ok = a.dataset.f.includes(q) && (!g || a.dataset.g === g); a.style.display = ok ? '' : 'none'; n += ok; }); $('#tc').innerHTML = L(`${n} נושאים`, `${arNum(n)} موضوعًا`); };
  $('#tf').oninput = f; $('#tg').onchange = f; f();
}

const APP_AR = { disputes: 'خلافات أساسية قديمة', roots: 'جذور توأم', pearls: 'لآلئ متوازية', crossroads: 'ملتقيات تاريخية' };
const HDR_AR = { 'קוד': 'الرمز', 'סוגיית המחלוקת (עברית)': 'قضية الخلاف (بالعبرية)', 'שאלת היסוד': 'السؤال الأساسي',
  'העמדה הקלאסית ביהדות (ומראי מקום)': 'الموقف الكلاسيكي في اليهودية (ومراجعه)', 'העמדה הקלאסית באסלאם (ומראי מקום)': 'الموقف الكلاسيكي في الإسلام (ومراجعه)',
  'שורש הפער התיאולוגי / הפרשני': 'جذر الفجوة اللاهوتية / التفسيرية', 'מפתח ללימוד מכבד בחברותא': 'مفتاح لدراسة مشتركة محترمة', 'אימות מראי המקום (19.11)': 'التحقق من المراجع',
  'מקור': 'المصدر', 'המונח בעברית': 'المصطلح بالعبرية', 'המונח בערבית': 'المصطلح بالعربية', 'השורש השמי המשותף': 'الجذر السامي المشترك',
  'משמעות ומראי מקום ביהדות': 'المعنى والمراجع في اليهودية', 'משמעות ומראי מקום באסלאם': 'المعنى والمراجع في الإسلام', 'נקודת המפגש והמשמעות הרעיונית': 'نقطة الالتقاء والمعنى الفكري',
  'נושא הפנינה': 'موضوع اللؤلؤة', 'המקור היהודי (עברית)': 'المصدر اليهودي (بالعبرية)', 'מראה מקום יהודי': 'المرجع اليهودي', 'המקור האסלאמי (ערבית + תרגום עברי)': 'المصدر الإسلامي (بالعربية مع ترجمة عبرية)',
  'מראה מקום אסלאמי': 'المرجع الإسلامي', 'הארה להשוואה': 'إضاءة للمقارنة', 'תקופה': 'الحقبة', 'מרכז גיאוגרפי': 'المركز الجغرافي', 'דמויות מפתח ביהדות': 'شخصيات محورية في اليهودية',
  'דמויות מפתח באסלאם': 'شخصيات محورية في الإسلام', 'חיבורים מרכזיים': 'مؤلفات رئيسية', 'מוקד ההשפעה והדיאלוג ההדדי': 'محور التأثير والحوار المتبادل' };
async function viewAppendix(slug) {
  markTab('x');
  const d = await J('appendices.json');
  if (!slug || !d[slug]) {
    setTitle('נספחים · ملاحق');
    app.innerHTML = `<div class="page"><h1>${L('נספחים', 'ملاحق')}</h1><div class="grid-cards">${Object.entries(d).map(([k, v]) => `<a class="bigcard" href="#/x/${k}"><h3>${L(esc(v.title), APP_AR[k])}</h3><div class="stat">${v.rows.length}</div></a>`).join('')}</div></div>`;
    return;
  }
  const t = d[slug]; setTitle(`${t.title} · ${APP_AR[slug]}`);
  const isAr = h => /[؀-ۿ]/.test(h || '');
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/x">${L('נספחים', 'ملاحق')}</a></div><h1>${L(esc(t.title), APP_AR[slug])}</h1>
    <div class="filter"><input id="af" type="search" placeholder="סינון · تصفية"></div>
    <div style="overflow:auto"><table class="tbl"><thead><tr>${t.headers.map(h => `<th>${isAr(h) ? `<span lang="ar">${esc(h)}</span>` : L(esc(h), esc(HDR_AR[h] || ''))}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r => `<tr id="${esc(r[0])}" data-f="${esc(norm(r.join(' ')))}">${r.map((c, j) => `<td class="${isAr(t.headers[j]) ? 'ar' : ''}">${linkQuran(c || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  $('#af').oninput = e => { const q = norm(e.target.value); $$('tbody tr').forEach(tr => tr.style.display = tr.dataset.f.includes(q) ? '' : 'none'); };
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
  let only = store.get('hTr', true);
  const render = () => {
    const q = norm($('#hf')?.value || '');
    const items = d.items.filter(x => (!only || x.he) && (!q || norm(x.n + ' ' + (x.he || '') + ' ' + x.ar).includes(q)));
    $('#hl').innerHTML = items.slice(0, 200).map(x => `<div class="card" id="h-${esc(x.n)}"><div class="card-h"><div><span class="t">${L(`${esc(d.collection)} ${esc(x.n)}`, `${esc(cAr)} ${esc(x.n)}`)}</span> <span class="chip weak">${esc(x.book || '')}</span></div>${cardActs([`${d.collection} ${x.n} · ${cAr} ${x.n}`, x.he, x.ar].filter(Boolean).join('\n'), `h/${i}/${x.n}`)}</div>
      <div class="two"><div class="he col-he">${x.he ? esc(x.he) : PENDING_HE}</div><div class="ar col-ar" lang="ar">${esc(x.ar)}</div></div></div>`).join('') + (items.length > 200 ? `<p class="muted">${L(`מוצגים 200 מתוך ${items.length}`, `يُعرض ٢٠٠ من ${arNum(items.length)}`)}</p>` : '');
    $('#hc').innerHTML = L(`${items.length} חדית׳`, `${arNum(items.length)} حديثًا`);
  };
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/h">${L('חדית׳', 'الحديث')}</a></div><h1>${L(esc(d.collection), esc(cAr))}</h1>
    <div class="filter"><input id="hf" type="search" placeholder="מספר או מילה · رقم أو كلمة" value="${n ? esc(n) : ''}"><label><input type="checkbox" id="ho" ${only ? 'checked' : ''}> ${L('רק מתורגמים', 'المترجمة فقط')}</label><span class="muted small" id="hc"></span></div><div id="hl"></div></div>`;
  if (n) { only = false; $('#ho').checked = false; }
  $('#hf').oninput = render; $('#ho').onchange = e => { only = e.target.checked; store.set('hTr', only); render(); };
  render();
  if (n) { const el = document.getElementById('h-' + n); el && el.scrollIntoView({ block: 'start' }); }
}

const KIND = { b: ['תורה', 'التوراة'], n: ['נ״ך', 'الأنبياء والكتب'], a: ['קוראן – מקבילה', 'القرآن – توازٍ'], t: ['הערת תרגום', 'ملاحظة ترجمة'], c: ['נושא', 'موضوع'],
  x: ['נספח', 'ملحق'], h: ['חדית׳', 'حديث'], s: ['רס״ג', 'سعديا'] };
async function viewSearch(q) {
  markTab(''); setTitle('חיפוש · بحث: ' + q);
  $('#q').value = q;
  app.innerHTML = `<div class="page"><h1>${L('חיפוש', 'بحث')}: ${esc(q)}</h1><div class="loading">…</div></div>`;
  const [idx, qi] = await Promise.all([J('search.json'), J('search_quran.json')]);
  const words = norm(q).split(' ').filter(Boolean);
  const hit = t => words.every(w => t.includes(w));
  const res = idx.filter(r => hit(r[3]) || hit(norm(r[1])));
  const qv = qi.filter(r => hit(r[2]) || hit(r[3]));
  const byKind = {}; res.forEach(r => (byKind[r[0]] = byKind[r[0]] || []).push(r));
  const snip = t => { const i = t.indexOf(words[0]); return esc(t.slice(Math.max(0, i - 60), i + 140)); };
  $('.page', app).innerHTML = `<h1>${L('חיפוש', 'بحث')}: ${esc(q)}</h1><p class="muted">${L(`${res.length} תוצאות · ${qv.length} פסוקי קוראן`, `${arNum(res.length)} نتيجة · ${arNum(qv.length)} آية`)}</p>
    ${Object.entries(byKind).map(([k, rs]) => `<h2>${L(...KIND[k])} <span class="muted small">(${rs.length})</span></h2><div class="results">${rs.slice(0, 150).map(r =>
      `<a class="r" href="#/${r[2]}"><span class="k">${L(...KIND[r[0]])}</span>${esc(r[1])}<span class="s">${snip(r[3])}</span></a>`).join('')}</div>`).join('')}
    ${qv.length ? `<h2>${L('פסוקי קוראן', 'آيات قرآنية')} <span class="muted small">(${qv.length})</span></h2><div class="results">${qv.slice(0, 150).map(r => `<a class="r" href="#/a/${r[0]}/${r[1]}"><span class="k"><bdi dir="ltr">${r[0]}:${r[1]}</bdi></span><span class="s"><span class="l-he">${esc(r[3].slice(0, 200))}</span><span class="l-ar" lang="ar">${esc(r[2].slice(0, 200))}</span></span></a>`).join('')}</div>` : ''}
    ${!res.length && !qv.length ? `<p>${L('לא נמצאו תוצאות. נסו מילה אחרת, בלי ניקוד.', 'لم يُعثر على نتائج. جرّبوا كلمة أخرى دون تشكيل.')}</p>` : ''}`;
}

function scrollToAnchor(id) {
  if (!id) { window.scrollTo(0, 0); return; }
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2500); }
}

/* ---------- router ---------- */
async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [v, a, b] = h.split('/');
  try {
    if (!v) await viewHome();
    else if (v === 'c') await viewThemes(a);
    else if (v === 'a') await viewQuran(+a || 1, b ? +b : 0);
    else if (v === 'b') await viewTorah(+a || 0, b);
    else if (v === 'n') await viewNakh(+a || 1, b);
    else if (v === 'x') await viewAppendix(a);
    else if (v === 'h') await viewHadith(+a || 0, b);
    else if (v === 'about') await viewAbout();
    else if (v === 'search') await viewSearch(h.slice(7));
    else await viewHome();
  } catch (e) { console.error(e); app.innerHTML = `<div class="page">${L('אירעה שגיאה בטעינה.', 'حدث خطأ في التحميل.')} <a href="#/">${L('לדף הבית', 'إلى الصفحة الرئيسية')}</a></div>`; }
}
window.addEventListener('hashchange', route);
(async () => {
  applySettings();
  META = await J('meta.json');
  $('#built').innerHTML = L('עדכון אחרון: ', 'آخر تحديث: ') + META.built;
  route();
})();
// keep the page map just under the sticky header
const setTopH = () => { const h = document.querySelector('.top'); if (h) document.documentElement.style.setProperty('--toph', h.offsetHeight + 'px'); };
window.addEventListener('resize', setTopH); setTopH(); setTimeout(setTopH, 500);
