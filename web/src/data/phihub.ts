// ─────────────────────────────────────────────────────────────────────────────
//  PHIHUB — tot el que surt de Física UAB, en un sol lloc.
//
//  Per afegir-hi una cosa, copia una entrada de la llista `entrades` i canvia-la.
//  No cal tocar cap altre fitxer: el banner, la categoria i els comptadors de la
//  portada surten sols.
//
//  - Sense `url`, el banner surt com a «Aviat» i no és clicable.
//  - Amb `destacat: true`, surt a la portada i ocupa dues columnes al phihub.
//    (Ara: el OneDrive, MineUAB i el DLV.)
//  - Amb `ample: true`, ocupa tota la fila del seu calaix.
//  - `tipus` diu quina mena de cosa és («Club», «App»…). Opcional.
//  - `imatge` és opcional: un logo quadrat a public/phihub/. Si no n'hi ha, el
//    banner fa servir les `sigles` dins d'un segell.
//  - `estil` tria un banner fet a mida, que recrea l'estil del web de cada
//    projecte (src/components/banners/). Sense `estil`, surt el banner de Física UAB.
//  - Els Instagram no van barrejats amb els webs: van en un banner d'`estil:
//    'instagram'`, amb la llista de `comptes`.
//  - `enllacos` i `apartat`: més enllaços, per als banners que en porten més d'un
//    (ara, el mod de Rodalies). L'`url` continua sent el principal.
// ─────────────────────────────────────────────────────────────────────────────

export type CategoriaId = 'onedrive' | 'clubs' | 'projectes' | 'hemeroteca';

export interface Categoria {
	id: CategoriaId;
	nom: string;
	icona: 'nuvol' | 'persones' | 'eina' | 'diari'; // src/components/Icona.astro
	color: Color;
	descripcio: string;
}

/** Els banners fets a mida. Cadascun és un fitxer a src/components/banners/. */
export type Estil = 'onedrive' | 'club' | 'instagram' | 'mineuab' | 'niniapp' | 'dlv' | 'lnh' | 'frasari' | 'rodalies' | 'calculadora';

/** Els colors dels calaixos: les línies d'un gràfic de matplotlib (src/styles/global.css). */
export type Color = 'blau' | 'taronja' | 'verd' | 'vermell';

export interface Enllac {
	text: string;
	url: string;
	nota?: string; // surt petit al costat: «alternativa»…
}

export interface Compte {
	nom: string;
	usuari: string; // sense @
	logo: string; // quadrat, a public/phihub/
	fons?: string; // color de fons darrere del logo, si és transparent
}

export interface Entrada {
	id: string;
	nom: string;
	categoria: CategoriaId;
	descripcio: string;
	url?: string;
	sigles: string;
	tipus?: string; // «Club», «App», «Joc»… Surt a dalt del banner; per defecte, la categoria
	etiqueta?: string; // el text petit del peu del banner; per defecte, el domini
	cta?: string; // el text del botó als banners grans
	imatge?: string;
	destacat?: boolean;
	ample?: boolean;
	estil?: Estil;
	comptes?: Compte[]; // només per a `estil: 'instagram'`
	enllacos?: Enllac[]; // altres llocs on és el mateix (el principal és `url`)
	apartat?: { titol: string; text?: string; enllacos: Enllac[] }; // un bloc d'enllaços a part
}

export const categories: Categoria[] = [
	{
		id: 'onedrive',
		nom: 'El OneDrive',
		icona: 'nuvol',
		color: 'blau',
		descripcio: 'Apunts, exàmens i material de les assignatures, compartits d’una promoció a la següent.',
	},
	{
		id: 'clubs',
		nom: 'Clubs i associacions',
		icona: 'persones',
		color: 'taronja',
		descripcio: 'On la física passa fora de l’aula.',
	},
	{
		id: 'projectes',
		nom: 'Projectes',
		icona: 'eina',
		color: 'verd',
		descripcio: 'Coses que ha fet la gent de física: apps, jocs, servidors…',
	},
	{
		id: 'hemeroteca',
		nom: 'Hemeroteca',
		icona: 'diari',
		color: 'vermell',
		descripcio: 'La memòria col·lectiva de la carrera: el que s’ha dit i no s’ha d’oblidar.',
	},
];

export const entrades: Entrada[] = [
	// ── El OneDrive ─────────────────────────────────────────────────────────
	{
		id: 'drive',
		nom: 'OneDrive de Física',
		categoria: 'onedrive',
		descripcio:
			'Apunts, exàmens i material de les assignatures del grau, compartits d’una promoció a la següent.',
		url: 'https://uab-my.sharepoint.com/:f:/g/personal/1707179_uab_cat/IgCbCYraHrSUSJrFY3QLJPIjAbEh7goNn_5t_EYq6dlJRAA',
		sigles: 'AP',
		tipus: 'OneDrive',
		etiqueta: 'OneDrive',
		cta: 'Obre el OneDrive',
		destacat: true,
		estil: 'onedrive',
	},

	// ── Clubs i associacions ────────────────────────────────────────────────
	{
		id: 'club-de-fisica',
		nom: 'Club de Física UAB',
		categoria: 'clubs',
		descripcio:
			'Un lloc on fem allò que les classes de pissarra no poden fer: pensar, fer preguntes que no tenen resposta de llibre i aprendre física fent física.',
		url: 'https://clubdefisicauab.cat/',
		sigles: 'CF',
		tipus: 'Club',
		cta: 'Coneix el Club',
		ample: true,
		estil: 'club',
	},
	{
		id: 'instagram-clubs',
		nom: 'Els clubs, a Instagram',
		categoria: 'clubs',
		descripcio: 'Convocatòries, fotos i el dia a dia de cada club.',
		sigles: 'IG',
		tipus: 'Instagram',
		ample: true,
		estil: 'instagram',
		comptes: [
			{ nom: 'Club de Física UAB', usuari: 'clubfisicauab', logo: '/phihub/club-logo.png' },
			{ nom: 'GdeE RSEF UAB', usuari: 'estudiantsrsef_uab', logo: '/phihub/gdee-emblema.png', fons: '#ffffff' },
			{ nom: 'Optica’t UAB', usuari: 'opticat_uab', logo: '/phihub/opticat-emblema.png', fons: '#000000' },
		],
	},

	// ── Projectes ───────────────────────────────────────────────────────────
	{
		id: 'mineuab',
		nom: 'MineUAB',
		categoria: 'projectes',
		descripcio: 'Un servidor fet per estudiants i obert a tothom, siguis o no de la UAB.',
		url: 'https://www.mineuab.org/',
		sigles: 'MU',
		tipus: 'Servidor de Minecraft',
		destacat: true,
		estil: 'mineuab',
	},
	{
		id: 'niniapp',
		nom: 'NiniApp',
		categoria: 'projectes',
		descripcio:
			'L’app del grup d’amics: els plans, les ratxes, qui porta cotxe i les bromes internes, tot en un lloc.',
		url: 'https://www.niniapp.org/gateway',
		sigles: 'NA',
		tipus: 'App',
		cta: 'Accedeix a l’app',
		estil: 'niniapp',
	},
	{
		id: 'rodalies',
		nom: 'Mod de Rodalies a Minecraft i més',
		categoria: 'projectes',
		descripcio:
			'Rètols d’estació, logos de Rodalies i Renfe i senyals de via per fer a Minecraft estacions i línies com les de debò.',
		url: 'https://www.curseforge.com/minecraft/mc-mods/rodalies-decorations',
		sigles: 'R',
		tipus: 'Mod de Minecraft',
		etiqueta: 'curseforge.com',
		cta: 'Descarrega’l a CurseForge',
		imatge: '/phihub/rodalies-icona.png',
		ample: true,
		estil: 'rodalies',
		enllacos: [{ text: 'Modrinth', url: 'https://modrinth.com/mod/rodalies-decorations' }],
		apartat: {
			titol: 'Construccions amb el mod',
			text: 'Estacions, vies i trens fets amb el mod, per descarregar-los i posar-los al teu món.',
			enllacos: [
				{ text: 'Create Mod', url: 'https://createmod.com/author/anty48' },
				{ text: 'BuildPaste', url: 'https://buildpaste.net/profile/io7uXbS485OjMq431nRknR25EoU2', nota: 'alternativa' },
			],
		},
	},
	{
		id: 'calculadora',
		nom: 'Calculadora de laboratori',
		categoria: 'projectes',
		descripcio:
			'Mitjana i incertesa de mesures repetides, propagació d’incerteses i un formulari, amb les xifres significatives ben posades. Per a les pràctiques.',
		url: 'https://physics-calc-cl7amvytg2hasqmbnqcnty.streamlit.app/',
		sigles: 'CL',
		tipus: 'Calculadora',
		etiqueta: 'streamlit.app',
		cta: 'Obre la calculadora',
		estil: 'calculadora',
	},
	{
		// TODO: nom definitiu, descripció i enllaç.
		id: 'joc',
		nom: 'El joc de Física UAB',
		categoria: 'projectes',
		descripcio: 'Un joc fet per i per a la gent de física. En construcció.',
		sigles: 'JC',
		tipus: 'Joc',
	},

	// ── Hemeroteca ──────────────────────────────────────────────────────────
	{
		id: 'dlv',
		nom: 'Diccionari de la Llengua Vespertina',
		categoria: 'hemeroteca',
		descripcio:
			'Personatges, conceptes, expressions i barbaritats de la física a la UAB, recollits perquè no es perdin.',
		url: 'https://diccionari-llengua-vespertina.web.app/diccionari/',
		sigles: 'DLV',
		tipus: 'Diccionari',
		cta: 'Obre el diccionari',
		destacat: true,
		estil: 'dlv',
	},
	{
		// El llibre viu dins d'aquest mateix web: /la-nostra-historia, fet amb els
		// .tex de ../La Nostra Història.
		id: 'la-nostra-historia',
		nom: 'La Nostra Història',
		categoria: 'hemeroteca',
		descripcio: 'La crònica apòcrifa del OneDrive de Física, de l’Erik al Consell de Savis.',
		url: '/la-nostra-historia',
		sigles: 'LNH',
		tipus: 'Llibre',
		etiqueta: 'fisicauab.com',
		cta: 'Llegeix el llibre',
		estil: 'lnh',
	},
	{
		// Viu dins d'aquest mateix web: /frasari, fet amb ../Frasari/frasari.json.
		id: 'frasari',
		nom: 'Frasari',
		categoria: 'hemeroteca',
		descripcio: 'Les frases dels profes, apuntades a classe. Les millors, amb estrelles.',
		url: '/frasari',
		sigles: 'FR',
		tipus: 'Recull',
		etiqueta: 'fisicauab.com',
		cta: 'Obre el frasari',
		estil: 'frasari',
	},
];

// ── Ajudes ──────────────────────────────────────────────────────────────────

export const categoria = (id: CategoriaId) => categories.find((c) => c.id === id)!;

export const entradesDe = (id: CategoriaId) => entrades.filter((e) => e.categoria === id);

export const destacats = () => entrades.filter((e) => e.destacat && (e.url || e.comptes));

/** Una entrada és «Aviat» si no porta enlloc: ni enllaç ni comptes. */
export const esAviat = (e: Entrada) => !e.url && !e.comptes?.length;

/** El text petit del peu del banner: l’etiqueta, o el domini de l’enllaç. */
export const peuDe = (e: Entrada) =>
	e.etiqueta ?? (e.url ? new URL(e.url).hostname.replace(/^www\./, '') : 'Aviat');
