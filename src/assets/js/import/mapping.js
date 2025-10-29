import { normalizeText, inferType, splitOptions, normalizeAnswer } from '../core/utils.js';
import { getTemplates, addTemplate, deleteTemplate } from '../core/storage.js';

export const REQUIRED_FIELDS = ['question','answer'];
export const OPTIONAL_FIELDS = ['type','difficulty','score','knowledge','analysis','note','tags','source','createdAt'];
export const DEFAULT_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// alias dictionary for intelligent header mapping
const ALIASES = {
  question: ['题目','题干','问题','题目内容','Question','Title','内容'],
  answer: ['答案','正确答案','Answer','解答'],
  type: ['题型','类型','Type'],
  difficulty: ['难度','Difficulty','难度等级'],
  score: ['分值','分数','Score','分'],
  knowledge: ['知识点','章节','Chapter','Topic','标签'],
  analysis: ['解析','答案解析','思路','Analysis','讲解'],
  note: ['备注','说明','Notes','Note'],
  tags: ['标签','Tag','Tags'],
  source: ['来源','出处','来源说明','Source'],
  createdAt: ['创建时间','时间','日期','Date','CreatedAt']
};

export function suggestFieldForHeader(h){
  const s = normalizeText(h).toLowerCase();
  // direct match
  for (const key of DEFAULT_FIELDS){ if (s === key.toLowerCase()) return key; }
  for (const [field, list] of Object.entries(ALIASES)){
    if (list.some(alias => normalizeText(alias).toLowerCase() === s)) return field;
  }
  // heuristics
  if (/题|干|问/.test(s)) return 'question';
  if (/答|正|案/.test(s)) return 'answer';
  if (/型|类/.test(s)) return 'type';
  if (/难|度/.test(s)) return 'difficulty';
  if (/分|值/.test(s)) return 'score';
  if (/知|识|点|章|节/.test(s)) return 'knowledge';
  if (/解|析|思路/.test(s)) return 'analysis';
  if (/备|注|说/.test(s)) return 'note';
  if (/标|签/.test(s)) return 'tags';
  if (/来|源|处/.test(s)) return 'source';
  if (/时|日|期/.test(s)) return 'createdAt';
  return '';
}

export function autoMapColumns(headers){
  const mapping = {};
  headers.forEach((h, idx)=>{
    const f = suggestFieldForHeader(h);
    if (f && mapping[f] === undefined) mapping[f] = idx;
  });
  return mapping;
}

export function toRecord(row, headers, mapping, customFields=[]) {
  const rec = { custom: {} };
  const getByField = (field) => {
    const col = mapping[field];
    if (col === undefined) return '';
    return row[col];
  };
  rec.question = normalizeText(getByField('question'));
  rec.answer = normalizeAnswer(getByField('answer'));
  rec.type = normalizeText(getByField('type'));
  rec.difficulty = normalizeText(getByField('difficulty'));
  rec.score = Number(String(getByField('score')).replace(/,/g,'')) || '';
  rec.knowledge = normalizeText(getByField('knowledge'));
  rec.analysis = String(getByField('analysis')||'');
  rec.note = String(getByField('note')||'');
  rec.tags = normalizeText(getByField('tags'));
  rec.source = normalizeText(getByField('source'));
  const createdAt = normalizeText(getByField('createdAt'));
  rec.createdAt = createdAt || '';

  // options auto detect if not provided in mapping
  // If row has columns like A/B/C/D or Options, try to consolidate
  const optionCols = headers.map((h,i)=>({h:normalizeText(h).toLowerCase(), i}))
    .filter(o=>/^(a|b|c|d|e|f)$/.test(o.h) || /选项/.test(o.h));
  if (optionCols.length){
    const texts = optionCols.map(o => String(row[o.i]||'')).filter(Boolean).join('\n');
    const parsed = splitOptions(texts);
    if (parsed && parsed.length) rec.options = parsed;
  }
  // Fallback: inline options inside question text
  if ((!rec.options || !rec.options.length) && rec.question){
    const inline = splitOptions(rec.question);
    if (inline && inline.length >= 2){
      rec.options = inline;
      // Remove inline options from question, keep stem before first option token
      const idxMatch = rec.question.search(/(?:^|[\s\n\r])[(（]?[A-F][)）]?[\.、．，,)）]?\s*/);
      if (idxMatch > 0) rec.question = rec.question.substring(0, idxMatch).trim();
    }
  }

  // custom fields
  (customFields||[]).slice(0,20).forEach(cf => {
    const idx = mapping[`custom:${cf}`];
    if (idx !== undefined) rec.custom[cf] = row[idx];
  });
  return rec;
}

// Templates
export function listTemplates(){ return getTemplates(); }
export function saveTemplate(name, mapping, headers, customFields){
  if (!name) throw new Error('模板名称不能为空');
  addTemplate({ name, mapping, headers, customFields: customFields||[] });
}
export function removeTemplate(name){ deleteTemplate(name); }
