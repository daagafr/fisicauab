// ─────────────────────────────────────────────────────────────────────────────
//  LA NOSTRA HISTÒRIA — de LaTeX a HTML
//
//  No és un compilador de LaTeX: entén el subconjunt que fa servir el llibre
//  (capítols, epígrafs, caplletres, cursives, salts d'escena, diàlegs…) i el
//  converteix en HTML amb l'estil del llibre. El fan servir la pàgina, quan es
//  construeix el web, i l'editor, per a la vista prèvia mentre escrius. Per això
//  aquí no es toca el disc: tot rep els fitxers com a text.
//
//  Si el llibre comença a fer servir una ordre nova, afegeix-la a `ordreEnLinia`
//  (si va dins d'un paràgraf) o a `ordreDeBloc` (si és un bloc sencer). Les que
//  no coneix les deixa passar com a text i l'editor les avisa.
// ─────────────────────────────────────────────────────────────────────────────

/** Els fitxers del llibre: camí (relatiu a la carpeta del llibre) → contingut. */
export type Fitxers = Record<string, string>;

/**
 * Un fitxer es talla en trossos, un per capítol. El primer és el text que hi ha
 * abans del primer capítol (a Preàmbul.tex, la pàgina de crèdits); sovint és buit.
 */
export type Mena = 'solt' | 'capitol' | 'sense-numero' | 'epileg';

export interface Tros {
	mena: Mena;
	inici: number;
	fi: number;
	font: string;
}

export interface Capitol {
	tipus: 'capitol';
	id: string;
	mena: Mena;
	numero: number | null;
	etiqueta: string | null; // «Capítol 3», «Epíleg» o res
	titol: string; // text pla
	titolHtml: string;
	html: string;
	paraules: number;
	fitxer: string;
	tros: number; // quin tros de `trossos(fitxer)` és
	desconegudes: string[];
}

export interface Part {
	tipus: 'part';
	id: string;
	etiqueta: string; // «Part II»
	titol: string;
	titolHtml: string;
	subtitolHtml: string;
}

export type Peca = Part | Capitol;

export interface Llibre {
	principal: string;
	fitxers: string[]; // els que formen el llibre, en ordre de lectura
	peces: Peca[];
	avisos: string[];
}

// ── Text ────────────────────────────────────────────────────────────────────

/** Els fitxers fets a Windows porten \r\n. Tot el que hi ha aquí treballa amb \n. */
export const normalitza = (font: string) => font.replace(/\r\n?/g, '\n');

const escapa = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const textPla = (html: string) =>
	html
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/­/g, '')
		.replace(/[\s ]+/g, ' ')
		.trim();

export const slug = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/·/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'x';

const paraulesDe = (html: string) => textPla(html).split(' ').filter(Boolean).length;

// ── Comentaris ──────────────────────────────────────────────────────────────

/**
 * On són els comentaris (% fins a final de línia, però no \%). Com LaTeX, cada
 * comentari es menja també el salt de línia i els espais de la línia següent.
 */
function comentaris(font: string): [number, number][] {
	const trams: [number, number][] = [];
	for (let i = 0; i < font.length; i++) {
		const c = font[i];
		if (c === '\\') {
			i++;
			continue;
		}
		if (c !== '%') continue;
		const ini = i;
		while (i < font.length && font[i] !== '\n') i++;
		i++;
		while (font[i] === ' ' || font[i] === '\t') i++;
		trams.push([ini, Math.min(i, font.length)]);
		i--;
	}
	return trams;
}

export function senseComentaris(font: string): string {
	let out = '';
	let des = 0;
	for (const [ini, fi] of comentaris(font)) {
		out += font.slice(des, ini);
		des = fi;
	}
	return out + font.slice(des);
}

// ── Lectura de grups i ordres ───────────────────────────────────────────────

/** Salta espais i, com a molt, un salt de línia (dos ja fan paràgraf). */
function saltaEspais(s: string, i: number): number {
	while (s[i] === ' ' || s[i] === '\t') i++;
	if (s[i] === '\n') {
		let j = i + 1;
		while (s[j] === ' ' || s[j] === '\t') j++;
		if (s[j] !== '\n') return j;
	}
	return i;
}

/** Un grup {…} a partir de `i`. Torna el que hi ha dins i on acaba. */
function grup(s: string, i: number): [string, number] | null {
	const j = saltaEspais(s, i);
	if (s[j] !== '{') return null;
	let prof = 0;
	for (let k = j; k < s.length; k++) {
		const c = s[k];
		if (c === '\\') k++;
		else if (c === '{') prof++;
		else if (c === '}' && --prof === 0) return [s.slice(j + 1, k), k + 1];
	}
	return [s.slice(j + 1), s.length];
}

/** Un argument opcional […] a partir de `i`, si n'hi ha. */
function opcional(s: string, i: number): [string, number] | null {
	const j = saltaEspais(s, i);
	if (s[j] !== '[') return null;
	let prof = 0;
	for (let k = j + 1; k < s.length; k++) {
		const c = s[k];
		if (c === '\\') k++;
		else if (c === '{') prof++;
		else if (c === '}') prof--;
		else if (c === ']' && prof === 0) return [s.slice(j + 1, k), k + 1];
	}
	return null;
}

/** Salta `n` arguments obligatoris. */
function salta(s: string, i: number, n: number): number {
	for (let k = 0; k < n; k++) {
		const g = grup(s, i);
		if (!g) break;
		i = g[1];
	}
	return i;
}

/** El nom de l'ordre que comença a `i` (on hi ha la \). */
function nomOrdre(s: string, i: number): [string, number] {
	let j = i + 1;
	if (/[A-Za-z@]/.test(s[j] ?? '')) {
		while (/[A-Za-z@]/.test(s[j] ?? '')) j++;
		if (s[j] === '*') j++;
	} else j++;
	return [s.slice(i + 1, j), j];
}

/** Després d'una ordre de lletres, LaTeX es menja els espais; «\LaTeX{}» no. */
function finalOrdre(s: string, j: number): number {
	if (s.startsWith('{}', j)) return j + 2;
	while (s[j] === ' ' || s[j] === '\t') j++;
	if (s[j] === '\n' && s[saltaEspais(s, j)] !== '\n') return saltaEspais(s, j);
	return j;
}

/** El \begin{…} … \end{…} que comença a `j`, comptant els que hi ha a dins. */
function entorn(s: string, j: number): { nom: string; dins: string; fi: number } | null {
	const g = grup(s, j);
	if (!g) return null;
	const nom = g[0].trim();
	const obre = `\\begin{${nom}}`;
	const tanca = `\\end{${nom}}`;
	let prof = 1;
	let k = g[1];
	while (prof > 0) {
		const a = s.indexOf(obre, k);
		const t = s.indexOf(tanca, k);
		if (t < 0) return { nom, dins: s.slice(g[1]), fi: s.length };
		if (a >= 0 && a < t) {
			prof++;
			k = a + obre.length;
		} else {
			prof--;
			k = t + tanca.length;
		}
	}
	return { nom, dins: s.slice(g[1], k - tanca.length), fi: k };
}

// ── Context d'una peça ──────────────────────────────────────────────────────

interface Context {
	prefix: string; // per a les notes al peu: ids únics a la pàgina
	notes: string[];
	desconegudes: Set<string>;
}

const context = (prefix: string): Context => ({ prefix, notes: [], desconegudes: new Set() });

// ── Dins del paràgraf ───────────────────────────────────────────────────────

const LATEX = '<span class="logo-tex">L<span class="a">a</span>T<span class="e">e</span>X</span>';
const TEX = '<span class="logo-tex">T<span class="e">e</span>X</span>';

const SIMBOLS: Record<string, string> = {
	textcopyright: '©',
	textregistered: '®',
	texttrademark: '™',
	ldots: '…',
	dots: '…',
	textellipsis: '…',
	textasteriskcentered: '∗',
	textendash: '–',
	textemdash: '—',
	guillemotleft: '«',
	guillemotright: '»',
	guillemetleft: '«',
	guillemetright: '»',
	textquoteleft: '‘',
	textquoteright: '’',
	textquotedblleft: '“',
	textquotedblright: '”',
	textbullet: '•',
	textdegree: '°',
	S: '§',
	P: '¶',
	dag: '†',
	ddag: '‡',
	pounds: '£',
	euro: '€',
	ss: 'ß',
	ae: 'æ',
	AE: 'Æ',
	oe: 'œ',
	OE: 'Œ',
	o: 'ø',
	O: 'Ø',
	l: 'ł',
	L: 'Ł',
	i: 'ı',
	quad: ' ',
	qquad: '  ',
	hfill: ' ',
	enspace: ' ',
	LaTeX: LATEX,
	TeX: TEX,
};

/** Ordres que canvien l'estil de la resta del grup: {\itshape …}, {\small …}. */
const DECLARACIONS: Record<string, [string, string] | null> = {
	itshape: ['<em>', '</em>'],
	em: ['<em>', '</em>'],
	slshape: ['<em>', '</em>'],
	bfseries: ['<strong>', '</strong>'],
	scshape: ['<span class="versaleta">', '</span>'],
	ttfamily: ['<code>', '</code>'],
	// Mides i alineacions: al web no hi pinten res.
	tiny: null,
	scriptsize: null,
	footnotesize: null,
	small: null,
	normalsize: null,
	large: null,
	Large: null,
	LARGE: null,
	huge: null,
	Huge: null,
	normalfont: null,
	upshape: null,
	mdseries: null,
	rmfamily: null,
	sffamily: null,
	centering: null,
	raggedright: null,
	raggedleft: null,
	selectfont: null,
};

/** Ordres que no pinten res al web (maquetació de pàgina, índex…). Valor: quants arguments es mengen. */
const MUDES: Record<string, number> = {
	noindent: 0,
	indent: 0,
	par: 0,
	clearpage: 0,
	newpage: 0,
	cleardoublepage: 0,
	pagebreak: 0,
	nopagebreak: 0,
	phantomsection: 0,
	relax: 0,
	protect: 0,
	nobreak: 0,
	allowbreak: 0,
	vfill: 0,
	maketitle: 0,
	tableofcontents: 0,
	frenchspacing: 0,
	thispagestyle: 1,
	pagestyle: 1,
	label: 1,
	index: 1,
	input: 1,
	include: 1,
	color: 1,
	hspace: 1,
	'hspace*': 1,
	setlength: 2,
	setcounter: 2,
	addtocounter: 2,
	addcontentsline: 3,
};

const ACCENTS: Record<string, string> = {
	"'": '́',
	'`': '̀',
	'^': '̂',
	'"': '̈',
	'~': '̃',
	'=': '̄',
	'.': '̇',
	c: '̧',
	u: '̆',
	v: '̌',
	H: '̋',
	r: '̊',
	k: '̨',
};

const MESOS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

/** `nom in obj` també troba «constructor» i companyia; això no. */
const te = (obj: object, clau: string) => Object.prototype.hasOwnProperty.call(obj, clau);

const urlSegura = (u: string) => (/^(https?:|mailto:)/i.test(u.trim()) ? escapa(u.trim()) : '#');

/** Una ordre dins d'un paràgraf. Torna l'HTML i on continua el text. */
function ordreEnLinia(nom: string, s: string, j: number, ctx: Context): [string, number] {
	const arg = (): [string, number] => {
		const g = grup(s, j);
		return g ? [enLinia(g[0], ctx), g[1]] : ['', j];
	};
	const embolcalla = (obre: string, tanca: string): [string, number] => {
		const [h, fi] = arg();
		return [obre + h + tanca, fi];
	};

	if (te(SIMBOLS, nom)) return [SIMBOLS[nom], /[A-Za-z]$/.test(nom) ? finalOrdre(s, j) : j];
	if (te(MUDES, nom)) return ['', MUDES[nom] ? salta(s, j, MUDES[nom]) : finalOrdre(s, j)];
	if (te(ACCENTS, nom)) {
		// \'e, \`{a}, \c{c}, \c c
		const g = grup(s, j);
		const k = /[A-Za-z]/.test(nom) ? saltaEspais(s, j) : j;
		const [lletra, fi] = g ? [g[0], g[1]] : [s[k] ?? '', k + 1];
		return [escapa((lletra + ACCENTS[nom]).normalize('NFC')), fi];
	}

	switch (nom) {
		case 'textit':
		case 'emph':
		case 'textsl':
			return embolcalla('<em>', '</em>');
		case 'textbf':
			return embolcalla('<strong>', '</strong>');
		case 'textsc':
			return embolcalla('<span class="versaleta">', '</span>');
		case 'underline':
			return embolcalla('<u>', '</u>');
		case 'texttt':
			return embolcalla('<code>', '</code>');
		case 'textsuperscript':
			return embolcalla('<sup>', '</sup>');
		case 'textsubscript':
			return embolcalla('<sub>', '</sub>');
		case 'textup':
		case 'textnormal':
		case 'textrm':
		case 'textsf':
		case 'textmd':
		case 'mbox':
		case 'hbox':
		case 'text':
			return arg();
		case 'textcolor': {
			const fi = salta(s, j, 1);
			const g = grup(s, fi);
			return g ? [enLinia(g[0], ctx), g[1]] : ['', fi];
		}
		case 'speaker':
			return embolcalla('<span class="parla">', '</span>');
		case 'lettrine': {
			let fi = opcional(s, j)?.[1] ?? j;
			const a = grup(s, fi);
			if (!a) return ['', fi];
			const b = grup(s, a[1]);
			fi = b ? b[1] : a[1];
			return [
				`<span class="caplletra">${enLinia(a[0], ctx)}</span><span class="versaleta">${b ? enLinia(b[0], ctx) : ''}</span>`,
				fi,
			];
		}
		case 'vers': {
			const [h, fi] = arg();
			return [`<span class="vers">${h}</span><br>`, fi];
		}
		case '\\':
		case 'newline':
		case 'linebreak': {
			let fi = s[j] === '*' ? j + 1 : j;
			fi = opcional(s, fi)?.[1] ?? fi;
			return ['<br>', nom === '\\' ? fi : finalOrdre(s, fi)];
		}
		case 'vspace':
		case 'vspace*':
		case 'addvspace':
			return ['<span class="espai"></span>', salta(s, j, 1)];
		case 'medskip':
		case 'bigskip':
		case 'smallskip':
			return ['<span class="espai"></span>', finalOrdre(s, j)];
		case 'rule':
			return ['', salta(s, opcional(s, j)?.[1] ?? j, 2)];
		case 'the': {
			const [qui, fi] = nomOrdre(s, j);
			const ara = new Date();
			const valor = { year: ara.getFullYear(), month: ara.getMonth() + 1, day: ara.getDate() }[qui];
			return [valor !== undefined ? String(valor) : '', finalOrdre(s, fi)];
		}
		case 'today': {
			const ara = new Date();
			return [`${ara.getDate()} de ${MESOS[ara.getMonth()]} de ${ara.getFullYear()}`, finalOrdre(s, j)];
		}
		case 'footnote': {
			const [h, fi] = arg();
			ctx.notes.push(h);
			const n = ctx.notes.length;
			const id = `${ctx.prefix}-${n}`;
			return [`<sup class="nota"><a href="#nota-${id}" id="crida-${id}">${n}</a></sup>`, fi];
		}
		case 'url': {
			const g = grup(s, j);
			if (!g) return ['', j];
			return [`<a href="${urlSegura(g[0])}">${escapa(g[0])}</a>`, g[1]];
		}
		case 'href': {
			const u = grup(s, j);
			if (!u) return ['', j];
			const t = grup(s, u[1]);
			return [`<a href="${urlSegura(u[0])}">${t ? enLinia(t[0], ctx) : escapa(u[0])}</a>`, t ? t[1] : u[1]];
		}
		case 'si':
		case 'num':
			return arg();
		case 'SI': {
			const [n, fi] = arg();
			const g = grup(s, fi);
			return [`${n} ${g ? enLinia(g[0], ctx) : ''}`, g ? g[1] : fi];
		}
		case 'epigraf': {
			// Fora de lloc (dins d'un grup): almenys que es llegeixi.
			const a = grup(s, j);
			const b = a && grup(s, a[1]);
			return [
				`<em>${a ? enLinia(a[0], ctx) : ''}</em> —${b ? enLinia(b[0], ctx) : ''}`,
				b ? b[1] : a ? a[1] : j,
			];
		}
		case 'saltescena':
			return ['∗ ∗ ∗', finalOrdre(s, j)];
		case 'item':
			return ['• ', finalOrdre(s, opcional(s, j)?.[1] ?? j)];
		case ' ':
		case '\n':
		case '\t':
			return [' ', j];
		case ',':
			return [' ', j];
		case ';':
		case ':':
			return [' ', j];
		case '!':
		case '@':
		case '/':
			return ['', j];
		case '-':
			return ['­', j];
		case '%':
		case '&':
		case '$':
		case '#':
		case '_':
		case '{':
		case '}':
			return [escapa(nom), j];
		case '(': {
			const fi = s.indexOf('\\)', j);
			const tanca = fi < 0 ? s.length : fi;
			return [`<span class="math">${matematiques(s.slice(j, tanca))}</span>`, tanca + 2];
		}
	}

	// No la coneixem: la deixem passar amb el que porti entre claus, i l'editor
	// n'avisa. Així el text no es perd mai.
	ctx.desconegudes.add('\\' + nom);
	let out = '';
	let fi = opcional(s, j)?.[1] ?? j;
	while (s[fi] === '{') {
		const g = grup(s, fi)!;
		out += enLinia(g[0], ctx);
		fi = g[1];
	}
	return [out, fi === j && /[A-Za-z]$/.test(nom) ? finalOrdre(s, fi) : fi];
}

/** El text d'un paràgraf (sense línies en blanc) passat a HTML. */
function enLinia(s: string, ctx: Context): string {
	let out = '';
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (c === '\\') {
			const [nom, j] = nomOrdre(s, i);
			if (te(DECLARACIONS, nom)) {
				const resta = enLinia(s.slice(finalOrdre(s, j)), ctx);
				const d = DECLARACIONS[nom];
				return out + (d ? d[0] + resta + d[1] : resta);
			}
			const [h, fi] = ordreEnLinia(nom, s, j, ctx);
			out += h;
			i = fi;
			continue;
		}
		if (c === '{') {
			const [dins, fi] = grup(s, i)!;
			out += enLinia(dins, ctx);
			i = fi;
			continue;
		}
		if (c === '$') {
			const doble = s[i + 1] === '$';
			const obre = doble ? 2 : 1;
			let fi = i + obre;
			while (fi < s.length && !(s[fi] === '$' && s[fi - 1] !== '\\')) fi++;
			const tex = s.slice(i + obre, fi);
			out += doble
				? `<span class="math math-bloc">${matematiques(tex)}</span>`
				: `<span class="math">${matematiques(tex)}</span>`;
			i = fi + obre;
			continue;
		}
		if (c === '}') {
			i++;
			continue;
		}
		// Les lligadures de TeX, que fontspec aplica a EB Garamond.
		if (s.startsWith('---', i)) {
			out += '—';
			i += 3;
			continue;
		}
		if (s.startsWith('--', i)) {
			out += '–';
			i += 2;
			continue;
		}
		if (s.startsWith('``', i)) {
			out += '“';
			i += 2;
			continue;
		}
		if (s.startsWith("''", i)) {
			out += '”';
			i += 2;
			continue;
		}
		if (c === "'") {
			out += '’';
			i++;
			continue;
		}
		if (c === '`') {
			out += '‘';
			i++;
			continue;
		}
		if (c === '~') {
			out += ' ';
			i++;
			continue;
		}
		// «estu-\ diants»: una paraula partida a mà perquè quedés bé al PDF. Al web
		// la tornem a ajuntar; el navegador ja la partirà on calgui.
		if (c === '-' && s[i + 1] === '\\' && s[i + 2] === ' ' && /\p{Ll}/u.test(s[i + 3] ?? '') && /\p{L}/u.test(s[i - 1] ?? '')) {
			i += 3;
			continue;
		}
		out += c === '\n' || c === '\t' ? ' ' : escapa(c);
		i++;
	}
	return out;
}

// ── Matemàtiques ────────────────────────────────────────────────────────────
//  Prou per a una fórmula dins d'una frase. Si algun dia el llibre en porta de
//  serioses, val la pena posar-hi KaTeX.

const GREC: Record<string, string> = {
	alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
	theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
	rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
	Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ',
	Omega: 'Ω', hbar: 'ℏ', ell: 'ℓ', infty: '∞', partial: '∂', nabla: '∇', int: '∫', oint: '∮',
	sum: '∑', prod: '∏', cdot: '·', times: '×', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥',
	neq: '≠', approx: '≈', sim: '∼', equiv: '≡', propto: '∝', to: '→', rightarrow: '→', leftarrow: '←',
	Rightarrow: '⇒', Leftrightarrow: '⇔', in: '∈', forall: '∀', exists: '∃', langle: '⟨', rangle: '⟩',
	dagger: '†', circ: '∘', degree: '°', ldots: '…', cdots: '⋯',
};

function matematiques(tex: string): string {
	let out = '';
	let i = 0;
	const sub = (etiqueta: 'sup' | 'sub') => {
		const g = grup(tex, i + 1);
		const [dins, fi] = g ? [g[0], g[1]] : [tex[i + 1] ?? '', i + 2];
		out += `<${etiqueta}>${matematiques(dins)}</${etiqueta}>`;
		i = fi;
	};
	while (i < tex.length) {
		const c = tex[i];
		if (c === '^') sub('sup');
		else if (c === '_') sub('sub');
		else if (c === '{' || c === '}') i++;
		else if (c === '\\') {
			const [nom, j] = nomOrdre(tex, i);
			if (te(GREC, nom)) {
				out += GREC[nom];
				i = j;
			} else if (nom === 'frac') {
				const a = grup(tex, j);
				const b = a && grup(tex, a[1]);
				out += `${matematiques(a?.[0] ?? '')}/${matematiques(b?.[0] ?? '')}`;
				i = b ? b[1] : j;
			} else if (nom === 'sqrt') {
				const a = grup(tex, j);
				out += `√<span class="arrel">${matematiques(a?.[0] ?? '')}</span>`;
				i = a ? a[1] : j;
			} else if (['mathrm', 'text', 'mathbf', 'mathcal', 'mathbb', 'operatorname'].includes(nom)) {
				const a = grup(tex, j);
				out += `<span class="dret">${escapa(a?.[0] ?? '')}</span>`;
				i = a ? a[1] : j;
			} else if (['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det'].includes(nom)) {
				out += `<span class="dret">${nom}</span>`;
				i = j;
			} else if (nom === ',' || nom === ';' || nom === ' ' || nom === 'quad') {
				out += ' ';
				i = j;
			} else {
				out += escapa(nom.length === 1 ? nom : '');
				i = j;
			}
		} else {
			out += escapa(c);
			i++;
		}
	}
	return out;
}

// ── Blocs ───────────────────────────────────────────────────────────────────

/** Els \item d'una llista o d'un diàleg. */
function items(s: string): { etiqueta: string | null; text: string }[] {
	const talls: number[] = [];
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '{') {
			i = grup(s, i)![1] - 1;
			continue;
		}
		if (s[i] === '\\') {
			const [nom, j] = nomOrdre(s, i);
			if (nom === 'item') talls.push(i);
			i = j - 1;
		}
	}
	return talls.map((ini, k) => {
		let j = ini + '\\item'.length;
		const o = opcional(s, j);
		if (o) j = o[1];
		return { etiqueta: o ? o[0] : null, text: s.slice(j, talls[k + 1] ?? s.length).trim() };
	});
}

const NIVELLS: Record<string, string> = {
	section: 'h3',
	subsection: 'h4',
	subsubsection: 'h5',
	paragraph: 'h5',
};

function htmlEntorn(nom: string, dins: string, ctx: Context): string {
	switch (nom) {
		case 'center':
			return `<div class="centrat">${blocs(dins, ctx)}</div>`;
		case 'flushright':
			return `<div class="a-dreta">${blocs(dins, ctx)}</div>`;
		case 'flushleft':
		case 'minipage':
		case 'figure':
		case 'document':
			return blocs(dins, ctx);
		case 'quote':
		case 'quotation':
		case 'quoting':
			return `<blockquote class="cita">${blocs(dins, ctx)}</blockquote>`;
		case 'verse':
			return `<div class="poema">${blocs(dins, ctx)}</div>`;
		case 'dialogue':
		case 'platdialogue':
		case 'description':
			return `<div class="dialeg">${items(dins)
				.map(
					({ etiqueta, text }) =>
						`<p class="replica">${etiqueta !== null ? `<span class="parla">${enLinia(etiqueta, ctx)}</span> ` : ''}${enLinia(text, ctx)}</p>`,
				)
				.join('')}</div>`;
		case 'itemize':
		case 'enumerate': {
			const t = nom === 'itemize' ? 'ul' : 'ol';
			return `<${t}>${items(dins)
				.map(({ text }) => `<li>${enLinia(text, ctx)}</li>`)
				.join('')}</${t}>`;
		}
		case 'equation':
		case 'equation*':
		case 'align':
		case 'align*':
		case 'gather':
		case 'gather*':
		case 'displaymath':
			return `<p class="math math-bloc">${matematiques(dins.replace(/\\\\|&/g, ' '))}</p>`;
		case 'tabular': {
			const files = dins
				.replace(/^\s*\{[^}]*\}/, '') // les columnes: {l c r}
				.split(/\\\\/)
				.map((f) => f.replace(/\\hline/g, '').trim())
				.filter(Boolean);
			return `<table>${files
				.map((f) => `<tr>${f.split('&').map((c) => `<td>${enLinia(c.trim(), ctx)}</td>`).join('')}</tr>`)
				.join('')}</table>`;
		}
		case 'tikzpicture':
			ctx.desconegudes.add('\\begin{tikzpicture}');
			return '';
		default:
			ctx.desconegudes.add(`\\begin{${nom}}`);
			return blocs(dins, ctx);
	}
}

/**
 * Una ordre que fa bloc sencer (tanca el paràgraf que hi hagi obert). Torna
 * `null` si no n'és cap i va dins del paràgraf.
 */
function ordreDeBloc(
	nom: string,
	s: string,
	j: number,
	ctx: Context,
	alPrincipi: boolean,
): { html: string; fi: number } | null {
	switch (nom) {
		case 'par':
			return { html: '', fi: finalOrdre(s, j) };
		case 'epigraf': {
			const a = grup(s, j);
			const b = a && grup(s, a[1]);
			if (!a) return null;
			return {
				html: `<figure class="epigraf"><blockquote><p>${enLinia(a[0], ctx).trim()}</p></blockquote>${
					b ? `<figcaption>—${enLinia(b[0], ctx).trim()}</figcaption>` : ''
				}</figure>`,
				fi: b ? b[1] : a[1],
			};
		}
		case 'saltescena':
			return { html: '<hr class="salt">', fi: finalOrdre(s, j) };
		case 'begin': {
			const e = entorn(s, j);
			if (!e) return null;
			return { html: htmlEntorn(e.nom, e.dins, ctx), fi: e.fi };
		}
		case '[': {
			const fi = s.indexOf('\\]', j);
			const tanca = fi < 0 ? s.length : fi;
			return { html: `<p class="math math-bloc">${matematiques(s.slice(j, tanca))}</p>`, fi: tanca + 2 };
		}
		case 'rule':
			if (!alPrincipi) return null;
			return { html: '<hr class="filet">', fi: salta(s, opcional(s, j)?.[1] ?? j, 2) };
		case 'vspace':
		case 'vspace*':
		case 'medskip':
		case 'bigskip':
		case 'smallskip':
			if (!alPrincipi) return null;
			return { html: '<div class="espai"></div>', fi: nom.startsWith('vspace') ? salta(s, j, 1) : finalOrdre(s, j) };
		case 'newpage':
		case 'clearpage':
		case 'cleardoublepage':
			return { html: '', fi: finalOrdre(s, j) };
		case 'chapter':
		case 'chapter*':
		case 'epileg': {
			// No hauria de passar (cada capítol és un tros), però per si de cas.
			const o = opcional(s, j);
			const g = grup(s, o ? o[1] : j);
			return { html: `<h2>${g ? enLinia(g[0], ctx) : ''}</h2>`, fi: g ? g[1] : j };
		}
	}
	const base = nom.replace(/\*$/, '');
	if (te(NIVELLS, base)) {
		const o = opcional(s, j);
		const g = grup(s, o ? o[1] : j);
		const h = NIVELLS[base];
		return { html: `<${h} class="seccio">${g ? enLinia(g[0], ctx) : ''}</${h}>`, fi: g ? g[1] : j };
	}
	return null;
}

/** Un tros de LaTeX sense comentaris passat a paràgrafs i blocs. */
function blocs(s: string, ctx: Context): string {
	const out: string[] = [];
	let buf = '';

	const tancaParagraf = () => {
		let raw = buf.trim();
		buf = '';
		if (!raw) return;
		const classes: string[] = [];
		let m: RegExpMatchArray | null;
		while ((m = raw.match(/^\\(noindent|indent|par|centering)(?![A-Za-z])\s*/))) {
			if (m[1] === 'noindent') classes.push('sense-sagnat');
			raw = raw.slice(m[0].length);
		}
		// Un \\ al final del paràgraf, a LaTeX, només afegeix aire.
		raw = raw.replace(/(\s*\\\\\*?(\s*\[[^\]]*\])?)+\s*$/, '');
		if (/^\\lettrine(?![A-Za-z])/.test(raw)) classes.push('inicial');
		const html = enLinia(raw, ctx).replace(/[ \t\n]{2,}/g, ' ').trim();
		if (!html) return;
		out.push(`<p${classes.length ? ` class="${classes.join(' ')}"` : ''}>${html}</p>`);
	};

	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (c === '\n') {
			let j = i + 1;
			while (s[j] === ' ' || s[j] === '\t') j++;
			if (s[j] === '\n') {
				tancaParagraf();
				while (s[j] === '\n' || s[j] === ' ' || s[j] === '\t') j++;
				i = j;
				continue;
			}
			buf += c;
			i++;
			continue;
		}
		if (c === '{') {
			const [, fi] = grup(s, i)!;
			buf += s.slice(i, fi);
			i = fi;
			continue;
		}
		if (c === '\\') {
			const [nom, j] = nomOrdre(s, i);
			const bloc = ordreDeBloc(nom, s, j, ctx, buf.trim() === '');
			if (bloc) {
				tancaParagraf();
				if (bloc.html) out.push(bloc.html);
				i = bloc.fi;
				continue;
			}
			buf += s.slice(i, j);
			i = j;
			continue;
		}
		buf += c;
		i++;
	}
	tancaParagraf();

	if (ctx.notes.length) {
		out.push(
			`<ol class="notes">${ctx.notes
				.map((n, k) => {
					const id = `${ctx.prefix}-${k + 1}`;
					return `<li id="nota-${id}">${n} <a href="#crida-${id}" aria-label="Torna al text">↩</a></li>`;
				})
				.join('')}</ol>`,
		);
		ctx.notes = [];
	}
	return out.join('\n');
}

// ── Trossos i capítols ──────────────────────────────────────────────────────

const RE_CAPITOL = /\\(chapter\*?|epileg)(?![A-Za-z])/g;

/**
 * Talla un fitxer en trossos, un per capítol. Cada tros s'emporta la capçalera
 * de comentaris que el precedeix («% Capítol 2»), així a l'editor surt sencer.
 * Enganxant tots els trossos en ordre es recupera el fitxer exacte.
 */
export function trossos(font: string): Tros[] {
	const trams = comentaris(font);
	const dinsComentari = (p: number) => trams.some(([a, b]) => p >= a && p < b);
	const inicis: { pos: number; mena: Mena }[] = [];

	for (const m of font.matchAll(RE_CAPITOL)) {
		const p = m.index!;
		if (dinsComentari(p)) continue;
		let ini = font.lastIndexOf('\n', p - 1) + 1;
		if (font.slice(ini, p).trim() !== '') ini = p;
		else {
			while (ini > 0) {
				const ant = font.lastIndexOf('\n', ini - 2) + 1;
				if (/^[ \t]*%/.test(font.slice(ant, ini - 1))) ini = ant;
				else break;
			}
		}
		const mena: Mena = m[1] === 'chapter' ? 'capitol' : m[1] === 'chapter*' ? 'sense-numero' : 'epileg';
		inicis.push({ pos: ini, mena });
	}

	const primer = inicis[0]?.pos ?? font.length;
	const out: Tros[] = [{ mena: 'solt', inici: 0, fi: primer, font: font.slice(0, primer) }];
	inicis.forEach((c, k) => {
		const fi = inicis[k + 1]?.pos ?? font.length;
		out.push({ mena: c.mena, inici: c.pos, fi, font: font.slice(c.pos, fi) });
	});
	return out;
}

export interface Render {
	mena: Mena;
	titolHtml: string;
	titol: string;
	html: string;
	paraules: number;
	desconegudes: string[];
}

/** Un tros (un capítol) passat a HTML: el títol a part i el cos. */
export function renderitza(font: string, prefix = 'v'): Render {
	const net = senseComentaris(normalitza(font));
	const ctx = context(prefix);
	let mena: Mena = 'solt';
	let titolHtml = '';
	let cos = net;

	const m = net.match(/\\(chapter\*?|epileg)(?![A-Za-z])/);
	if (m) {
		mena = m[1] === 'chapter' ? 'capitol' : m[1] === 'chapter*' ? 'sense-numero' : 'epileg';
		let j = m.index! + m[0].length;
		const o = opcional(net, j);
		if (o) j = o[1];
		const g = grup(net, j);
		if (g) {
			titolHtml = enLinia(g[0], ctx).replace(/\s+/g, ' ').trim();
			j = g[1];
		}
		// El que hi hagi abans de l'ordre (un \setlength, p. ex.) no es veu.
		cos = net.slice(j);
	}
	const html = blocs(cos, ctx);
	return { mena, titolHtml, titol: textPla(titolHtml), html, paraules: paraulesDe(html), desconegudes: [...ctx.desconegudes] };
}

export const etiquetaDe = (mena: Mena, numero: number | null) =>
	mena === 'capitol' ? `Capítol ${numero}` : mena === 'epileg' ? 'Epíleg' : null;

/** La capçalera d'un capítol, com la dibuixa titlesec: número, filet i títol. */
export function capcalera(c: Pick<Capitol, 'etiqueta' | 'titolHtml' | 'mena'>): string {
	if (c.mena === 'solt') return '';
	return `<header class="cap">${c.etiqueta ? `<p class="cap-etiqueta">${c.etiqueta}</p>` : ''}<hr class="cap-filet"><h2 class="cap-titol">${c.titolHtml}</h2></header>`;
}

// ── El llibre sencer ────────────────────────────────────────────────────────

const RE_INPUT = /\\(?:input|include)\s*\{([^}]*)\}/g;

const dirDe = (cami: string) => (cami.includes('/') ? cami.slice(0, cami.lastIndexOf('/') + 1) : '');
const nomDe = (cami: string) => cami.slice(cami.lastIndexOf('/') + 1).replace(/\.tex$/, '');

/**
 * Els fitxers que inclou un fitxer amb \input. A LaTeX, els camins van sempre
 * des de la carpeta del fitxer principal, i el .tex és opcional.
 */
export function inputsDe(font: string, principal: string): string[] {
	const base = dirDe(principal);
	return [...senseComentaris(normalitza(font)).matchAll(RE_INPUT)].map((m) => {
		const cami = base + m[1].trim();
		return /\.[a-z]+$/i.test(cami) ? cami : cami + '.tex';
	});
}

/** Els grups {…} de primer nivell d'una pàgina de part, sense els del \rule. */
function grupsDePart(s: string): string[] {
	const out: string[] = [];
	for (let i = 0; i < s.length; ) {
		if (s[i] === '\\') {
			const [nom, j] = nomOrdre(s, i);
			if (nom === 'rule') i = salta(s, opcional(s, j)?.[1] ?? j, 2);
			else if (nom === '\\') i = opcional(s, j)?.[1] ?? j;
			else i = j;
			continue;
		}
		if (s[i] === '{') {
			const [dins, fi] = grup(s, i)!;
			out.push(dins);
			i = fi;
			continue;
		}
		i++;
	}
	return out;
}

/**
 * Llegeix el llibre a partir del fitxer principal: les parts (les pàgines amb
 * «Part II / Stasis / subtítol»), els \input i els capítols de cada fitxer, en
 * l'ordre en què surten al PDF.
 */
export function llegeixLlibre(fitxers: Fitxers, principal: string): Llibre {
	const avisos: string[] = [];
	const visitats: string[] = [];
	const peces: Peca[] = [];
	const ids = new Set<string>();
	let comptador = 0;

	const idUnic = (base: string) => {
		let id = base;
		for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
		ids.add(id);
		return id;
	};

	const font = fitxers[principal];
	if (font === undefined) return { principal, fitxers: [], peces, avisos: [`No trobo ${principal}`] };
	const net = senseComentaris(normalitza(font));
	const ini = net.indexOf('\\begin{document}');
	const fi = net.indexOf('\\end{document}');
	const cos = net.slice(ini < 0 ? 0 : ini, fi < 0 ? net.length : fi);

	// \setcounter{chapter}{-1} sol anar al preàmbul: el primer capítol és el 0.
	const inicial = [...net.slice(0, Math.max(ini, 0)).matchAll(/\\setcounter\s*\{chapter\}\s*\{\s*(-?\d+)\s*\}/g)].pop();
	if (inicial) comptador = Number(inicial[1]);

	const entra = (cami: string) => {
		const text = fitxers[cami];
		if (text === undefined) {
			avisos.push(`No trobo ${cami}`);
			return;
		}
		if (visitats.includes(cami)) return;
		visitats.push(cami);
		trossos(normalitza(text)).forEach((t, index) => {
			const r = renderitza(t.font, `${visitats.length}-${index}`);
			if (t.mena !== 'solt' || r.html.trim()) {
				const numero = t.mena === 'capitol' ? ++comptador : null;
				const titol = r.titol || nomDe(cami);
				peces.push({
					tipus: 'capitol',
					id: idUnic(slug(titol)),
					mena: t.mena,
					numero,
					etiqueta: etiquetaDe(t.mena, numero),
					titol,
					titolHtml: r.titolHtml || escapa(titol),
					html: r.html,
					paraules: r.paraules,
					fitxer: cami,
					tros: index,
					desconegudes: r.desconegudes,
				});
			}
			// Un fitxer en pot incloure d'altres: 2 Stasis.tex només fa \input de Quimica.tex.
			inputsDe(t.font, principal).forEach(entra);
		});
	};

	const RE = /\\(?:input|include)\s*\{([^}]*)\}|\\addcontentsline\s*\{toc\}\s*\{part\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}|\\setcounter\s*\{chapter\}\s*\{\s*(-?\d+)\s*\}/g;
	let darrer = 0;
	for (const m of cos.matchAll(RE)) {
		if (m[1] !== undefined) inputsDe(m[0], principal).forEach(entra);
		else if (m[2] !== undefined) {
			// «Part 0: Chaos» a l'índex; la pàgina de part, just abans, té el subtítol.
			const ctx = context('p');
			const [et, ...resta] = m[2].split(':');
			let etiqueta = textPla(enLinia(et, ctx));
			let titolHtml = enLinia(resta.join(':'), ctx).trim();
			let subtitolHtml = '';
			const centre = [...cos.slice(darrer, m.index).matchAll(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g)].pop();
			if (centre) {
				const g = grupsDePart(centre[1]);
				if (g[0]) etiqueta = textPla(enLinia(g[0], ctx)) || etiqueta;
				if (g[1]) titolHtml = enLinia(g[1], ctx).trim() || titolHtml;
				if (g[2]) subtitolHtml = enLinia(g[2], ctx).trim();
			}
			const titol = textPla(titolHtml);
			peces.push({ tipus: 'part', id: idUnic(slug(etiqueta)), etiqueta, titol, titolHtml, subtitolHtml });
		} else comptador = Number(m[3]);
		darrer = m.index! + m[0].length;
	}

	return { principal, fitxers: visitats, peces, avisos };
}
