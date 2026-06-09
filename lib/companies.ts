// Metadatos de cada empresa: sector, país, método de obtención de vacantes
// (verificado el 2026-06-09), fiabilidad y links. Alimenta la sección
// "Empresas y fuentes" del frontend y documenta cómo el scraper consigue cada una.

export type Sector = "Energía" | "Minería" | "Automatización";
export type Reliability = "solida" | "parcial" | "respaldo";
export type CountryCode = "PE" | "AU";

export interface Company {
  key: string;
  name: string;
  sector: Sector;
  countries: CountryCode[];
  ats: string; // plataforma de reclutamiento
  method: string; // cómo el scraper obtiene las vacantes
  reliability: Reliability;
  careersUrl: string; // página oficial de empleos
  links: { label: string; url: string }[]; // links útiles (fallbacks, programas)
}

export const COMPANIES: Company[] = [
  {
    key: "abb",
    name: "ABB",
    sector: "Automatización",
    countries: ["PE", "AU"],
    ats: "Phenom + Workday",
    method:
      "API JSON de Phenom (POST a careers.abb/widgets) con filtro de país. Devuelve las vacantes locales limpias y su link de postulación.",
    reliability: "solida",
    careersUrl: "https://careers.abb/global/en/search-results",
    links: [
      { label: "Portal de empleos ABB", url: "https://careers.abb/global/en/search-results" },
      { label: "ABB en LinkedIn", url: "https://www.linkedin.com/jobs/search/?keywords=ABB" },
    ],
  },
  {
    key: "rockwell",
    name: "Rockwell Automation",
    sector: "Automatización",
    countries: ["PE", "AU"],
    ats: "Workday",
    method:
      "API JSON de Workday (CXS). Se piden las vacantes y se filtran por ubicación del país elegido. También se revisa el portal Early Careers (practicantes y recién egresados).",
    reliability: "solida",
    careersUrl: "https://rockwellautomation.wd1.myworkdayjobs.com/External_Rockwell_Automation",
    links: [
      {
        label: "Portal principal (Workday)",
        url: "https://rockwellautomation.wd1.myworkdayjobs.com/External_Rockwell_Automation",
      },
      {
        label: "Early Careers",
        url: "https://rockwellautomation.wd1.myworkdayjobs.com/External-Rockwell-Automation-Early-Careers",
      },
    ],
  },
  {
    key: "schneider",
    name: "Schneider Electric",
    sector: "Automatización",
    countries: ["PE", "AU"],
    ats: "Eightfold AI",
    method:
      "API JSON de Eightfold por palabra clave (intern, junior, maintenance, automation…). Se filtra el país del lado del servidor.",
    reliability: "parcial",
    careersUrl: "https://careers.se.com/global/jobs",
    links: [
      { label: "Portal de empleos Schneider", url: "https://careers.se.com/global/jobs" },
      { label: "Schneider en LinkedIn", url: "https://www.linkedin.com/jobs/search/?keywords=Schneider%20Electric" },
    ],
  },
  {
    key: "siemens",
    name: "Siemens",
    sector: "Automatización",
    countries: ["PE", "AU"],
    ats: "Avature",
    method:
      "Avature no expone una API JSON pública. Se usa la API guest de LinkedIn filtrada por país como respaldo. Puede ser bloqueada desde IPs de servidor.",
    reliability: "respaldo",
    careersUrl: "https://jobs.siemens.com/en_US/externaljobs/SearchJobs",
    links: [
      { label: "Portal de empleos Siemens", url: "https://jobs.siemens.com/en_US/externaljobs/SearchJobs" },
      { label: "Siemens Energy", url: "https://jobs.siemens-energy.com/en_US/jobs/Jobs" },
    ],
  },
  {
    key: "isarep",
    name: "ISA REP",
    sector: "Energía",
    countries: ["PE"],
    ats: "HiringRoom",
    method:
      "API JSON de HiringRoom (POST getVacanciesForPortal). Devuelve las vacantes con su ID estable y link directo.",
    reliability: "solida",
    careersUrl: "https://rep.hiringroom.com/jobs/",
    links: [
      { label: "Portal de empleos ISA REP", url: "https://rep.hiringroom.com/jobs/" },
      { label: "Portal grupo ISA", url: "https://jobs.isa.co/go/RED-DE-ENERGIA-DEL-PERU/9131000/" },
    ],
  },
  {
    key: "southern",
    name: "Southern Copper",
    sector: "Minería",
    countries: ["PE"],
    ats: "CAPPER (propio) + HiringRoom",
    method:
      "Doble fuente: API JSON del portal propio CAPPER (puestos y practicantes) y, como respaldo, la API de HiringRoom. Se unen y se quitan repetidos.",
    reliability: "solida",
    careersUrl: "https://southerncoppercorp.com/bolsa-de-trabajo/",
    links: [
      { label: "Bolsa de trabajo (CAPPER)", url: "https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx?tipo=1" },
      { label: "Practicantes (CAPPER tipo 2)", url: "https://capper.southernperu.com.pe/capper/ListadoOfertas.aspx?tipo=2" },
      { label: "Portal HiringRoom", url: "https://southernperu.hiringroom.com/jobs" },
    ],
  },
  {
    key: "cerroverde",
    name: "Cerro Verde",
    sector: "Minería",
    countries: ["PE"],
    ats: "HiringRoom",
    method:
      "API JSON de HiringRoom (misma que ISA REP). Aquí se publica el programa de Becarios; se extraen IDs y links de cada vacante.",
    reliability: "solida",
    careersUrl: "https://cerroverde.hiringroom.com/jobs",
    links: [
      { label: "Portal de empleos Cerro Verde", url: "https://cerroverde.hiringroom.com/jobs" },
      { label: "Trabaja con nosotros", url: "https://www.cerroverde.pe/mineria-cobre-molibdeno-arequipa-minera-trabaja-con-nosotros" },
    ],
  },
  {
    key: "antamina",
    name: "Antamina",
    sector: "Minería",
    countries: ["PE"],
    ats: "SAP SuccessFactors (Más Talento)",
    method:
      "Tiles HTML de SuccessFactors (tile-search-results). Cada vacante trae un ID numérico estable y su link.",
    reliability: "solida",
    careersUrl: "https://mastalento.antamina.com/",
    links: [
      { label: "Portal Más Talento Antamina", url: "https://mastalento.antamina.com/" },
      { label: "Antamina en LinkedIn", url: "https://pe.linkedin.com/jobs/antamina-empleos" },
    ],
  },
  {
    key: "lasbambas",
    name: "Las Bambas (MMG)",
    sector: "Minería",
    countries: ["PE"],
    ats: "PageUp People",
    method:
      "Se lee el sitemap.xml de careers.mmg.com (esquiva el bloqueo WAF). Se filtran las URLs con ubicación Perú/Apurímac y se deduce título y link.",
    reliability: "solida",
    careersUrl: "https://careers.mmg.com/caw/es/listing",
    links: [
      { label: "Portal de empleos MMG", url: "https://careers.mmg.com/caw/es/listing" },
      { label: "Trabaja con nosotros", url: "https://www.lasbambas.com/seccion-trabaja-con-nosotros" },
    ],
  },
  {
    key: "engie",
    name: "ENGIE Energía Perú",
    sector: "Energía",
    countries: ["PE"],
    ats: "SAP SuccessFactors",
    method:
      "SuccessFactors no expone una API JSON pública sin credenciales. Se usa la API guest de LinkedIn filtrada a Perú como respaldo.",
    reliability: "respaldo",
    careersUrl: "https://jobs.engie.com/search/?locationsearch=Peru",
    links: [
      { label: "Portal de empleos ENGIE", url: "https://jobs.engie.com/search/?locationsearch=Peru" },
      { label: "ENGIE en LinkedIn", url: "https://www.linkedin.com/company/engie/jobs/" },
    ],
  },
  {
    key: "kallpa",
    name: "Kallpa Generación",
    sector: "Energía",
    countries: ["PE"],
    ats: "Formulario propio (sin ATS)",
    method:
      "El sitio oficial solo tiene un formulario de CV para banco de talento. Se usa la API guest de LinkedIn filtrada a Perú.",
    reliability: "respaldo",
    careersUrl: "https://kallpageneracion.com.pe/unete-a-nosotros/",
    links: [
      { label: "Únete a nosotros", url: "https://kallpageneracion.com.pe/unete-a-nosotros/" },
      { label: "Kallpa en LinkedIn", url: "https://pe.linkedin.com/jobs/kallpa-empleos" },
    ],
  },
  {
    key: "electroperu",
    name: "Electroperú",
    sector: "Energía",
    countries: ["PE"],
    ats: "SharePoint (convocatorias PDF)",
    method:
      "Sitio SharePoint estatal que publica convocatorias como PDF. El scraper detecta los PDFs nuevos en la página de Ofertas Laborales.",
    reliability: "respaldo",
    careersUrl: "http://www.electroperu.com.pe/SitePages/Ofertas%20Laborales.aspx",
    links: [
      { label: "Ofertas Laborales (SharePoint)", url: "http://www.electroperu.com.pe/SitePages/Ofertas%20Laborales.aspx" },
      { label: "Electroperú en LinkedIn", url: "https://pe.linkedin.com/jobs/electroperu-s.a-empleos" },
    ],
  },
];
