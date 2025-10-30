/*
 * 错题队列服务（ErrorQueueService）
 * - 负责错误入队/更新与正确计数、转入待移除
 * - 依赖 StorageAdapter 进行读写与字段补齐
 * - 中文注释；英文错误提示
 */
(function(global){
  'use strict';

  var Adapter = global.StorageAdapter;
  var Config = global.EQPP_CONFIG || { CORRECT_STREAK_THRESHOLD: 3 };

  function findById(list, id){
    if (!Array.isArray(list)) return -1;
    for (var i=0;i<list.length;i++){ if (String(list[i].id) === String(id)) return i; }
    return -1;
  }

  var ErrorQueueService = {
    /**
     * 记录错误：
     * - 新增或更新错题记录：errorCount++、lastErrorTime=now、errorTimes.push(now)、correctStreak=0、status=normal
     */
    recordError: function(questionId){
      try {
        var list = Adapter.loadErrorQuestions();
        var idx = findById(list, questionId);
        var now = new Date().toISOString();
        if (idx < 0){
          list.push({ id: String(questionId), errorCount: 1, lastErrorTime: now, errorTimes: [now], correctStreak: 0, status: 'normal', pendingSince: null });
        } else {
          var item = list[idx];
          item.errorCount = Number(item.errorCount||0) + 1;
          item.lastErrorTime = now;
          if (!Array.isArray(item.errorTimes)) item.errorTimes = [];
          item.errorTimes.push(now);
          item.correctStreak = 0;
          item.status = 'normal';
          item.pendingSince = null;
        }
        Adapter.saveErrorQuestions(list);
        return true;
      } catch(e){ console.warn('[ErrorQueueService.recordError] failed:', e); alert('Record error failed'); return false; }
    },

    /**
     * 记录正确：
     * - 若题目在错题系统中，则连续答对计数+1；达到阈值转入待移除队列
     */
    recordCorrect: function(questionId){
      try {
        var list = Adapter.loadErrorQuestions();
        var idx = findById(list, questionId);
        if (idx < 0){
          // 不在错题系统中，忽略或可选策略：不计入 streak
          return false;
        }
        var item = list[idx];
        // 待移除状态下不参与普通练习计数（保留以抽查）
        if (item.status === 'pendingRemoval') return false;
        item.correctStreak = Number(item.correctStreak||0) + 1;
        // 达到阈值：转入待移除
        var TH = Number((Config && Config.CORRECT_STREAK_THRESHOLD) || 3);
        if (item.correctStreak >= TH){
          item.status = 'pendingRemoval';
          item.pendingSince = new Date().toISOString();
        }
        Adapter.saveErrorQuestions(list);
        return true;
      } catch(e){ console.warn('[ErrorQueueService.recordCorrect] failed:', e); alert('Record correct failed'); return false; }
    }
  };

  global.ErrorQueueService = ErrorQueueService;
})(window);
