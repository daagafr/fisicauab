# fisicauab.com

El web de la comunitat de física de la UAB. Fet amb [Astro](https://astro.build):
genera HTML estàtic, no necessita base de dades, i Vercel el publica sol. L'única part
que corre al servidor són els editors de La Nostra Història i del Frasari (les rutes de
`src/pages/api/lnh/` i `src/pages/api/frasari/`).

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
│   │   ├── la-nostra-historia/   el llibre (index.astro) i el seu editor (editor.astro)
│   │   ├── frasari/              el frasari (index.astro) i el seu editor (editor.astro)
│   │   └── api/                  entrar, llegir i desar per als editors (lnh/, frasari/)
│   ├── lnh/                  La Nostra Història: de LaTeX a HTML, sessions, desar
│   ├── frasari/              el Frasari: les dades, l'editor i on es desa
│   ├── components/           capçalera, peu, banner, segell de sigles, l'àtom…
│   ├── layouts/Base.astro    la closca de totes les pàgines (<head>, capçalera, peu)
│   └── styles/global.css     colors, tipografia, botons, paper mil·limetrat
├── public/                   es publica tal qual: marca/, favicon, og.png
└── eines/
    ├── marca.mjs             copia ../marca dins del web  (npm run marca)
    ├── og.py                 genera public/og.png, la imatge de WhatsApp
    ├── og-lnh.py             el mateix per al llibre: public/lnh/og.png
    ├── cmu.py                retalla la CMU Serif per al web
    ├── frasari-importa.py    bolca una secció sencera de frases al Frasari
    └── lnh-admin.mjs         dona d'alta un admin dels editors (npm run lnh:admin)
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
| `lnh` | `Lnh.astro` | la portada de La Nostra Història (pergamí, marc granat, lotus) |
| `frasari` | `Frasari.astro` | la pissarra del Frasari, amb una frase de les bones |
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

- **L'estil**: paper de laboratori. Fons blanc, paper mil·limetrat a les capçaleres,
  títols numerats com els `\section` de LaTeX, amb una ona a sota, i el borgonya de
  la marca com a única tinta de color. De decoració, un àtom
  (`components/Atom.astro`): a la portada el segell en fa de nucli, amb els electrons
  girant (si el cliques, s'excita i deixa anar un fotó); a la pàgina d'error li falta
  l'electró que s'ha escapat; i a la capçalera de les altres pàgines n'hi ha un de
  gran que gira a poc a poc (`--atom`, a `global.css`).
- **Colors**: són variables a `src/styles/global.css`. Cada calaix del phihub té una
  de les línies d'un gràfic de matplotlib (`--blau`, `--taronja`, `--verd`,
  `--vermell`: C0–C3), per a línies, vores i fons molt aigualits, mai per a text. Per
  canviar el color d'un calaix, canvia'n el `color` a `categories` (`src/data/phihub.ts`).
- **Tipografia**: CMU Serif (la Computer Modern de LaTeX) per als títols, IBM Plex
  Sans per al text, IBM Plex Mono per a dates i etiquetes, i Palatino només per al
  nom de la marca. La CMU és a `src/assets/fonts/cmu/`, retallada amb `eines/cmu.py`.
- **Èmfasi**: `<mark>` dins d'un títol el posa en cursiva i en borgonya.
- **Mode fosc**: no n'hi ha. El web és sempre clar (`data-theme="light"` a
  `Base.astro`). La Nostra Història té el seu, a part.

---

## La Nostra Història

El llibre és a `fisicauab.com/la-nostra-historia`, i al phihub, a l'Hemeroteca. La
pàgina **no té el text copiat**: cada vegada que es construeix el web, llegeix els
`.tex` de la carpeta del costat (`../La Nostra Història`), a partir de
`La Nostra Història.tex` i dels seus `\input`. Si canvies el llibre, canvia la web.

- **Les parts** (Chaos, Genesis…) i el seu subtítol surten de les pàgines de part del
  fitxer principal. **Els capítols**, de cada `\chapter`, `\chapter*` i `\epileg`.
- **La sinopsi** és a `Recursos/Sinopsi.pdf`, no a cap `.tex`: per això és escrita a
  `src/pages/la-nostra-historia/index.astro`. Si la canvies, canvia-la als dos llocs.
- **El traductor** (`src/lnh/latex.ts`) entén les ordres que fa servir el llibre:
  `\epigraf`, `\lettrine`, `\saltescena`, `\textit`, `\\`, els diàlegs, notes al peu…
  Si n'hi poseu una de nova, al web en sortirà el text sense format (i l'editor ho avisa)
  fins que l'afegiu allà.

### L'editor

A `fisicauab.com/la-nostra-historia/editor` (o «Accés d'edició», al peu del llibre).
Només hi entren els admins, amb correu i contrasenya. A l'esquerra hi ha el LaTeX del
capítol i a la dreta, com quedarà. **Ctrl S** desa.

Desar escriu el `.tex` de veritat, només el tros del capítol que has tocat:

- **En local** (`npm run dev`), al disc. Després el pots compilar a PDF com sempre.
- **Al web publicat**, fa un commit a GitHub amb el teu nom. Vercel el veu i torna a
  publicar el web: el text nou surt en un parell de minuts.

Si dues persones editen el mateix fitxer alhora, el segon que desa rep un avís i no
trepitja res.

### Posar-lo en marxa

Tot va en variables d'entorn: a Vercel (**Settings → Environment Variables**) i, per
provar-ho en local, a `web/.env` (no es puja mai; és a `.gitignore`).

1. **Els admins.** Per a cadascun:

   ```bash
   npm run lnh:admin -- nom@exemple.com
   ```

   Et demana la contrasenya i t'escriu una línia. Posa-les totes a `LNH_ADMINS`,
   separades per comes. La primera vegada també et dona un `LNH_SECRET`: posa'l tal
   qual (és el mateix per a tothom). Per treure algú, esborra la seva línia.
2. **El token de GitHub** (només a Vercel; en local es desa al disc). A GitHub:
   **Settings → Developer settings → Fine-grained tokens → Generate new token**. Tria
   només el repositori `daagafr/fisicauab` i, a **Repository permissions**, posa
   **Contents: Read and write**. Enganxa'l a `LNH_GITHUB_TOKEN`.
3. Si el repositori o la branca no són `daagafr/fisicauab` i `main`, posa'ls a
   `LNH_GITHUB_REPO` i `LNH_GITHUB_BRANCA`.

| Variable | Què és |
|---|---|
| `LNH_ADMINS` | `correu:sal:hash` per a cada admin, separats per comes |
| `LNH_SECRET` | signa les sessions; si el canvies, tothom ha de tornar a entrar |
| `LNH_GITHUB_TOKEN` | per fer els commits des del web publicat |
| `LNH_GITHUB_REPO`, `LNH_GITHUB_BRANCA` | opcionals |

La imatge per compartir (`public/lnh/og.png`) es fa amb `python eines/og-lnh.py`.

---

## El Frasari

Les frases dels profes, a `fisicauab.com/frasari`, i al phihub, a l'Hemeroteca. Té
l'aspecte d'una pissarra de guix, amb un buscador, un filtre d'estrelles, un rànquing
i una frase a l'atzar a dalt de tot.

Totes les frases són en un sol fitxer, `Frasari/frasari.json`, a la carpeta del
costat del web (com La Nostra Història). Hi ha grups (ara només **Profes**), dins de
cada grup les persones i, dins de cada persona, les frases, cadascuna amb 0, 1, 2 o 3
estrelles. La pàgina el llegeix quan es construeix el web.

### L'editor

A `fisicauab.com/frasari/editor` (o «Accés d'edició», al peu del frasari). Hi entren
**els mateixos admins que a La Nostra Història**, amb el mateix correu i contrasenya, i
no cal configurar res més: fa servir les mateixes variables d'entorn.

- **Afegir**: tria qui la va dir (o «Una persona nova…»), escriu la frase i les
  estrelles.
- **Estrelles**: clica la primera, la segona o la tercera estrella d'una frase. Si
  cliques la que ja és l'última encesa, n'hi treus una.
- **Editar** i **esborrar**: a cada frase. **Canvia el nom**: a cada persona. Si una
  persona es queda sense frases, desapareix.
- **Desfés** (Ctrl Z) treu l'últim canvi. Res no es desa fins que cliques **Desa**
  (Ctrl S), i aleshores es desa tot de cop: al disc en local, i amb un commit a GitHub
  al web publicat, que surt al web en un parell de minuts.

Si dos admins desen alhora no es trepitgen: l'editor no envia el fitxer sencer sinó la
llista de canvis, i el servidor l'aplica al frasari tal com estigui en aquell moment.

Com s'escriuen les frases, tal com al frasari en paper:

- Entre cometes, i el context entre parèntesis: `(Coge una chaqueta) “De quien…”`.
  El que va entre parèntesis surt més fluix.
- Els diàlegs, una línia per persona: `Unai: “…”` (el nom surt en rosa).
- `**negreta**`, `_cursiva_` i `*accions*`.

### Bolcar-hi una secció sencera

Per a les altres seccions del frasari en paper (Fisquims, Sótano…), és més ràpid
escriure-les en un `.txt` i importar-les de cop. El format és a
`eines/frasari-importa.py`:

```bash
python eines/frasari-importa.py fisquims.txt --grup fisquims --nom Fisquims
```

Si el grup ja existeix, el substitueix sencer.

### No surt a Google

Les pàgines del Frasari porten `noindex`: són frases de gent amb nom i cognoms, dites a
classe i fora de context. Si algun dia ho voleu canviar, és `indexar` a
`src/layouts/Pissarra.astro`.

---

## Publicar a Vercel amb fisicauab.com

1. Puja la carpeta `Física UAB` sencera a un repositori de GitHub.
2. A [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
3. A **Root Directory** posa `web`. Vercel detecta Astro sol. Deixa marcada
   l'opció **Include files outside the root directory in the Build Step**: el web
   llegeix La Nostra Història i el Frasari de les carpetes del costat. (Si no les
   troba, la publicació s'atura i ho diu.)
4. **Deploy**. Cada `git push` a `main` torna a publicar.
5. **Settings → Domains** → afegeix `fisicauab.com` i `www.fisicauab.com`. Vercel
   et dirà quins registres DNS has de posar on vau comprar el domini.

---

## Pendent

- [ ] `correu` a `src/config/lloc.ts`: crear-lo o canviar-lo.
- [ ] La Nostra Història: pujar la carpeta `La Nostra Història/` al repositori i posar
      les variables de l'editor a Vercel (vegeu més amunt).
- [ ] NiniApp i el joc: descripció i enllaç (`src/data/phihub.ts`).
- [ ] El Frasari: la resta de seccions del frasari en paper, si les voleu publicar.
- [ ] Logos dels clubs i projectes a `public/phihub/`, si en voleu en comptes de sigles.
- [ ] Els logos del GdeE RSEF i d'Optica't són els dels seus webs; si en teniu una
      versió millor (la de l'Instagram), substituïu `gdee-emblema.png` i
      `opticat-emblema.png`.
