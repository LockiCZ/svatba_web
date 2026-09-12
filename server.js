import { config as dotenvConfig } from "dotenv";
dotenvConfig(); // lokální .env
dotenvConfig({ path: "/etc/secrets/.env", override: false }); // Render Secret Files
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Cesta k datům lze nastavit přes DATA_DIR (např. připojený disk na Renderu).
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const RSVP_FILE = join(DATA_DIR, "rsvps.json");

// Přihlašovací údaje pro přehled odpovědí (/admin a /api/rsvps).
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// Basic Auth ochrana. Když není nastaveno ADMIN_PASSWORD, přístup se povolí
// (kvůli lokálnímu vývoji) a při startu se vypíše varování.
function chranit(req, res, next) {
  if (!ADMIN_PASSWORD) return next();
  const header = req.headers.authorization || "";
  const [typ, hodnota] = header.split(" ");
  if (typ === "Basic" && hodnota) {
    const [user, pass] = Buffer.from(hodnota, "base64")
      .toString("utf-8")
      .split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Svatební administrace"');
  return res.status(401).send("Přístup zamítnut.");
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(RSVP_FILE);
  } catch {
    await fs.writeFile(RSVP_FILE, "[]", "utf-8");
  }
}

async function readRsvps() {
  const raw = await fs.readFile(RSVP_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRsvps(rsvps) {
  await fs.writeFile(RSVP_FILE, JSON.stringify(rsvps, null, 2), "utf-8");
}

app.post("/api/rsvp", async (req, res) => {
  const {
    jmena,
    pocetOsob,
    prijezd,
    pocetMaso,
    pocetVege,
    alergie,
    odjezd,
    vybaveni,
    postel,
    doprava,
    poznamka,
  } = req.body || {};

  if (!jmena || typeof jmena !== "string" || !jmena.trim()) {
    return res
      .status(400)
      .json({ ok: false, chyba: "Vyplňte prosím křestní jména." });
  }

  const platnePrijezdy = [
    "patek",
    "sobota_pred",
    "sobota_po",
    "nevim",
    "nemuzu",
  ];
  if (!platnePrijezdy.includes(prijezd)) {
    return res
      .status(400)
      .json({ ok: false, chyba: "Zvolte prosím, kdy dorazíte." });
  }

  const nedorazi = prijezd === "nemuzu";
  const platnaDoprava = ["", "rozvoz", "sami"];

  const zaznam = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    jmena: String(jmena).trim(),
    pocetOsob: pocetOsob != null ? Number(pocetOsob) : null,
    prijezd,
    pocetMaso: nedorazi ? 0 : Number(pocetMaso) || 0,
    pocetVege: nedorazi ? 0 : Number(pocetVege) || 0,
    alergie: !nedorazi && alergie ? String(alergie).trim() : "",
    odjezd: nedorazi ? "" : (odjezd || ""),
    vybaveni: nedorazi ? false : !!vybaveni,
    postel: nedorazi ? false : !!postel,
    doprava:
      !nedorazi && platnaDoprava.includes(doprava) ? doprava : "",
    poznamka: poznamka ? String(poznamka).trim() : "",
    vytvoreno: new Date().toISOString(),
  };

  try {
    const rsvps = await readRsvps();
    rsvps.push(zaznam);
    await writeRsvps(rsvps);
    res.status(201).json({ ok: true, zaznam });
  } catch (err) {
    console.error("Chyba při ukládání RSVP:", err);
    res.status(500).json({ ok: false, chyba: "Nepodařilo se uložit odpověď." });
  }
});

app.get("/api/rsvps", chranit, async (_req, res) => {
  try {
    const rsvps = await readRsvps();
    res.json(rsvps);
  } catch {
    res.status(500).json({ ok: false, chyba: "Nepodařilo se načíst data." });
  }
});

// Přehledná HTML tabulka odpovědí pro nevěstu a ženicha.
const PRIJEZD_POPIS = {
  patek: "Už v pátek",
  sobota_pred: "Sobota před obřadem",
  sobota_po: "Sobota po obřadu",
  nevim: "Ještě nevíme",
  nemuzu: "Nedorazí",
};

const DOPRAVA_POPIS = {
  "": "Neřeší",
  rozvoz: "Chce rozvoz",
  sami: "Odvezou se sami",
};

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.get("/admin", chranit, async (_req, res) => {
  const rsvps = await readRsvps();
  const dorazi = rsvps.filter((r) => r.prijezd !== "nemuzu");
  const soucet = (klic) => dorazi.reduce((s, r) => s + (Number(r[klic]) || 0), 0);
  const celkemOsob = soucet("pocetOsob");
  const celkemMaso = soucet("pocetMaso");
  const celkemVege = soucet("pocetVege");

  const radky = rsvps
    .slice()
    .reverse()
    .map((r) => {
      const ano = (v) => (v ? "✓" : "");
      const datum = r.vytvoreno
        ? new Date(r.vytvoreno).toLocaleString("cs-CZ")
        : "";
      return `<tr>
        <td>${esc(r.jmena)}</td>
        <td class="c">${esc(r.pocetOsob)}</td>
        <td>${esc(PRIJEZD_POPIS[r.prijezd] || r.prijezd)}</td>
        <td class="c">${esc(r.pocetMaso)}</td>
        <td class="c">${esc(r.pocetVege)}</td>
        <td>${esc(r.alergie)}</td>
        <td>${r.odjezd === "sobota" ? "Sobota" : r.odjezd === "nedele" ? "Neděle" : "—"}</td>
        <td>${[r.vybaveni ? "Stan/spacák" : "", r.postel ? "Postel" : ""].filter(Boolean).join(", ") || "—"}</td>
        <td>${esc(DOPRAVA_POPIS[r.doprava] ?? r.doprava)}</td>
        <td>${esc(r.poznamka)}</td>
        <td class="nowrap">${esc(datum)}</td>
      </tr>`;
    })
    .join("");

  res.send(`<!DOCTYPE html>
<html lang="cs"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Odpovědi — svatba</title>
<style>
  body{font-family:system-ui,Segoe UI,sans-serif;margin:2rem;color:#3a352f;background:#fbf8f4}
  h1{font-weight:600}
  .souhrn{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0 1.5rem}
  .karta{background:#fff;border:1px solid #e6ddd1;border-radius:12px;padding:1rem 1.5rem;min-width:130px}
  .karta b{display:block;font-size:1.8rem;color:#9c8156}
  table{border-collapse:collapse;width:100%;background:#fff;font-size:0.9rem}
  th,td{border:1px solid #e6ddd1;padding:0.5rem 0.6rem;text-align:left;vertical-align:top}
  th{background:#f3ece3;position:sticky;top:0}
  td.c{text-align:center}
  .nowrap{white-space:nowrap}
  .prazdno{color:#8a8078}
</style></head><body>
<h1>Odpovědi hostů</h1>
<div class="souhrn">
  <div class="karta"><b>${rsvps.length}</b>dotazníků</div>
  <div class="karta"><b>${celkemOsob}</b>lidí dorazí</div>
  <div class="karta"><b>${dorazi.length}</b>skupin dorazí</div>
  <div class="karta"><b>${celkemMaso}</b>porcí masa</div>
  <div class="karta"><b>${celkemVege}</b>vegetariánských</div>
</div>
${
  rsvps.length
    ? `<table><thead><tr>
  <th>Jména</th><th>Počet</th><th>Příjezd</th><th>Maso</th><th>Vege</th>
  <th>Alergie</th><th>Odjezd</th><th>Vybavení</th><th>Doprava</th>
  <th>Poznámka</th><th>Odesláno</th>
</tr></thead><tbody>${radky}</tbody></table>`
    : `<p class="prazdno">Zatím žádné odpovědi.</p>`
}
</body></html>`);
});

await ensureDataFile();

app.listen(PORT, () => {
  console.log(`Svatební web běží na http://localhost:${PORT}`);
  console.log(`Data se ukládají do: ${RSVP_FILE}`);
  if (!ADMIN_PASSWORD) {
    console.warn(
      "⚠  ADMIN_PASSWORD není nastaveno — /admin a /api/rsvps jsou NEZABEZPEČENÉ. " +
        "Před nasazením nastavte proměnnou prostředí ADMIN_PASSWORD."
    );
  }
});
