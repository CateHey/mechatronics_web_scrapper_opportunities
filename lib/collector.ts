// Motor de recolección de vacantes. Consulta cada empresa por su fuente oficial,
// en paralelo y con tolerancia a fallos. Soporta Perú y Australia.
// Verificado el 2026-06-09.

export type Country = "PE" | "AU";

export const COUNTRY: Record<Country, { name: string; flag: string; label: string; regex: RegExp }> = {
  PE: {
    name: "Peru",
    flag: "🇵🇪",
    label: "Perú",
    regex: /peru|per[uú]|lima|apurimac|arequipa|cusco|cuzco|moquegua|tacna|ancash|ica|junin|callao/i,
  },
  AU: {
    name: "Australia",
    flag: "🇦🇺",
    label: "Australia",
    regex:
      /australia|perth|sydney|melbourne|brisbane|adelaide|canberra|queensland|western australia|new south wales|victoria|\bnsw\b|\bqld\b|\bwa\b|\bvic\b|\bsa\b|\bnt\b/i,
  },
};

export interface Job {
  company: string;
  country: Country;
  id: string;
  title: string;
  url: string;
  location: string;
  nivel: boolean;
  dominio: boolean;
}

export interface CollectResult {
  jobs: Job[];
  perSource: Record<string, number | "error">;
  errors: string[];
  generatedAt: string;
  country: Country;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const NIVEL =
  /practic|pre.?profes|trainee|junior|jr\b|j[oó]ven|becari|egresad|intern|aprendiz|reci[eé]n|graduate|vacation program|vacationer|cadet|early career/i;
const DOMINIO =
  /mecatr|mantenim|instrument|automatiz|automation|control|el[eé]ctr|electr|confiab|reliab|mec[aá]nic|mechanic|plc|scada|rob[oó]t|proces/i;

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const stripTags = (s: string) =>
  (s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const slugToTitle = (slug: string) => {
  try {
    slug = decodeURIComponent(slug);
  } catch {}
  return slug
    .replace(/\.html?$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface FetchOpts {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}
async function http(url: string, opts: FetchOpts = {}): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? 12000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: { "User-Agent": UA, ...(opts.headers ?? {}) },
      body: opts.body,
      signal: ctrl.signal,
    });
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}
async function httpJson(url: string, opts: FetchOpts = {}): Promise<any> {
  return JSON.parse(await http(url, opts));
}

type Raw = { id: string; title: string; url: string; location?: string };

// ---- HiringRoom genérico (PE: ISA REP, Southern, Cerro Verde) ----
async function hiringRoom(subdomain: string): Promise<Raw[]> {
  const data = await httpJson(`https://${subdomain}.hiringroom.com/jobs/getVacanciesForPortal/1`, {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
    body: "typePortal=external&selectedPage=1",
  });
  const html: string = data?.data?.htmlContent || "";
  const out: Raw[] = [];
  for (const block of html.split(/<a href="\/jobs\/get_vacancy\//).slice(1)) {
    const id = block.match(/^([^"\/?]+)/)?.[1];
    if (!id) continue;
    const title = stripTags(block.match(/name__vacancy">\s*([\s\S]*?)<\/h4>/)?.[1] || "");
    const loc = stripTags(block.match(/Location-pin[\s\S]*?<\/i>\s*([\s\S]*?)<\/span>/)?.[1] || "");
    out.push({
      id,
      title: title || id,
      url: `https://${subdomain}.hiringroom.com/jobs/get_vacancy/${id}`,
      location: loc,
    });
  }
  return out;
}

// ---- Antamina (PE, SuccessFactors RMK) ----
async function antamina(): Promise<Raw[]> {
  const html = await http("https://mastalento.antamina.com/tile-search-results/?data=1");
  const out: Raw[] = [];
  const re = /class="[^"]*job-id-(\d+)[^"]*"[^>]*data-url="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = (m[2].split("/job/")[1] || "").split("/")[0];
    out.push({ id: m[1], title: slugToTitle(slug), url: "https://mastalento.antamina.com" + m[2] });
  }
  return out;
}

// ---- Southern Copper — CAPPER (PE, JSON propio) ----
async function capper(): Promise<Raw[]> {
  const out: Raw[] = [];
  for (const tipo of ["1", "2"]) {
    try {
      const res = await httpJson("https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx/GetListOfertas", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ tipo }),
      });
      let d = res?.d;
      if (typeof d === "string") d = JSON.parse(d);
      let lst = d?.lstOfertas;
      if (typeof lst === "string") lst = JSON.parse(lst);
      const arr: any[] = Array.isArray(lst) ? lst : lst ? Object.values(lst) : [];
      for (const o of arr) {
        const id = o.IdOferta || o.idOferta || o.Id || o.codigo || JSON.stringify(o).slice(0, 40);
        const title = o.Titulo || o.titulo || o.NombrePuesto || o.Puesto || o.descripcion || "";
        out.push({
          id: String(id),
          title,
          url: "https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx?tipo=" + tipo,
          location: o.Lugar || o.Ubicacion || "",
        });
      }
    } catch {}
  }
  return out;
}

// ---- MMG sitemap (PE: Las Bambas · AU: Dugald River, Melbourne…) ----
async function mmg(regex: RegExp): Promise<Raw[]> {
  const xml = await http("https://careers.mmg.com/sitemap.xml");
  const out: Raw[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1].trim();
    if (!/\/jobs\//i.test(url)) continue;
    if (!regex.test(url)) continue;
    const slug = url.split("/jobs/")[1].replace(/\/$/, "");
    out.push({ id: url, title: slugToTitle(slug), url, location: slug.split("-").slice(-3).join(" ") });
  }
  return out;
}

// ---- ABB (Phenom widgets, filtro por país) ----
async function abb(countryName: string): Promise<Raw[]> {
  const res = await httpJson("https://careers.abb/widgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lang: "en_global",
      deviceType: "desktop",
      country: "global",
      pageName: "search-results",
      ddoKey: "refineSearch",
      sortBy: "",
      subsearch: "",
      from: 0,
      jobs: true,
      counts: true,
      all_fields: ["category", "country", "state", "city"],
      size: 50,
      keywords: "",
      global: true,
      selected_fields: { country: [countryName] },
      locationData: {},
    }),
  });
  const list: any[] = res?.refineSearch?.data?.jobs || [];
  return list.map((j) => ({
    id: String(j.jobId || j.reqId || j.jobSeqNo || j.applyUrl),
    title: j.title,
    url: j.applyUrl || j.jobUrl || "https://careers.abb/global/en/search-results",
    location: (j.multi_location && j.multi_location[0]) || j.state || j.city || countryName,
  }));
}

// ---- Workday CXS (Rockwell) ----
async function workday(tenant: string, site: string, countryName: string, regex: RegExp): Promise<Raw[]> {
  const res = await httpJson(`https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: countryName }),
  });
  const list: any[] = res?.jobPostings || [];
  return list
    .filter((j) => regex.test(j.locationsText || ""))
    .map((j) => ({
      id: j.externalPath || (j.bulletFields && j.bulletFields[0]) || j.title,
      title: j.title,
      url: `https://${tenant}.wd1.myworkdayjobs.com/en-US/${site}` + (j.externalPath || ""),
      location: j.locationsText || countryName,
    }));
}

// ---- Schneider (Eightfold, filtro por país en cliente) ----
async function schneider(regex: RegExp): Promise<Raw[]> {
  const out: Raw[] = [];
  const kws = ["intern", "junior", "graduate", "maintenance", "automation", "control"];
  for (const kw of kws) {
    try {
      const res = await httpJson(
        `https://careers.se.com/api/jobs?query=${encodeURIComponent(kw)}&start=0&num=10&sort_by=timestamp`
      );
      const list: any[] = res?.positions || res?.jobs || res?.data || [];
      for (const j of list) {
        const loc = j.location || j?.data?.full_location || j.full_location || "";
        if (!regex.test(loc)) continue;
        out.push({
          id: String(j.id || j.display_job_id || j.canonicalPositionUrl),
          title: j.name || j.title || j?.data?.title || "",
          url: j.canonicalPositionUrl || j.absolute_url || "https://careers.se.com/global/jobs",
          location: loc,
        });
      }
    } catch {}
  }
  return out;
}

// ---- LinkedIn guest API (respaldo) ----
async function linkedin(query: string, location: string): Promise<Raw[]> {
  const html = await http(
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
      query
    )}&location=${encodeURIComponent(location)}&start=0`
  );
  const out: Raw[] = [];
  const re =
    /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title">\s*([\s\S]*?)<\/h3>[\s\S]*?base-card__full-link"\s*href="([^"?]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({ id: m[1], title: stripTags(m[2]), url: m[3] });
  }
  return out;
}

// ---- Electroperú (PE, SharePoint PDFs) ----
async function electroperu(): Promise<Raw[]> {
  const html = await http("http://www.electroperu.com.pe/SitePages/Ofertas%20Laborales.aspx");
  const out: Raw[] = [];
  const re = /href="([^"]+\.pdf)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let url = m[1];
    if (!/^https?:/i.test(url)) url = "http://www.electroperu.com.pe" + (url.startsWith("/") ? "" : "/") + url;
    const name = (url.split("/").pop() || "").replace(/%20/g, " ");
    out.push({ id: url, title: slugToTitle(name), url });
  }
  return out;
}

function sourcesFor(country: Country): { company: string; fn: () => Promise<Raw[]> }[] {
  const C = COUNTRY[country];
  const global = [
    { company: "ABB", fn: () => abb(C.name) },
    { company: "Rockwell Automation", fn: () => workday("rockwellautomation", "External_Rockwell_Automation", C.name, C.regex) },
    { company: "Schneider Electric", fn: () => schneider(C.regex) },
    { company: "Siemens", fn: () => linkedin("Siemens", C.name) },
  ];
  if (country === "PE") {
    return [
      ...global,
      { company: "ISA REP", fn: () => hiringRoom("rep") },
      { company: "Southern Copper", fn: () => hiringRoom("southernperu") },
      { company: "Southern Copper", fn: () => capper() },
      { company: "Cerro Verde", fn: () => hiringRoom("cerroverde") },
      { company: "Antamina", fn: () => antamina() },
      { company: "Las Bambas (MMG)", fn: () => mmg(C.regex) },
      { company: "ENGIE Energía Perú", fn: () => linkedin("ENGIE", "Peru") },
      { company: "Kallpa Generación", fn: () => linkedin("Kallpa Generacion", "Peru") },
      { company: "Electroperú", fn: () => electroperu() },
    ];
  }
  return [
    ...global,
    { company: "MMG", fn: () => mmg(C.regex) },
    { company: "BHP", fn: () => linkedin("BHP", "Australia") },
    { company: "Rio Tinto", fn: () => linkedin("Rio Tinto", "Australia") },
    { company: "Fortescue", fn: () => linkedin("Fortescue", "Australia") },
    { company: "Woodside Energy", fn: () => linkedin("Woodside Energy", "Australia") },
  ];
}

export async function collect(country: Country = "PE"): Promise<CollectResult> {
  const SOURCES = sourcesFor(country);
  const perSource: Record<string, number | "error"> = {};
  const errors: string[] = [];
  const seen = new Set<string>();
  const jobs: Job[] = [];

  // Inicializa todas las empresas en 0 para que el panel de cobertura las muestre todas.
  for (const s of SOURCES) if (!(s.company in perSource)) perSource[s.company] = 0;

  const results = await Promise.allSettled(SOURCES.map((s) => s.fn()));

  results.forEach((r, i) => {
    const company = SOURCES[i].company;
    if (r.status === "rejected") {
      errors.push(`${company}: ${r.reason?.message || r.reason}`);
      if (perSource[company] === 0) perSource[company] = "error";
      return;
    }
    let count = 0;
    for (const raw of r.value) {
      if (!raw || !raw.title) continue;
      const t = norm(raw.title);
      const key = company + "::" + raw.id;
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push({
        company,
        country,
        id: raw.id,
        title: stripTags(raw.title),
        url: raw.url || "",
        location: raw.location || "",
        nivel: NIVEL.test(t),
        dominio: DOMINIO.test(t),
      });
      count++;
    }
    if (typeof perSource[company] === "number") perSource[company] = (perSource[company] as number) + count;
  });

  // Orden: mecatrónica primero, luego practicante/junior, luego por empresa.
  jobs.sort(
    (a, b) =>
      Number(b.dominio) - Number(a.dominio) ||
      Number(b.nivel) - Number(a.nivel) ||
      a.company.localeCompare(b.company)
  );
  return { jobs, perSource, errors, generatedAt: new Date().toISOString(), country };
}
