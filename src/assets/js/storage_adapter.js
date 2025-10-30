/*
 * 存储适配器（StorageAdapter）
 * - 与现有 localStorage 键兼容：legacy('errorQuestions','questions') 与模块化('eqpp.errorQuestions','eqpp.questions')
 * - 提供错题数据读写与迁移：loadErrorQuestions / saveErrorQuestions / migrateIfNeeded
 * - 保证缺失字段的补齐：errorCount、lastErrorTime、errorTimes、correctStreak、status、pendingSince
 * - 中文注释；错误提示使用英文
 */
(function(global){
  'use strict';

  var LS_KEYS = {
    LEGACY_ERRORS: 'errorQuestions',
    LEGACY_QUESTIONS: 'questions',
    MOD_ERRORS: 'eqpp.errorQuestions',
    MOD_QUESTIONS: 'eqpp.questions'
  };

  function safeParse(str, fallback){
    try { return JSON.parse(str); } catch(_) { return (typeof fallback === 'undefined' ? null : fallback); }
  }

  function nowISO(){ return new Date().toISOString(); }

  // 为错题元素补齐字段
  function normalizeErrorItem(item){
    var o = item || {};
    // 基础字段映射（兼容 legacy 结构）
    var normalized = {
      id: o.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)),
      question: o.content || o.question || '',
      answer: o.correctAnswer || o.answer || '',
      type: o.type || '',
      knowledge: o.knowledge || '',
      analysis: o.analysis || '',
      note: o.correctMethod || o.errorReason || o.note || '',
      tags: Array.isArray(o.errorTags) ? o.errorTags.join(',') : (String(o.tags||'').split(/[，,、\/\s]+/).filter(Boolean).join(',')),
      source: o.source || ''
    };
    // 错题扩展字段
    normalized.errorCount = Number(o.errorCount || 0);
    normalized.lastErrorTime = o.lastErrorTime || nowISO();
    normalized.errorTimes = Array.isArray(o.errorTimes) ? o.errorTimes.slice() : [];
    normalized.correctStreak = Number(o.correctStreak || 0);
    normalized.status = (o.status === 'pendingRemoval') ? 'pendingRemoval' : 'normal';
    normalized.pendingSince = o.pendingSince || null;
    // 兼容 createdAt（用于导出/统计）
    normalized.createdAt = o.createdAt || (o.date ? (String(o.date).includes('T') ? o.date : (o.date + 'T00:00:00')) : normalized.lastErrorTime);
    return normalized;
  }

  function normalizeErrorList(list){
    var arr = Array.isArray(list) ? list : [];
    return arr.map(normalizeErrorItem);
  }

  function readKey(key, fallback){
    var raw = localStorage.getItem(key);
    return raw ? safeParse(raw, fallback) : fallback;
  }

  function writeKey(key, value){
    try { localStorage.setItem(key, JSON.stringify(value || [])); }
    catch(e){ console.warn('[StorageAdapter.writeKey] failed:', e); alert('Storage write failed'); }
  }

  function dispatchUpdated(type, count){
    try { global.dispatchEvent(new CustomEvent('eqpp:'+ type +':updated', { detail: { origin: 'adapter', count: count } })); } catch(_){ }
  }

  var StorageAdapter = {
    // 读取错题（优先模块化键，回退 legacy），并进行字段补齐
    loadErrorQuestions: function(){
      var mod = readKey(LS_KEYS.MOD_ERRORS, null);
      var legacy = readKey(LS_KEYS.LEGACY_ERRORS, null);
      var src = Array.isArray(mod) ? mod : (Array.isArray(legacy) ? legacy : []);
      return normalizeErrorList(src);
    },

    // 保存错题（写入模块化与 legacy），保持兼容
    saveErrorQuestions: function(list){
      var normalized = normalizeErrorList(list);
      writeKey(LS_KEYS.MOD_ERRORS, normalized);
      writeKey(LS_KEYS.LEGACY_ERRORS, normalized);
      dispatchUpdated('errorQuestions', normalized.length);
      return normalized.length;
    },

    // 迁移：当存在 legacy/混合数据时，补齐字段并统一写入模块化键
    migrateIfNeeded: function(){
      try {
        var mod = readKey(LS_KEYS.MOD_ERRORS, null);
        var legacy = readKey(LS_KEYS.LEGACY_ERRORS, null);
        var need = !Array.isArray(mod) && Array.isArray(legacy);
        if (need){
          var normalized = normalizeErrorList(legacy);
          writeKey(LS_KEYS.MOD_ERRORS, normalized);
          // 保留 legacy 副本以兼容既有页面逻辑
          writeKey(LS_KEYS.LEGACY_ERRORS, normalized);
          dispatchUpdated('errorQuestions', normalized.length);
          return { migrated: true, count: normalized.length };
        }
        // 即便不需要迁移，也尝试将 mod 内容补齐字段
        if (Array.isArray(mod)){
          var normalized2 = normalizeErrorList(mod);
          writeKey(LS_KEYS.MOD_ERRORS, normalized2);
          return { migrated: false, normalized: normalized2.length };
        }
        return { migrated: false };
      } catch(e){ console.warn('[StorageAdapter.migrateIfNeeded] failed:', e); return { error: e }; }
    }
  };

  // 暴露到全局
  global.StorageAdapter = StorageAdapter;
})(window);
