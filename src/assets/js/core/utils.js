// Common utilities: normalization, type inference, option parsing, answer normalization
export function trim(s){ return typeof s==='string'? s.trim(): s; }
export function toHalfWidth(str=''){
  return String(str).replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, ' ');
}
export function stripHtml(str=''){
  const div = document.createElement('div');
  div.innerHTML = str; return div.textContent || div.innerText || '';
}
export function normalizeText(str=''){ return trim(toHalfWidth(stripHtml(String(str)))); }

export function inferType(v){
  const s = normalizeText(v);
  if (!s) return 'empty';
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/.test(s)) return 'date';
  if (/^\d+(?:[.,]\d+)?$/.test(s)) return 'number';
  if (/^(?:true|false|是|否|对|错|正确|错误|T|F)$/i.test(s)) return 'boolean';
  return 'text';
}

export function splitOptions(text){
  if (!text) return [];
  let s = normalizeText(text).replace(/\r?\n/g, '\n');
  // First: try inline pattern like "A.xxx B.yyy C.zzz"
  const inline = [];
  const re = /(?:^|[\s\n\r])[(（]?([A-F])[)）]?[\.、．，,)）]?\s*/g;
  let m, indices=[];
  while ((m = re.exec(s))){
    indices.push({ key: m[1], start: m.index + m[0].length });
  }
  if (indices.length >= 2){
    for (let i=0; i<indices.length; i++){
      const cur = indices[i];
      const next = indices[i+1];
      const seg = s.substring(cur.start, next ? next.index ?? next.start - (next.start - next.start) : s.length).trim();
      inline.push({ key: cur.key, text: seg });
    }
    // Clean up trailing empty texts
    const cleaned = inline.map(o=>({ key:o.key, text:o.text.replace(/^[\s:：-]+/, '') }));
    if (cleaned.filter(o=>o.text).length >= 2) return cleaned;
  }
  // Second: use line-based parsing
  const lines = s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const opts = [];
  for (const line of lines){
    const m2 = line.match(/^\(?([A-Z])\)?[\.|、．，\)]?\s*(.*)$/);
    if (m2) opts.push({ key: m2[1], text: m2[2] });
    else opts.push({ key: '', text: line });
  }
  if (opts.length && opts.every(o=>o.key)) return opts; // already labeled A/B/C
  // If not labeled, auto assign sequential letters
  return opts.map((o,i)=>({ key: String.fromCharCode(65+i), text: o.text }));
}

export function normalizeAnswer(answer){
  const s = normalizeText(answer);
  if (!s) return '';
  // judge
  if (/^(对|正确|true|t)$/i.test(s)) return 'T';
  if (/^(错|错误|false|f)$/i.test(s)) return 'F';
  // multi-select like A,B or AB
  if (/^[A-Z](?:[,;\s]*[A-Z])*$/.test(s)){
    const letters = s.replace(/[^A-Z]/g,'').split('').filter(Boolean);
    const uniq = Array.from(new Set(letters));
    return uniq.sort().join('');
  }
  // single like A or 1
  if (/^[A-Z]$/.test(s)) return s;
  if (/^[1-9]\d*$/.test(s)){
    const n = parseInt(s,10);
    if (n>=1 && n<=26) return String.fromCharCode(64+n);
  }
  return s;
}

export function hashContent(s){
  // simple hash for dedup
  let h = 0, str = normalizeText(s);
  for (let i=0;i<str.length;i++){ h = (h<<5)-h + str.charCodeAt(i); h |= 0; }
  return String(h);
}

export function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1200);
}
