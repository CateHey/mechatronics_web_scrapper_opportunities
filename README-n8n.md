# 🔧 Vacantes Mecatrónica Perú → correo diario (n8n)

Workflow de n8n que **cada día a las 8:00 a. m.** revisa, empresa por empresa, su
fuente oficial de vacantes (energía, minería y automatización industrial en Perú),
filtra las de **practicante / junior** (marcando ⭐ las de mecatrónica/automatización),
**evita repetidos** y le envía el resumen por correo a tu hermano.

No depende de Jooble ni de ningún agregador: consulta directamente el sistema de
reclutamiento de cada empresa (Workday, SuccessFactors, HiringRoom, etc.).

## Archivos
- `n8n-vacantes-peru.json` → workflow listo para **importar** en n8n.
- `collector.js` → el código del nodo "Code" (por si quieres editarlo a mano).

---

## Pasos de instalación (10 min)

### 1. Importar el workflow
En n8n: menú **⋯ → Import from File** → elige `n8n-vacantes-peru.json`.
Verás 3 nodos: **Cada día 8:00 → Recolectar vacantes → Enviar correo**.

### 2. Configurar el correo (nodo "Enviar correo al hermano")
Doble clic en el nodo y completa:
- **From Email:** tu correo (el que enviará). Ej: `tucorreo@gmail.com`
- **To Email:** el correo de tu hermano.

Luego crea la **credencial SMTP** (botón *Credential to connect with → Create new*):
- **Host:** `smtp.gmail.com` · **Port:** `465` · **SSL/TLS:** activado
- **User:** tu correo de Gmail
- **Password:** una **contraseña de aplicación** de Gmail (NO tu contraseña normal).
  Se genera en: cuenta de Google → Seguridad → Verificación en 2 pasos →
  **Contraseñas de aplicaciones**. (Requiere tener activada la verificación en 2 pasos.)

> ¿Prefieres Gmail con OAuth en vez de SMTP? Reemplaza el nodo por el nodo **Gmail**
> de n8n; el resto funciona igual (`{{ $json.asunto }}` y `{{ $json.html }}`).

### 3. Activar
Pulsa **Active** (arriba a la derecha). Listo: correrá solo cada mañana.

### 4. Probar ahora (opcional)
Pulsa **Execute Workflow**. El primer envío trae **todas** las vacantes abiertas
relevantes (es normal, es la "foto" inicial); a partir de ahí solo llegan las nuevas.

---

## Cómo ajustar qué vacantes llegan
En el nodo **Code**, arriba del todo:
- `NIVEL` → palabras que definen practicante/junior. Edita para ampliar/restringir.
- `DOMINIO` → palabras de mecatrónica/afines (marcan ⭐ y, si activas el modo
  estricto, filtran).
- `SOLO_MECATRONICA = false` → ponlo en `true` si quieres que **solo** lleguen
  vacantes que sean a la vez practicante/junior **y** de mecatrónica.

Para cambiar la hora: nodo **"Cada día 8:00"** → `triggerAtHour`.

---

## Fiabilidad por fuente (verificado el 2026-06-09)

| Empresa | Fuente usada | Estado |
|---|---|---|
| ABB | API Phenom con filtro Perú | ✅ Sólida |
| Rockwell | API Workday (filtra Perú en n8n) | ✅ Sólida (hoy poca oferta en Perú) |
| ISA REP | API HiringRoom | ✅ Sólida |
| Antamina | Tiles SuccessFactors | ✅ Sólida |
| Southern Copper | HiringRoom + portal CAPPER | ✅ Sólida |
| Cerro Verde | API HiringRoom (programa Becarios) | ✅ Sólida |
| Las Bambas | sitemap.xml de MMG | ✅ Sólida |
| Schneider | API Eightfold (filtra Perú en n8n) | ⚠️ Parcial |
| Siemens / Siemens Energy | LinkedIn (API guest) | ⚠️ Respaldo* |
| ENGIE / Kallpa | LinkedIn (API guest) | ⚠️ Respaldo* |
| Electroperú | SharePoint (detecta PDFs de convocatoria) | ⚠️ Respaldo |

\* **LinkedIn** a veces bloquea las peticiones desde IPs de servidor (responde 999).
Si ves esas fuentes con `ERROR` en el pie del correo, no pasa nada: el resto sigue
funcionando. Si quieres LinkedIn 100% fiable, lo mejor es añadir un nodo con un
servicio anti-bloqueo o revisar esas 4 empresas a mano (son las que menos publican
practicantes de todas formas). El núcleo fuerte son las 7 primeras.

El código está hecho a prueba de fallos: si una empresa falla, las demás siguen y el
correo igual se envía con lo que sí encontró.
