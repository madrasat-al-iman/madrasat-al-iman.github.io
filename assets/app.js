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
function copy(text) { navigator.clipboard.writeText(text).then(() => toast('הועתק'), () => toast('ההעתקה נכשלה')); }
const QREF = /(?<![\d:.])(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?(?![\d:])/g;
function quranRefs(s) {
  const out = []; if (!s) return out;
  for (const m of s.matchAll(QREF)) { const su = +m[1], a = +m[2]; if (su >= 1 && su <= 114 && a >= 1 && a <= 286) out.push([su, a, m[3] ? +m[3] : a]); }
  return out;
}
function linkQuran(s) {
  // turn "12:77" style references into links to Book A
  return esc(s).replace(/(?<![\d:.])(\d{1,3}):(\d{1,3})((?:\s*[–-]\s*\d{1,3})?)(?![\d:])/g, (m, su, a, rest) =>
    (+su >= 1 && +su <= 114) ? `<a href="#/a/${su}/${a}"><bdi dir="ltr">${su}:${a}${rest}</bdi></a>` : m);
}
function norm(s) {
  return (s || '').normalize('NFKD').replace(/[̀-֑ͯ-ׇؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/״/g, '"').replace(/׳/g, "'").replace(/־/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
function strengthChip(s) {
  if (!s) return '';
  const cls = s === 'מובהקת' ? 'strong' : (s === 'לא סווג' ? 'warn' : (s === 'נושאית' ? '' : 'weak'));
  return `<span class="chip ${cls}">${esc(s === 'לא סווג' ? 'טרם סווג' : s)}</span>`;
}
function setTitle(t) { document.title = (t ? t + ' · ' : '') + 'מדרשת האמונה · مدرسة الإيمان'; }
function markTab(t) { $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t)); }

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
  const text = `הזמנה ללימוד בחברותא במדרשת האמונה · مدرسة الإيمان\nנלמד: ${where}\nהעמוד: ${url}\nחדר וידאו (Jitsi, ללא הרשמה): ${room}`;
  modal(`<h2>לימוד בחברותא</h2>
    <p class="small muted">חדר וידאו חינמי ב־Jitsi Meet, ללא צורך בחשבון. שלחו את ההזמנה לחברותא ולחצו "כנסו לחדר".</p>
    <textarea id="inv">${esc(text)}</textarea>
    <div><a class="btn primary" href="${room}" target="_blank" rel="noopener">כנסו לחדר</a>
    <button class="btn" type="button" id="invCopy">העתק הזמנה</button>
    <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">שלח בוואטסאפ</a></div>`);
  $('#invCopy').onclick = () => copy($('#inv').value);
};

/* ---------- cards ---------- */
function cardActs(copyText, link, extra = '') {
  const id = 'c' + Math.random().toString(36).slice(2, 9);
  CARDTXT[id] = copyText;
  return `<div class="acts">${extra}<button type="button" data-copy="${id}" title="העתק ציטוט דו־לשוני">העתק</button>${link ? `<button type="button" data-link="${esc(link)}" title="העתק קישור">קישור</button>` : ''}</div>`;
}
const CARDTXT = {};
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
  AUDIO.play().catch(() => toast('לא ניתן להשמיע')); btn.textContent = '❚❚';
  AUDIO.onended = () => { btn.textContent = '▶'; };
}

function parallelCard(p, route, showBible) {
  const q = quranRefs(p.src);
  const jump = q.length ? `<a href="#/a/${q[0][0]}/${q[0][1]}" title="לסורה בספר א׳">ספר א׳</a>` : '';
  const txt = [`${p.ref || ''} ⇄ ${p.src || ''}`, p.textHe, p.textAr, p.note].filter(Boolean).join('\n');
  const unver = (!p.strength || p.strength === 'לא סווג') ? '<span class="chip warn">טרם נבדק בידי אדם</span>' : '';
  return `<div class="card" id="p-${esc(p.id)}">
    <div class="card-h"><div><span class="t">${esc(p.ref || '')}</span> <span class="muted">⇄</span> <span class="t">${linkQuran(p.src || '')}</span>
      <div class="chips">${p.type ? `<span class="chip">${esc(p.type)}</span>` : ''}${strengthChip(p.strength)}${unver}${p.unit ? `<span class="chip weak">${esc(p.unit)}</span>` : ''}</div></div>
      ${cardActs(txt, route, jump)}</div>
    ${showBible && (p.bibleHe || p.bibleAr) ? `<div class="two"><div class="he col-he">${esc(p.bibleHe)}</div><div class="ar col-ar" lang="ar">${esc(p.bibleAr)}</div></div><hr style="border:0;border-top:1px dashed var(--line)">` : ''}
    ${(p.textHe || p.textAr) ? `<div class="two"><div class="he col-he">${pre(p.textHe)}</div><div class="ar col-ar" lang="ar">${pre(p.textAr)}</div></div>` : ''}
    <div class="two note"><div class="col-he"><b>הקשר:</b> ${linkQuran(p.note || '')}</div><div class="col-ar ar" lang="ar">${p.srcAr ? `<b>${esc(p.srcAr)}</b> — ` : ''}${esc(p.noteAr || '')}</div></div>
    ${(p.hadithHe || p.hadithAr) ? `<div class="two note small"><div class="col-he pre"><b>חדית׳ מתורגמים:</b> ${esc(p.hadithHe || '')}</div><div class="col-ar ar pre" lang="ar">${esc(p.hadithAr || '')}</div></div>` : ''}
    <details class="more"><summary>מקור ואימות</summary>${p.origin ? `<div>מקור הזיהוי: ${esc(p.origin)}</div>` : ''}${p.verify ? `<div>אימות: ${esc(p.verify)}</div>` : ''}${p.themes ? `<div>נושאים: ${esc(p.themes)}</div>` : ''}${p.id ? `<div>מזהה: ${esc(p.id)}</div>` : ''}</details>
  </div>`;
}

/* ---------- views ---------- */
async function viewHome() {
  markTab(''); setTitle('');
  const c = META.counts;
  const vay = META.parashot.find(p => p.name === 'ויצא');
  app.innerHTML = `<div class="page">
    <h1>מדרשת האמונה <span class="ar" lang="ar" style="color:var(--gold)">مدرسة الإيمان</span></h1>
    <p>מאגר דו־לשוני, עברית וערבית, של מקבילות בין התורה, הנביאים והכתובים וספרות חז״ל לבין הקוראן והחדית׳. כל מקבילה מובאת בנוסח המקור ובתרגום, עם הקשר, מקור הזיהוי ואימות.</p>
    <div class="grid-cards">
      <a class="bigcard" href="#/b"><h3>ספר ב׳ · פירוש האסלאם לתורה</h3><div class="stat">${c.torahParallels}</div><div class="muted">מקבילות ב־54 פרשות, לצד נוסח המסורה ותרגום ון־דייק, והערות תפסיר רס״ג</div></a>
      <a class="bigcard" href="#/a"><h3>ספר א׳ · עם הספר לקוראן</h3><div class="stat">114</div><div class="muted">סורות בערבית ובתרגום עברי, עם ${c.quranParallels} מקבילות לפי פסוק וקישורים חוזרים למקרא</div></a>
      <a class="bigcard" href="#/n"><h3>נביאים וכתובים</h3><div class="stat">${c.nakhParallels}</div><div class="muted">מקבילות מספרי הנביאים והכתובים</div></a>
      <a class="bigcard" href="#/c"><h3>ספר ג׳ · מקבילות לפי נושאים</h3><div class="stat">${c.topics}</div><div class="muted">נושאים וסיפורים, עם שאלות לחברותא ועיון בדמיון ובשוני</div></a>
      <a class="bigcard" href="#/x"><h3>נספחים</h3><div class="muted">מחלוקות יסוד עתיקות · שורשים תאומים · פנינים מקבילות · צומתי מפגש היסטוריים</div></a>
      <a class="bigcard" href="#/h"><h3>חדית׳</h3><div class="stat">${c.hadith}</div><div class="muted">חדית׳ מששת הקבצים, מאלכ ודארמי; ${c.hadithTranslated} מתורגמים לעברית</div></a>
    </div>
    ${vay ? `<h2>פיילוט: פרשת ויצא</h2><p><a class="btn primary" href="#/b/${vay.i}">לפרשת ויצא</a> <span class="muted">${vay.parallels} מקבילות, ${vay.saadia} הערות רס״ג ושאלות לשולחן שבת</span></p>` : ''}
  </div>`;
}

function torahSide(cur) {
  const byBook = {};
  META.parashot.forEach(p => (byBook[p.book] = byBook[p.book] || []).push(p));
  return `<aside class="side">${Object.entries(byBook).map(([b, ps]) => `<h4>${esc(b)}</h4>${ps.map(p =>
    `<a href="#/b/${p.i}" class="${p.i === cur ? 'on' : ''}"><span>${esc(p.name)}</span><span class="n">${p.parallels || ''}</span></a>`).join('')}`).join('')}</aside>`;
}
async function viewTorah(i, anchor) {
  markTab('b');
  if (!i) i = (META.parashot.find(p => p.name === 'ויצא') || META.parashot[0]).i;
  app.innerHTML = `<div class="layout">${torahSide(i)}<div class="page"><div class="loading">טוען…</div></div></div>`;
  const d = await J(`torah/${pad(i, 2)}.json`);
  const P = d.parasha; setTitle(`פרשת ${P.name}`);
  const key = (c, v) => c * 1000 + v;
  const inR = (c, v, f, t) => key(c, v) >= key(f[0], f[1]) && key(c, v) <= key(t[0], t[1]);
  let units = d.units.length ? d.units : [{ name: P.name, from: P.from, to: P.to }];
  const sa = {}; d.saadia.forEach(s => (sa[key(s.c, s.v)] = sa[key(s.c, s.v)] || []).push(s));
  const used = new Set();
  const ref = (c, v) => `${gem(c)}, ${gem(v)}`;
  let body = '';
  for (const u of units) {
    const vs = d.verses.filter(v => inR(v.c, v.v, u.from, u.to));
    if (!vs.length) continue;
    const ps = d.parallels.filter(p => !used.has(p.id) && inR(p.c, p.v, u.from, u.to)); ps.forEach(p => used.add(p.id));
    body += `<section class="unit"><div class="unit-h"><h2>${esc(u.name)}</h2><span class="muted small">${esc(P.book)} ${ref(vs[0].c, vs[0].v)} – ${ref(vs.at(-1).c, vs.at(-1).v)}</span>${u.type ? `<span class="chip">${esc(u.type)}</span>` : ''}</div>
      <div class="verses">${vs.map(v => `<div class="vrow" id="v-${v.c}-${v.v}">
        <div class="he"><a class="num" href="#/b/${i}/${v.c}:${v.v}">${ref(v.c, v.v)}</a>${esc(v.he)}</div>
        <div class="ar" lang="ar">${esc(v.ar)} <span class="num">(${arNum(v.vd ? v.vd.replace(':', ': ') : v.v)})</span></div>
        ${(sa[key(v.c, v.v)] || []).map(s => `<div class="saadia"><b>תפסיר רס״ג על „${esc(s.phrase)}״</b><div class="two small"><div>ון־דייק: <span lang="ar" class="ar">${esc(s.vd)}</span></div><div>רס״ג: <span lang="ar" class="ar">${esc(s.sa)}</span> <span class="muted">(${esc(s.tr)})</span></div></div><div>${esc(s.note)}</div></div>`).join('')}
      </div>`).join('')}</div>
      ${ps.length ? `<h3>פירוש האסלאם <span class="ar" lang="ar">تفسير الإسلام</span> <span class="muted small">(${ps.length})</span></h3>${ps.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`)).join('')}` : ''}
    </section>`;
  }
  const rest = d.parallels.filter(p => !used.has(p.id));
  if (rest.length) body += `<section class="unit"><h2>מקבילות נוספות</h2>${rest.map(p => parallelCard(p, `b/${i}/${p.c}:${p.v}`)).join('')}</section>`;
  const prev = META.parashot.find(p => p.i === i - 1), next = META.parashot.find(p => p.i === i + 1);
  $('.page', app).innerHTML = `<div class="crumbs">ספר ב׳ · פירוש האסלאם לתורה · ${esc(P.book)}</div>
    <h1>פרשת ${esc(P.name)}</h1>
    <div class="muted">${esc(P.book)} ${ref(P.from[0], P.from[1])} – ${ref(P.to[0], P.to[1])} · ${P.verses} פסוקים · ${d.parallels.length} מקבילות${d.saadia.length ? ` · ${d.saadia.length} הערות רס״ג` : ''}</div>
    <div class="chips">${(P.themes || '').split(';').filter(Boolean).map(t => `<span class="chip">${esc(t.trim())}</span>`).join('')}</div>
    ${P.questions ? `<div class="qs"><h3>לשולחן שבת: שאלות לשיחה וללימוד משותף</h3><div class="pre">${esc(P.questions)}</div></div>` : ''}
    ${body}
    <div class="pager">${prev ? `<a class="btn" href="#/b/${prev.i}">→ ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/b/${next.i}">${esc(next.name)} ←</a>` : ''}</div>`;
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

function quranSide(cur) {
  return `<aside class="side"><input type="search" id="sfilter" placeholder="סינון סורות" style="width:100%;margin-bottom:6px">
  <div id="slist">${META.suras.map(s => `<a href="#/a/${s.n}" class="${s.n === cur ? 'on' : ''}" data-f="${esc(norm(s.name + ' ' + s.n))}"><span>${s.n}. <span lang="ar">${esc(s.name)}</span></span><span class="n">${s.parallels || ''}</span></a>`).join('')}</div></aside>`;
}
async function viewQuran(su, v) {
  markTab('a');
  su = su || 1;
  app.innerHTML = `<div class="layout">${quranSide(su)}<div class="page"><div class="loading">טוען…</div></div></div>`;
  $('#sfilter').oninput = e => { const q = norm(e.target.value); $$('#slist a').forEach(a => a.style.display = a.dataset.f.includes(q) ? '' : 'none'); };
  $('#slist a.on')?.scrollIntoView({ block: 'center' });
  const d = await J(`quran/${pad(su, 3)}.json`);
  setTitle(`סורה ${su} · ${d.name}`);
  const after = {};
  d.parallels.forEach(p => { const k = p.b || p.a || 1; (after[k] = after[k] || []).push(['p', p]); });
  d.bible.forEach(p => { const k = p.b || p.a; (after[k] = after[k] || []).push(['b', p]); });
  const cards = list => list.map(([k, p]) => k === 'p' ? `<div class="card">
      <div class="card-h"><div><bdi dir="ltr" class="t">${su}:${p.a}${p.b && p.b !== p.a ? '–' + p.b : ''}</bdi> <span class="muted">⇄</span> <span class="t">${esc(p.ref || '')}</span>
      <div class="chips">${p.corpus ? `<span class="chip">${esc(p.corpus)}</span>` : ''}${strengthChip(p.strength)}${p.topic ? `<span class="chip weak">${esc(p.topic)}</span>` : ''}</div></div>
      ${cardActs([`${su}:${p.a} ⇄ ${p.ref}`, p.srcHe, p.srcAr, p.note].filter(Boolean).join('\n'), `a/${su}/${p.a}`)}</div>
      ${(p.srcHe || p.srcAr) ? `<div class="two"><div class="he col-he">${esc(p.srcHe)}</div><div class="ar col-ar" lang="ar">${esc(p.srcAr)}</div></div>` : ''}
      <div class="two note"><div class="col-he"><b>הקשר:</b> ${esc(p.note || '')}</div><div class="col-ar ar" lang="ar">${p.refAr ? `<b>${esc(p.refAr)}</b> — ` : ''}${esc(p.noteAr || '')}</div></div>
      ${p.context || p.edition ? `<details class="more"><summary>הקשר רחב ומהדורה</summary>${esc(p.context || '')} ${esc(p.edition || '')}</details>` : ''}
    </div>` : `<div class="card small"><div class="card-h" style="border:0;margin:0;padding:0"><div><bdi dir="ltr" class="t">${su}:${p.a}${p.b !== p.a ? '–' + p.b : ''}</bdi> <span class="muted">⇄</span> <a class="t" href="#/${p.route}">${esc(p.ref)}</a> ${strengthChip(p.strength)}</div></div><div class="muted">${esc(p.note || '')}</div></div>`).join('');
  $('.page', app).innerHTML = `<div class="crumbs">ספר א׳ · עם הספר לקוראן</div>
    <h1>סורה ${su}: <span class="ar" lang="ar">${esc(d.name)}</span></h1>
    <div class="muted">${d.verses.length} פסוקים · ${d.parallels.length + d.bible.length} מקבילות</div>
    <div class="verses">${d.verses.map(x => `<div class="vrow" id="v-${x.v}">
      <div class="he"><a class="num" href="#/a/${su}/${x.v}">${x.v}</a>${esc(x.he)}${x.notes ? `<span class="tn" title="${esc(x.notes.join(' | '))}">ⓘ</span>` : ''}</div>
      <div class="ar" lang="ar">${esc(x.ar)} <span class="num">﴿${arNum(x.v)}﴾</span><button type="button" class="play" data-play="${su}:${x.v}" title="השמע">▶</button></div>
      ${x.notes ? `<div class="saadia"><b>הערת תרגום:</b> ${esc(x.notes.join(' · '))}</div>` : ''}
    </div>${after[x.v] ? cards(after[x.v]) : ''}`).join('')}</div>
    <div class="pager">${su > 1 ? `<a class="btn" href="#/a/${su - 1}">→ סורה ${su - 1}</a>` : '<span></span>'}${su < 114 ? `<a class="btn" href="#/a/${su + 1}">סורה ${su + 1} ←</a>` : ''}</div>`;
  scrollToAnchor(v && `v-${v}`);
}

async function viewNakh(i, anchor) {
  markTab('n');
  i = i || 1;
  const side = `<aside class="side">${META.nakh.map(b => `<a href="#/n/${META.nakh.indexOf(b) + 1}" class="${META.nakh.indexOf(b) + 1 === i ? 'on' : ''}"><span>${esc(b.book)}</span><span class="n">${b.count}</span></a>`).join('')}</aside>`;
  app.innerHTML = `<div class="layout">${side}<div class="page"><div class="loading">טוען…</div></div></div>`;
  const d = await J(`nakh/${pad(i, 2)}.json`);
  setTitle(d.book);
  $('.page', app).innerHTML = `<div class="crumbs">נביאים וכתובים</div><h1>${esc(d.book)}</h1><div class="muted">${d.parallels.length} מקבילות</div>
    ${d.parallels.map(p => `<div id="v-${p.c}-${p.v}">${parallelCard(p, `n/${i}/${p.c}:${p.v}`, true)}</div>`).join('')}`;
  scrollToAnchor(anchor && `v-${anchor.replace(':', '-')}`);
}

const CFIELDS = [['quran', 'קוראן'], ['hadith', 'חדית׳'], ['torah', 'תורה'], ['nakh', 'נביאים וכתובים'], ['jewish', 'חז״ל ומקורות יהודיים'],
  ['nt', 'ברית חדשה וספרות חיצונית'], ['moreIslam', 'מראי מקום נוספים – קוראן, חדית׳ ותפסיר'], ['moreJewish', 'מראי מקום נוספים – תורה, נ״ך, חז״ל והגות'],
  ['deepen', 'העמקת הדמיון והשוני'], ['question', 'שאלת חברותא להעמקה']];
async function viewThemes(code) {
  markTab('c');
  const d = await J('themes.json');
  if (code) {
    const t = d.topics.find(x => x.code === code);
    if (!t) { app.innerHTML = '<div class="page">לא נמצא</div>'; return; }
    setTitle(t.title);
    const idx = d.topics.indexOf(t), prev = d.topics[idx - 1], next = d.topics[idx + 1];
    app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/c">ספר ג׳ · מקבילות לפי נושאים</a> · ${esc(t.group || '')}</div>
      <h1>${esc(t.title)} <span class="ar" lang="ar" style="color:var(--gold)">${esc(t.titleAr || '')}</span></h1>
      <div class="chips"><span class="chip">${esc(t.code)}</span>${t.kind ? `<span class="chip">${esc(t.kind)}</span>` : ''}${(t.themeCodes || '').split(/[;,]/).filter(Boolean).map(x => `<span class="chip weak">${esc(x.trim())}</span>`).join('')}</div>
      <div class="two"><div class="col-he"><h3>עיקר ההשוואה</h3><p>${linkQuran(t.summary || '')}</p></div><div class="col-ar ar" lang="ar"><h3>خلاصة المقارنة</h3><p>${esc(t.summaryAr || '')}</p></div></div>
      ${CFIELDS.filter(([k]) => t[k]).map(([k, l]) => `<h3>${l}</h3><p class="pre">${linkQuran(t[k])}</p>`).join('')}
      ${t.quranVerses ? `<h3>פסוקי קוראן בנושא</h3><p>${linkQuran(t.quranVerses)}</p>` : ''}
      ${t.linksHe ? `<h3>חדית׳ מתורגמים</h3><div class="two"><div class="col-he pre">${esc(t.linksHe)}</div><div class="col-ar ar pre" lang="ar">${esc(t.linksAr || '')}</div></div>` : ''}
      <details class="more"><summary>מקור ואימות</summary><div>${esc(t.origin || '')}</div><div>${esc(t.verify || '')}</div></details>
      <div class="pager">${prev ? `<a class="btn" href="#/c/${prev.code}">→ ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/c/${next.code}">${esc(next.title)} ←</a>` : ''}</div></div>`;
    window.scrollTo(0, 0); return;
  }
  setTitle('ספר ג׳ · נושאים');
  const groups = [...new Set(d.topics.map(t => t.group).filter(Boolean))];
  app.innerHTML = `<div class="page"><h1>ספר ג׳ · מקבילות לפי נושאים</h1>
    <div class="filter"><input id="tf" type="search" placeholder="סינון לפי מילה"><select id="tg"><option value="">כל הקבוצות</option>${groups.map(g => `<option>${esc(g)}</option>`).join('')}</select><span class="muted small" id="tc"></span></div>
    <div class="results" id="tl">${d.topics.map(t => `<a class="r" href="#/c/${t.code}" data-g="${esc(t.group || '')}" data-f="${esc(norm([t.code, t.title, t.titleAr, t.summary].join(' ')))}"><span class="k">${esc(t.code)}</span>${esc(t.title)} <span class="ar" lang="ar">${esc(t.titleAr || '')}</span><span class="s">${esc((t.summary || '').slice(0, 180))}</span></a>`).join('')}</div></div>`;
  const f = () => { const q = norm($('#tf').value), g = $('#tg').value; let n = 0; $$('#tl a').forEach(a => { const ok = a.dataset.f.includes(q) && (!g || a.dataset.g === g); a.style.display = ok ? '' : 'none'; n += ok; }); $('#tc').textContent = n + ' נושאים'; };
  $('#tf').oninput = f; $('#tg').onchange = f; f();
}

async function viewAppendix(slug) {
  markTab('x');
  const d = await J('appendices.json');
  if (!slug || !d[slug]) {
    setTitle('נספחים');
    app.innerHTML = `<div class="page"><h1>נספחים</h1><div class="grid-cards">${Object.entries(d).map(([k, v]) => `<a class="bigcard" href="#/x/${k}"><h3>${esc(v.title)}</h3><div class="stat">${v.rows.length}</div></a>`).join('')}</div></div>`;
    return;
  }
  const t = d[slug]; setTitle(t.title);
  const isAr = h => /[؀-ۿ]/.test(h || '') || /ערבית|ערבי \(/.test(h || '');
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/x">נספחים</a></div><h1>${esc(t.title)}</h1>
    <div class="filter"><input id="af" type="search" placeholder="סינון"></div>
    <div style="overflow:auto"><table class="tbl"><thead><tr>${t.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r => `<tr id="${esc(r[0])}" data-f="${esc(norm(r.join(' ')))}">${r.map((c, j) => `<td class="${isAr(t.headers[j]) ? 'ar' : ''}">${linkQuran(c || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  $('#af').oninput = e => { const q = norm(e.target.value); $$('tbody tr').forEach(tr => tr.style.display = tr.dataset.f.includes(q) ? '' : 'none'); };
}

async function viewHadith(i, n) {
  markTab('h');
  if (!i) {
    setTitle('חדית׳');
    app.innerHTML = `<div class="page"><h1>חדית׳</h1><p class="muted">הנוסח הערבי לפי sunnah.com (במוסלם – מספור עבד אל־באקי). התרגום לעברית הוא טיוטת המאגר.</p><div class="grid-cards">${META.hadith.map(c => `<a class="bigcard" href="#/h/${c.i}"><h3>${esc(c.collection)}</h3><div class="stat">${c.count}</div><div class="muted">${c.translated} מתורגמים</div></a>`).join('')}</div></div>`;
    return;
  }
  const d = await J(`hadith/${pad(i, 2)}.json`);
  setTitle(d.collection);
  let only = store.get('hTr', true);
  const render = () => {
    const q = norm($('#hf')?.value || '');
    const items = d.items.filter(x => (!only || x.he) && (!q || norm(x.n + ' ' + (x.he || '') + ' ' + x.ar).includes(q)));
    $('#hl').innerHTML = items.slice(0, 200).map(x => `<div class="card" id="h-${esc(x.n)}"><div class="card-h"><div><span class="t">${esc(d.collection)} ${esc(x.n)}</span> <span class="chip weak">${esc(x.book || '')}</span></div>${cardActs([`${d.collection} ${x.n}`, x.he, x.ar].filter(Boolean).join('\n'), `h/${i}/${x.n}`)}</div>
      <div class="two"><div class="he col-he">${esc(x.he || '— טרם תורגם —')}</div><div class="ar col-ar" lang="ar">${esc(x.ar)}</div></div></div>`).join('') + (items.length > 200 ? `<p class="muted">מוצגים 200 מתוך ${items.length}. צמצמו בעזרת הסינון.</p>` : '');
    $('#hc').textContent = items.length + ' חדית׳';
  };
  app.innerHTML = `<div class="page"><div class="crumbs"><a href="#/h">חדית׳</a></div><h1>${esc(d.collection)}</h1>
    <div class="filter"><input id="hf" type="search" placeholder="מספר או מילה" value="${n ? esc(n) : ''}"><label><input type="checkbox" id="ho" ${only ? 'checked' : ''}> רק מתורגמים</label><span class="muted small" id="hc"></span></div><div id="hl"></div></div>`;
  if (n) { only = false; $('#ho').checked = false; }
  $('#hf').oninput = render; $('#ho').onchange = e => { only = e.target.checked; store.set('hTr', only); render(); };
  render();
  if (n) { const el = document.getElementById('h-' + n); el && el.scrollIntoView({ block: 'start' }); }
}

const KIND = { b: 'תורה', n: 'נ״ך', a: 'קוראן – מקבילה', t: 'הערת תרגום', c: 'נושא', x: 'נספח', h: 'חדית׳', s: 'רס״ג' };
async function viewSearch(q) {
  markTab(''); setTitle('חיפוש: ' + q);
  $('#q').value = q;
  app.innerHTML = `<div class="page"><h1>חיפוש: ${esc(q)}</h1><div class="loading">מחפש…</div></div>`;
  const [idx, qi] = await Promise.all([J('search.json'), J('search_quran.json')]);
  const words = norm(q).split(' ').filter(Boolean);
  const hit = t => words.every(w => t.includes(w));
  const res = idx.filter(r => hit(r[3]) || hit(norm(r[1])));
  const qv = qi.filter(r => hit(r[2]) || hit(r[3]));
  const byKind = {}; res.forEach(r => (byKind[r[0]] = byKind[r[0]] || []).push(r));
  const snip = t => { const i = t.indexOf(words[0]); return esc(t.slice(Math.max(0, i - 60), i + 140)); };
  $('.page', app).innerHTML = `<h1>חיפוש: ${esc(q)}</h1><p class="muted">${res.length} תוצאות במקבילות ובהערות · ${qv.length} פסוקי קוראן</p>
    ${Object.entries(byKind).map(([k, rs]) => `<h2>${KIND[k] || k} <span class="muted small">(${rs.length})</span></h2><div class="results">${rs.slice(0, 150).map(r =>
      `<a class="r" href="#/${r[2]}"><span class="k">${KIND[r[0]]}</span>${esc(r[1])}<span class="s">${snip(r[3])}</span></a>`).join('')}</div>`).join('')}
    ${qv.length ? `<h2>פסוקי קוראן <span class="muted small">(${qv.length})</span></h2><div class="results">${qv.slice(0, 150).map(r => `<a class="r" href="#/a/${r[0]}/${r[1]}"><span class="k">${r[0]}:${r[1]}</span><span class="s">${esc(r[3].slice(0, 200))}</span></a>`).join('')}</div>` : ''}
    ${!res.length && !qv.length ? '<p>לא נמצאו תוצאות. נסו מילה אחרת, בלי ניקוד.</p>' : ''}`;
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
    else if (v === 'b') await viewTorah(+a || 0, b);
    else if (v === 'a') await viewQuran(+a || 1, b ? +b : 0);
    else if (v === 'n') await viewNakh(+a || 1, b);
    else if (v === 'c') await viewThemes(a);
    else if (v === 'x') await viewAppendix(a);
    else if (v === 'h') await viewHadith(+a || 0, b);
    else if (v === 'search') await viewSearch(h.slice(7));
    else await viewHome();
  } catch (e) { console.error(e); app.innerHTML = `<div class="page">אירעה שגיאה בטעינה. <a href="#/">לדף הבית</a></div>`; }
}
window.addEventListener('hashchange', route);
(async () => {
  applySettings();
  META = await J('meta.json');
  $('#built').textContent = 'עדכון אחרון: ' + META.built;
  route();
})();
