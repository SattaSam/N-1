'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'engine', 'ui-enhancements.js'), 'utf8');

const listeners = new Map();
let observerCallback = null;
const rafQueue = [];
let panels = [];
let consolidateCount = 0;

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

const meta = {
  dataset: {},
  querySelector() { return null; },
  set innerHTML(value) { this._html = value; },
  get innerHTML() { return this._html || ''; }
};
const heading = { insertAdjacentElement() {} };
const report = {
  children: [],
  querySelector(selector) {
    if (selector === '.journal-heading') return heading;
    if (selector === '.journal-temporal-meta') return meta;
    if (selector === '.living-notes') return null;
    return null;
  }
};
const journalPanel = {
  isConnected: true,
  getAttribute(name) { return name === 'aria-label' ? 'Journal' : null; },
  querySelector(selector) {
    if (selector === '.journal-layout') return {};
    if (selector === '.journal-report') return report;
    if (selector === '.journal-window-biome') return null;
    if (selector === 'h2') return null;
    return null;
  },
  querySelectorAll() { return []; }
};

const document = {
  documentElement: {},
  head: { appendChild() {} },
  body: { appendChild() {} },
  addEventListener(type, fn) { listeners.set(type, fn); },
  getElementById(id) {
    if (id === 'bluefox-journal-trust-styles') return {};
    return null;
  },
  querySelector() { return null; },
  querySelectorAll(selector) {
    if (selector === '.full-screen-panel') return panels;
    if (selector === '.drawer, .full-screen-panel') return panels;
    return [];
  },
  createElement() {
    return {
      className: '', style: {}, dataset: {}, hidden: false,
      append() {}, appendChild() {}, replaceChildren() {},
      addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      set textContent(v) { this._text = v; }, get textContent() { return this._text || ''; }
    };
  }
};

class MutationObserver {
  constructor(fn) { observerCallback = fn; }
  observe() {}
}
class ResizeObserver { observe() {} }

const BF = {
  getProgressionState() { return { history: [] }; },
  getJournalState() { return { entries: [] }; },
  getJournalNarrativeState() { return { themes: {}, pastThoughts: [] }; },
  consolidateJournalNarrative(candidate) {
    consolidateCount += 1;
    assert.ok(Array.isArray(candidate.themes));
  }
};

const context = {
  window: null,
  document,
  localStorage,
  MutationObserver,
  ResizeObserver,
  CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
  Image: class Image {},
  requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {},
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  performance: { now() { return 0; } },
  console,
  Date,
  Math,
  Set,
  Map,
  WeakMap,
  WeakSet,
  BlueFox3D: BF,
  addEventListener() {},
  dispatchEvent() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'ui-enhancements.js' });

const flushRaf = () => {
  while (rafQueue.length) rafQueue.shift()();
};
const mutate = () => { observerCallback?.([]); flushRaf(); };
const clickTool = (label) => {
  const button = {
    querySelector(selector) { return selector === 'small' ? { textContent: label } : null; },
    getAttribute() { return ''; }
  };
  const event = { target: { closest(selector) { return selector === '.tool-rail button' ? button : null; } } };
  listeners.get('click')(event);
  flushRaf();
};

assert.strictEqual(consolidateCount, 0, 'initial scan must not consolidate journal');
mutate();
assert.strictEqual(consolidateCount, 0, 'DOM mutations while journal is closed must not consolidate');

panels = [journalPanel];
mutate();
assert.strictEqual(consolidateCount, 0, 'mere panel scanning must not trigger narrative consolidation');

clickTool('Journal');
assert.strictEqual(consolidateCount, 1, 'opening Journal must consolidate exactly once');

mutate(); mutate(); mutate();
assert.strictEqual(consolidateCount, 1, 'repeated scanner activity during same opening must not reconsolidate');

clickTool('Recherche');
assert.strictEqual(consolidateCount, 1, 'other menu clicks must not consolidate Journal');

clickTool('Journal');
assert.strictEqual(consolidateCount, 2, 'reopening Journal must allow one fresh consolidation');
mutate();
assert.strictEqual(consolidateCount, 2, 'scanner activity after reopening must remain bounded');

console.log('PASS journal lazy open runtime');
