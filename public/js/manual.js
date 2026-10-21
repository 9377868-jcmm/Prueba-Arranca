// Pestaña "Cargar dato": arma una entrada manual, la valida y abre GitHub con el archivo listo para crear.
import {vigentes, manualActivas, filaManual, rankearModelo, estadosManual, aCSV, hoyISO, sumaDias} from './calc.js';
import {MOTIVOS, FRECUENCIAS, validarEntrada, nombrePlan, claveModelo, nombreArchivo, urlGitHub} from './manual-core.js';
import {h, fmtN, fmtUsd, fmtD, descargar} from './format.js';

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: no pasa nada */ } };
const leer = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };

export function vCargar(el, D, opciones = {}) {
  const hoy = hoyISO();
  const reales = vigentes(D.rows);
  const empresas = D.empresas.map((e) => e.empresa).sort((a, b) => a.localeCompare(b, 'es'));
  const marcasLista = [...new Set([...Object.values(D.marcasMap || {}).filter(Boolean), ...D.rows.map((r) => r.marca_norm).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
  const activas = manualActivas(D.manual.entradas, hoy);
  const ctx = () => ({hoy, alias: {}, empresas: new Set(empresas), ids: new Set(D.rows.map((r) => r.id)), modelos: new Set(D.rows.map((r) => r.modelo_clave)),
    manualIds: new Set(D.manual.entradas.filter((e) => e.tipo === 'precio').map((e) => e.fila.id)), marcas: new Set([...Object.keys(D.marcasMap || {}), ...marcasLista, ...D.rows.map((r) => r.marca)]),
    ultimos: new Map(reales.map((r) => [r.id, r]))});

  let modo = 'precio';
  const campos = {};
  const campo = (id, etiqueta, ctrl, ayuda) => { campos[id] = ctrl; ctrl.id = 'f-' + id; return h('div', {class: 'campo'}, h('label', {for: 'f-' + id}, etiqueta), ctrl, ayuda && h('small', {}, ayuda)); };
  const inp = (type = 'text', extra = {}) => h('input', {type, autocomplete: 'off', ...extra});
  const sel = (opts, valor) => h('select', {}, opts.map(([v, t]) => h('option', {value: v, selected: v === valor}, t)));
  const dl = (id, vals) => h('datalist', {id}, vals.map((v) => h('option', {value: v})));

  // ---- controles comunes
  const cMotivo = sel(Object.entries(MOTIVOS), 'sin_publicar');
  const cFecha = inp('date', {value: hoy, max: hoy});
  const cFuente = h('textarea', {rows: 2, placeholder: 'Ej.: Asesor de ventas por WhatsApp, captura guardada en Drive'});
  const cUrl = inp('url', {placeholder: 'https://… (obligatoria si la confianza es Alta)'});
  const cConf = sel([['Media', 'Media'], ['Baja', 'Baja (dato verbal o sin captura)'], ['Alta', 'Alta (con url de respaldo)']], 'Media');
  const cQuien = inp('text', {value: leer('mx-quien'), placeholder: 'Su nombre'});
  const cNota = h('textarea', {rows: 2});

  // ---- modo precio
  const cEmpresa = inp('text', {list: 'dl-emp', placeholder: 'Empresa existente'});
  const cModelo = inp('text', {list: 'dl-mod', placeholder: 'Modelo (existente o nuevo)'});
  const cPlan = h('select', {});
  const cCuotas = inp('number', {min: 1, step: 1, placeholder: 'N.° de cuotas'});
  const cFrec = sel(FRECUENCIAS.map((f) => [f, f]), 'Quincenal');
  const cMarca = inp('text', {list: 'dl-marca', placeholder: 'Marca'});
  const cInicial = inp('number', {min: 0, step: 'any'});
  const cCuota = inp('number', {min: 0, step: 'any'});
  const cMoneda = sel([['USD', 'US$'], ['EUR', '€ (euro)']], 'USD');
  const bloquePlanNuevo = h('div', {class: 'fila'});

  // ---- modo empresa
  const cE = {empresa: inp('text'), modelo_negocio: inp('text', {placeholder: 'Ej.: Financiamiento directo, arrendamiento con opción a compra'}), marcas: inp('text'),
    ubicacion: inp('text', {value: 'Caracas'}), frecuencia: inp('text'), plazos: inp('text'), gastos_adm: inp('text'), como_publica: inp('text'), confianza: sel([['Media', 'Media'], ['Baja', 'Baja'], ['Alta', 'Alta']], 'Media')};

  // ---- modo retiro
  const cRetiro = sel([['', '— elija un dato manual —'], ...activas.map((f) => [f.id, `${f.empresa} · ${f.modelo_clave} · ${f.plan} (${fmtD(f.man.registrado)})`])], '');

  // ---- salidas
  const salida = h('div', {class: 'salida', 'aria-live': 'polite'});
  const cuerpo = h('div');

  const planesDe = () => reales.filter((r) => r.empresa === cEmpresa.value.trim() && r.modelo_clave === claveModelo(cModelo.value));
  function refrescarPlanes() {
    const ps = planesDe();
    const actual = cPlan.value;
    cPlan.replaceChildren(...ps.map((p) => h('option', {value: p.plan}, `${p.plan} · hoy: ${fmtN(p.inicial)} inicial, ${fmtN(p.cuota)} cuota`)), h('option', {value: '__nuevo'}, 'Plan nuevo…'));
    const conserva = [...cPlan.options].some((o) => o.value === actual) && (cPlan.dataset.tocado === '1' || actual !== '__nuevo');
    cPlan.value = conserva ? actual : (ps.length ? ps[0].plan : '__nuevo');
    bloquePlanNuevo.hidden = cPlan.value !== '__nuevo';
    const base = ps.find((p) => p.plan === cPlan.value);
    if (base && !cMarca.dataset.tocado) cMarca.value = base.marca_norm || base.marca || '';
    if (!base && !cMarca.dataset.tocado) { const m = reales.find((r) => r.modelo_clave === claveModelo(cModelo.value)); if (m) cMarca.value = m.marca_norm || ''; }
    document.getElementById('dl-mod').replaceChildren(...[...new Set((cEmpresa.value.trim() ? reales.filter((r) => r.empresa === cEmpresa.value.trim()) : reales).map((r) => r.modelo_clave))].sort().map((v) => h('option', {value: v})));
  }

  const comunes = () => ({v: 1, registrado_por: cQuien.value.trim(), registrado: hoy, motivo: cMotivo.value, fuente: cFuente.value.trim(), url: cUrl.value.trim(), fecha_dato: cFecha.value});
  const numero = (c) => (c.value === '' ? null : Number(c.value));

  function construir() {
    const k = comunes();
    if (modo === 'precio') {
      const empresa = cEmpresa.value.trim(), clave = claveModelo(cModelo.value);
      const existente = cPlan.value !== '__nuevo' ? planesDe().find((p) => p.plan === cPlan.value) : null;
      const nuevoPlan = !existente;
      const n = numero(cCuotas);
      const plan = existente ? existente.plan : nombrePlan(n, cFrec.value);
      const modelo = existente ? existente.modelo : cModelo.value.trim();
      const modeloExiste = D.rows.some((r) => r.modelo_clave === clave);
      const base = D.rows.find((r) => r.modelo_clave === clave);
      return {...k, tipo: 'precio', confianza: cConf.value, vence: sumaDias(cFecha.value || hoy, 30), nota: cNota.value.trim(),
        nuevo: nuevoPlan ? (modeloExiste ? 'plan' : 'modelo') : null,
        plan: {empresa, marca: cMarca.value.trim(), modelo: existente ? modelo : (base ? base.modelo : modelo), modelo_clave: clave, plan,
          inicial: numero(cInicial), inicial_txt: '', cuota: numero(cCuota), cuota_txt: '', moneda: cMoneda.value === 'EUR' ? '€ (manual)' : 'USD',
          frecuencia: existente ? existente.frecuencia : cFrec.value, n_cuotas: existente ? existente.n_cuotas : n}};
    }
    if (modo === 'empresa') {
      const f = Object.fromEntries(Object.entries(cE).map(([key, c]) => [key, c.value.trim()]));
      return {...k, tipo: 'empresa', motivo: 'alta_nueva', ficha: {...f, fuente: cUrl.value.trim() || cFuente.value.trim()}};
    }
    return {...k, tipo: 'retiro', id: cRetiro.value};
  }

  function actualizar() {
    guardar('mx-quien', cQuien.value);
    const e = construir();
    const {errores, avisos} = validarEntrada(e, ctx());
    delete e._id;
    const kids = [];
    if (errores.length) kids.push(h('div', {class: 'warn', role: 'alert'}, h('strong', {}, 'Revise antes de enviar:'), h('ul', {}, errores.map((m) => h('li', {}, m)))));
    if (avisos.length) kids.push(h('div', {class: 'note'}, h('strong', {}, 'Avisos:'), h('ul', {}, avisos.map((m) => h('li', {}, m)))));
    if (!errores.length && modo === 'precio') {
      const f = filaManual(e, {}, D.marcasMap || {});
      const otros = D.vigAll.filter((r) => r.modelo_clave === f.modelo_clave && r.id !== f.id);
      const {ranking} = rankearModelo([...otros, f], {tasas: {eurUsd: D.eurUsd}});
      const pos = ranking.findIndex((p) => p.id === f.id);
      kids.push(h('p', {class: 'note'}, `Costo total: ${f.costo_total !== null ? fmtN(f.costo_total) : '—'} · cuota mensual equivalente: ${f.cuota_mensual !== null ? fmtN(f.cuota_mensual) : '—'}. `,
        pos >= 0 ? `Quedaría en el puesto ${pos + 1} de ${ranking.length} para ${f.modelo_clave}.` : 'No entra al ranking (falta cuota, n.° de cuotas o tasa del euro).'));
    }
    const archivo = nombreArchivo(e);
    const u = urlGitHub(archivo, [e]);
    kids.push(h('details', {}, h('summary', {}, `Ver el archivo que se creará (${archivo})`), h('pre', {}, h('code', {}, u.json))));
    const ok = !errores.length;
    const enlace = h('a', {class: 'b boton' + (ok ? '' : ' off'), href: ok ? (u.larga ? u.vacia : u.url) : null, target: '_blank', rel: 'noopener noreferrer', 'aria-disabled': ok ? false : 'true',
      onclick: ok && u.larga ? () => { navigator.clipboard && navigator.clipboard.writeText(u.json); } : null}, u.larga ? 'Copiar JSON y abrir GitHub' : 'Abrir en GitHub');
    const copiar = h('button', {class: 'b', type: 'button', disabled: !ok, onclick: (ev) => { navigator.clipboard && navigator.clipboard.writeText(u.json); ev.target.textContent = '¡Copiado!'; setTimeout(() => { ev.target.textContent = 'Copiar JSON'; }, 1800); }}, 'Copiar JSON');
    kids.push(h('div', {class: 'ctrls'}, enlace, copiar));
    kids.push(h('p', {class: 'note'}, 'En GitHub elija "Create a new branch for this commit and start a pull request" y pulse "Commit". Al unir el PR, el sitio se actualiza solo.'));
    salida.replaceChildren(...kids);
  }

  function dibujar() {
    const comun = [campo('motivo', 'Motivo', cMotivo), campo('fecha', 'Fecha en que se vio el dato', cFecha), campo('fuente', 'Fuente (obligatoria)', cFuente, 'Diga de dónde sale: persona, canal y dónde guardó la captura.'),
      campo('url', 'Enlace de respaldo', cUrl), campo('quien', 'Registrado por', cQuien), campo('nota', 'Nota (opcional)', cNota)];
    if (modo === 'precio') {
      cuerpo.replaceChildren(
        h('div', {class: 'fila'}, campo('empresa', 'Empresa', cEmpresa), campo('modelo', 'Modelo', cModelo)),
        campo('plan', 'Plan', cPlan, 'Elija uno existente para actualizar su precio, o "Plan nuevo" para crearlo (también sirve para un modelo nuevo).'),
        h('div', {class: 'fila'}, campo('cuotas', 'N.° de cuotas (solo plan nuevo)', cCuotas), campo('frec', 'Frecuencia (solo plan nuevo)', cFrec)),
        h('div', {class: 'fila'}, campo('marca', 'Marca', cMarca), campo('moneda', 'Moneda', cMoneda)),
        h('div', {class: 'fila'}, campo('inicial', 'Inicial', cInicial), campo('cuota', 'Cuota', cCuota)),
        campo('conf', 'Confianza', cConf), ...comun);
    } else if (modo === 'empresa') {
      cuerpo.replaceChildren(
        campo('e-empresa', 'Nombre de la empresa', cE.empresa), campo('e-neg', 'Modelo de negocio', cE.modelo_negocio),
        h('div', {class: 'fila'}, campo('e-marcas', 'Marcas', cE.marcas), campo('e-ubic', 'Ubicación', cE.ubicacion)),
        h('div', {class: 'fila'}, campo('e-frec', 'Frecuencia de pago', cE.frecuencia), campo('e-plazos', 'Plazos', cE.plazos)),
        h('div', {class: 'fila'}, campo('e-gastos', 'Gastos administrativos', cE.gastos_adm), campo('e-pub', 'Cómo publica sus precios', cE.como_publica)),
        campo('e-conf', 'Confianza de la ficha', cE.confianza), ...comun.filter((_, i) => i !== 0),
        h('p', {class: 'note'}, 'La empresa aparece en "Empresas" con la etiqueta Nuevo. Para que entre a los rankings, cargue también sus planes en "Actualizar o añadir precio".'));
    } else {
      cuerpo.replaceChildren(campo('retiro', 'Dato manual a retirar', cRetiro, activas.length ? '' : 'No hay datos manuales vigentes.'), ...comun.filter((_, i) => i !== 0));
    }
    actualizar();
  }

  [cEmpresa, cModelo].forEach((c) => c.addEventListener('input', () => { cPlan.dataset.tocado = ''; refrescarPlanes(); actualizar(); }));
  cPlan.addEventListener('change', () => { cPlan.dataset.tocado = '1'; cMarca.dataset.tocado = ''; refrescarPlanes(); actualizar(); });
  cMarca.addEventListener('input', () => { cMarca.dataset.tocado = '1'; });
  [cMotivo, cFecha, cFuente, cUrl, cConf, cQuien, cNota, cCuotas, cFrec, cMarca, cInicial, cCuota, cMoneda, cRetiro, ...Object.values(cE)].forEach((c) => {
    c.addEventListener('input', actualizar); c.addEventListener('change', actualizar);
  });

  const tabs = [['precio', 'Actualizar o añadir precio'], ['empresa', 'Empresa nueva'], ['retiro', 'Retirar un dato manual']];
  const barra = h('div', {class: 'sub', role: 'group', 'aria-label': 'Tipo de carga'}, tabs.map(([k, t]) => h('button', {type: 'button', class: 'b' + (k === modo ? ' on' : ''), 'aria-pressed': String(k === modo), onclick: (ev) => {
    modo = k; barra.querySelectorAll('button').forEach((b) => { const on = b === ev.currentTarget; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); dibujar();
  }}, t)));

  // ---- historial de datos manuales (nada se borra) y renovación
  const ESTADOS = {vigente: ['Vigente', 'g'], vencido: ['Vencido', 'w'], cubierto: ['Cubierto por el corte real', 'b'], reemplazado: ['Reemplazado por uno más nuevo', 'b'], retirado: ['Retirado', 'w']};
  const registro = estadosManual(D.manual.entradas, D.rows, hoy);
  function renovar(f) {
    modo = 'precio';
    barra.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === 0); b.setAttribute('aria-pressed', String(i === 0)); });
    dibujar();
    cEmpresa.value = f.empresa; cModelo.value = f.modelo_clave; cPlan.dataset.tocado = '';
    refrescarPlanes();
    if ([...cPlan.options].some((o) => o.value === f.plan)) cPlan.value = f.plan;
    cInicial.value = f.inicial ?? ''; cCuota.value = f.cuota ?? ''; cMarca.value = f.marca_norm || f.marca || ''; cMarca.dataset.tocado = '1';
    cMoneda.value = f.moneda_norm === 'EUR' ? 'EUR' : 'USD'; cFecha.value = hoy; cMotivo.value = 'otro'; cConf.value = f.confianza === 'Alta' ? 'Media' : f.confianza;
    cFuente.value = ''; cFuente.placeholder = 'Confirme el dato y diga de dónde lo verificó hoy'; cNota.value = 'Renovación del dato del ' + f.fecha_dato;
    actualizar(); cuerpo.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  const COLS = [{k: 'estado', t: 'Estado'}, {k: 'empresa', t: 'Empresa'}, {k: 'modelo_clave', t: 'Modelo'}, {k: 'plan', t: 'Plan'}, {k: 'inicial', t: 'Inicial'}, {k: 'cuota', t: 'Cuota'}, {k: 'moneda_norm', t: 'Moneda'},
    {k: 'fecha_dato', t: 'Fecha del dato'}, {k: 'vence', t: 'Vence'}, {k: 'registrado_por', t: 'Registrado por'}, {k: 'fuente', t: 'Fuente'}, {k: 'archivo', t: 'Archivo'}];
  const plano = registro.map((r) => ({estado: ESTADOS[r.estado][0], empresa: r.fila.empresa, modelo_clave: r.fila.modelo_clave, plan: r.fila.plan, inicial: r.fila.inicial, cuota: r.fila.cuota, moneda_norm: r.fila.moneda_norm,
    fecha_dato: r.fila.fecha_dato, vence: r.fila.man.vence, registrado_por: r.fila.man.registrado_por, fuente: r.fila.man.fuente, archivo: r.archivo}));
  const historial = h('div', {class: 'card'}, h('h2', {}, 'Datos manuales registrados'),
    h('p', {class: 'note'}, 'Nada se borra: cada dato manual queda guardado en el repositorio (carpeta data/manual) aunque venza, sea reemplazado o lo cubra un corte real. Aquí puede verlos todos, descargarlos y renovar los vencidos.'),
    registro.length ? h('div', {class: 'tw', role: 'region', 'aria-label': 'Datos manuales registrados', tabindex: 0}, h('table', {}, h('thead', {}, h('tr', {}, ['Estado', 'Empresa y plan', 'Inicial', 'Cuota', 'Fecha del dato', 'Vence', 'Fuente', ''].map((t) => h('th', {scope: 'col'}, t)))),
      h('tbody', {}, registro.map((r) => h('tr', {}, h('td', {}, h('span', {class: 'badge ' + ESTADOS[r.estado][1]}, ESTADOS[r.estado][0])),
        h('td', {}, h('strong', {}, r.fila.empresa), h('div', {class: 'sub-t'}, `${r.fila.modelo_clave} · ${r.fila.plan}`)), h('td', {class: 'n'}, fmtN(r.fila.inicial)), h('td', {class: 'n'}, fmtN(r.fila.cuota)),
        h('td', {}, fmtD(r.fila.fecha_dato)), h('td', {}, fmtD(r.fila.man.vence)), h('td', {}, h('div', {}, r.fila.man.fuente), h('div', {class: 'sub-t'}, `por ${r.fila.man.registrado_por}`)),
        h('td', {}, ['vencido', 'cubierto', 'retirado'].includes(r.estado) ? h('button', {class: 'b', type: 'button', onclick: () => renovar(r.fila)}, 'Renovar') : null)))))) : h('p', {class: 'empty'}, 'Todavía no hay datos manuales.'),
    registro.length > 0 && h('div', {class: 'ctrls mt'}, h('button', {class: 'b', type: 'button', onclick: () => descargar('datos-manuales.csv', aCSV(plano, COLS), 'text/csv;charset=utf-8')}, 'Exportar CSV'),
      h('button', {class: 'b', type: 'button', onclick: () => descargar('datos-manuales.json', JSON.stringify(plano, null, 1), 'application/json')}, 'Exportar JSON')));

  el.append(h('div', {class: 'card'}, h('h2', {}, 'Cargar un dato a mano'),
    h('p', {class: 'note'}, 'Use esto cuando una empresa no publicó a tiempo o su información no se puede consultar en línea. El dato queda marcado como "Manual", vence a los 30 días o cuando el próximo corte traiga el dato real, y pasa por revisión (PR) antes de publicarse.'),
    dl('dl-emp', empresas), h('datalist', {id: 'dl-mod'}), dl('dl-marca', marcasLista), barra, cuerpo, salida), historial);
  refrescarPlanes();
  dibujar();
}
