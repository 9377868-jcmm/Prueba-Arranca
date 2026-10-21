import {fmtN, fmtD, h} from './format.js';

export const PALETA = ['#2456d6', '#0f8b6d', '#b8860b', '#8e44ad', '#c0392b', '#16a0b8', '#6b7a1f', '#d35fa0', '#5d6d7e', '#e67e22', '#2e86c1', '#7d3c98'];
const ARR = '#d9480f';
export const colorDe = (empresa, i) => empresa === 'Arranca' ? ARR : PALETA[i % PALETA.length];
const css = 'var(--muted)';

function tooltip(box) {
  let t = box.querySelector('.tip');
  if (!t) { t = h('div', {class: 'tip'}); box.append(t); }
  t.hidden = true; return t;
}
function mostrar(box, tip, ev, lineas) {
  tip.hidden = false; tip.replaceChildren(...lineas.map((l) => h('div', {}, l)));
  const r = box.getBoundingClientRect(); let lx = ev.clientX - r.left + 12;
  if (lx + tip.offsetWidth > r.width) lx = ev.clientX - r.left - tip.offsetWidth - 12;
  tip.style.left = Math.max(0, lx) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px';
}

// Evolución de la inicial (USD) por empresa en el tiempo. series: [{empresa, pts:[{c, v}]}]
export function lineas(box, series, ocultas = new Set(), onToggle = () => {}) {
  box.replaceChildren();
  const vis = series.filter((s) => s.pts.length);
  if (!vis.length) { box.append(h('p', {class: 'empty'}, 'Este modelo no tiene inicial publicada en dólares.')); return; }
  const tip = tooltip(box);
  const W = box.clientWidth || 600, H = 300, labW = Math.min(150, W * 0.3), ml = 44;
  const all = vis.flatMap((s) => s.pts.map((p) => ({...p, d: new Date(p.c + 'T00:00:00Z')})));
  const shown = all.filter((p) => !ocultas.has(p.empresa));
  const y = d3.scaleLinear([0, (d3.max(shown.length ? shown : all, (p) => p.v) || 1) * 1.12], [H - 28, 12]).nice();
  let x0 = d3.min(all, (p) => p.d), x1 = d3.max(all, (p) => p.d);
  if (+x0 === +x1) { x0 = d3.utcDay.offset(x0, -15); x1 = d3.utcDay.offset(x1, 15); }
  const x = d3.scaleUtc([x0, x1], [ml, W - labW]);
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Inicial por empresa en el tiempo');
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', ml).attr('x2', W - labW).attr('y1', y).attr('y2', y).attr('stroke', 'var(--line)');
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', 11).attr('fill', css).text(fmtN);
  svg.append('g').selectAll('text').data(x.ticks(Math.max(2, Math.floor((W - labW - ml) / 90)))).join('text').attr('x', x).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', css).text(d3.utcFormat('%b %Y'));
  const ln = d3.line().x((p) => x(p.d)).y((p) => y(p.v));
  const ends = [];
  vis.forEach((s, i) => {
    const col = colorDe(s.empresa, i), off = ocultas.has(s.empresa);
    const pts = s.pts.map((p) => ({...p, d: new Date(p.c + 'T00:00:00Z')})).sort((a, b) => a.d - b.d);
    if (!off) {
      svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2).attr('d', ln);
      svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.d)).attr('cy', (p) => y(p.v)).attr('r', 5).attr('fill', col)
        .on('pointermove', (ev, p) => mostrar(box, tip, ev, [fmtD(p.c), `${s.empresa}: $${fmtN(p.v)}`])).on('pointerleave', () => { tip.hidden = true; });
    }
    ends.push({y: off ? 1e9 : y(pts[pts.length - 1].v), e: s.empresa, t: s.empresa + (off ? '' : ' · ' + fmtN(pts[pts.length - 1].v)), col, off});
  });
  ends.sort((a, b) => a.y - b.y);
  let ly = 12;
  ends.forEach((e, i) => { e.y = e.off ? 12 + 14 * i : Math.max(e.y, ly); ly = e.y + 14; });
  svg.append('g').selectAll('text').data(ends).join('text').attr('x', W - labW + 8).attr('y', (d) => d.y).attr('dy', '0.32em').attr('font-size', 11)
    .attr('fill', (d) => d.off ? css : d.col).attr('opacity', (d) => d.off ? 0.5 : 1).style('cursor', 'pointer').style('text-decoration', (d) => d.off ? 'line-through' : null)
    .text((d) => d.t).on('click', (ev, d) => onToggle(d.e))
    .each(function () { while (this.getComputedTextLength() > labW - 10 && this.textContent.length > 4) this.textContent = this.textContent.slice(0, -2) + '…'; });
  box.append(tip);
}

// Barras horizontales: items [{etiqueta, valor, arranca}]
export function barras(box, items, formato = (v) => '$' + fmtN(v)) {
  box.replaceChildren();
  if (!items.length) { box.append(h('p', {class: 'empty'}, 'Sin planes comparables con estos filtros.')); return; }
  const W = box.clientWidth || 600, rowH = 26, H = items.length * rowH + 8, lab = Math.min(220, W * 0.42);
  const x = d3.scaleLinear([0, d3.max(items, (d) => d.valor) || 1], [0, W - lab - 70]);
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Costo total por plan');
  items.forEach((d, i) => {
    const g = svg.append('g').attr('transform', `translate(0,${i * rowH + 4})`);
    g.append('text').attr('x', lab - 8).attr('y', 14).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--fg)').text(d.etiqueta)
      .each(function () { while (this.getComputedTextLength() > lab - 12 && this.textContent.length > 4) this.textContent = this.textContent.slice(0, -2) + '…'; });
    g.append('rect').attr('x', lab).attr('y', 3).attr('height', 16).attr('rx', 3).attr('width', Math.max(2, x(d.valor))).attr('fill', d.arranca ? ARR : i === 0 ? 'var(--ok)' : 'var(--acc)');
    g.append('text').attr('x', lab + Math.max(2, x(d.valor)) + 6).attr('y', 14).attr('font-size', 12).attr('fill', css).text(formato(d.valor));
  });
}
