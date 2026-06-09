"use client";

import { useEffect, useMemo, useState } from "react";
import { COMPANIES, type Sector, type CountryCode } from "@/lib/companies";

interface Job {
  company: string;
  country: CountryCode;
  id: string;
  title: string;
  url: string;
  location: string;
  nivel: boolean;
  dominio: boolean;
}
interface ApiResult {
  jobs: Job[];
  perSource: Record<string, number | "error">;
  errors: string[];
  generatedAt: string;
  country: CountryCode;
  error?: string;
}

type Tab = "PE" | "AU" | "empresas";

const SECTORS: (Sector | "Todos")[] = ["Todos", "Automatización", "Minería", "Energía"];
const SECTOR_EMOJI: Record<string, string> = { Automatización: "⚙️", Minería: "⛏️", Energía: "⚡" };
const FLAG: Record<CountryCode, string> = { PE: "🇵🇪", AU: "🇦🇺" };
const COUNTRY_LABEL: Record<CountryCode, string> = { PE: "Perú", AU: "Australia" };
const RELIABILITY_LABEL: Record<string, string> = {
  solida: "Fuente sólida",
  parcial: "Fuente parcial",
  respaldo: "Respaldo (puede fallar)",
};
const sectorByCompany = new Map<string, Sector>(COMPANIES.map((c) => [c.name, c.sector]));

export default function Page() {
  const [tab, setTab] = useState<Tab>("PE");
  const [cache, setCache] = useState<Partial<Record<CountryCode, ApiResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<CountryCode, boolean>>>({});
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | "Todos">("Todos");
  const [onlyMech, setOnlyMech] = useState(false);
  const [onlyNivel, setOnlyNivel] = useState(false);

  async function run(c: CountryCode) {
    setLoading((l) => ({ ...l, [c]: true }));
    try {
      const res = await fetch(`/api/jobs?country=${c}&mecatronica=0`);
      const json = (await res.json()) as ApiResult;
      setCache((p) => ({ ...p, [c]: json }));
    } catch {
      setCache((p) => ({
        ...p,
        [c]: { jobs: [], perSource: {}, errors: ["No se pudo conectar"], generatedAt: "", country: c, error: "fetch" },
      }));
    } finally {
      setLoading((l) => ({ ...l, [c]: false }));
    }
  }

  useEffect(() => {
    run("PE");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTab(t: Tab) {
    setTab(t);
    setQuery("");
    setSector("Todos");
    if ((t === "PE" || t === "AU") && !cache[t] && !loading[t]) run(t);
  }

  const country: CountryCode = tab === "AU" ? "AU" : "PE";
  const data = cache[country] ?? null;
  const isLoading = !!loading[country];

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.jobs.filter((j) => {
      if (onlyMech && !j.dominio) return false;
      if (onlyNivel && !j.nivel) return false;
      if (sector !== "Todos" && sectorByCompany.get(j.company) !== sector) return false;
      if (!q) return true;
      return (j.title + " " + j.company + " " + j.location).toLowerCase().includes(q);
    });
  }, [data, query, onlyMech, onlyNivel, sector]);

  const grouped = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of filtered) {
      if (!m.has(j.company)) m.set(j.company, []);
      m.get(j.company)!.push(j);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const mechCount = filtered.filter((j) => j.dominio).length;
  const nivelCount = filtered.filter((j) => j.nivel).length;
  const coverage = data ? Object.entries(data.perSource) : [];
  let jobIndex = 0;

  return (
    <div className="wrap">
      <div className="bg-orbs" aria-hidden />
      <header className="hero">
        <div className="pill-top">⚡ En vivo desde las fuentes oficiales</div>
        <h1>Vacantes Mecatrónica</h1>
        <p>
          Practicantes y junior en las mejores empresas de <b>energía</b>, <b>minería</b> y{" "}
          <b>automatización industrial</b>. Busca en tiempo real.
        </p>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === "PE" ? "active" : ""}`} onClick={() => selectTab("PE")}>
          🇵🇪 Vacantes Perú
        </button>
        <button className={`tab ${tab === "AU" ? "active" : ""}`} onClick={() => selectTab("AU")}>
          🇦🇺 Vacantes Australia
        </button>
        <button className={`tab ${tab === "empresas" ? "active" : ""}`} onClick={() => selectTab("empresas")}>
          🏢 Empresas y fuentes
        </button>
      </div>

      {(tab === "PE" || tab === "AU") && (
        <>
          <div className="controls">
            <button className="btn" onClick={() => run(country)} disabled={isLoading}>
              {isLoading ? "Buscando…" : "🔄 Actualizar"}
            </button>
            <input
              className="input"
              placeholder="Filtrar: cargo, empresa, ciudad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="check">
              <input type="checkbox" checked={onlyMech} onChange={(e) => setOnlyMech(e.target.checked)} />
              Solo mecatrónica ⭐
            </label>
            <label className="check">
              <input type="checkbox" checked={onlyNivel} onChange={(e) => setOnlyNivel(e.target.checked)} />
              Solo practicante/junior 🎓
            </label>
          </div>

          <div className="chips">
            {SECTORS.map((s) => (
              <button key={s} className={`chip ${sector === s ? "active" : ""}`} onClick={() => setSector(s)}>
                {s !== "Todos" && SECTOR_EMOJI[s]} {s}
              </button>
            ))}
          </div>

          {data && !isLoading && (
            <div className="stats">
              <div className="stat">
                <div className="num">{filtered.length}</div>
                <div className="lbl">vacantes</div>
              </div>
              <div className="stat gold">
                <div className="num">{mechCount}</div>
                <div className="lbl">mecatrónica ⭐</div>
              </div>
              <div className="stat">
                <div className="num">{nivelCount}</div>
                <div className="lbl">practicante/junior 🎓</div>
              </div>
              <div className="stat">
                <div className="num">{grouped.length}</div>
                <div className="lbl">empresas</div>
              </div>
            </div>
          )}

          {data && !isLoading && (
            <div className="coverage">
              <div className="coverage-title">
                Cobertura — consultamos {coverage.length} empresas en {COUNTRY_LABEL[country]}, una por una:
              </div>
              <div className="coverage-grid">
                {coverage.map(([name, n]) => (
                  <span
                    key={name}
                    className={`cov ${n === "error" ? "err" : n === 0 ? "zero" : "ok"}`}
                    title={n === "error" ? "La fuente no respondió" : `${n} vacante(s)`}
                  >
                    {name} <b>{n === "error" ? "⚠" : n}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="state">
              <div className="spinner" />
              Consultando empresa por empresa en {COUNTRY_LABEL[country]}… (puede tardar ~15–30 s)
            </div>
          )}

          {!isLoading && data && data.errors.length > 0 && (
            <div className="note">
              ⚠️ Algunas fuentes no respondieron (suele ser LinkedIn bloqueando IPs de servidor):{" "}
              {data.errors.map((e) => e.split(":")[0]).join(", ")}. El resto sí se consultó.
            </div>
          )}

          {tab === "AU" && !isLoading && data && (
            <div className="note">
              🇦🇺 Australia es experimental: usa las APIs de ABB, Rockwell, Schneider y MMG (sólidas) más LinkedIn
              para BHP, Rio Tinto, Fortescue y Woodside (este último puede venir vacío desde el servidor).
            </div>
          )}

          {!isLoading && data && filtered.length === 0 && (
            <div className="state">
              😶 No hay vacantes de practicante/junior con esos filtros ahora mismo en {COUNTRY_LABEL[country]}.
              <br />
              Prueba quitar filtros o revisa “Empresas y fuentes”.
            </div>
          )}

          {!isLoading &&
            grouped.map(([company, jobs]) => {
              const sec = sectorByCompany.get(company);
              return (
                <div className="group" key={company}>
                  <div className="group-head">
                    <h3>{company}</h3>
                    {sec && (
                      <span className={`badge ${sec}`}>
                        {SECTOR_EMOJI[sec]} {sec}
                      </span>
                    )}
                    <span className="count-pill">{jobs.length}</span>
                  </div>
                  {jobs.map((j) => (
                    <div className="job" key={j.id} style={{ animationDelay: `${Math.min(jobIndex++ * 0.03, 0.6)}s` }}>
                      <div>
                        <div className="title">
                          {j.dominio && <span className="star">⭐ </span>}
                          {j.title}
                          {j.nivel && <span className="tag-nivel">🎓 practicante/junior</span>}
                        </div>
                        <div className="meta">📍 {j.location || company}</div>
                      </div>
                      {j.url && (
                        <a className="apply" href={j.url} target="_blank" rel="noopener noreferrer">
                          Postular →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
        </>
      )}

      {tab === "empresas" && (
        <>
          <p style={{ color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>
            Cómo este buscador obtiene las vacantes de cada empresa (verificado el 09/06/2026) y los links
            oficiales para postular.
          </p>
          <div className="companies-grid">
            {COMPANIES.map((c) => (
              <div className={`ccard ${c.sector}`} key={c.key}>
                <div className="top">
                  <h4>
                    {c.name} {c.countries.map((cc) => FLAG[cc]).join(" ")}
                  </h4>
                  <span className={`badge ${c.sector}`}>
                    {SECTOR_EMOJI[c.sector]} {c.sector}
                  </span>
                </div>
                <p className="ats">
                  <span className="rel">
                    <span className={`dot ${c.reliability}`} /> {RELIABILITY_LABEL[c.reliability]}
                  </span>{" "}
                  · {c.ats}
                </p>
                <p className="method">{c.method}</p>
                <div className="links">
                  {c.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="footer">
        Hecho para mecatrónicos · Vacantes consultadas en vivo desde las fuentes oficiales de cada empresa.
        <br />
        Incluye además un workflow de n8n para recibir las vacantes nuevas por correo (ver repositorio).
      </div>
    </div>
  );
}
