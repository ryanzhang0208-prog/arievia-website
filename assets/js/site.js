/* Arievia Foundation — motion layer.
   Everything is visible without this file; it only adds choreography when it runs. */
(function () {
  'use strict';

  var root = document.documentElement;
  var zh = /^zh/i.test(root.lang);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Hero: split the headline into words that rise out of a mask ---------- */
  function splitHeadline() {
    var h = document.querySelector('.hero h1');
    if (!h || reduce) return;
    var i = 0;
    var frag = document.createDocumentFragment();
    function unit(node) {
      var outer = document.createElement('span');
      var inner = document.createElement('span');
      outer.className = 'ln';
      inner.style.setProperty('--i', i++);
      inner.appendChild(node);
      outer.appendChild(inner);
      return outer;
    }
    Array.prototype.slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : unit(document.createTextNode(part)));
        });
      } else {
        var u = unit(n);
        if (n.classList && n.classList.contains('h1-lead')) u.classList.add('ln-block');
        frag.appendChild(u);
      }
    });
    h.textContent = '';
    h.appendChild(frag);
  }

  function startHero() {
    var fired = false;
    var add = function () { if (!fired) { fired = true; root.classList.add('loaded'); } };
    /* two frames so the hidden state paints first; the timer covers hosts that throttle rAF */
    var go = function () { requestAnimationFrame(function () { requestAnimationFrame(add); }); setTimeout(add, 120); };
    if (document.fonts && document.fonts.ready) {
      var done = false;
      var once = function () { if (!done) { done = true; go(); } };
      document.fonts.ready.then(once);
      setTimeout(once, 300);
    } else {
      go();
    }
  }

  /* ---------- Scroll reveals (staggered within a group) ---------- */
  function reveals() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    els.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
      var k = sibs.indexOf(el);
      if (k > 0) el.style.setProperty('--delay', Math.min(k * 0.12, 0.36) + 's');
    });
    if (reduce || !hasIO) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Mission: the statement lights up as you read down to it ---------- */
  var words = [];
  var statement = document.querySelector('[data-words]');
  function splitStatement() {
    if (!statement) return;
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(statement.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) { frag.appendChild(n.cloneNode(true)); return; }
      var parts = zh ? [n.textContent] : n.textContent.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        words.push(s);
        frag.appendChild(s);
      });
    });
    statement.textContent = '';
    statement.appendChild(frag);
  }
  function lightStatement() {
    if (!words.length) return;
    if (reduce) { words.forEach(function (w) { w.classList.add('lit'); }); return; }
    var r = statement.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var start = vh * 0.9, end = vh * 0.45;
    var p = (start - r.top) / Math.max(start - end, 1);
    var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
    words.forEach(function (w, k) { w.classList.toggle('lit', k < n); });
  }

  /* ---------- Quick check: three questions from the course's before-and-after quiz ----------
     Without this, the page shows a finished answer sheet. Here it asks one question at a time:
     you pick an answer, a pencil loop marks your pick, the pen circles the right one, then the reason appears.
     Every label comes from the figure's data-* attributes, so both languages share this code. */

  /* A hand-drawn loop for a w×h box: a squircle that starts just outside the top, wobbles a little,
     leans a degree, and crosses its own start, like a pen circling an answer on paper. */
  function loopPath(w, h, seed) {
    var cx = w / 2, cy = h / 2, a = w / 2 - 3, b = h / 2 - 3;
    var e = 2 / Math.max(2.4, Math.min(7, 2.2 + (w - 32) / 110 + Math.max(0, (h - 50) / 14)));
    var N = 48, t0 = -Math.PI / 2 - 0.75, span = Math.PI * 2 + 0.5, pts = [];
    for (var i = 0; i <= N; i++) {
      var p = i / N, t = t0 + span * p, c = Math.cos(t), s = Math.sin(t);
      var k = (0.975 + 0.025 * p + 0.05 * Math.exp(-p * 22)) * (1 + 0.014 * Math.sin(3 * t + seed));
      var x = cx + a * k * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), e);
      pts.push([x, cy + b * k * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), e) - 1.5 * p - (x - cx) * 0.012 + 1.1 * Math.sin(x / w * 6.28 + seed)]);
    }
    var f = function (v) { return Math.round(v * 10) / 10; };
    var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var j = 0; j < N; j++) {
      var p0 = pts[Math.max(0, j - 1)], p1 = pts[j], p2 = pts[j + 1], p3 = pts[Math.min(N, j + 2)];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d;
  }

  function quiz() {
    var fig = document.querySelector('.check');
    if (!fig) return;
    var qs = Array.prototype.slice.call(fig.querySelectorAll('.q'));
    var end = fig.querySelector('.check-end');
    var sheet = fig.querySelector('.sheet');
    var body = fig.querySelector('.sheet-body');
    if (!qs.length || !end || !sheet || !body) return;

    var L = fig.dataset;
    var NS = 'http://www.w3.org/2000/svg';
    var ARROW = '<svg class="arrow" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4.5 14.5 9 10 13.5"/></svg>';
    var AGAIN = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9a5.5 5.5 0 1 0 1.7-4"/><path d="M4.6 1.8 5.2 5l3.2-.5"/></svg>';
    var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
    var fill = function (str, v) { return (str || '').replace(/\{(\w)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
    var label = function (opt) { return opt.querySelector('.lbl').textContent.replace(/\s+/g, ' ').trim(); };
    var cur = 0;

    /* answer choices become real buttons; each question gets a verdict line */
    qs.forEach(function (q) {
      each(q.querySelectorAll('span.opt'), function (span) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = span.className;
        while (span.firstChild) b.appendChild(span.firstChild);
        span.parentNode.replaceChild(b, span);
      });
      var v = document.createElement('p');
      v.className = 'verdict';
      v.textContent = L.unsure || ''; /* the longest verdict holds its room until the real one arrives */
      q.insertBefore(v, q.querySelector('.reason'));
      q.querySelector('.q-text').tabIndex = -1;
    });

    var count = document.createElement('p');
    count.className = 'q-count';
    fig.querySelector('.sheet-head').appendChild(count);

    var lead = document.createElement('p');
    lead.className = 'end-lead';
    lead.textContent = L.done || '';
    lead.tabIndex = -1;
    end.insertBefore(lead, end.firstChild);

    var foot = document.createElement('div');
    foot.className = 'sheet-foot';
    var hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = L.hint || '';
    hint.insertAdjacentHTML('beforeend', '<svg class="hint-line" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 6.5C30 3.2 72 2.4 118 5.2"/></svg>');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-btn';
    foot.appendChild(hint);
    foot.appendChild(btn);
    sheet.appendChild(foot);

    var live = document.createElement('p');
    live.className = 'sr';
    live.setAttribute('aria-live', 'polite');
    fig.appendChild(live);

    function setBtn(text, icon, iconFirst) {
      btn.innerHTML = icon;
      var t = document.createTextNode(text || '');
      if (iconFirst) btn.appendChild(t); else btn.insertBefore(t, btn.firstChild);
    }
    function say(text) {
      live.textContent = '';
      setTimeout(function () { live.textContent = text; }, 60);
    }
    /* size a ring to its own box, so the stroke stays even on short and long answers */
    function draw(svg, seed) {
      var r = svg.getBoundingClientRect();
      var w = Math.max(24, Math.round(r.width)), h = Math.max(24, Math.round(r.height));
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.querySelector('path').setAttribute('d', loopPath(w, h, seed));
    }
    function pencil(opt, seed) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'circ pencil');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('preserveAspectRatio', 'none');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('pathLength', '1');
      svg.appendChild(path);
      opt.querySelector('.lbl').appendChild(svg);
      draw(svg, seed);
      svg.getBoundingClientRect(); /* commit the undrawn stroke before it starts */
      svg.classList.add('on');
    }
    /* the sheet takes the height of the page it shows; each question already holds room for its reason,
       so answering never moves anything */
    function fit() {
      var el = fig.querySelector('.q.is-on, .check-end.is-on');
      if (el) body.style.height = el.offsetHeight + 'px';
    }

    function answer(q, choice) {
      if (q.classList.contains('done') || !q.classList.contains('is-on')) return;
      var i = qs.indexOf(q);
      var key = q.querySelector('.opt.is-key');
      var got = choice === key;
      each(q.querySelectorAll('.opt'), function (o) { o.setAttribute('aria-disabled', 'true'); });
      draw(key.querySelector('.circ'), i + 1);
      if (!got) pencil(choice, i + 4);
      var v = q.querySelector('.verdict');
      v.textContent = got ? L.right : choice.classList.contains('unsure') ? L.unsure : L.wrong;
      q.classList.add('done', got ? 'got' : 'missed');
      setBtn(i < qs.length - 1 ? L.next : L.finish, ARROW);
      foot.classList.toggle('late', !got);
      foot.classList.add('ready');
      say(v.textContent + ' ' + (got ? '' : fill(L.answer, { a: label(key) }) + ' ') + q.querySelector('.reason').textContent);
    }

    function show(i, focus) {
      var prev = fig.querySelector('.q.is-on, .check-end.is-on');
      if (prev) { prev.classList.remove('is-on'); prev.classList.add('was'); }
      cur = i;
      var el = i < qs.length ? qs[i] : end;
      el.classList.remove('was');
      el.classList.add('is-on');
      foot.classList.remove('ready', 'late', 'end');
      if (i < qs.length) {
        count.hidden = false;
        count.textContent = fill(L.count, { n: i + 1, t: qs.length });
      } else {
        count.hidden = true;
        setBtn(L.again, AGAIN, true);
        foot.classList.add('ready', 'end');
      }
      fit();
      if (focus) (i < qs.length ? qs[i].querySelector('.q-text') : lead).focus({ preventScroll: true });
    }

    function restart() {
      fig.classList.add('resetting');
      qs.forEach(function (q) {
        q.classList.remove('done', 'got', 'missed', 'was');
        q.querySelector('.verdict').textContent = L.unsure || '';
        each(q.querySelectorAll('.opt'), function (o) { o.removeAttribute('aria-disabled'); });
        each(q.querySelectorAll('.circ.pencil'), function (svg) { svg.parentNode.removeChild(svg); });
      });
      void fig.offsetWidth;
      fig.classList.remove('resetting');
      live.textContent = '';
      show(0, true);
    }

    fig.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('.opt');
      if (o && fig.contains(o)) answer(o.closest('.q'), o);
    });
    btn.addEventListener('click', function () {
      if (cur >= qs.length) restart();
      else if (qs[cur].classList.contains('done')) show(cur + 1, true);
    });

    fig.classList.add('quiz-on', 'resetting');
    show(0, false);
    void fig.offsetWidth;
    fig.classList.remove('resetting');

    var rt = 0;
    function relayout() {
      qs.forEach(function (q, i) {
        if (!q.classList.contains('done')) return;
        draw(q.querySelector('.is-key .circ'), i + 1);
        var p = q.querySelector('.circ.pencil');
        if (p) draw(p, i + 4);
      });
      fit();
    }
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 150); });
    window.addEventListener('load', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    /* arrival: invite a tap once the sheet is properly in view; never plays by itself */
    if (reduce || !hasIO) { fig.classList.add('in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { fig.classList.add('in'); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(fig);
  }

  /* ---------- Gentle depth on the event prints ---------- */
  var prints = Array.prototype.slice.call(document.querySelectorAll('.print'));
  function drift() {
    if (reduce) return;
    var vh = window.innerHeight || 800;
    prints.forEach(function (img, k) {
      var r = img.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var off = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.translate = '0 ' + (off * (k ? -36 : 14)).toFixed(1) + 'px';
    });
  }

  /* ---------- Nav: mark the section you're in ---------- */
  function navSpy() {
    if (!hasIO) return;
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('.nav a[href^="#"]'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = links[e.target.id];
        if (a) a.classList.toggle('is-active', e.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Wire up ---------- */
  splitHeadline();
  splitStatement();
  reveals();
  quiz();
  navSpy();
  startHero();

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; lightStatement(); drift(); });
  }
  lightStatement();
  drift();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* reached the end without throwing: tell the inline failsafe in <head> not to unhide everything */
  window.__arv = true;
})();

/* Keep the first screen exactly one viewport tall: hero fills from its top edge to the bottom of the window */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  function set() { hero.style.minHeight = Math.max(0, window.innerHeight - hero.offsetTop) + 'px'; }
  set();
  window.addEventListener('resize', set);
  window.addEventListener('load', set);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
})();

/* Premium layer: stage light follows the pointer; cinematic scroll on the first screen */
(function () {
  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  if (!hero) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* let the entrance finish before scroll takes over the transforms */
  setTimeout(function () { root.classList.add('settled'); update(); }, 2600);

  var mx = null, my = null, raf = 0;
  function update() {
    raf = 0;
    var h = hero.offsetHeight || 1;
    var p = Math.min(1, Math.max(0, window.scrollY / h));
    hero.style.setProperty('--hp', p.toFixed(3));
    if (mx !== null) { hero.style.setProperty('--mx', mx + 'px'); hero.style.setProperty('--my', my + 'px'); }
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  if (window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); mx = Math.round(e.clientX - r.left); my = Math.round(e.clientY - r.top); queue();
    });
  }
  window.addEventListener('scroll', queue, { passive: true });
})();
