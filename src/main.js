/**
 * main.js — DOM wiring, events, rendering
 */

import { validate } from './validator.js';
import { examples } from './examples.js';
import { t, setLang, getLang, translations } from './i18n.js';

// ─── State ───────────────────────────────────────────────────────────────────
let currentErrors = [];
let validationTimer = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const schemaTextarea = document.getElementById('schema-input');
const dataTextarea   = document.getElementById('data-input');
const resultPanel    = document.getElementById('result-panel');
const statusBadge    = document.getElementById('status-badge');
const errorList      = document.getElementById('error-list');
const errorCount     = document.getElementById('error-count');
const copyBtn        = document.getElementById('copy-errors-btn');
const themeBtn       = document.getElementById('theme-btn');
const langBtn        = document.getElementById('lang-btn');
const examplesSelect = document.getElementById('examples-select');

// ─── i18n ─────────────────────────────────────────────────────────────────────
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  schemaTextarea.placeholder = t('placeholder').schema;
  dataTextarea.placeholder   = t('placeholder').data;
  // Update examples options
  Array.from(examplesSelect.options).forEach((opt, i) => {
    if (i === 0) { opt.textContent = t('examples'); return; }
    const ex = examples[i - 1];
    if (ex) opt.textContent = ex.label[getLang()] || ex.label.en;
  });
  langBtn.textContent = t('lang');
}

function toggleLang() {
  setLang(getLang() === 'en' ? 'ja' : 'en');
  applyTranslations();
  runValidation();
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  themeBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
    themeBtn.textContent = '☀️';
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function runValidation() {
  const schemaText = schemaTextarea.value.trim();
  const dataText   = dataTextarea.value.trim();

  if (!schemaText && !dataText) {
    showIdle();
    return;
  }

  // Parse schema
  let schema;
  try {
    schema = JSON.parse(schemaText || '{}');
  } catch (e) {
    showParseError('schema', e.message);
    return;
  }

  // Parse data
  let data;
  try {
    data = JSON.parse(dataText || 'null');
  } catch (e) {
    showParseError('data', e.message);
    return;
  }

  const errors = validate(schema, data);
  currentErrors = errors;
  renderErrors(errors);
}

function showIdle() {
  resultPanel.className = 'result-panel idle';
  statusBadge.className = 'status-badge';
  statusBadge.textContent = '';
  errorCount.textContent = '';
  errorList.innerHTML = '';
  copyBtn.style.display = 'none';
  currentErrors = [];
}

function showParseError(which, msg) {
  resultPanel.className = 'result-panel error';
  statusBadge.className = 'status-badge invalid';
  const key = which === 'schema' ? 'schemaError' : 'dataError';
  statusBadge.textContent = t(key);
  errorCount.textContent = '';
  errorList.innerHTML = `<li class="error-item parse-error"><span class="error-path">${which === 'schema' ? 'schema' : 'data'}</span><span class="error-message">${escapeHtml(msg)}</span></li>`;
  copyBtn.style.display = 'none';
  currentErrors = [];
}

function renderErrors(errors) {
  if (errors.length === 0) {
    resultPanel.className = 'result-panel valid';
    statusBadge.className = 'status-badge valid';
    statusBadge.textContent = t('valid');
    errorCount.textContent = t('noErrors');
    errorList.innerHTML = '';
    copyBtn.style.display = 'none';
  } else {
    resultPanel.className = 'result-panel invalid';
    statusBadge.className = 'status-badge invalid';
    statusBadge.textContent = t('invalid');
    errorCount.textContent = t('errorsFound', errors.length);
    errorList.innerHTML = errors.map((err, i) => `
      <li class="error-item" data-index="${i}">
        <span class="error-path">${escapeHtml(err.path || '(root)')}</span>
        <span class="error-message">${escapeHtml(err.message)}</span>
        <span class="error-keyword">${escapeHtml(err.keyword)}</span>
      </li>
    `).join('');
    copyBtn.style.display = '';
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Debounced input ──────────────────────────────────────────────────────────
function onInput() {
  clearTimeout(validationTimer);
  validationTimer = setTimeout(runValidation, 250);
}

// ─── Copy errors ──────────────────────────────────────────────────────────────
function copyErrors() {
  const text = JSON.stringify(currentErrors, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    const orig = copyBtn.textContent;
    copyBtn.textContent = t('copied');
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ─── Examples ─────────────────────────────────────────────────────────────────
function loadExample(id) {
  const ex = examples.find(e => e.id === id);
  if (!ex) return;
  schemaTextarea.value = JSON.stringify(ex.schema, null, 2);
  dataTextarea.value   = JSON.stringify(ex.data, null, 2);
  runValidation();
}

function buildExamplesSelect() {
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = t('examples');
  examplesSelect.appendChild(opt0);
  examples.forEach(ex => {
    const opt = document.createElement('option');
    opt.value = ex.id;
    opt.textContent = ex.label[getLang()] || ex.label.en;
    examplesSelect.appendChild(opt);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  initTheme();
  buildExamplesSelect();
  applyTranslations();

  schemaTextarea.addEventListener('input', onInput);
  dataTextarea.addEventListener('input', onInput);
  copyBtn.addEventListener('click', copyErrors);
  themeBtn.addEventListener('click', toggleTheme);
  langBtn.addEventListener('click', toggleLang);
  examplesSelect.addEventListener('change', () => {
    if (examplesSelect.value) {
      loadExample(examplesSelect.value);
      examplesSelect.value = '';
    }
  });

  // Load User example by default
  loadExample('user');
}

document.addEventListener('DOMContentLoaded', init);
