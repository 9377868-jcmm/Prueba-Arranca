export const fmtN = (v) => (v === null || v === undefined || v === '') ? '—' : (typeof v === 'number' ? new Intl.NumberFormat('es-VE', {maximumFractionDigits: 2}).format(v) : String(v));
export const fmtUsd = (v) => (v === null || v === undefined) ? '—' : '$' + fmtN(v);
export const fmtD = (s) => { if (!s) return '—'; const d = new Date(s + 'T00:00:00Z'); return isNaN(d) ? s : new Intl.DateTimeFormat('es-VE', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(d); };
export const pillCls = (c = '') => /^alta/i.test(c) ? 'alta' : /^media/i.test(c) ? 'media' : 'baja';

// Crea un elemento; los hijos de tipo texto se insertan con textContent (nunca HTML).
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
export const td = (txt, cls) => h('td', {class: cls}, txt);
export const enlace = (url, txt) => /^https?:\/\//.test(url || '') ? h('a', {href: url, target: '_blank', rel: 'noopener noreferrer'}, txt) : txt;

export function descargar(nombre, texto, tipo) {
  const a = h('a', {href: URL.createObjectURL(new Blob([texto], {type: tipo})), download: nombre});
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
