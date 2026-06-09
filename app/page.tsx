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

const COUNTRIES: { code: CountryCode; flag: string; label: string }[] = [
  { code: "PE", flag: "🇵🇪", label: "Perú" },
  { code: "AU", flag: "🇦🇺", label: "Australia" },
];
const SECTORS: (Sector | "Todos")[] = ["Todos", "Automatización", "Minería", "Energía"];
const SECTOR_EMOJI: Record<string, string> = {
  Automatización: "⚙️",
  Minería: "⛏️",
  Energía: "⚡",
};
const RELIABILITY_LABEL: Record<string, string> = {
  solida: "Fuente sólida",
  parcial: "Fuente parcial",
  respaldo: "Respaldo (puede fallar)",
};
const sectorByCompany = new Map<string, Sector>(COMPANIES.map((c) => [c.name, c.sector]));

export default function Page() {
  const [tab, setTab] = useState<"vacantes" | "empresas">("vacantes");
  const [country, setCountry] = useState<CountryCode>("PE");
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | "Todos">("Todos");
  const [onlyMech, setOnlyMech] = useState(false);

  async function run(c: CountryCode = country) {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?country=${c}&mecatronica=0`);
      setData((await res.json()) as ApiResult);
    } catch {
      setData({ jobs: [], perSource: {}, errors: ["No se pudo conectar"], generatedAt: "", country: c, error: "fetch" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeCountry(c: CountryCode) {
    if (c === country) return;
    setCountry(c);
    setSector("Todos");
    run(c);
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.jobs.filter((j) => {
      if (onlyMech && !j.dominio) return false;
      if (sector !== "Todos" && sectorByCompany.get(j.company) !== sector) return false;
      if (!q) return true;
      return (j.title + " " + j.company + " " + j.location).toLowerCase().includes(q);
    });
  }, [data, query, onlyMech, sector]);

  const grouped = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of filtered) {
      if (!m.has(j.company)) m.set(j.company, []);
      m.get(j.company)!.push(j);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const mechCount = filtered.filter((j) => j.dominio).length;
  const companiesForCountry = COMPANIES.filter((c) => c.countries.includes(country));
  let jobIndex = 0;

  return (
    <div className="wrap">
      <div className="bg-orbs" aria-hidden />
      <header className="hero">
        <div className="pill-top">⚡ En vivo desde las fuentes oficiales</div>
        <h1>Vacantes Mecatrónica</h1>
        <p>
          Practicantes y junior en las mejores empresas de <b>energía</b>, <b>minería</b> y{" "}
          <b>automatización industrial</b>. Elige tu país y busca en tiempo real.
        </p>

        <div className="country-switch">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              className={`country ${country === c.code ? "active" : ""}`}
              onClick={() => changeCountry(c.code)}
            >
              <span className="flag">{c.flag}</span> {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === "vacantes" ? "active" : ""}`} onClick={() => setTab("vacantes")}>
          🔧 Vacantes
        </button>
        <button className={`tab ${tab === "empresas" ? "active" : ""}`} onClick={() => setTab("empresas")}>
          🏢 Empresas y fuentes
        </button>
      </div>

      {tab === "vacantes" && (
        <>
          <div className="controls">
            <button className="btn" onClick={() => run()} disabled={loading}>
              {loading ? "Buscando…" : "🔄 Actualizar"}
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
          </div>

          <div className="chips">
            {SECTORS.map((s) => (
              <button key={s} className={`chip ${sector === s ? "active" : ""}`} onClick={() => setSector(s)}>
                {s !== "Todos" && SECTOR_EMOJI[s]} {s}
              </button>
            ))}
          </div>

          {data && !loading && (
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
                <div className="num">{grouped.length}</div>
                <div className="lbl">empresas</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="state">
              <div className="spinner" />
              Consultando empresa por empresa… (puede tardar ~15–30 s)
            </div>
          )}

          {!loading && data && data.errors.length > 0 && (
            <div className="note">
              ⚠️ Algunas fuentes no respondieron (suele ser LinkedIn bloqueando IPs de servidor):{" "}
              {data.errors.map((e) => e.split(":")[0]).join(", ")}. El resto sí se consultó.
            </div>
          )}

          {!loading && data && filtered.length === 0 && (
            <div className="state">
              😶 No hay vacantes de practicante/junior con esos filtros ahora mismo.
              <br />
              Prueba quitar filtros, cambiar de país, o revisa “Empresas y fuentes”.
            </div>
          )}

          {!loading &&
            grouped.map(([company, jobs]) => {
              const sec = sectorByCompany.get(company);
              return (
                <div className="group" key={company}>
                  <div className="group-head">
                    <h3>{company}</h3>
                    {sec && <span className={`badge ${sec}`}>{SECTOR_EMOJI[sec]} {sec}</span>}
                    <span className="count-pill">{jobs.length}</span>
                  </div>
                  {jobs.map((j) => (
                    <div
                      className="job"
                      key={j.id}
                      style={{ animationDelay: `${Math.min(jobIndex++ * 0.03, 0.6)}s` }}
                    >
                      <div>
                        <div className="title">
                          {j.dominio && <span className="star">⭐ </span>}
                          {j.title}
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
            Cómo este buscador obtiene las vacantes de cada empresa en{" "}
            <b>{COUNTRIES.find((c) => c.code === country)?.label}</b> y los links oficiales para postular.
          </p>
          <div className="companies-grid">
            {companiesForCountry.map((c) => (
              <div className={`ccard ${c.sector}`} key={c.key}>
                <div className="top">
                  <h4>{c.name}</h4>
                  <span className={`badge ${c.sector}`}>{SECTOR_EMOJI[c.sector]} {c.sector}</span>
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
