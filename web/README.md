# fisicauab.com

El web de la comunitat de física de la UAB. Fet amb [Astro](https://astro.build):
genera HTML estàtic, no necessita servidor ni base de dades, i Vercel el publica sol.

La marca surt de la carpeta del costat, `../marca`. El web no redibuixa res: copia
els fitxers i pinta el dibuix amb el color del tema.

---

## Posar-lo en marxa

```bash
npm install
npm run dev        # http://localhost:4321, es recarrega sol
npm run build      # genera dist/, el que es publica
```

Cal Node 22 o més nou.

---

## On és cada cosa

```
web/
├── src/
│   ├── config/lloc.ts        nom, lema, correu, xarxes i menú
│   ├── data/phihub.ts        ★ tot el phihub: categories i entrades
│   ├── content/avisos/       ★ el tauler: un .md per avís
│   ├── pages/                una pàgina per fitxer (index, phihub, comunitat…)
│   ├── components/           capçalera, peu, banner, segell de sigles…
│   ├── layouts/Base.astro    la closca de totes les pàgines (<head>, capçalera, peu)
│   └── styles/global.css     colors, tipografia, botons
├── public/                   es publica tal qual: marca/, favicon, og.png
└── eines/
    ├── marca.mjs             copia ../marca dins del web  (npm run marca)
    └── og.py                 genera public/og.png, la imatge de WhatsApp
```

Les dues carpetes amb ★ són les que tocareu més. No cal saber Astro per fer-ho.

---

## Afegir una cosa al phihub

Obre `src/data/phihub.ts`, copia una entrada i canvia-la:

```ts
{
	id: 'el-meu-projecte',          // únic, en minúscules i amb guions
	nom: 'El meu projecte',
	categoria: 'projectes',         // onedrive | clubs | projectes | hemeroteca
	tipus: 'App',                   // opcional: surt a dalt del banner
	descripcio: 'Una o dues frases que diguin què és.',
	url: 'https://…',               // sense url → surt com a «Aviat»
	sigles: 'EP',                   // van dins del segell si no hi ha logo
	imatge: '/phihub/logo.png',     // opcional: logo quadrat a public/phihub/
	destacat: true,                 // opcional: surt a la portada i ocupa dues columnes
	estil: 'mineuab',               // opcional: un banner fet a mida (vegeu a sota)
},
```

El calaix, els comptadors de la portada i el peu de pàgina s'actualitzen sols. Per
obrir un calaix nou, afegeix-lo a `categories` al mateix fitxer (i al tipus
`CategoriaId`).

### Els banners fets a mida

Cada projecte que té web pròpia té un banner que en recrea l'estil: els seus
colors, tipografies, logos i fotos. Són a `src/components/banners/`:

| `estil` | Fitxer | D'on surt |
|---|---|---|
| `onedrive` | `Onedrive.astro` | una carpeta compartida d'OneDrive (Fluent, de Microsoft) |
| `club` | `Club.astro` | la portada de clubdefisicauab.cat (`custom.css`, `carrusel4.jpg`, logo) |
| `instagram` | `Instagram.astro` | la safata d'històries d'Instagram, amb un compte per club |
| `mineuab` | `Mineuab.astro` | la portada de mineuab.org (`tailwind.config.ts`, logo, captura) |
| `niniapp` | `Niniapp.astro` | la portada de niniapp.org (icona, Lora, botó lila) |
| `dlv` | `Dlv.astro` | la capçalera del diccionari (`dlv.css`, logo DLV, segell RAV) |
| — | `Fisica.astro` | el de Física UAB, per a tot el que no en té de propi |

Per fer-ne un de nou: copia'n un de semblant, posa'l a `components/Banner.astro` i
afegeix-ne el nom al tipus `Estil` de `phihub.ts`. Les imatges van a
`public/phihub/`, reduïdes (una foto de 1.400 px d'ample en JPG ja n'hi ha prou).

### Webs i Instagram, separats

Un banner porta a **un** lloc. Els webs tenen el seu banner; els Instagram van
junts en un banner d'`estil: 'instagram'`, amb la llista de comptes:

```ts
comptes: [
	{ nom: 'Club de Física UAB', usuari: 'clubfisicauab', logo: '/phihub/club-logo.png' },
	{ nom: 'Optica’t UAB', usuari: 'opticat_uab', logo: '/phihub/opticat-emblema.png', fons: '#000000' },
],
```

`fons` és el color de darrere del logo quan és transparent o no és quadrat.

## Penjar un avís al tauler

Crea un fitxer a `src/content/avisos/`. El nom del fitxer és l'adreça:
`xerrada-octubre.md` → `fisicauab.com/tauler/xerrada-octubre`.

```md
---
titol: Xerrada sobre ones gravitacionals
data: 2026-10-15
resum: Una frase que surt a la llista i a la portada.
etiqueta: Club de Física     # opcional
esborrany: true               # opcional: no surt enlloc fins que el treguis
---

El text, en Markdown. **Negreta**, *cursiva*, [enllaços](https://…) i llistes.
```

A la portada surten els tres més recents.

## Afegir una pàgina

1. Crea `src/pages/el-nom.astro` (serà `fisicauab.com/el-nom`). Copia l'estructura
   de `comunitat.astro`: `<Base titol="…">`, una `pagina-cap` i seccions.
2. Si ha de sortir al menú, afegeix-la a `navegacio` a `src/config/lloc.ts`.

---

## La marca

Si regeneres la marca (`python marca/eines/generar.py`), torna-la a copiar:

```bash
npm run marca
python eines/og.py     # només si ha canviat el segell
```

Colors, tipografia i regles d'ús: `../marca/LLEGEIX-ME.md`. Al web:

- **L'estil**: net i amb color. Paper quadriculat de fons, el borgonya de la marca
  com a tinta i quatre **colors de marcador** (`--groc`, `--blau`, `--taronja`,
  `--rosa`), un per calaix del phihub, amb una icona de línia (`Icona.astro`).
- **Colors**: són variables a `src/styles/global.css`. Per canviar el color d'un
  calaix, canvia'n el `color` a `categories` (`src/data/phihub.ts`).
- **Tipografia**: Rubik per a tot, i Palatino només per al nom de la marca a la
  capçalera i al peu.
- **Marcador**: `<mark>` subratlla una paraula amb una franja groga;
  `<mark style="--m: var(--rosa)">` amb un altre color.
- **Mode fosc**: segueix el sistema. El dibuix passa a os i el borgonya ple es manté.

---

## Publicar a Vercel amb fisicauab.com

1. Puja la carpeta `Física UAB` sencera a un repositori de GitHub.
2. A [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
3. A **Root Directory** posa `web`. Vercel detecta Astro sol; no cal tocar res més.
4. **Deploy**. Cada `git push` a `main` torna a publicar.
5. **Settings → Domains** → afegeix `fisicauab.com` i `www.fisicauab.com`. Vercel
   et dirà quins registres DNS has de posar on vau comprar el domini.

---

## Pendent

- [ ] `correu` a `src/config/lloc.ts`: crear-lo o canviar-lo.
- [ ] NiniApp, el joc i el Frasario: descripció i enllaç (`src/data/phihub.ts`).
- [ ] Logos dels clubs i projectes a `public/phihub/`, si en voleu en comptes de sigles.
- [ ] Els logos del GdeE RSEF i d'Optica't són els dels seus webs; si en teniu una
      versió millor (la de l'Instagram), substituïu `gdee-emblema.png` i
      `opticat-emblema.png`.
