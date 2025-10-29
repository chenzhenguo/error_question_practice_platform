import { attachImport } from './import/preview.js';
import { attachExport } from './export/exporter.js';
import { attachBulk } from './bulk/bulk_actions.js';
import { loadQuestions as loadEqppQuestions, saveQuestions as saveEqppQuestions, loadErrorQuestions as loadEqppErrorQuestions, saveErrorQuestions as saveEqppErrorQuestions } from './core/storage.js';
import './test/auto_test.js';
import './test/practice_auto.js';
import './test/export_auto.js';
import './test/practice_filter_auto.js';

function migrateLegacyQuestions(){
  try {
    const eqpp = loadEqppQuestions();
    const legacyRaw = localStorage.getItem('questions');
    if ((eqpp && eqpp.length > 0) || !legacyRaw) return;
    const legacy = JSON.parse(legacyRaw || '[]') || [];
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const mapped = legacy.map(q => ({
      question: q.content || q.question || '',
      answer: q.correctAnswer || q.answer || '',
      type: q.type || '',
      difficulty: q.difficulty || '',
      score: q.score || '',
      knowledge: q.knowledge || '',
      analysis: q.analysis || '',
      note: q.correctMethod || q.errorReason || q.note || '',
      tags: Array.isArray(q.errorTags) ? q.errorTags.join(',') : (String(q.tags||'').split(/[，,、\/\s]+/).filter(Boolean).join(',')),
      source: q.source || '',
      createdAt: q.date ? (String(q.date).includes('T') ? q.date : (q.date + 'T00:00:00')) : (q.lastErrorTime || new Date().toISOString()),
      id: q.id || undefined,
    }));
    // Ensure IDs exist for eqpp items for stable operations
    const withIds = mapped.map(item => ({ ...item, id: item.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)) }));
    saveEqppQuestions(withIds);
    console.log('[Migration] Migrated legacy questions -> eqpp.questions', { count: withIds.length });
  } catch (e) {
    console.warn('[Migration] failed:', e);
  }
}

function migrateLegacyErrorQuestions(){
  try {
    const eqppErr = loadEqppErrorQuestions();
    const legacyRaw = localStorage.getItem('errorQuestions');
    if ((eqppErr && eqppErr.length > 0) || !legacyRaw) return;
    const legacy = JSON.parse(legacyRaw || '[]') || [];
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const mapped = legacy.map(q => ({
      id: q.id || undefined,
      question: q.content || q.question || '',
      answer: q.correctAnswer || q.answer || '',
      type: q.type || '',
      knowledge: q.knowledge || '',
      analysis: q.analysis || '',
      note: q.correctMethod || q.errorReason || q.note || '',
      tags: Array.isArray(q.errorTags) ? q.errorTags.join(',') : (String(q.tags||'').split(/[，,、\/\s]+/).filter(Boolean).join(',')),
      source: q.source || '',
      errorCount: Number(q.errorCount || 0),
      lastErrorTime: q.lastErrorTime || new Date().toISOString(),
      createdAt: q.date ? (String(q.date).includes('T') ? q.date : (q.date + 'T00:00:00')) : (q.lastErrorTime || new Date().toISOString()),
    }));
    const withIds = mapped.map(item => ({ ...item, id: item.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)) }));
    saveEqppErrorQuestions(withIds);
    console.log('[Migration] Migrated legacy errorQuestions -> eqpp.errorQuestions', { count: withIds.length });
  } catch (e) {
    console.warn('[Migration:error] failed:', e);
  }
}

function syncEqppToLegacy(){
  try {
    const eqpp = loadEqppQuestions() || [];
    // guarantee id exists
    const ensured = eqpp.map(it => ({ ...it, id: it.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)) }));
    if (ensured.some((x,i)=> !eqpp[i] || eqpp[i].id !== ensured[i].id)) {
      // write back IDs if we created any
      saveEqppQuestions(ensured);
    }
    const legacy = ensured.map(q => ({
      id: q.id,
      date: q.createdAt ? String(q.createdAt).slice(0,10) : new Date().toISOString().slice(0,10),
      source: q.source || '',
      priority: '',
      questionNumber: '',
      type: q.type || '选择题',
      knowledge: q.knowledge || '',
      specificKnowledge: '',
      content: q.question || '',
      options: q.options || '',
      myAnswer: '',
      correctAnswer: q.answer || '',
      analysis: q.analysis || '',
      errorReason: '',
      correctMethod: q.note || '',
      errorCount: 0,
      lastErrorTime: q.updatedAt || q.createdAt || '',
      tags: q.tags || '',
      errorTags: String(q.tags||'').split(/[，,、\/\s]+/).filter(Boolean)
    }));
    localStorage.setItem('questions', JSON.stringify(legacy));
    try { window.dispatchEvent(new CustomEvent('legacy:questions:updated', { detail: { count: legacy.length } })); } catch(_){ }
  } catch (e) {
    console.warn('[Sync] eqpp->legacy failed', e);
  }
}

function syncEqppErrorsToLegacy(){
  try {
    const eqppErr = loadEqppErrorQuestions() || [];
    const ensured = eqppErr.map(it => ({ ...it, id: it.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)) }));
    if (ensured.some((x,i)=> !eqppErr[i] || eqppErr[i].id !== ensured[i].id)) {
      saveEqppErrorQuestions(ensured);
    }
    const legacy = ensured.map(q => ({
      id: q.id,
      date: q.createdAt ? String(q.createdAt).slice(0,10) : new Date().toISOString().slice(0,10),
      source: q.source || '',
      priority: '',
      questionNumber: '',
      type: q.type || '选择题',
      knowledge: q.knowledge || '',
      specificKnowledge: '',
      content: q.question || '',
      options: q.options || '',
      myAnswer: '',
      correctAnswer: q.answer || '',
      analysis: q.analysis || '',
      errorReason: '',
      correctMethod: q.note || '',
      errorCount: Number(q.errorCount || 0),
      lastErrorTime: q.lastErrorTime || new Date().toISOString(),
      tags: q.tags || '',
      errorTags: String(q.tags||'').split(/[，,、\/\s]+/).filter(Boolean)
    }));
    localStorage.setItem('errorQuestions', JSON.stringify(legacy));
    try { window.dispatchEvent(new CustomEvent('legacy:errorQuestions:updated', { detail: { count: legacy.length } })); } catch(_){ }
  } catch (e) {
    console.warn('[Sync:error] eqpp->legacy failed', e);
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  // One-time migration: legacy localStorage keys -> new eqpp.* keys used by modules
  migrateLegacyQuestions();
  migrateLegacyErrorQuestions();
  // Hook import/export/bulk
  attachImport();
  attachExport();
  attachBulk();

  // Realtime bridge: when modules update eqpp, mirror to legacy and notify page UI
  window.addEventListener('eqpp:questions:updated', (e)=>{
    try {
      if (e && e.detail && e.detail.origin === 'legacy') return; // ignore mirror-back
    } catch(_){ }
    syncEqppToLegacy();
  });
  window.addEventListener('eqpp:errorQuestions:updated', (e)=>{
    try {
      if (e && e.detail && e.detail.origin === 'legacy') return;
    } catch(_){ }
    syncEqppErrorsToLegacy();
  });
});
