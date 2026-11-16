// Small things that make the site feel alive.

// Click the name: how it's said, then what it rhymes with, then back.
(() => {
  const h = document.querySelector('header h1');
  if (!h) return;
  const steps = [h.textContent, '/ˈsiːvər laʊθ/', 'rhymes with: leaver south'];
  let i = 0, idle;
  h.style.cursor = 'default';
  h.addEventListener('click', () => {
    i = (i + 1) % steps.length;
    h.textContent = steps[i];
    clearTimeout(idle);
    idle = setTimeout(() => { i = 0; h.textContent = steps[0]; }, 4000);
  });
})();

// Click "thanks for stopping by." to play a scene, one line per click.
// Leave it alone for a bit and it goes back to the start.
(() => {
  const p = document.querySelector('footer p');
  if (!p || !/thanks for stopping by/i.test(p.textContent)) return;
  const start = p.textContent;
  const lines = [
      "Helen: Dash, you have something you wanna tell your father about school?",
      "Dash: (nervously) Well, we dissected a frog.",
      "Helen: Dash, got sent to the office again.",
      "Bob: Good, good.",
      "Helen: No, Bob, that's bad.",
      "Bob: What?",
      "Helen: Dash, got sent to the office again!",
      "Bob: What, what for?!",
      "Dash: Nothing!",
      "Helen: He put a tack on the teacher's chair...during class!",
      "Dash: Nobody saw me, you could barely see it on the tape.",
      "Bob: They caught you on tape and you still got away with it? Whoa! You must have been booking. How fast did you think were you going?",
      "Helen: Bob! We are not encouraging this.",
      "Bob: (sarcastically) I'm not encouraging! I'm just asking how fast...",
      "Helen: Honey!",
      "(Bob cuts his meatloaf will accidentally the plate breaks it.)",
      "Bob: Great. First the car, now I gotta pay to fix the table!",
      "Helen: The car, what happened to the car?",
      "Bob: Here, I'm getting a new plate! (walks off as were leaving)"
  ];
  let i = 0, idle;
  p.classList.add('nudge'); // gets the same quiet underline as links
  p.addEventListener('click', () => {
    // after the last line it comes back to "thanks for stopping by." before starting over
    p.textContent = i < lines.length ? lines[i] : start;
    i = (i + 1) % (lines.length + 1);
    clearTimeout(idle);
    idle = setTimeout(() => { p.textContent = start; i = 0; }, 6000);
  });
})();

// Email and phone: clicking copies them and says so.
(() => {
  // email always copies (phones hand mailto links to whatever app claims them);
  // text and phone still open Messages on phones, and copy on computers
  const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('a[href^="mailto:"], a[href^="sms:"], a[href^="tel:"]').forEach((a) => {
    if (touch && !a.getAttribute('href').startsWith('mailto:')) return;
    const value = decodeURIComponent(a.getAttribute('href').replace(/^(mailto|sms|tel):/, ''));
    const label = a.textContent;
    let timer;
    a.title = value;
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await navigator.clipboard.writeText(value); a.textContent = 'copied'; }
      catch { a.textContent = value; }
      clearTimeout(timer);
      timer = setTimeout(() => { a.textContent = label; }, 1400);
    });
  });
})();

// Stream: a vertical "back to top" pinned to the left edge, always visible.
// The whole word moves as one body on a loose spring: it drifts a little with the
// scroll, and when you stop it springs back past center and wobbles to rest.
(() => {
  const el = document.querySelector('.slinky');
  if (!el) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastY = scrollY, speed = 0, o = 0, vo = 0, frame = 0;
  const grid = document.querySelector('.mood-stream');
  const place = () => {
    // never sit lower than the bottom of the last image (keeps it out of the footer)
    const floor = grid ? grid.getBoundingClientRect().bottom : innerHeight;
    el.style.bottom = Math.max(40, innerHeight - floor) + 'px';
  };
  const tick = () => {
    frame = 0;
    place();
    const dy = scrollY - lastY; lastY = scrollY;
    speed = speed * 0.7 + dy * 0.3;                       // smoothed, signed
    // while scrolling the body is dragged along; when you stop, the target
    // snaps back to zero and the loose spring overshoots and wobbles
    const oTarget = Math.max(-7, Math.min(7, speed * 0.25));
    vo = (vo + (oTarget - o) * 0.12) * 0.78; o += vo;
    if (still) o = 0;
    el.style.transform = `translateY(${o.toFixed(1)}px)`;
    if (Math.abs(speed) > 0.05 || Math.abs(vo) > 0.03 || Math.abs(o) > 0.1) {
      frame = requestAnimationFrame(tick);
    } else {
      el.style.transform = '';
    }
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(tick); }, { passive: true });
  addEventListener('resize', place);
  addEventListener('load', place);
  place();
  el.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' }); });
})();

// Stream: small / medium / large circles to size the images. Remembers your choice on this device.
(() => {
  const buttons = [...document.querySelectorAll('.sizer button')];
  const grid = document.querySelector('.mood-stream');
  if (!buttons.length || !grid) return;
  const imgs = [...grid.querySelectorAll('img[srcset]')];
  const pick = (size) => {
    grid.style.setProperty('--col', size + 'px');
    grid.dataset.size = size;
    // tell the browser how wide images now show, so large gets the sharp versions
    imgs.forEach((im) => { im.sizes = Math.round(Number(size) * 1.4) + 'px'; });
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
  };
  let start = '160';
  try { const saved = localStorage.getItem('stream-size'); if (buttons.some((b) => b.dataset.size === saved)) start = saved; } catch {}
  pick(start);
  buttons.forEach((b) => b.addEventListener('click', () => {
    pick(b.dataset.size);
    try { localStorage.setItem('stream-size', b.dataset.size); } catch {}
  }));
})();

// Stream: click an image to see it on its own. Click anywhere or press esc to close,
// arrow keys to move between images.
(() => {
  const grid = document.querySelector('.mood-stream');
  if (!grid) return;
  const box = document.createElement('div');
  box.className = 'iso';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.hidden = true;
  box.innerHTML = '<figure><img alt=""></figure>';
  document.body.appendChild(box);
  const big = box.querySelector('img');
  let current = null;
  const sharp = (im) => {
    const m = (im.getAttribute('srcset') || '').match(/(\S+@2x\.webp)/);
    return m ? m[1] : im.getAttribute('src');
  };
  const show = (im) => {
    current = im;
    big.src = im.getAttribute('src');          // the small one is already loaded, show it instantly
    const hi = sharp(im);
    if (hi !== big.src) { const pre = new Image(); pre.onload = () => { if (current === im) big.src = hi; }; pre.src = hi; }
    big.alt = im.alt;
    box.hidden = false;
    document.documentElement.classList.add('iso-open');
  };
  const close = () => { box.hidden = true; current = null; document.documentElement.classList.remove('iso-open'); };
  const step = (d) => {
    const all = [...grid.querySelectorAll('img')];
    const i = all.indexOf(current);
    show(all[(i + d + all.length) % all.length]);
  };
  grid.addEventListener('click', (e) => { const im = e.target.closest('img'); if (im) show(im); });
  box.addEventListener('click', close);
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
})();

// No lonely last words: if a line would wrap just one word onto the next line,
// keep it on one line instead (only when it still fits on screen).
(() => {
  const els = [...document.querySelectorAll('main p, main li, main summary')]
    .filter((el) => !el.closest('.mood-stream') && el.textContent.trim().includes(' '));
  const fix = () => {
    for (const el of els) {
      el.style.whiteSpace = '';
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      if (el.getBoundingClientRect().height < lh * 1.6) continue;   // already one line
      const r = el.getBoundingClientRect();
      el.style.whiteSpace = 'nowrap';
      const full = el.scrollWidth;
      const words = el.textContent.trim().split(/\s+/);
      const last = words[words.length - 1].length + 1;
      const charW = full / el.textContent.trim().length;
      const over = full - r.width;
      const fitsScreen = r.left + full <= innerWidth - 16;
      if (!(over > 0 && over <= last * charW + 2 && fitsScreen)) el.style.whiteSpace = '';
    }
  };
  addEventListener('load', fix);
  addEventListener('resize', fix);
  document.addEventListener('toggle', fix, true);
  fix();
})();

// Letters that swell under the cursor.
// When the cursor is on a link or list title, the letters nearest it grow slightly,
// and they ease back slowly after it leaves, so the cursor leaves a soft trail.
// Pages on this site also start loading when you're on their link.
// Mouse only; does nothing on touch screens or with reduced motion.
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('swell');

  const els = [...document.querySelectorAll('header h1, a[href], summary, .nudge')];
  const REACH = 55;   // px either side of the cursor that letters respond to
  const GROW = 0.32;  // how much the closest letter grows
  const prefetched = new Set();
  const letters = new Map(); // element -> [{span, v}]

  const prefetch = (a) => {
    if (!a.href) return;
    const url = new URL(a.href, location.href);
    url.hash = '';
    if (url.origin !== location.origin || url.href === location.href.split('#')[0] || prefetched.has(url.href)) return;
    prefetched.add(url.href);
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = url.href;
    document.head.appendChild(l);
  };

  // wrap each letter in a span (again, if the text was changed by another easter egg)
  const split = (el) => {
    const text = el.textContent;
    if (el.dataset.split === text && letters.has(el) && el.querySelector('.ch')) return letters.get(el);
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const list = [];
    // letters are grouped into words so lines only break between words
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      for (const ch of part) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        word.appendChild(s);
        list.push({ s, v: 0 });
      }
      el.appendChild(word);
    }
    el.dataset.split = text;
    letters.set(el, list);
    return list;
  };

  let mx = -1e4, my = -1e4, frame = 0;
  const tick = () => {
    frame = 0;
    let busy = false;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const on = mx >= r.left - 2 && mx <= r.right + 2 && my >= r.top - 2 && my <= r.bottom + 2;
      if (!on && !letters.has(el)) continue;
      const list = split(el);
      if (on) prefetch(el);
      for (const L of list) {
        let target = 0;
        if (on) {
          const b = L.s.getBoundingClientRect();
          const d = Math.hypot(mx - (b.left + b.width / 2), my - (b.top + b.height / 2));
          target = Math.max(0, 1 - d / REACH);
        }
        // rise quickly, fade slowly: that's the trail
        L.v += (target - L.v) * (target > L.v ? 0.6 : 0.012);
        if (L.v < 0.002) L.v = 0;
        L.s.style.transform = L.v ? `scale(${(1 + L.v * GROW).toFixed(3)})` : '';
        if (L.v) busy = true;
      }
    }
    if (busy) frame = requestAnimationFrame(tick);
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(tick); };

  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
  document.addEventListener('pointerleave', () => { mx = my = -1e4; kick(); });
})();
