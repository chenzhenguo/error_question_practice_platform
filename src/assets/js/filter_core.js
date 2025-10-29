// Phase-2 (2.1) Advanced filter core utilities
// Expose as window.FilterCore for use in inline scripts
(function(){
  function safeArray(x){ if (Array.isArray(x)) return x; if (!x) return []; return [x]; }
  function normStr(s){ return String(s||'').trim(); }
  function splitTags(raw){
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(normStr).filter(Boolean);
    return String(raw).split(/[，,、\/\s]+/).map(normStr).filter(Boolean);
  }
  function normalizeQuestion(q){
    const n = Object.assign({}, q);
    n.type = normStr(q.type);
    n.knowledge = normStr(q.knowledge);
    n.tags = Array.isArray(q.errorTags) ? q.errorTags.slice().map(normStr).filter(Boolean) : splitTags(q.tags);
    // future: n.addTime, n.lastErrorTime normalization (timestamp)
    // add: normalize lastErrorTime to timestamp for time-range filtering
    try { n.lastErrorTimeTs = q && q.lastErrorTime ? (Date.parse(q.lastErrorTime) || 0) : 0; } catch(_) { n.lastErrorTimeTs = 0; }
    return n;
  }
  function getAdvancedRulesForMode(mode){
    try{
      const raw = localStorage.getItem(`practiceFilter:${mode}`);
      if (!raw) return {};
      const obj = JSON.parse(raw)||{};
      const rules = obj.rules || {};
      // Only pick advanced fields for 2.1
      const types = Array.isArray(rules.types) ? rules.types.filter(Boolean) : [];
      const tags = Array.isArray(rules.tags) ? rules.tags.filter(Boolean) : [];
      const tagLogic = (rules.tagLogic==='AND'||rules.tagLogic==='OR')? rules.tagLogic : 'OR';
      const knowledge = Array.isArray(rules.knowledge) ? rules.knowledge.filter(Boolean) : [];
      const tableFilters = rules.tableFilters || {};
      // new: questionCount and timeRange
      const questionCount = Number.isFinite(+rules.questionCount) ? Math.max(0, parseInt(rules.questionCount)) : 0;
      const timeRange = (rules.timeRange && typeof rules.timeRange==='object') ? rules.timeRange : {};
      return { types, tags, tagLogic, knowledge, tableFilters, questionCount, timeRange };
    }catch(_){ return {}; }
  }
  function matchByListAND(itemList, ruleList){
    if (!ruleList || ruleList.length===0) return true;
    if (!itemList || itemList.length===0) return false;
    return ruleList.every(r => itemList.includes(r));
  }
  function matchByListOR(itemList, ruleList){
    if (!ruleList || ruleList.length===0) return true;
    if (!itemList || itemList.length===0) return false;
    return ruleList.some(r => itemList.includes(r));
  }
  function matchQuestion(qRaw, rules, studyData){
    const q = normalizeQuestion(qRaw);
    const types = Array.isArray(rules.types) ? rules.types : [];
    const tags = Array.isArray(rules.tags) ? rules.tags : [];
    const tagLogic = (rules.tagLogic==='AND'||rules.tagLogic==='OR')? rules.tagLogic : 'OR';
    const knowledge = Array.isArray(rules.knowledge) ? rules.knowledge : [];
    const timeRange = rules && rules.timeRange ? rules.timeRange : null;

    // knowledge constraint (optional; knowledge-mode may already apply)
    if (knowledge.length>0 && q.knowledge && !knowledge.includes(q.knowledge)) return false;

    // types (OR by default; future: typeLogic)
    if (types.length>0 && !types.includes(q.type)) return false;

    // tags (AND/OR)
    if (tags.length>0){
      const ok = tagLogic==='AND' ? matchByListAND(q.tags, tags) : matchByListOR(q.tags, tags);
      if (!ok) return false;
    }

    // timeRange by lastErrorTime
    if (timeRange && (timeRange.preset || timeRange.from || timeRange.to)){
      const now = Date.now();
      let fromTs = 0, toTs = Infinity;
      if (timeRange.preset === '7d') { fromTs = now - 7*24*60*60*1000; }
      else if (timeRange.preset === '30d') { fromTs = now - 30*24*60*60*1000; }
      else if (timeRange.preset === 'any' || timeRange.preset === '' || timeRange.preset === undefined) {
        // no-op
      }
      if (timeRange.preset === 'custom'){
        if (timeRange.from){ const t = Date.parse(timeRange.from + 'T00:00:00'); if (!Number.isNaN(t)) fromTs = t; }
        if (timeRange.to){ const t = Date.parse(timeRange.to + 'T23:59:59'); if (!Number.isNaN(t)) toTs = t; }
      } else {
        // even if preset given, allow from/to to further clamp if present
        if (timeRange.from){ const t = Date.parse(timeRange.from + 'T00:00:00'); if (!Number.isNaN(t)) fromTs = Math.max(fromTs, t); }
        if (timeRange.to){ const t = Date.parse(timeRange.to + 'T23:59:59'); if (!Number.isNaN(t)) toTs = Math.min(toTs, t); }
      }
      const t = q.lastErrorTimeTs || 0;
      // if question has no time info, treat as not matched when a time filter exists
      if (!t) return false;
      if (t < fromTs || t > toTs) return false;
    }

    // future: answerRange/errorRange/date ranges using studyData

    return true;
  }
  function filterQuestions(arr, rules, studyData){
    if (!Array.isArray(arr)||arr.length===0) return [];
    return arr.filter(q => matchQuestion(q, rules, studyData));
  }
  function mergeRules(base, ext){
    const out = Object.assign({}, base||{});
    Object.keys(ext||{}).forEach(k=>{
      out[k] = ext[k];
    });
    return out;
  }
  function saveRulesForMode(mode, patch){
    try{
      const raw = localStorage.getItem(`practiceFilter:${mode}`);
      const obj = raw? (JSON.parse(raw)||{}) : {};
      const oldRules = obj.rules || {};
      const newRules = mergeRules(oldRules, patch||{});
      localStorage.setItem(`practiceFilter:${mode}`, JSON.stringify({ rules: newRules, ts: new Date().toISOString() }));
      return newRules;
    }catch(_){ return null; }
  }
  window.FilterCore = {
    normalizeQuestion,
    getAdvancedRulesForMode,
    matchQuestion,
    filterQuestions,
    saveRulesForMode,
  };
})();
