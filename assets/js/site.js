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
        frag.appendChild(unit(n));
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

  /* ---------- Sample lesson: the scam arrives message by message, then gets marked ---------- */
  function lesson() {
    var ex = document.querySelector('.example');
    if (!ex) return;
    var turns = Array.prototype.slice.call(ex.querySelectorAll('.turn'));
    if (!turns.length) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'replay';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9a5.5 5.5 0 1 0 1.7-4"/><path d="M4.6 1.8 5.2 5l3.2-.5"/></svg>' + (zh ? '重播' : 'Replay');
    btn.hidden = true;
    ex.insertBefore(btn, ex.querySelector('figcaption'));

    if (reduce) return; /* final state, nothing to replay */

    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      turns.forEach(function (t) { t.classList.remove('is-typing', 'm-in', 'f-in'); });
    }
    function play() {
      reset();
      ex.classList.add('armed');
      var t = 450;
      turns.forEach(function (turn) {
        later(function () { turn.classList.add('is-typing'); }, t);
        t += 950;
        later(function () { turn.classList.remove('is-typing'); turn.classList.add('m-in'); }, t);
        t += 850;
        later(function () { turn.classList.add('f-in'); }, t);
        t += 1000;
      });
      later(function () { btn.hidden = false; }, t - 400);
    }

    ex.classList.add('armed');
    btn.addEventListener('click', function () {
      btn.classList.remove('spin');
      void btn.offsetWidth;
      btn.classList.add('spin');
      play();
    });

    if (!hasIO) { play(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { play(); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(ex.querySelector('.phone'));
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
  lesson();
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
