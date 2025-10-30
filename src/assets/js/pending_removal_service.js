/*
 * 待移除队列服务（PendingRemovalService）
 * - 管理 pendingRemoval 状态与抽查周期
 * - 支持会话周期（session）与时间周期（time N 天）
 * - 中文注释；英文错误提示
 */
(function(global){
  'use strict';

  var Adapter = global.StorageAdapter;
  var EqService = global.ErrorQueueService;
  var Config = global.EQPP_CONFIG || { AUDIT_MODE: 'session', AUDIT_TIME_DAYS: 7 };

  var sessionAuditFlag = false; // 本会话是否需要抽查（简化实现）

  var PendingRemovalService = {
    moveToPendingRemoval: function(questionId){
      try {
        var list = Adapter.loadErrorQuestions();
        for (var i=0;i<list.length;i++){
          if (String(list[i].id) === String(questionId)){
            list[i].status = 'pendingRemoval';
            list[i].pendingSince = new Date().toISOString();
            Adapter.saveErrorQuestions(list);
            return true;
          }
        }
        return false;
      } catch(e){ console.warn('[PendingRemovalService.moveToPendingRemoval] failed:', e); alert('Move to pending failed'); return false; }
    },

    // 简化的抽查周期判断
    shouldAuditNow: function(now){
      var mode = (Config && Config.AUDIT_MODE) || 'session';
      if (mode === 'session'){
        // 下一次错题练习会话触发抽查
        return sessionAuditFlag === true;
      }
      if (mode === 'time'){
        try {
          var list = Adapter.loadErrorQuestions();
          var DAYS = Number((Config && Config.AUDIT_TIME_DAYS) || 7);
          var ms = DAYS * 24 * 60 * 60 * 1000;
          var tNow = now ? (new Date(now)).getTime() : Date.now();
          return list.some(function(item){
            if (item.status !== 'pendingRemoval') return false;
            var since = (item.pendingSince ? Date.parse(item.pendingSince) : 0);
            return (tNow - since) >= ms;
          });
        } catch(e){ console.warn('[PendingRemovalService.shouldAuditNow] failed:', e); return false; }
      }
      return false;
    },

    // 在抽查周期触发时执行抽查
    runAuditCycle: function(onAnswer){
      try {
        var list = Adapter.loadErrorQuestions();
        var pending = list.filter(function(x){ return x.status === 'pendingRemoval'; });
        // 抽查：逐个验证（实际答题由回调 onAnswer 提供）
        for (var i=0;i<pending.length;i++){
          var q = pending[i];
          var ok = false;
          try { ok = (typeof onAnswer === 'function') ? !!onAnswer(q) : true; } catch(_){ ok = true; }
          if (ok){ PendingRemovalService.finalRemove(q.id); }
          else { PendingRemovalService.reintegrateOnError(q.id); }
        }
        return { audited: pending.length };
      } catch(e){ console.warn('[PendingRemovalService.runAuditCycle] failed:', e); alert('Audit failed'); return { error: e }; }
    },

    // 最终移除：不再显示在错题系统中（保留历史可选）
    finalRemove: function(questionId){
      try {
        var list = Adapter.loadErrorQuestions();
        var kept = [];
        for (var i=0;i<list.length;i++){
          if (String(list[i].id) === String(questionId)) continue;
          kept.push(list[i]);
        }
        Adapter.saveErrorQuestions(kept);
        return true;
      } catch(e){ console.warn('[PendingRemovalService.finalRemove] failed:', e); alert('Final remove failed'); return false; }
    },

    // 回归错题队列并清零连续计数
    reintegrateOnError: function(questionId){
      try {
        var list = Adapter.loadErrorQuestions();
        for (var i=0;i<list.length;i++){
          if (String(list[i].id) === String(questionId)){
            list[i].status = 'normal';
            list[i].correctStreak = 0;
            list[i].pendingSince = null;
            list[i].errorCount = Number(list[i].errorCount||0) + 1; // 抽查答错计一次错误
            var now = new Date().toISOString();
            list[i].lastErrorTime = now;
            if (!Array.isArray(list[i].errorTimes)) list[i].errorTimes = [];
            list[i].errorTimes.push(now);
            Adapter.saveErrorQuestions(list);
            return true;
          }
        }
        // 若不在错题系统（已被移除），则作为新错题入队
        EqService && EqService.recordError && EqService.recordError(questionId);
        return true;
      } catch(e){ console.warn('[PendingRemovalService.reintegrateOnError] failed:', e); alert('Reintegrate failed'); return false; }
    },

    // 供会话开始时标记需要抽查（由练习控制器调用）
    markSessionAudit: function(flag){ sessionAuditFlag = !!flag; }
  };

  global.PendingRemovalService = PendingRemovalService;
})(window);
