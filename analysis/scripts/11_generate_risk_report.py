"""
Generates the executive risk report (insurance vs. self-funded reserve) as a
standalone HTML file from the CSVs produced by 09_build_loss_events.py and
10_risk_simulation.py. No record-level data touches this script -- only the
already-aggregated files in ../data/.
"""
import os
import json

import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "..", "reports", "analisis_riesgo_seguro_vs_fondo.html")

PREMIUM_TOTAL = 100.0
PREMIUM_RCV = 19.0
PREMIUM_OWN_DAMAGE = PREMIUM_TOTAL - PREMIUM_RCV


def load():
    d = {}
    for name in ["risk_summary", "risk_by_branch", "risk_by_model", "risk_insured_vs_not",
                 "event_type_summary", "simulation_summary", "stress_scenarios", "fund_sizing_curve",
                 "loss_severity_sample"]:
        d[name] = pd.read_csv(os.path.join(DATA_DIR, f"{name}.csv"))
    return d


def svg_bar_chart(rows, value_key, label_key, n_key, title, max_val=None, color="var(--series-1)", unit="", fmt="{:.2f}"):
    """Horizontal bar chart, one series, with a count annotation. rows: list of dicts."""
    if max_val is None:
        max_val = max(r[value_key] for r in rows) * 1.15 if rows else 1
    row_h = 30
    chart_h = row_h * len(rows) + 10
    label_w = 190
    chart_w = 560
    bars = []
    for i, r in enumerate(rows):
        y = i * row_h + 6
        w = (r[value_key] / max_val) * chart_w if max_val > 0 else 0
        val_label = fmt.format(r[value_key]) + unit
        n_label = f"n={int(r[n_key])}" if n_key else ""
        tooltip = f"{r[label_key]}: {val_label} ({n_label}, exposición {r.get('bike_years', 0):.0f} moto-años)" if 'bike_years' in r else f"{r[label_key]}: {val_label}"
        bars.append(f'''
        <g class="bar-row">
          <title>{tooltip}</title>
          <text x="{label_w - 8}" y="{y + 15}" text-anchor="end" class="bar-label">{r[label_key]}</text>
          <rect x="{label_w}" y="{y}" width="{max(w,1.5):.1f}" height="18" rx="3" fill="{color}"/>
          <text x="{label_w + max(w,1.5) + 8}" y="{y + 15}" class="bar-value">{val_label}{'  ('+n_label+')' if n_label else ''}</text>
        </g>''')
    svg = f'''<svg viewBox="0 0 {label_w + chart_w + 170} {chart_h + 16}" class="chart-svg" role="img" aria-label="{title}">
      {''.join(bars)}
    </svg>'''
    return svg


def build_percentile_ladder(sim):
    """Risk ladder: expected/p50/p75/p90/p95/p99/p99.5 vs premium line."""
    steps = [
        ("Esperado (media)", sim["expected_annual_loss"].iloc[0]),
        ("p50 (mediana)", sim["p50_annual_loss"].iloc[0]),
        ("p75", sim["p75_annual_loss"].iloc[0]),
        ("p90", sim["p90_annual_loss"].iloc[0]),
        ("p95", sim["p95_annual_loss"].iloc[0]),
        ("p99", sim["p99_annual_loss"].iloc[0]),
        ("p99.5 (peor 1 en 200 años)", sim["p99_5_annual_loss"].iloc[0]),
    ]
    premium = sim["annual_premium_cost"].iloc[0]
    max_val = max(premium, steps[-1][1]) * 1.12
    row_h = 34
    chart_h = row_h * len(steps) + 10
    label_w = 210
    chart_w = 520
    bars = []
    for i, (label, val) in enumerate(steps):
        y = i * row_h + 6
        w = (val / max_val) * chart_w
        bars.append(f'''
        <g class="bar-row">
          <title>{label}: ${val:,.0f} en pérdidas simuladas para la flota activa en un año</title>
          <text x="{label_w - 8}" y="{y + 16}" text-anchor="end" class="bar-label">{label}</text>
          <rect x="{label_w}" y="{y}" width="{max(w,1.5):.1f}" height="20" rx="3" fill="var(--series-1)"/>
          <text x="{label_w + max(w,1.5) + 8}" y="{y + 16}" class="bar-value">${val:,.0f}</text>
        </g>''')
    premium_x = label_w + (premium / max_val) * chart_w
    premium_line = f'''
      <line x1="{premium_x:.1f}" y1="0" x2="{premium_x:.1f}" y2="{chart_h-6}" stroke="var(--critical)" stroke-width="2" stroke-dasharray="5,4"/>
      <text x="{premium_x:.1f}" y="{chart_h+8}" text-anchor="middle" class="premium-label">Costo de la póliza: ${premium:,.0f}/año</text>
    '''
    return f'''<svg viewBox="0 0 {label_w + chart_w + 130} {chart_h + 26}" class="chart-svg" role="img" aria-label="Escalera de percentiles de pérdida anual simulada vs costo de póliza">
      {''.join(bars)}
      {premium_line}
    </svg>'''


def build_fund_curve(curve_df, premium):
    """Line: probability that annual loss exceeds fund size, vs fund size. Premium marked."""
    w, h = 640, 220
    pad_l, pad_b, pad_t = 55, 34, 14
    xs = curve_df["fund_size"].to_numpy()
    ys = curve_df["prob_exceed_in_a_year"].to_numpy()
    x_max = xs.max()
    plot_w = w - pad_l - 20
    plot_h = h - pad_b - pad_t
    pts = []
    for x, y in zip(xs, ys):
        px = pad_l + (x / x_max) * plot_w
        py = pad_t + (1 - y) * plot_h
        pts.append((px, py))
    path = "M " + " L ".join(f"{px:.1f},{py:.1f}" for px, py in pts)
    area = path + f" L {pts[-1][0]:.1f},{pad_t+plot_h:.1f} L {pts[0][0]:.1f},{pad_t+plot_h:.1f} Z"

    # gridlines at 0,25,50,75,100%
    grid = []
    for pct in [0, 25, 50, 75, 100]:
        gy = pad_t + (1 - pct / 100) * plot_h
        grid.append(f'<line x1="{pad_l}" y1="{gy:.1f}" x2="{pad_l+plot_w}" y2="{gy:.1f}" class="gridline"/>')
        grid.append(f'<text x="{pad_l-8}" y="{gy+4:.1f}" text-anchor="end" class="axis-label">{pct}%</text>')

    premium_x = pad_l + (premium / x_max) * plot_w
    premium_line = f'''<line x1="{premium_x:.1f}" y1="{pad_t}" x2="{premium_x:.1f}" y2="{pad_t+plot_h}" stroke="var(--critical)" stroke-width="2" stroke-dasharray="5,4"/>
      <text x="{premium_x:.1f}" y="{pad_t-2}" text-anchor="middle" class="premium-label">póliza: ${premium:,.0f}</text>'''

    x_ticks = []
    for i in range(0, 6):
        xv = x_max * i / 5
        px = pad_l + (xv / x_max) * plot_w
        x_ticks.append(f'<text x="{px:.1f}" y="{h-8}" text-anchor="middle" class="axis-label">${xv/1000:.0f}k</text>')

    return f'''<svg viewBox="0 0 {w} {h}" class="chart-svg" role="img" aria-label="Probabilidad de que la pérdida anual supere el tamaño del fondo">
      {''.join(grid)}
      <path d="{area}" fill="var(--series-1)" opacity="0.15"/>
      <path d="{path}" fill="none" stroke="var(--series-1)" stroke-width="2.5"/>
      {premium_line}
      {''.join(x_ticks)}
      <text x="{pad_l + plot_w/2}" y="{h-1}" text-anchor="middle" class="axis-title" dy="10">Tamaño del fondo de reserva</text>
    </svg>'''


def main():
    d = load()
    rs = d["risk_summary"].iloc[0]
    sim = d["simulation_summary"]
    sim_row = sim.iloc[0]
    stress = d["stress_scenarios"]
    ins = d["risk_insured_vs_not"]
    ev_types = d["event_type_summary"]
    branch = d["risk_by_branch"].to_dict("records")
    model = d["risk_by_model"].to_dict("records")
    for r in model:
        r["label"] = f"{r['product_name']}"

    branch_svg = svg_bar_chart(branch, "freq_per_100_bikeyears", "location", "n_events",
                                "Frecuencia de siniestros por sede", unit=" / 100 moto-años", fmt="{:.2f}")
    model_svg = svg_bar_chart(model, "freq_per_100_bikeyears", "label", "n_events",
                               "Frecuencia de siniestros por modelo", unit=" / 100 moto-años", fmt="{:.2f}")
    ladder_svg = build_percentile_ladder(sim)
    fund_svg = build_fund_curve(d["fund_sizing_curve"], sim_row["annual_premium_cost"])

    ins_rows = ins.to_dict("records")
    ins_chart = svg_bar_chart(
        [{"label": ("Asegurados" if r["insured"] else "No asegurados"), "freq_per_100_bikeyears": r["freq_per_100_bikeyears"],
          "n_events": r["n_events"], "bike_years": r["bike_years"]} for r in ins_rows],
        "freq_per_100_bikeyears", "label", "n_events", "Asegurados vs no asegurados",
        unit=" / 100 moto-años", fmt="{:.2f}", color="var(--series-2)"
    )

    stress_rows = stress.to_dict("records")
    stress_labels = {"point_estimate": "Estimación central", "upper_95ci_frequency": "Límite superior IC95% frecuencia",
                      "stress_include_fiscalia": "Estrés: FISCALIA también son siniestros"}

    severity_vals = d["loss_severity_sample"]["estimated_loss"].tolist()

    html = f'''<title>Seguro vs. fondo propio — riesgo de flota</title>
<style>
  :root {{
    color-scheme: light;
    --surface-1: #fcfcfb; --page: #f9f9f7;
    --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
    --gridline: #e1e0d9; --border: rgba(11,11,11,0.10);
    --series-1: #2a78d6; --series-2: #eb6834;
    --good: #0ca30c; --critical: #d03b3b; --warning: #fab219;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:where(:not([data-theme="light"])) {{
      color-scheme: dark;
      --surface-1: #1a1a19; --page: #0d0d0d;
      --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #898781;
      --gridline: #2c2c2a; --border: rgba(255,255,255,0.10);
      --series-1: #3987e5; --series-2: #d95926;
      --good: #0ca30c; --critical: #e66767; --warning: #fab219;
    }}
  }}
  :root[data-theme="dark"] {{
    color-scheme: dark;
    --surface-1: #1a1a19; --page: #0d0d0d;
    --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #898781;
    --gridline: #2c2c2a; --border: rgba(255,255,255,0.10);
    --series-1: #3987e5; --series-2: #d95926;
    --good: #0ca30c; --critical: #e66767; --warning: #fab219;
  }}
  * {{ box-sizing: border-box; }}
  body {{ background: var(--page); color: var(--text-primary); font-family: system-ui,-apple-system,"Segoe UI",sans-serif;
          margin: 0; padding: 0 0 60px; line-height: 1.5; }}
  .wrap {{ max-width: 980px; margin: 0 auto; padding: 40px 24px; }}
  h1 {{ font-size: 1.7rem; margin: 0 0 6px; }}
  h2 {{ font-size: 1.25rem; margin: 44px 0 4px; border-top: 1px solid var(--border); padding-top: 28px; }}
  h3 {{ font-size: 1rem; margin: 20px 0 8px; color: var(--text-secondary); }}
  .subtitle {{ color: var(--text-secondary); margin: 0 0 28px; font-size: 0.95rem; }}
  .card {{ background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; margin: 14px 0; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 12px; margin: 16px 0; }}
  .tile {{ background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; }}
  .tile .num {{ font-size: 1.6rem; font-weight: 600; }}
  .tile .lbl {{ color: var(--text-secondary); font-size: 0.82rem; margin-top: 2px; }}
  .tile.good .num {{ color: var(--good); }}
  .tile.crit .num {{ color: var(--critical); }}
  .chart-svg {{ width: 100%; height: auto; }}
  .bar-label {{ fill: var(--text-secondary); font-size: 12px; }}
  .bar-value {{ fill: var(--text-primary); font-size: 12px; }}
  .axis-label {{ fill: var(--text-muted); font-size: 11px; }}
  .axis-title {{ fill: var(--text-secondary); font-size: 12px; }}
  .premium-label {{ fill: var(--critical); font-size: 11px; font-weight: 600; }}
  .gridline {{ stroke: var(--gridline); stroke-width: 1; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.88rem; margin: 10px 0; }}
  th, td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); }}
  th {{ color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.02em; }}
  td.num, th.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .badge {{ display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }}
  .badge.good {{ background: color-mix(in srgb, var(--good) 16%, transparent); color: var(--good); }}
  .badge.warn {{ background: color-mix(in srgb, var(--warning) 22%, transparent); color: #8a6100; }}
  .badge.crit {{ background: color-mix(in srgb, var(--critical) 16%, transparent); color: var(--critical); }}
  .caveat {{ font-size: 0.85rem; color: var(--text-secondary); background: color-mix(in srgb, var(--warning) 10%, var(--surface-1));
             border-left: 3px solid var(--warning); padding: 10px 14px; border-radius: 4px; margin: 12px 0; }}
  .answer {{ font-size: 1.05rem; font-weight: 600; margin: 6px 0 10px; }}
  ul {{ margin: 6px 0; padding-left: 22px; }}
  li {{ margin: 4px 0; }}
  .toc {{ display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; }}
  .toc a {{ color: var(--text-secondary); text-decoration: none; }}
  .toc a:hover {{ color: var(--text-primary); text-decoration: underline; }}
  footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 0.8rem; }}
</style>
<div class="wrap">
  <h1>¿Póliza de seguro o fondo propio contra pérdida total?</h1>
  <p class="subtitle">Frecuencia y severidad de siniestros (robo, hurto, choque, daño total) sobre la flota de motos en arrendamiento, y simulación de capital necesario para autoasegurar el riesgo vs. contratar la póliza cotizada ($100/moto/año, de los cuales $19 son RCV y no forman parte de este análisis).</p>

  <div class="toc">
    <a href="#resumen">Resumen ejecutivo</a>
    <a href="#datos">Qué dice realmente la data</a>
    <a href="#frecuencia">Frecuencia por sede y modelo</a>
    <a href="#asegurados">Asegurados vs. no asegurados</a>
    <a href="#simulacion">Simulación: fondo vs. póliza</a>
    <a href="#recomendacion">Recomendación</a>
    <a href="#limitaciones">Limitaciones</a>
  </div>

  <h2 id="resumen">Resumen ejecutivo</h2>
  <div class="grid">
    <div class="tile"><div class="num">{rs['total_leases']:,.0f}</div><div class="lbl">contratos de moto analizados</div></div>
    <div class="tile"><div class="num">{rs['total_bike_years']:,.0f}</div><div class="lbl">moto-años de exposición observados</div></div>
    <div class="tile"><div class="num">{rs['freq_per_100_bikeyears']:.2f}</div><div class="lbl">siniestros confirmados / 100 moto-años</div></div>
    <div class="tile"><div class="num">${sim_row['annual_premium_cost']:,.0f}</div><div class="lbl">costo anual de la póliza (flota activa, {sim_row['fleet_size']:.0f} motos)</div></div>
    <div class="tile good"><div class="num">${sim_row['expected_annual_loss']:,.0f}</div><div class="lbl">pérdida anual esperada (simulada)</div></div>
    <div class="tile good"><div class="num">${sim_row['p99_annual_loss']:,.0f}</div><div class="lbl">pérdida anual en el peor 1% de los años (p99)</div></div>
  </div>
  <p class="answer">Con la frecuencia y severidad observadas, un fondo propio de ~$60,000–65,000 cubre el 99% de los años posibles — muy por debajo de los ${sim_row['annual_premium_cost']:,.0f}/año que cuesta la póliza sobre la flota activa.</p>
  <p>Esa brecha se sostiene incluso en el escenario pesimista de frecuencia (límite superior del intervalo de confianza al 95%). Solo se estrecha si se asume que los 39 casos <code>FISCALIA</code> —hoy sin clasificar como siniestro— son también pérdidas no cubiertas; ver <a href="#simulacion">sección de simulación</a>.</p>

  <h2 id="datos">Qué dice realmente la data</h2>
  <p>El sistema de origen no tiene un campo de "tipo de siniestro". Robo, hurto y choque solo aparecen como texto libre en observaciones, y con muy pocas menciones literales:</p>
  <table>
    <tr><th>Fuente</th><th class="num">Registros</th><th>Confianza</th></tr>
    <tr><td>Estatus <code>SINISTER</code> / <code>DAMAGED</code> / <code>INDEMNIFIED</code> (status_records)</td><td class="num">{int(ev_types[ev_types.event_type.isin(['SINISTER','DAMAGED','INDEMNIFIED'])]['n'].sum())}</td><td><span class="badge good">alta</span></td></tr>
    <tr><td>Estatus <code>FISCALIA</code> (denuncia legal, no siempre siniestro)</td><td class="num">{int(ev_types[ev_types.event_type=='FISCALIA']['n'].iloc[0])}</td><td><span class="badge warn">baja</span></td></tr>
    <tr><td>Menciones de texto libre (robo/hurto/choque/siniestro) en observaciones</td><td class="num">{int(ev_types[ev_types.event_type=='KEYWORD_MENTION']['n'].iloc[0])}</td><td><span class="badge crit">muy baja</span></td></tr>
    <tr><td>Menciones literales de "robo" en todo el dataset</td><td class="num">3</td><td><span class="badge crit">no estimable</span></td></tr>
    <tr><td>Menciones literales de "hurto"</td><td class="num">1</td><td><span class="badge crit">no estimable</span></td></tr>
  </table>
  <div class="caveat"><strong>Por eso este análisis no reporta una tasa de robo, otra de hurto y otra de choque por separado</strong> — pedírselo a esta data produciría un número inventado. Sí se puede medir con confianza razonable la frecuencia y severidad de <em>siniestros de flota en general</em> (los 41 eventos de alta confianza: {int(ev_types[ev_types.event_type=='SINISTER']['n'].iloc[0])} SINISTER, {int(ev_types[ev_types.event_type=='DAMAGED']['n'].iloc[0])} DAMAGED, {int(ev_types[ev_types.event_type=='INDEMNIFIED']['n'].iloc[0])} INDEMNIFIED), que es lo que informa la simulación de abajo.</div>
  <p>Severidad: de esos 41 eventos, {int(rs['n_severity_matched'])} se pudieron cruzar con la tabla de motos recuperadas (venta tras siniestro), con una pérdida real de <strong>{', '.join(f'${v:,.0f}' for v in severity_vals)}</strong> — entre 68% y 100% del valor original de la moto. Los {41-int(rs['n_severity_matched'])} restantes nunca aparecen en esa tabla, consistente con robo/hurto sin recuperación: se modelan como pérdida total (100% del precio de esa moto), un supuesto documentado, no un hecho medido.</p>

  <h2 id="frecuencia">Frecuencia de siniestros por sede y modelo</h2>
  <p>Solo se muestran sedes/modelos con exposición mínima (≥5 moto-años). Con 0–18 eventos por sede, los números bajos no son un ranking preciso — pase el cursor para ver el conteo y la exposición detrás de cada barra.</p>
  <h3>Por sede</h3>
  {branch_svg}
  <p class="caveat">Pto_Ordaz y Maturín destacan (5.04 y 3.72/100 moto-años), pero con 4 y 10 eventos respectivamente — la incertidumbre estadística es amplia. Guarenas es la única sede con volumen suficiente (18 eventos, 1,077 moto-años) para que su tasa (1.67) sea razonablemente estable.</p>
  <h3>Por modelo</h3>
  {model_svg}
  <p class="caveat">EK XPRESS DE RAYO (9.26/100 moto-años) es un valor atípico basado en 7 eventos sobre solo 76 moto-años de exposición — la muestra es demasiado chica para tratarlo como una diferencia real de producto y no ruido. RK 200, NEW HORSE y EK XPRESS DE PALETA tienen exposición suficiente (400–540 moto-años) para que sus tasas (1.16–1.86) sean más confiables.</p>

  <h2 id="asegurados">Asegurados vs. no asegurados</h2>
  {ins_chart}
  <p>Los contratos con póliza muestran <strong>más</strong> eventos por moto-año, no menos ({ins_rows[1]['freq_per_100_bikeyears'] if ins_rows[0]['insured']==False else ins_rows[0]['freq_per_100_bikeyears']:.2f} vs {ins_rows[0]['freq_per_100_bikeyears'] if ins_rows[0]['insured']==False else ins_rows[1]['freq_per_100_bikeyears']:.2f}). Esto <strong>no</strong> significa que asegurar cause más siniestros — el seguro no es una herramienta de prevención, es transferencia de riesgo tras el hecho. La causa real: la aseguradora (Seguros Caracas) se contrató por sede, y las sedes con seguro son justamente las de mayor riesgo (Maturín 43% asegurado, Guarenas 41%, vs. Caracas y Valencia 0%). Al comparar <em>dentro</em> de la misma sede (Guarenas: 1.89 asegurado vs 1.46 no asegurado; Maturín: 5.42 vs 1.65) el patrón se mantiene, así que no es solo un artefacto de sede — pero con tan pocos eventos por celda, no alcanza para separar selección de riesgo real de reporting bias (un siniestro asegurado tiene un proceso de reclamo que genera el registro <code>SINISTER</code>; uno no asegurado puede resolverse informalmente sin dejar ese rastro).</p>

  <h2 id="simulacion">Simulación: ¿fondo propio o póliza?</h2>
  <p>Se simularon 50,000 años de la flota activa ({sim_row['fleet_size']:.0f} motos) con la frecuencia y severidad observadas (Monte Carlo, eventos ~ Poisson, severidad remuestreada de los 41 casos reales). El resultado es la distribución completa de la pérdida anual — no solo el promedio, que es lo que importa para dimensionar un fondo.</p>
  <h3>Percentiles de pérdida anual simulada vs. costo de la póliza</h3>
  {ladder_svg}
  <p>Incluso el percentil 99.5 (el peor año en 200) queda en <strong>${sim_row['p99_5_annual_loss']:,.0f}</strong>, un 25% por debajo del costo anual de la póliza (${sim_row['annual_premium_cost']:,.0f}). La probabilidad de que la pérdida real de un año supere lo que costaría la póliza es <strong>{sim_row['prob_loss_exceeds_premium']*100:.2f}%</strong> bajo la estimación central.</p>

  <h3>¿Qué tan frágil es esta conclusión? — escenarios de estrés</h3>
  <table>
    <tr><th>Escenario</th><th class="num">Tasa /100 moto-años</th><th class="num">Eventos/año esp.</th><th class="num">Pérdida esperada</th><th class="num">p95</th><th class="num">p99</th><th class="num">P(pérdida &gt; póliza)</th></tr>
    {"".join(f"<tr><td>{stress_labels.get(r['scenario'], r['scenario'])}</td><td class='num'>{r['rate_per_100_bikeyears']:.2f}</td><td class='num'>{r['expected_events_year']:.1f}</td><td class='num'>${r['expected_annual_loss']:,.0f}</td><td class='num'>${r['p95_annual_loss']:,.0f}</td><td class='num'>${r['p99_annual_loss']:,.0f}</td><td class='num'>{r['prob_loss_exceeds_premium']*100:.2f}%</td></tr>" for r in stress_rows)}
  </table>
  <p>Solo en el escenario más pesimista —tratar los 39 casos <code>FISCALIA</code> como siniestros reales, algo que la data no confirma— la probabilidad de que un año sea más caro que la póliza sube a 14.7%. Incluso ahí, en 85 de cada 100 años el fondo propio sigue siendo más barato.</p>

  <h3>Tamaño del fondo vs. probabilidad de que no alcance en un año dado</h3>
  {fund_svg}
  <p>Un fondo de <strong>${sim_row['p95_annual_loss']:,.0f}</strong> (percentil 95) deja sin cubrir 1 de cada 20 años; uno de <strong>${sim_row['p99_annual_loss']:,.0f}</strong> (percentil 99) deja sin cubrir 1 de cada 100. Ambos son menores al costo anual de la póliza — es decir, incluso financiando el fondo completo desde cero en el primer año, ya se ahorra frente a la prima.</p>

  <h2 id="recomendacion">Recomendación</h2>
  <div class="card">
    <p class="answer">Con la información disponible, el fondo propio domina financieramente a la póliza de $100/moto (menos $19 de RCV) para el riesgo de pérdida total sobre la flota actual.</p>
    <ul>
      <li><strong>Prima de indiferencia:</strong> ${sim_row['indifference_premium_per_bike']:.2f}/moto/año — el punto en que da lo mismo asegurar o no. La prima real ($81) más que <strong>duplica</strong> ese valor.</li>
      <li><strong>Capital inicial requerido:</strong> ${sim_row['p99_annual_loss']:,.0f} cubre el 99% de los años; no exige inmovilizar más que eso incluso en el arranque del fondo.</li>
      <li><strong>La decisión es sensible a un solo supuesto:</strong> si se decide investigar y confirmar que una parte relevante de los 39 <code>FISCALIA</code> son siniestros no reportados como tales, la ventaja del fondo se reduce (aunque no desaparece).</li>
      <li><strong>Recomendación operativa:</strong> antes de cancelar la póliza, auditar una muestra de los 39 casos <code>FISCALIA</code> para confirmar si son siniestro, fraude interno o disputa de cobranza — esa clasificación, hoy ausente del sistema, es la pieza que más cambiaría esta conclusión.</li>
    </ul>
  </div>

  <h2 id="limitaciones">Limitaciones</h2>
  <ul>
    <li><strong>Muestra chica:</strong> 41 eventos de alta confianza sostienen toda la estimación de frecuencia; el intervalo de confianza al 95% va de 1.24 a 2.34 por 100 moto-años (ver escenario de estrés).</li>
    <li><strong>Severidad basada en 5 casos reales</strong> más un supuesto de pérdida total (100% del precio) para los 36 restantes — razonable para robo/hurto sin recuperación, pero no verificado caso por caso.</li>
    <li><strong>Riesgo correlacionado no modelado:</strong> la simulación asume eventos independientes (un robo en Maturín no afecta la probabilidad de otro en Guarenas). No captura eventos catastróficos que afecten muchas motos a la vez (disturbios, incendio de depósito, etc.) — ese es precisamente el tipo de cola que una póliza sí cubre y un fondo dimensionado con data histórica individual podría no anticipar.</li>
    <li><strong>No incluye la RCV</strong> ($19 de los $100): ese tramo cubre responsabilidad civil frente a terceros, un riesgo de naturaleza distinta (posible severidad ilimitada por lesiones/daños a terceros) que no se modela aquí y que probablemente sí justifica seguro por separado.</li>
    <li><strong>Costos operativos de un fondo propio</strong> (gestión de reclamos, peritaje, tiempo de resolución) no están valorizados — la aseguradora los absorbe dentro de la prima.</li>
  </ul>

  <footer>
    Generado a partir de {rs['total_leases']:,.0f} contratos de moto y {int(sim_row['fleet_size'])} vigentes en la flota activa. Sin datos de clientes ni PII — solo agregados y simulación. Pipeline: <code>analysis/scripts/09_build_loss_events.py</code>, <code>10_risk_simulation.py</code>, <code>11_generate_risk_report.py</code>.
  </footer>
</div>
'''

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w") as f:
        f.write(html)
    print(f"Wrote {REPORT_PATH} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
