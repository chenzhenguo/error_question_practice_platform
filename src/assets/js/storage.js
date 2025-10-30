/*
 * 本地存储工具（StorageUtil）
 * - 中文注释；英文错误提示
 * - 统一封装 get/set/remove/keys/clearCachePreserveData/migrate
 * - 保留白名单键，清理缓存不影响本地答题数据
 */
(function(global){
  'use strict';

  // 保留的答题数据键（白名单）
  var PRESERVE_KEYS = [
    'questions',
    'errorQuestions',
    'studyData',
    'practiceSettings',
    'dailyPracticeSettings',
    'eqpp.questions',
    'eqpp.errorQuestions'
  ];

  function isPreservedKey(key){
    if (!key) return false;
    // 精确匹配白名单
    for (var i=0;i<PRESERVE_KEYS.length;i++){ if (PRESERVE_KEYS[i] === key) return true; }
    return false;
  }

  function safeParse(json, fallback){
    try { return JSON.parse(json); } catch(_) { return (typeof fallback === 'undefined' ? null : fallback); }
  }

  function safeStringify(obj){
    try { return JSON.stringify(obj); } catch(_) { return null; }
  }

  var StorageUtil = {
    // 安全读取：返回默认值而不是抛异常
    get: function(key, defaultValue){
      try {
        var v = localStorage.getItem(key);
        if (v === null || typeof v === 'undefined') return (typeof defaultValue === 'undefined' ? null : defaultValue);
        // 自动识别 JSON 格式
        if (typeof v === 'string' && (v.charAt(0) === '{' || v.charAt(0) === '[')){
          var parsed = safeParse(v, defaultValue);
          return (parsed === null ? (typeof defaultValue === 'undefined' ? null : defaultValue) : parsed);
        }
        return v;
      } catch(e){
        console.warn('[StorageUtil.get] failed:', e);
        alert('Failed to read local data.');
        return (typeof defaultValue === 'undefined' ? null : defaultValue);
      }
    },

    // 安全写入：字符串化对象
    set: function(key, value){
      try {
        var toStore = (typeof value === 'string') ? value : safeStringify(value);
        if (toStore === null) throw new Error('Stringify failed');
        localStorage.setItem(key, toStore);
        return true;
      } catch(e){
        console.warn('[StorageUtil.set] failed:', e);
        alert('Failed to write local data.');
        return false;
      }
    },

    remove: function(key){
      try { localStorage.removeItem(key); return true; }
      catch(e){ console.warn('[StorageUtil.remove] failed:', e); alert('Failed to remove local data.'); return false; }
    },

    keys: function(){
      try {
        var ks = [];
        for (var i=0;i<localStorage.length;i++){ ks.push(localStorage.key(i)); }
        return ks;
      } catch(e){ console.warn('[StorageUtil.keys] failed:', e); return []; }
    },

    // 清除缓存但保留答题数据
    clearCachePreserveData: function(){
      try {
        var toRemove = [];
        for (var i=0;i<localStorage.length;i++){
          var k = localStorage.key(i);
          if (!isPreservedKey(k)){
            // 可清理键：practiceFilter:*、__AUTO_RESUME__、非保留 eqpp.*、eqpp.batches、eqpp.mappingTemplates
            if (k && (k.indexOf('practiceFilter:') === 0 || k === '__AUTO_RESUME__' || k === 'eqpp.batches' || k === 'eqpp.mappingTemplates' || k.indexOf('eqpp.') === 0)){
              toRemove.push(k);
            }
          }
        }
        for (var j=0;j<toRemove.length;j++){ localStorage.removeItem(toRemove[j]); }
        console.log('[StorageUtil] cleared non-answer data keys:', toRemove);
        try { if (typeof global.loadSavedData === 'function') { global.loadSavedData(); } } catch(_){}
        alert('Cache cleared. Answer data preserved.');
        return { removed: toRemove.slice() };
      } catch(e){
        console.warn('[StorageUtil.clearCachePreserveData] failed:', e);
        alert('Failed to clear cache.');
        return { error: e };
      }
    },

    // 迁移策略（可选）：旧键映射到新结构
    migrate: function(map){
      try {
        if (!map || typeof map !== 'object') return false;
        for (var oldKey in map){ if (!map.hasOwnProperty(oldKey)) continue; var newKey = map[oldKey]; var val = localStorage.getItem(oldKey); if (val !== null) { localStorage.setItem(newKey, val); localStorage.removeItem(oldKey); } }
        return true;
      } catch(e){ console.warn('[StorageUtil.migrate] failed:', e); return false; }
    }
  };

  // 暴露到全局
  global.StorageUtil = StorageUtil;
})(window);
