/* language switch for archived newsletters: Arabic / Hebrew / both (shares the site's preference, key mh_lang) */
(function () {
  const KEY = 'mh_lang', MODES = [['ar', 'العربية'], ['he', 'עברית'], ['both', 'العربية · עברית']];
  const get = () => { const q = (location.search.match(/[?&]l=(he|ar|both)/) || [])[1]; if (q) return q;
    try { return JSON.parse(localStorage.getItem(KEY)) || 'both'; } catch (e) { return 'both'; } };
  const hasText = n => /[\p{L}\p{N}]/u.test(n.textContent);
  function seps() {
    document.querySelectorAll('.nl-sep').forEach(s => { s.style.display = 'none'; });
    const blocks = new Set([...document.querySelectorAll('.nl-sep')].map(s => s.parentElement.closest('a,p,div,h1,h2,h3,li,nav') || document.body));
    blocks.forEach(b => {
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let pend = null, seen = false, n;
      while ((n = w.nextNode())) {
        if (n.nodeType === 1) { if (n.classList.contains('nl-sep')) { if (seen && !pend) pend = n; } continue; }
        if (n.parentElement.closest('.nl-sep') || !hasText(n) || !n.parentElement.getClientRects().length) continue;
        if (pend) { pend.style.display = ''; pend = null; } seen = true;
      }
    });
  }
  function set(m) {
    document.body.classList.remove('nl-ar', 'nl-he', 'nl-both'); document.body.classList.add('nl-' + m);
    document.querySelectorAll('.nl-langs button').forEach(b => b.classList.toggle('on', b.dataset.l === m));
    if (m === 'both') document.querySelectorAll('.nl-sep').forEach(s => { s.style.display = ''; }); else seps();
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'nl-langs'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'اللغة · שפה');
    bar.innerHTML = MODES.map(([l, t]) => `<button type="button" data-l="${l}" lang="${l === 'he' ? 'he' : 'ar'}" class="nl-keep">${t}</button>`).join('');
    const nav = document.querySelector('.nlnav'); (nav || document.body).insertBefore(bar, nav ? nav.children[1] || null : document.body.firstChild);
    bar.onclick = e => { const b = e.target.closest('button'); if (!b) return; try { localStorage.setItem(KEY, JSON.stringify(b.dataset.l)); } catch (x) {} set(b.dataset.l); };
    set(get());
  });
})();
