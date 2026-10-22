// Worker del sitio: sirve los archivos estáticos y atiende /api/*.
import {cargar, responder} from './intake.js';

let cache = {t: 0, datos: null};
const TTL = 60000;

// Lee los datos ya publicados (los mismos que ve el navegador) para validar contra ellos.
async function datosPublicados(request, env) {
  if (cache.datos && Date.now() - cache.t < TTL) return cache.datos;
  const leer = async (f) => { const r = await env.ASSETS.fetch(new Request(new URL('/data/' + f, request.url))); if (!r.ok) throw new Error('datos ' + f); return r.json(); };
  const [rows, empresas, manual, tasas, marcas] = await Promise.all([leer('historial.json'), leer('empresas.json'), leer('manual.json'), leer('tasas.json'), leer('marcas.json')]);
  delete marcas._nota;
  cache = {t: Date.now(), datos: {rows, empresas, manual, tasas, marcas}};
  return cache.datos;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/estado' && request.method === 'GET') return responder({habilitado: Boolean(env.GITHUB_TOKEN && env.CODIGOS)});
    if (url.pathname === '/api/cargar') {
      if (request.method !== 'POST') return responder({error: 'Método no permitido.'}, 405);
      try { return await cargar(request, env, {datos: () => datosPublicados(request, env)}); } catch (e) { console.error('carga: error', e.message); return responder({error: 'Error interno.'}, 500); }
    }
    if (url.pathname.startsWith('/api/')) return responder({error: 'No existe.'}, 404);
    return env.ASSETS.fetch(request);
  },
};
