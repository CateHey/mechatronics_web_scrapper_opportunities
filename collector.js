// ============================================================================
//  COLECTOR DE VACANTES — Mecatrónica / Practicante / Junior en Perú
//  Pegar este código en un nodo "Code" de n8n (modo: Run Once for All Items).
//  Consulta empresa por empresa su fuente oficial, filtra por mecatrónica /
//  practicante / junior, evita repetidos (guarda los IDs ya vistos) y arma
//  el correo HTML. Si no hay vacantes nuevas, no devuelve nada (no se envía).
// ============================================================================

// ---------- CONFIGURA AQUÍ ----------
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Nivel (practicante / junior). Si el título NO contiene ninguna de estas, se descarta.
const NIVEL = /practic|pre.?profes|trainee|junior|jr\b|j[oó]ven|becari|egresad|intern|aprendiz|reci[eé]n/i;

// Dominio (mecatrónica y afines). Sirve para marcar ⭐ las más relevantes.
const DOMINIO = /mecatr|mantenim|instrument|automatiz|control|el[eé]ctr|electron|confiab|mec[aá]nic|plc|scada|rob[oó]t|proces/i;

// Si lo pones en true: solo deja pasar vacantes que sean NIVEL **y** DOMINIO.
// En false (recomendado): deja pasar todo lo de nivel practicante/junior y solo
// marca con ⭐ las de mecatrónica (así no se pierden programas tipo "Becarios").
const SOLO_MECATRONICA = false;
// ------------------------------------

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const stripTags = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const slugToTitle = (slug) => {
  try { slug = decodeURIComponent(slug); } catch (e) {}
  return slug.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
             .replace(/\b\w/g, (c) => c.toUpperCase());
};

async function http(opts) {
  return this.helpers.httpRequest({ timeout: 25000, headers: { 'User-Agent': UA }, ...opts });
}

const jobs = [];      // {company, id, title, url, location}
const porFuente = {}; // conteo por empresa
const errores = [];   // fuentes que fallaron

function add(company, list) {
  let n = 0;
  for (const j of list) {
    if (!j || !j.title) continue;
    jobs.push({
      company,
      id: String(j.id || j.url || j.title),
      title: stripTags(j.title),
      url: j.url || '',
      location: j.location || '',
    });
    n++;
  }
  porFuente[company] = n;
}

// ---- Parser genérico HiringRoom (ISA REP, Southern, Cerro Verde) ----
async function hiringRoom(company, subdomain) {
  const res = await http.call(this, {
    method: 'POST',
    url: `https://${subdomain}.hiringroom.com/jobs/getVacanciesForPortal/1`,
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'typePortal=external&selectedPage=1',
  });
  const data = typeof res === 'string' ? JSON.parse(res) : res;
  const html = (data && data.data && data.data.htmlContent) || '';
  const out = [];
  for (const block of html.split(/<a href="\/jobs\/get_vacancy\//).slice(1)) {
    const idMatch = block.match(/^([^"\/?]+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const tMatch = block.match(/name__vacancy">\s*([\s\S]*?)<\/h4>/);
    const lMatch = block.match(/Location-pin[\s\S]*?<\/i>\s*([\s\S]*?)<\/span>/);
    out.push({
      id,
      title: stripTags(tMatch ? tMatch[1] : '') || id,
      url: `https://${subdomain}.hiringroom.com/jobs/get_vacancy/${id}`,
      location: stripTags(lMatch ? lMatch[1] : ''),
    });
  }
  return out;
}

// ---- Antamina (SuccessFactors RMK — tiles HTML) ----
async function antamina() {
  const html = await http.call(this, { url: 'https://mastalento.antamina.com/tile-search-results/?data=1' });
  const out = [];
  const re = /class="[^"]*job-id-(\d+)[^"]*"[^>]*data-url="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = (m[2].split('/job/')[1] || '').split('/')[0];
    out.push({ id: m[1], title: slugToTitle(slug), url: 'https://mastalento.antamina.com' + m[2] });
  }
  return out;
}

// ---- Southern Copper — portal CAPPER (JSON oficial) ----
async function capper() {
  const out = [];
  for (const tipo of ['1', '2']) { // 1 = puestos, 2 = practicantes
    try {
      const res = await http.call(this, {
        method: 'POST',
        url: 'https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx/GetListOfertas',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: { tipo },
        json: true,
      });
      let d = res && res.d;
      if (typeof d === 'string') d = JSON.parse(d);
      let lst = d && d.lstOfertas;
      if (typeof lst === 'string') lst = JSON.parse(lst);
      const arr = Array.isArray(lst) ? lst : (lst ? Object.values(lst) : []);
      for (const o of arr) {
        const id = o.IdOferta || o.idOferta || o.Id || o.codigo || JSON.stringify(o).slice(0, 40);
        const title = o.Titulo || o.titulo || o.NombrePuesto || o.Puesto || o.descripcion || '';
        out.push({ id: String(id), title, url: 'https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx?tipo=' + tipo, location: o.Lugar || o.Ubicacion || '' });
      }
    } catch (e) { /* CAPPER suele estar vacío; el respaldo es HiringRoom */ }
  }
  return out;
}

// ---- Las Bambas / MMG (sitemap.xml) ----
async function lasBambas() {
  const xml = await http.call(this, { url: 'https://careers.mmg.com/sitemap.xml' });
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1].trim();
    if (!/\/jobs\//i.test(url)) continue;
    if (!/peru|apurimac|lima-office|las-bambas/i.test(url)) continue;
    const slug = url.split('/jobs/')[1].replace(/\/$/, '');
    out.push({ id: url, title: slugToTitle(slug), url });
  }
  return out;
}

// ---- ABB (Phenom widgets — JSON con filtro Perú) ----
async function abb() {
  const res = await http.call(this, {
    method: 'POST',
    url: 'https://careers.abb/widgets',
    headers: { 'Content-Type': 'application/json' },
    body: {
      lang: 'en_global', deviceType: 'desktop', country: 'global', pageName: 'search-results',
      ddoKey: 'refineSearch', sortBy: '', subsearch: '', from: 0, jobs: true, counts: true,
      all_fields: ['category', 'country', 'state', 'city'], size: 50, keywords: '', global: true,
      selected_fields: { country: ['Peru'] }, locationData: {},
    },
    json: true,
  });
  const list = (((res || {}).refineSearch || {}).data || {}).jobs || [];
  return list.map((j) => ({
    id: j.jobId || j.reqId || j.jobSeqNo || j.applyUrl,
    title: j.title,
    url: j.applyUrl || j.jobUrl || 'https://careers.abb/global/en/search-results',
    location: (j.multi_location && j.multi_location[0]) || j.state || j.city || 'Peru',
  }));
}

// ---- Rockwell Automation (Workday CXS) ----
async function workday(company, tenant, site) {
  const res = await http.call(this, {
    method: 'POST',
    url: `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    headers: { 'Content-Type': 'application/json' },
    body: { appliedFacets: {}, limit: 20, offset: 0, searchText: 'Peru' },
    json: true,
  });
  const list = (res || {}).jobPostings || [];
  return list
    .filter((j) => /peru|lima/i.test(j.locationsText || ''))
    .map((j) => ({
      id: j.externalPath || j.bulletFields && j.bulletFields[0] || j.title,
      title: j.title,
      url: `https://${tenant}.wd1.myworkdayjobs.com/en-US/${site}` + (j.externalPath || ''),
      location: j.locationsText || 'Peru',
    }));
}

// ---- Schneider Electric (Eightfold — filtro Perú en cliente) ----
async function schneider() {
  const out = [];
  const kws = ['practicante', 'junior', 'mantenimiento', 'automatizacion', 'mecatronica', 'control'];
  for (const kw of kws) {
    try {
      const res = await http.call(this, {
        url: `https://careers.se.com/api/jobs?query=${encodeURIComponent(kw)}&start=0&num=10&sort_by=timestamp`,
        json: true,
      });
      const list = (res && (res.positions || res.jobs || res.data)) || [];
      for (const j of list) {
        const loc = j.location || (j.data && j.data.full_location) || j.full_location || '';
        if (!/peru|lima/i.test(loc)) continue;
        out.push({
          id: j.id || j.display_job_id || j.canonicalPositionUrl,
          title: j.name || j.title || (j.data && j.data.title),
          url: j.canonicalPositionUrl || j.absolute_url || 'https://careers.se.com/global/jobs',
          location: loc,
        });
      }
    } catch (e) { /* ignora keyword que falle */ }
  }
  return out;
}

// ---- LinkedIn guest API (Siemens, ENGIE, Kallpa, Electroperú) ----
// Puede ser bloqueado desde IPs de servidor (respuesta 999). Es un respaldo.
async function linkedin(company, query) {
  const html = await http.call(this, {
    url: `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=Peru&start=0`,
  });
  const out = [];
  const re = /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title">\s*([\s\S]*?)<\/h3>[\s\S]*?base-card__full-link"\s*href="([^"?]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ id: m[1], title: stripTags(m[2]), url: m[3] });
  }
  return out;
}

// ---- Electroperú (SharePoint — detecta PDFs de convocatoria) ----
async function electroperu() {
  const html = await http.call(this, { url: 'http://www.electroperu.com.pe/SitePages/Ofertas%20Laborales.aspx' });
  const out = [];
  const re = /href="([^"]+\.pdf)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let url = m[1];
    if (!/^https?:/i.test(url)) url = 'http://www.electroperu.com.pe' + (url.startsWith('/') ? '' : '/') + url;
    const name = (url.split('/').pop() || '').replace(/%20/g, ' ');
    out.push({ id: url, title: slugToTitle(name), url });
  }
  return out;
}

// ============================ EJECUCIÓN ============================
const fuentes = [
  ['ISA REP',         () => hiringRoom.call(this, 'ISA REP', 'rep')],
  ['Southern Copper', () => hiringRoom.call(this, 'Southern Copper', 'southernperu')],
  ['Southern (CAPPER)', () => capper.call(this)],
  ['Cerro Verde',     () => hiringRoom.call(this, 'Cerro Verde', 'cerroverde')],
  ['Antamina',        () => antamina.call(this)],
  ['Las Bambas',      () => lasBambas.call(this)],
  ['ABB',             () => abb.call(this)],
  ['Rockwell',        () => workday.call(this, 'Rockwell', 'rockwellautomation', 'External_Rockwell_Automation')],
  ['Schneider',       () => schneider.call(this)],
  ['Siemens',         () => linkedin.call(this, 'Siemens', 'Siemens')],
  ['Siemens Energy',  () => linkedin.call(this, 'Siemens Energy', 'Siemens Energy')],
  ['ENGIE',           () => linkedin.call(this, 'ENGIE', 'ENGIE')],
  ['Kallpa',          () => linkedin.call(this, 'Kallpa', 'Kallpa Generacion')],
  ['Electroperú',     () => electroperu.call(this)],
];

for (const [name, fn] of fuentes) {
  try {
    const list = await fn();
    add(name, list);
  } catch (e) {
    errores.push(`${name}: ${e.message}`);
    porFuente[name] = 'ERROR';
  }
}

// ---- Filtro nivel/dominio ----
const relevantes = jobs.filter((j) => {
  const t = norm(j.title);
  const nivel = NIVEL.test(t);
  const dom = DOMINIO.test(t);
  return SOLO_MECATRONICA ? (nivel && dom) : nivel;
});

// ---- Dedup contra lo ya visto (memoria del workflow) ----
const sd = $getWorkflowStaticData('global');
sd.seen = sd.seen || {};
const hoy = new Date().toISOString().slice(0, 10);
const nuevas = [];
for (const j of relevantes) {
  const key = j.company + '::' + j.id;
  if (!sd.seen[key]) {
    nuevas.push(j);
    sd.seen[key] = hoy;
  }
}
// Limpieza: olvida lo visto hace más de 120 días
const limite = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
for (const k of Object.keys(sd.seen)) if (sd.seen[k] < limite) delete sd.seen[k];

// ---- Si no hay nada nuevo, no enviar correo ----
if (nuevas.length === 0) {
  return [];
}

// ---- Marca ⭐ y ordena (mecatrónica primero) ----
for (const j of nuevas) j.estrella = DOMINIO.test(norm(j.title));
nuevas.sort((a, b) => (b.estrella - a.estrella) || a.company.localeCompare(b.company));

// ---- Arma el correo HTML ----
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const porEmpresa = {};
for (const j of nuevas) (porEmpresa[j.company] = porEmpresa[j.company] || []).push(j);

let html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:auto;color:#222">`;
html += `<h2 style="color:#1a5276">🔧 ${nuevas.length} vacante(s) nueva(s) para practicante / junior</h2>`;
html += `<p style="color:#555">Empresas de energía, minería y automatización en Perú · ${hoy}<br>⭐ = relacionada con mecatrónica / mantenimiento / automatización.</p>`;
for (const empresa of Object.keys(porEmpresa)) {
  html += `<h3 style="margin:18px 0 6px;border-bottom:2px solid #eee;padding-bottom:4px">${esc(empresa)}</h3><ul style="padding-left:18px">`;
  for (const j of porEmpresa[empresa]) {
    const star = j.estrella ? '⭐ ' : '';
    const loc = j.location ? ` <span style="color:#888">— ${esc(j.location)}</span>` : '';
    const link = j.url ? `<a href="${esc(j.url)}" style="color:#1a5276;text-decoration:none">${star}${esc(j.title)}</a>` : `${star}${esc(j.title)}`;
    html += `<li style="margin:5px 0">${link}${loc}</li>`;
  }
  html += `</ul>`;
}
const fuenteResumen = Object.entries(porFuente).map(([k, v]) => `${k}: ${v}`).join(' · ');
html += `<hr style="border:none;border-top:1px solid #eee;margin:20px 0">`;
html += `<p style="font-size:11px;color:#999">Encontradas por fuente — ${esc(fuenteResumen)}.${errores.length ? ' Fuentes con error: ' + esc(errores.join('; ')) + '.' : ''}</p>`;
html += `<p style="font-size:11px;color:#999">Generado automáticamente con n8n. Postula pronto: las vacantes de practicante se cierran rápido.</p></div>`;

const asunto = `🔧 ${nuevas.length} nueva(s) vacante(s) practicante/junior — ${hoy}`;

return [{ json: { hayNuevas: true, totalNuevas: nuevas.length, asunto, html, fecha: hoy, porFuente, errores } }];
