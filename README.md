# Svatební web 💍

Jednoduchý svatební web s informacemi o svatbě a formulářem pro potvrzení účasti (RSVP). Odpovědi hostů se ukládají na server do souboru `data/rsvps.json`.

## Co web obsahuje

- **Úvodní stránka** se jmény, datem a místem svatby
- **Informace o svatbě** (datum, obřad, oslava, dress code)
- **Program dne** (časová osa)
- **Místo konání** s mapou
- **RSVP formulář** pro potvrzení účasti

## Požadavky

- [Node.js](https://nodejs.org/) verze 18 nebo novější

## Instalace a spuštění

```bash
npm install
npm start
```

Web poběží na adrese [http://localhost:3000](http://localhost:3000).

Pro vývoj s automatickým restartem po změně:

```bash
npm run dev
```

## Kde najdu odpovědi hostů?

Všechna potvrzení se ukládají do souboru `data/rsvps.json`.

- **Přehledná tabulka:** [http://localhost:3000/admin](http://localhost:3000/admin) — souhrn (kolik lidí dorazí, porce masa/vege) a tabulka všech odpovědí.
- **Data jako JSON:** [http://localhost:3000/api/rsvps](http://localhost:3000/api/rsvps).

Obě stránky jsou chráněné heslem, pokud nastavíte proměnnou `ADMIN_PASSWORD` (viz níže). Přihlašovací jméno je `admin` (nebo `ADMIN_USER`).

## Nastavení (proměnné prostředí)

Zkopírujte `.env.example` na `.env` a upravte hodnoty (nebo je nastavte přímo u hostingu):

| Proměnná | Význam | Výchozí |
| --- | --- | --- |
| `PORT` | Port serveru | `3000` |
| `DATA_DIR` | Složka pro uložení odpovědí | `./data` |
| `ADMIN_USER` | Jméno pro přístup k `/admin` | `admin` |
| `ADMIN_PASSWORD` | Heslo pro přístup k `/admin` a `/api/rsvps` | *(prázdné = nezabezpečeno)* |

> ⚠ Bez nastaveného `ADMIN_PASSWORD` jsou `/admin` a `/api/rsvps` veřejně přístupné. Před nasazením heslo nastavte.

Lokálně můžete heslo vyzkoušet takto:

```bash
ADMIN_PASSWORD=tajne npm start
# nebo s .env souborem (Node 20+):
node --env-file=.env server.js
```

## Nasazení na web (s trvalým diskem)

Aby odpovědi hostů nezmizely při restartu/nasazení, potřebuje web **trvalý disk** (persistent disk / volume). Postup na příkladu **Renderu** (obdobně Railway, Fly.io):

1. Nahrajte projekt na GitHub (soubor `data/rsvps.json` je v `.gitignore`, takže se neposílá).
2. Na [render.com](https://render.com) vytvořte **New → Web Service** a propojte repozitář.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. V sekci **Disks** přidejte disk, např. s **Mount Path** `/var/data`.
4. V sekci **Environment** nastavte proměnné:
   - `DATA_DIR` = `/var/data` (stejné jako Mount Path disku)
   - `ADMIN_PASSWORD` = vaše silné heslo
   - (`PORT` nastavuje Render automaticky)
5. Nasaďte. Web poběží na adrese `https://vas-web.onrender.com`, odpovědi najdete na `…/admin`.

Zálohu odpovědí kdykoli stáhnete z `…/api/rsvps` (jako JSON).

## Jak web přizpůsobit

- **Jména, datum, texty** – uprav v souboru `public/index.html`
- **Barvy a vzhled** – uprav proměnné na začátku souboru `public/styles.css`
- **Úvodní fotka** – zaměň odkaz na obrázek v `.hero` v souboru `public/styles.css`
- **Port serveru** – nastav proměnnou prostředí `PORT` (výchozí 3000)

## Struktura projektu

```
svatba_web/
├── server.js          # Express server + ukládání RSVP + /admin
├── package.json
├── .env.example       # Vzor proměnných prostředí
├── public/
│   ├── index.html     # Obsah webu
│   ├── styles.css     # Styly
│   ├── script.js      # Odeslání formuláře
│   ├── itinerar.html  # Harmonogram k tisku
│   └── images/        # Obrázky (pozadí hero)
└── data/
    └── rsvps.json     # Uložené odpovědi (vytvoří se automaticky)
```
