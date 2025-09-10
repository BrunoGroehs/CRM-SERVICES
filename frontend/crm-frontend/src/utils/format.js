export const formatCurrency = (value) => {
  const n = parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  // Prefer parsing YYYY-MM-DD as local date to avoid TZ shift
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (ymd.test(dateStr)) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    return dt.toLocaleDateString('pt-BR');
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
};

export const parseISODate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const monthRange = (yyyyMm) => {
  // yyyyMm: YYYY-MM
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2, '0');
    yyyyMm = `${y}-${m}`;
  }
  const [y, m] = yyyyMm.split('-').map(Number);
  const first = new Date(y, m-1, 1);
  const last = new Date(y, m, 0);
  const from = first.toISOString().slice(0,10);
  const to = last.toISOString().slice(0,10);
  return { from, to };
};

export const monthKey = (dateStr) => {
  if (!dateStr) return '';
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (ymd.test(dateStr)) {
    const [y,m] = dateStr.split('-');
    return `${y}-${m}`;
  }
  const d = parseISODate(dateStr);
  return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : '';
};

export const monthLabel = (anyDateStrOrFrom) => {
  // Accepts YYYY-MM or YYYY-MM-DD or a Date-like string
  const ym = /^\d{4}-\d{2}$/;
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  let d;
  if (ym.test(anyDateStrOrFrom)) {
    const [y, m] = anyDateStrOrFrom.split('-').map(Number);
    d = new Date(y, m-1, 1);
  } else if (ymd.test(anyDateStrOrFrom)) {
    const [y, m] = anyDateStrOrFrom.split('-').map(Number);
    d = new Date(y, m-1, 1);
  } else {
    d = parseISODate(anyDateStrOrFrom) || new Date();
  }
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  return formatter.format(d);
};

export const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
export const parseYMDLocal = (s) => {
  if (!isYMD(s)) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
};
