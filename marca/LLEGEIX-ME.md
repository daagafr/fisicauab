# Marca Física UAB — proposta

Identitat visual per a la carrera de Física de la UAB, construïda **sobre el teu
dibuix**, no sobre un de nou: la gallina amb l'ull ratllat, en flames i glaçada
alhora, agafant la pinya. Aquí no hi ha res redibuixat.

No fa servir cap element de la identitat institucional de la UAB: ni el verd
corporatiu, ni el logotip, ni la tipografia oficial, ni la firma
«Universitat Autònoma de Barcelona».

---

## Com agafa el dibuix

`eines/generar.py` **no busca cap `id`**. Mesura tots els `<path>` de
`logo-idea.svg` amb Inkscape i es queda amb els que cauen dins de la pàgina; els
retalls de treball que deixes fora del llenç s'ignoren sols.

El dibuix el busca a l'arrel del projecte i dins de `marca/`, en aquest ordre, i si
no el troba pel nom agafa el primer `.svg` de qualsevol de les dues. El pots moure
de lloc o canviar-li el nom sense trencar res.

Això vol dir que pots redibuixar una peça, separar-la en dos camins o afegir-ne una
de nova: mentre quedi dins del llenç, entra a la marca. Només cal tornar a executar:

```bash
python "marca/eines/generar.py"
```

Escriu quins camins ha trobat. Ara mateix: `path8` (la gallina) i `path11` (la pinya).

---

## El color

**Borgonya `#70143D`** — el que ja tenies al fitxer. És *el* color de la marca, i
la marca funciona sencera amb una sola tinta. La resta de la paleta només és paper
i text:

| Nom | Hex | Paper |
|---|---|---|
| **Borgonya** | `#70143D` | el color de la marca |
| Borgonya fosc | `#4A0C28` | línies secundàries, text petit sobre os |
| Os | `#F4EFE6` | fons clar i negatiu |
| Tinta | `#1A1416` | text corrent quan no és de marca |

Que sigui d'una sola tinta no és una limitació, és la posició: surt més barat
imprimir, funciona en serigrafia, en gravat i en un segell de goma, i no es pot
desmuntar fent-ne una versió «de colors».

---

## Tipografia

**Palatino Linotype** en majúscules amb l'interlletratge obert. És una romana
humanística: dona l'aire de segell acadèmic sense haver de copiar el de ningú.
Alternatives lliures amb el mateix caràcter: **EB Garamond**, **Cormorant**,
**Spectral**.

- Nom: majúscules, negreta, interlletratge obert.
- Lema: majúscules, pes normal, cos molt més petit i interlletratge molt obert.

---

## Fitxers

### `svg/` — vectors, la font de veritat

| Fitxer | Ús |
|---|---|
| `marca.svg` | el dibuix sol, en borgonya. La peça bàsica |
| `marca-os.svg` | el dibuix sol, en os, per a fons borgonya o foscos |
| `segell.svg` | **versió principal.** Disc borgonya ple, dibuix en os, nom i lema a l'anella |
| `segell-invers.svg` | anella borgonya, camp os, dibuix en borgonya |
| `segell-cec.svg` | el segell sense text, només els filets i el dibuix |
| `segell-cec-invers.svg` | el mateix, amb el camp en os |
| `lockup-horitzontal.svg` | dibuix + nom al costat. Capçaleres, webs, signatures |
| `lockup-horitzontal-negatiu.svg` | l'anterior sobre fons borgonya |
| `lockup-vertical.svg` | dibuix + nom a sota. Cartells, samarretes |
| `icona.svg` | la marca sencera dins d'un disc, per a avatars i favicons |
| `icona-invers.svg` | la mateixa, en os |
| `carta-de-marca.svg` | **un A4 amb tot: segell, família, paleta i regles.** El full que s'ensenya |
| `carta-aplicacions.svg` | un segon A4: paper de carta, targeta, xapes, samarreta, segell de goma i xarxes |

Als segells i als lockups el text ja està convertit a corbes: no cal tenir la
tipografia instal·lada per obrir-los.

### `png/` — previsualitzacions

Per enganxar ràpid a un Drive, un Slack o unes diapositives. Per a res definitiu,
fes servir el SVG.

### `eines/generar.py`

Reconstrueix tots els fitxers. Els colors, el nom (`NOM`) i el lema (`LEMA`) són
constants al principi del fitxer; la geometria del segell són les constants `R_*`,
`SZ_*`, `LS_*` i `MH`, i la de la icona `ICO_*`.

---

## Sense lema

El segell porta el nom **dues vegades**: a dalt, com sempre, i a baix, girat, seguint
la volta en el mateix sentit (com a les monedes). Els lockups només porten el nom.

Abans hi havia el lema *ARDENS ET GELIDA*; es va treure perquè no acabava de
convèncer. Si algun dia en voleu un, és una sola línia (`LEMA` a `generar.py`): torna a
sortir a l'anella de baix del segell i sota el nom als lockups.

## Com està fet el segell

Tres elements i prou: el disc, un filet, i el nom a dalt i a baix separats per dos
rombes a les 3 i a les 9. Els dos noms van al mateix radi (393) i al mateix cos (74):
com que el de baix està girat, les majúscules de tots dos creixen cap enfora i queden
a la mateixa distància dels dos vorells.

El dibuix va a la mida màxima que deixa la cua i la flama lliures del filet: 478 de
1000. Per sobre de 490 el filet les talla i el segell perd la vora neta.

---

## Ús

- **Mida mínima del segell: 28 mm / 110 px.** Per sota no es llegeix l'anella;
  passa al `segell-cec`, al lockup o a la icona.
- **Mida mínima de la icona: 48 px.** La icona ensenya el dibuix sencer, sense
  retallar-ne cap tros: per sota de 40 px es converteix en una taca, però és la marca
  sencera. Val més una pinya i una gallina poc nítides que mitja pinya nítida.
- Marge de respecte: l'alçada de la corona de la pinya.
- Sobre fotografia: `segell` (disc ple) o `marca-os`, mai la marca en borgonya
  sobre una imatge fosca.
- No estiris ni giris res, i no li posis contorn.

---

## Els dos A4

`svg/carta-de-marca.svg` és el full de la marca a mida real: el segell i el nom a la
capçalera, la família, la paleta amb els hex, la tipografia, les mides mínimes i la
nota que no és material oficial. És el que s'imprimeix o s'envia quan algú pregunta
«quina marca és aquesta».

`svg/carta-aplicacions.svg` és el segon full: paper de carta, targeta, xapes,
samarreta, segell de goma i perfil de xarxes. Són maquetes planes, dibuixades amb
les mateixes peces — no fotomuntatges. Serveixen per a la pregunta següent, que
sempre és «i això com queda posat».

Tot el que surt als dos fulls es genera de les mateixes funcions que els fitxers
solts, així que no es poden desincronitzar: canvies el lema, tornes a executar, i
canvia als tres llocs.

---

## Idees obertes

1. **Patró.** Els gels i les flames de la gallina, repetits, donarien una trama per
   a folres i marxandatge sense haver de dibuixar res nou.
2. **Versió d'una línia.** Una variant del dibuix només de contorn, per a gravat o
   brodat fi. Això sí que demanaria dibuixar.
