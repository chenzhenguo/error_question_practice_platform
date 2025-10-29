import { normalizeText } from '../core/utils.js';

function parseCSV(text, delimiter=','){
  const lines = text.replace(/\r/g,'').split('\n').filter(l=>l.length>0);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line) => {
    const out=[]; let cur=''; let inQ=false;
    for (let i=0;i<line.length;i++){
      const ch=line[i];
      if (ch==='"'){
        if (inQ && line[i+1]==='"'){ cur+='"'; i++; }
        else inQ=!inQ;
      } else if (ch===delimiter && !inQ){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map(h=>normalizeText(h));
  const rows = lines.slice(1).map(l=>split(l));
  return { headers, rows };
}

export async function readFileAsTable(file){
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')){
    // requires xlsx library in window scope
    const data = await file.arrayBuffer();
    const wb = window.XLSX.read(data, { type: 'array' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const range = window.XLSX.utils.decode_range(ws['!ref']);
    const headers=[]; const rows=[];
    for (let C=range.s.c; C<=range.e.c; C++){
      const cell = ws[window.XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      headers.push(normalizeText(cell ? cell.v : ''));
    }
    for (let R=range.s.r+1; R<=Math.min(range.e.r, range.s.r + 10000); R++){
      const row=[]; let empty=0;
      for (let C=range.s.c; C<=range.e.c; C++){
        const cell = ws[window.XLSX.utils.encode_cell({ r: R, c: C })];
        const v = cell ? cell.v : '';
        row.push(v);
        if (v==='' || v===null || v===undefined) empty++;
      }
      if (empty === row.length) continue; // skip empty rows
      rows.push(row);
    }
    return { headers, rows };
  }
  if (name.endsWith('.csv')){
    const text = await file.text();
    return parseCSV(text, ',');
  }
  if (name.endsWith('.txt')){
    const text = await file.text();
    // try to guess delimiter: tab or comma
    const delimiter = text.includes('\t') ? '\t' : ',';
    return parseCSV(text, delimiter);
  }
  throw new Error('不支持的文件格式');
}
