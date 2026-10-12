/* A small dependency-free DOM harness: enough of the browser to run the real
   application scripts (from either build) with the network disabled. It is an
   event and logic harness, not a layout engine; visual checks are done in a browser. */
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');

const VOID = new Set(['meta', 'link', 'input', 'br', 'img', 'hr', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'source']);
function parseAttrs(text) {
  const attrs = {};
  for (const m of text.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attrs[m[1]] = m[2] === undefined ? '' : m[2];
  return attrs;
}
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function createEnvironment({ width = 1400, height = 620, html }) {
  const viewport = { width, height }, elements = new Map(), all = [], resizeObservers = [];
  const drawing = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 40 }) : k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true) });

  class Element {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase(); this.attrs = attrs; this.children = []; this.parent = null; this.events = {}; this.style = {};
      this.dataset = {}; for (const [k, v] of Object.entries(attrs)) if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = v;
      this.id = attrs.id || ''; this.value = attrs.value || ''; this.hidden = 'hidden' in attrs; this.textContent = ''; this.width = 300; this.height = 150; this.open = false;
      const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean)); this._classes = classes;
      this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, force) => { const on = force === undefined ? !classes.has(c) : !!force; on ? classes.add(c) : classes.delete(c); return on; } };
      all.push(this); if (this.id) elements.set(this.id, this);
    }
    get className() { return [...this._classes].join(' '); }
    addEventListener(type, fn) { (this.events[type] ??= []).push(fn); }
    removeEventListener(type, fn) { this.events[type] = (this.events[type] || []).filter(f => f !== fn); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    getContext() { return drawing; }
    showModal() { this.open = true; } close() { this.open = false; }
    focus() {} scrollIntoView() {} setPointerCapture() {}
    set innerHTML(markup) { this._html = markup; this.children = []; parseInto(this, markup); }
    get innerHTML() { return this._html || ''; }
    descendants() { const out = []; const walk = el => { for (const c of el.children) { out.push(c); walk(c); } }; walk(this); return out; }
    querySelectorAll(sel) { return select(this.descendants(), sel); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    getBoundingClientRect() {
      const W = viewport.width, H = viewport.height, r = (left, top, w, h) => ({ left, top, width: w, height: h, right: left + w, bottom: top + h, x: left, y: top });
      if (this.id === 'landscape') return r(0, 0, W, H);
      if (this.id === 'hud') return r(12, 12, Math.min(500, W - 24), W < 700 ? 72 : 38);
      if (this._classes.has('tabbar')) return r(W / 2 - 170, H - 70, 340, 56);
      if (this.id === 'sheet') return r(W / 2 - 196, H - 70 - 26 - Math.min(340, H * .5), 392, Math.min(340, H * .5));
      if (this.id === 'explanation') return W < 700 ? r(10, H - 70 - 200, W - 20, 190) : r(W - 352, 12, 340, 230);
      if (this.id === 'journey-card') return W < 700 ? r(8, H - 10 - 230, W - 16, 230) : r(W - 372, 12, 360, 280);
      return r(0, 0, 0, 0);
    }
  }
  function parseInto(parentEl, markup) {
    const stack = [parentEl];
    for (const m of markup.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
      const [, closing, tag, rest, selfClose] = m;
      if (closing) { for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag.toUpperCase()) { stack.length = i; break; } continue; }
      const el = new Element(tag, parseAttrs(rest)); el.parent = stack[stack.length - 1]; el.parent.children.push(el);
      if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(el);
    }
  }
  // Selectors: compound parts of tag/.class/#id/[attr]/[attr="v"], joined by spaces.
  function matchCompound(el, part) {
    for (const m of part.matchAll(/(^[a-zA-Z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]|:not\(([^)]*)\)/g)) {
      if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
      if (m[2] && !el.classList.contains(m[2])) return false;
      if (m[3] && el.id !== m[3]) return false;
      if (m[4] && (!(m[4] in el.attrs) || (m[5] !== undefined && el.attrs[m[4]] !== m[5]))) return false;
      if (m[6] && matchCompound(el, m[6])) return false;
    }
    return true;
  }
  function select(pool, sel) {
    const groups = sel.split(',').map(s => s.trim().split(/\s+/));
    return pool.filter(el => groups.some(parts => {
      if (!matchCompound(el, parts[parts.length - 1])) return false;
      let anc = el.parent, i = parts.length - 2;
      while (i >= 0 && anc) { if (matchCompound(anc, parts[i])) i--; anc = anc.parent; }
      return i < 0;
    }));
  }

  const documentRoot = new Element('#document');
  parseInto(documentRoot, html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''));
  const document = documentRoot;
  document.hidden = false; document.activeElement = null;
  document.getElementById = id => { if (!elements.has(id)) throw Error('Element exists: ' + id); return elements.get(id); };
  document.createElement = tag => new Element(tag);
  document.createElementNS = (ns, tag) => new Element(tag);
  const audioContexts = [];
  class AudioContext {
    constructor() { this.sampleRate = 20; this.currentTime = 0; this.destination = {}; this.gains = []; this.startedSources = 0; audioContexts.push(this); }
    createGain() { const gain = { gain: { value: 0, setTargetAtTime(v) { this.value = v; }, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; } }, connect() {}, disconnect() {} }; this.gains.push(gain); return gain; }
    createBuffer(c, l) { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start: () => this.startedSources++, stop() {} }; }
    createBiquadFilter() { return { frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    resume() { return Promise.resolve(); } close() {}
  }
  const window = new Element('window'); window.AudioContext = AudioContext;
  const store = new Map(), localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) };
  let nextFrame = null;
  const context = {
    console, document, window, localStorage, devicePixelRatio: 1, matchMedia: () => ({ matches: false }),
    ResizeObserver: class { constructor(fn) { resizeObservers.push(fn); } observe() {} disconnect() {} },
    requestAnimationFrame: fn => (nextFrame = fn, 1), cancelAnimationFrame() {}, setTimeout: () => 1, clearTimeout() {},
    fetch: () => { throw Error('Network disabled in application QA'); }, XMLHttpRequest: class { constructor() { throw Error('Network disabled'); } }
  };
  vm.createContext(context);
  let now = 100;
  return {
    context, document, elements, viewport, audioContexts, store, all,
    run(code, filename) { vm.runInContext(code, context, { filename }); },
    advance(seconds) { for (let i = 0; i < Math.round(seconds * 10); i++) { now += 100; nextFrame(now); } },
    resize(w, h) { viewport.width = w; viewport.height = h; for (const fn of resizeObservers) fn(); },
    state: () => context.window.nitrogenDiagnostics ? context.window.nitrogenDiagnostics() : null,
    async fire(el, type, init = {}) { if (typeof el === 'string') el = document.getElementById(el); for (const fn of [...(el.events[type] || [])]) await fn({ target: el, preventDefault() {}, ...init }); },
    select: sel => document.querySelectorAll(sel)
  };
}

function loadBuild(offline) {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, offline ? 'dist-offline/Nitrogen-Cycle.html' : 'dist-web/index.html'), 'utf8');
  const inline = new Map([...html.matchAll(/<script data-source="([^"]+)">([\s\S]*?)<\/script>/g)].map(m => [m[1], m[2].replace(/<\\\/script/gi, '</script')]));
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>|<script data-source="([^"]+)">/g)].map(m => m[1] || m[2]).filter(f => f !== 'startup-check.js');
  const source = f => offline ? inline.get(f) : fs.readFileSync(path.join(root, 'dist-web', f), 'utf8');
  return { html, scripts, source };
}

module.exports = { createEnvironment, loadBuild };
