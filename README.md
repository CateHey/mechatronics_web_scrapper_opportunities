# 🔧 mechatronics_web_scrapper_opportunities

Buscador de **vacantes practicante / junior de mecatrónica** en las mejores empresas
de **energía, minería y automatización industrial** de Perú. Consulta cada empresa en
su **fuente oficial en tiempo real** (Workday, SuccessFactors, HiringRoom, sitemap…),
sin depender de agregadores tipo Jooble.

🌐 **Web app (Next.js, lista para Vercel)** — frontend para ver y ejecutar la búsqueda,
con el detalle de cómo se obtiene cada empresa y sus links.
📧 **Workflow de n8n** — opcional, envía las vacantes nuevas por correo cada día.

## Empresas cubiertas

| Sector | Empresas |
|---|---|
| Automatización | ABB · Rockwell Automation · Schneider Electric · Siemens |
| Minería | Antamina · Cerro Verde · Las Bambas (MMG) · Southern Copper |
| Energía | ISA REP · ENGIE · Kallpa · Electroperú |

Fiabilidad por fuente (verificado el 2026-06-09): **sólidas** ABB, Rockwell, ISA REP,
Antamina, Southern, Cerro Verde, Las Bambas · **parcial** Schneider · **respaldo**
(LinkedIn/SharePoint, pueden fallar desde IP de servidor) Siemens, ENGIE, Kallpa, Electroperú.

---

## 🚀 Desplegar en Vercel

**Opción A — desde la web (1 clic):**
1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repo
   `CateHey/mechatronics_web_scrapper_opportunities`.
2. Framework: **Next.js** (autodetectado). No requiere variables de entorno.
3. **Deploy**. Listo.

**Opción B — desde la terminal:**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # producción
```

---

## 💻 Desarrollo local

```bash
npm install
npm run dev    # http://localhost:3000
```

### Estructura
```
app/
  page.tsx            # frontend (pestañas Vacantes / Empresas y fuentes)
  api/jobs/route.ts   # API serverless que ejecuta el scraper
  globals.css         # estilos
lib/
  collector.ts        # motor de scraping (una fuente por empresa, en paralelo)
  companies.ts        # metadatos: cómo se obtiene cada empresa + links
n8n-vacantes-peru.json # workflow de n8n para envío por correo (opcional)
collector.js           # versión del scraper para el nodo Code de n8n
README-n8n.md          # guía de instalación del envío por correo
```

### Cómo ajustar qué vacantes salen
En [`lib/collector.ts`](lib/collector.ts), arriba:
- `NIVEL` — palabras que definen practicante/junior.
- `DOMINIO` — palabras de mecatrónica/afines (marcan ⭐).
- El frontend tiene además el toggle “Solo mecatrónica / afines”.

---

## 📧 Envío diario por correo (n8n)

Además de la web, el repo incluye un workflow de n8n que cada día revisa las mismas
fuentes y envía las vacantes **nuevas** por correo. Ver **[README-n8n.md](README-n8n.md)**.

---

## ⚠️ Nota legal
Este proyecto consulta páginas y endpoints públicos de cada empresa con fines de
difusión de oportunidades laborales. Respeta los términos de uso de cada sitio. Para
postular se redirige siempre al portal oficial de la empresa.
