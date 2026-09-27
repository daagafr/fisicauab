// ─────────────────────────────────────────────────────────────────────────────
//  LA NOSTRA HISTÒRIA — l'editor
//
//  Com un Overleaf petit: a l'esquerra, el LaTeX del capítol; a la dreta, com
//  quedarà a la pàgina. Edites un capítol cada vegada, però el que es desa és el
//  fitxer .tex sencer on viu, amb la resta intacta.
//
//  1. Mira si ja has entrat (/api/lnh/sessio). Si no, ensenya el formulari.
//  2. Llegeix tots els .tex del llibre (/api/lnh/llibre) i en treu l'índex amb
//     el mateix traductor que fa servir la pàgina (latex.ts).
//  3. En desar, envia cada fitxer canviat amb el sha que tenia quan el vas obrir
//     (/api/lnh/fitxer). Si algú l'ha desat mentrestant, avisa i no trepitja res.
// ─────────────────────────────────────────────────────────────────────────────
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { tags } from '@lezer/highlight';
import {
	capcalera,
	etiquetaDe,
	llegeixLlibre,
	normalitza,
	renderitza,
	trossos,
	type Capitol,
	type Llibre,
} from './latex';

interface Fitxer {
	cami: string;
	original: string; // l'últim que hi ha desat
	actual: string; // amb els teus canvis
	sha: string;
	crlf: boolean; // si venia amb salts de línia de Windows, es desa igual
}

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

const vistes = {
	carregant: $('#vista-carregant'),
	entrada: $('#vista-entrada'),
	configura: $('#vista-configura'),
	editor: $('#vista-editor'),
};

const fitxers = new Map<string, Fitxer>();
let principal = '';
let mode: 'local' | 'github' = 'local';
let llibre: Llibre | null = null;
let actiu: { cami: string; tros: number; ini: number; fi: number } | null = null;
const estats = new Map<string, EditorState>(); // per capítol: així el desfer no es perd en canviar
let vista: EditorView;
let desant = false;

function mostra(nom: keyof typeof vistes) {
	for (const [k, el] of Object.entries(vistes)) el.hidden = k !== nom;
	document.body.dataset.vista = nom;
}

// ── Sessió ──────────────────────────────────────────────────────────────────

async function api(ruta: string, opcions: RequestInit = {}) {
	const r = await fetch(ruta, {
		...opcions,
		headers: { 'Content-Type': 'application/json', ...(opcions.headers ?? {}) },
		credentials: 'same-origin',
	});
	const dades = await r.json().catch(() => ({}));
	return { estat: r.status, dades };
}

async function inicia() {
	mostra('carregant');
	try {
		const { estat, dades } = await api('/api/lnh/sessio');
		if (estat === 200) return carregaLlibre(dades.correu);
		if (estat === 503) return mostra('configura');
		mostra('entrada');
		$('#correu').focus();
	} catch {
		mostra('entrada');
		errorEntrada('No s’ha pogut connectar amb el servidor.');
	}
}

const errorEntrada = (text: string) => {
	const el = $('#entrada-error');
	el.textContent = text;
	el.hidden = !text;
};

$('#form-entrada').addEventListener('submit', async (e) => {
	e.preventDefault();
	const boto = $<HTMLButtonElement>('#entra');
	boto.disabled = true;
	errorEntrada('');
	try {
		const { estat, dades } = await api('/api/lnh/sessio', {
			method: 'POST',
			body: JSON.stringify({ correu: $<HTMLInputElement>('#correu').value, contrasenya: $<HTMLInputElement>('#contrasenya').value }),
		});
		if (estat === 200) {
			$<HTMLInputElement>('#contrasenya').value = '';
			if (llibre) {
				// La sessió havia caducat enmig de l'edició: tornem on érem i desem.
				mostra('editor');
				desa();
			} else carregaLlibre(dades.correu);
		} else if (estat === 401) errorEntrada('El correu o la contrasenya no són correctes.');
		else if (estat === 503) mostra('configura');
		else errorEntrada('No s’ha pogut entrar. Torna-ho a provar.');
	} catch {
		errorEntrada('No s’ha pogut connectar amb el servidor.');
	} finally {
		boto.disabled = false;
	}
});

async function surt() {
	if (hiHaCanvis() && !confirm('Tens canvis sense desar. Vols sortir igualment?')) return;
	await api('/api/lnh/sessio', { method: 'DELETE' }).catch(() => {});
	location.reload();
}
document.querySelectorAll('[data-surt]').forEach((b) => b.addEventListener('click', surt));

// ── El llibre ───────────────────────────────────────────────────────────────

async function carregaLlibre(correu: string) {
	mostra('carregant');
	$('#qui').textContent = correu;
	const { estat, dades } = await api('/api/lnh/llibre').catch(() => ({ estat: 0, dades: {} as any }));
	if (estat !== 200) {
		mostra('carregant');
		$('#carregant-text').textContent =
			estat === 503
				? 'L’editor encara no pot desar enlloc: falta configurar LNH_GITHUB_TOKEN (vegeu el README).'
				: `No s’ha pogut llegir el llibre${dades?.missatge ? `: ${dades.missatge}` : '.'}`;
		return;
	}
	principal = dades.principal;
	mode = dades.mode;
	for (const [cami, f] of Object.entries(dades.fitxers as Record<string, { font: string; sha: string }>)) {
		const net = normalitza(f.font);
		fitxers.set(cami, { cami, original: net, actual: net, sha: f.sha, crlf: f.font.includes('\r\n') });
	}
	$('#mode').textContent = mode === 'github' ? 'Desa a GitHub' : 'Desa al disc (local)';
	recalcula();
	mostra('editor');

	const demanat = new URLSearchParams(location.search).get('capitol');
	const primer = capitols().find((c) => c.id === demanat) ?? capitols().find((c) => c.mena !== 'solt') ?? capitols()[0];
	if (primer) obre(primer.fitxer, primer.tros);
}

const capitols = () => (llibre?.peces.filter((p): p is Capitol => p.tipus === 'capitol') ?? []);

const textos = () => Object.fromEntries([...fitxers.values()].map((f) => [f.cami, f.actual]));

/** Torna a llegir l'estructura (títols, números) amb el text d'ara. */
function recalcula() {
	llibre = llegeixLlibre(textos(), principal);
	pintaIndex();
	pintaEstat();
}

function pintaIndex() {
	const llista = $('#index');
	const select = $<HTMLSelectElement>('#tria');
	llista.replaceChildren();
	select.replaceChildren();
	let grup: HTMLOptGroupElement | null = null;

	for (const p of llibre!.peces) {
		if (p.tipus === 'part') {
			const li = document.createElement('li');
			li.className = 'index-part';
			li.textContent = `${p.etiqueta} · ${p.titol}`;
			llista.append(li);
			grup = document.createElement('optgroup');
			grup.label = `${p.etiqueta} · ${p.titol}`;
			select.append(grup);
			continue;
		}
		const nom = p.mena === 'solt' ? 'Pàgina de crèdits' : p.mena === 'capitol' ? `${p.numero}. ${p.titol}` : p.etiqueta ? `${p.etiqueta}: ${p.titol}` : p.titol;
		const esActiu = actiu?.cami === p.fitxer && actiu.tros === p.tros;
		const brut = fitxers.get(p.fitxer)!;
		const li = document.createElement('li');
		const boto = document.createElement('button');
		boto.type = 'button';
		boto.className = 'index-capitol';
		boto.textContent = nom;
		if (esActiu) boto.setAttribute('aria-current', 'true');
		if (brut.actual !== brut.original) boto.dataset.brut = '';
		boto.addEventListener('click', () => obre(p.fitxer, p.tros));
		li.append(boto);
		llista.append(li);

		const opcio = new Option(nom, `${p.fitxer}#${p.tros}`, false, esActiu);
		(grup ?? select).append(opcio);
	}
}

$<HTMLSelectElement>('#tria').addEventListener('change', (e) => {
	const valor = (e.target as HTMLSelectElement).value;
	const talla = valor.lastIndexOf('#');
	obre(valor.slice(0, talla), Number(valor.slice(talla + 1)));
});

// ── L'editor ────────────────────────────────────────────────────────────────

const colors = HighlightStyle.define([
	{ tag: tags.tagName, color: 'var(--accent)', fontWeight: '600' }, // \ordres
	{ tag: tags.keyword, color: 'var(--accent)', fontWeight: '600' }, // $ i companyia
	{ tag: tags.atom, color: 'var(--ed-atom)' }, // {entorns}
	{ tag: tags.bracket, color: 'var(--ed-clau)' },
	{ tag: tags.comment, color: 'var(--ed-comentari)', fontStyle: 'italic' },
	{ tag: tags.number, color: 'var(--ed-atom)' },
	{ tag: tags.invalid, color: '#c2410c' },
]);

const tema = EditorView.theme({
	'&': { height: '100%', backgroundColor: 'var(--ed-fons)', color: 'var(--tinta)', fontSize: '14.5px' },
	'.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
	'.cm-content': { padding: '1rem 0 40vh', caretColor: 'var(--accent)' },
	'.cm-line': { padding: '0 1.1rem 0 0.6rem' },
	'.cm-gutters': { backgroundColor: 'var(--ed-fons)', color: 'var(--ed-comentari)', border: 'none' },
	'.cm-activeLine': { backgroundColor: 'var(--ed-linia)' },
	'.cm-activeLineGutter': { backgroundColor: 'var(--ed-linia)', color: 'var(--tinta)' },
	'.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
	'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--ed-seleccio) !important' },
	'.cm-matchingBracket': { backgroundColor: 'var(--ed-seleccio)', outline: 'none' },
	'.cm-searchMatch': { backgroundColor: 'rgb(219 196 160 / 0.6)' },
	'.cm-panels': { backgroundColor: 'var(--paper-fosc)', color: 'var(--tinta)' },
	'.cm-foldPlaceholder': { backgroundColor: 'var(--ed-linia)', border: 'none', color: 'var(--tinta-suau)' },
});

/** Embolcalla la selecció: \textit{…}. Sense selecció, deixa el cursor a dins. */
const embolcalla = (obre: string, tanca: string) => (v: EditorView) => {
	v.dispatch(
		v.state.changeByRange((r) => ({
			changes: [
				{ from: r.from, insert: obre },
				{ from: r.to, insert: tanca },
			],
			range: r.empty
				? EditorSelection.cursor(r.from + obre.length)
				: EditorSelection.range(r.from + obre.length, r.to + obre.length),
		})),
	);
	v.focus();
	return true;
};

/** Insereix un bloc en una línia pròpia i en selecciona el tros per omplir. */
const bloc = (text: string, marca: string) => (v: EditorView) => {
	const { from } = v.state.selection.main;
	const linia = v.state.doc.lineAt(from);
	const abans = linia.text.trim() ? '\n\n' : '';
	const pos = linia.text.trim() ? linia.to : linia.from;
	const insert = `${abans}${text}\n`;
	const ini = pos + abans.length + text.indexOf(marca);
	v.dispatch({ changes: { from: pos, insert }, selection: { anchor: ini, head: ini + marca.length }, scrollIntoView: true });
	v.focus();
	return true;
};

const accions: Record<string, (v: EditorView) => boolean> = {
	cursiva: embolcalla('\\textit{', '}'),
	negreta: embolcalla('\\textbf{', '}'),
	cometes: embolcalla('«', '»'),
	nota: embolcalla('\\footnote{', '}'),
	guio: (v) => {
		v.dispatch(v.state.replaceSelection('—'));
		v.focus();
		return true;
	},
	epigraf: bloc('\\epigraf{Text de la cita}{Autor}', 'Text de la cita'),
	caplletra: bloc('\\lettrine[loversize=0.2, lines=2]{A}{ls} confins', 'ls'),
	salt: bloc('\\saltescena', '\\saltescena'),
};

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-accio]')) {
	b.addEventListener('click', () => accions[b.dataset.accio!]?.(vista));
}

let temporitzador = 0;
const extensions: Extension[] = [
	basicSetup,
	StreamLanguage.define(stex),
	syntaxHighlighting(colors),
	EditorView.lineWrapping,
	tema,
	keymap.of([
		{ key: 'Mod-s', preventDefault: true, run: () => (desa(), true) },
		{ key: 'Mod-i', run: accions.cursiva },
		{ key: 'Mod-b', run: accions.negreta },
	]),
	EditorView.updateListener.of((u) => {
		if (!u.docChanged || !actiu) return;
		const f = fitxers.get(actiu.cami)!;
		const text = u.state.doc.toString();
		f.actual = f.actual.slice(0, actiu.ini) + text + f.actual.slice(actiu.fi);
		actiu.fi = actiu.ini + text.length;
		pintaEstat();
		clearTimeout(temporitzador);
		temporitzador = window.setTimeout(() => {
			previsualitza();
			recalcula();
		}, 180);
	}),
];

vista = new EditorView({ parent: $('#codi'), state: EditorState.create({ doc: '', extensions }) });

/** Obre un capítol: el tros número `tros` del fitxer `cami`. */
function obre(cami: string, tros: number) {
	if (actiu) estats.set(`${actiu.cami}#${actiu.tros}`, vista.state);
	const f = fitxers.get(cami);
	const t = f && trossos(f.actual)[tros];
	if (!f || !t) return;

	actiu = { cami, tros, ini: t.inici, fi: t.fi };
	const desat = estats.get(`${cami}#${tros}`);
	vista.setState(desat && desat.doc.toString() === t.font ? desat : EditorState.create({ doc: t.font, extensions }));
	vista.scrollDOM.scrollTop = 0;

	$('#fitxer').textContent = cami;
	const c = capitolActiu();
	if (c) {
		history.replaceState(null, '', `?capitol=${encodeURIComponent(c.id)}`);
		$<HTMLAnchorElement>('#veure').href = `/la-nostra-historia#${c.id}`;
	}
	previsualitza();
	pintaIndex();
	document.body.dataset.panell = 'codi';
	vista.focus();
}

const capitolActiu = () => capitols().find((c) => c.fitxer === actiu?.cami && c.tros === actiu.tros);

function previsualitza() {
	const r = renderitza(vista.state.doc.toString(), 'vp');
	const c = capitolActiu();
	const etiqueta = etiquetaDe(r.mena, c?.numero ?? null);
	$('#previa').innerHTML = capcalera({ mena: r.mena, etiqueta, titolHtml: r.titolHtml }) + r.html;
	$('#titol-actiu').textContent = r.mena === 'solt' ? 'Pàgina de crèdits' : r.titol || 'Sense títol';

	const avis = $('#avis');
	avis.hidden = !r.desconegudes.length;
	avis.textContent = r.desconegudes.length
		? `El web no coneix ${r.desconegudes.join(', ')}: surt el text de dins, sense format. Al PDF, en canvi, sortirà bé.`
		: '';
}

// Que la vista prèvia acompanyi el codi mentre baixes.
vista.scrollDOM.addEventListener(
	'scroll',
	() => {
		const s = vista.scrollDOM;
		const p = $('#panell-previa');
		const fet = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight);
		p.scrollTop = fet * (p.scrollHeight - p.clientHeight);
	},
	{ passive: true },
);

// ── Desar ───────────────────────────────────────────────────────────────────

const bruts = () => [...fitxers.values()].filter((f) => f.actual !== f.original);
const hiHaCanvis = () => bruts().length > 0;

function pintaEstat(text?: string, tipus: 'ok' | 'error' | 'feina' | '' = '') {
	const el = $('#estat');
	const n = bruts().length;
	el.textContent = text ?? (n ? (n === 1 ? 'Canvis sense desar' : `Canvis sense desar en ${n} fitxers`) : 'Tot desat');
	el.dataset.tipus = tipus || (n ? 'brut' : 'ok');
	$<HTMLButtonElement>('#desa').disabled = desant || !n;
}

async function desa() {
	if (desant || !hiHaCanvis()) return;
	desant = true;
	pintaEstat('Desant…', 'feina');
	let enllac: string | undefined;
	try {
		for (const f of bruts()) {
			const titol = capitols().find((c) => c.fitxer === f.cami && actiu?.cami === f.cami && c.tros === actiu.tros)?.titol;
			const font = f.crlf ? f.actual.replace(/\n/g, '\r\n') : f.actual;
			const { estat, dades } = await api('/api/lnh/fitxer', {
				method: 'PUT',
				body: JSON.stringify({ cami: f.cami, font, sha: f.sha, titol }),
			});
			if (estat === 200) {
				f.original = f.actual;
				f.sha = dades.sha;
				enllac = dades.enllac ?? enllac;
				continue;
			}
			desant = false;
			if (estat === 401) {
				mostra('entrada');
				errorEntrada('La sessió ha caducat. Torna a entrar i es desarà el que tens.');
				return;
			}
			if (estat === 409) {
				pintaEstat('Conflicte', 'error');
				$('#conflicte-fitxer').textContent = f.cami;
				$<HTMLDialogElement>('#conflicte').showModal();
				return;
			}
			pintaEstat(`No s’ha pogut desar${dades?.missatge ? `: ${dades.missatge}` : ''}`, 'error');
			return;
		}
		desant = false;
		pintaEstat(mode === 'github' ? 'Desat. El web públic s’actualitza en un parell de minuts.' : 'Desat al disc', 'ok');
		const commit = $<HTMLAnchorElement>('#commit');
		commit.hidden = !enllac;
		if (enllac) commit.href = enllac;
		pintaIndex();
	} catch {
		desant = false;
		pintaEstat('Sense connexió: no s’ha desat', 'error');
	}
}

$('#desa').addEventListener('click', desa);

$('#conflicte-copia').addEventListener('click', async () => {
	await navigator.clipboard?.writeText(vista.state.doc.toString()).catch(() => {});
	$('#conflicte-copia').textContent = 'Copiat';
});
$('#conflicte-recarrega').addEventListener('click', () => {
	for (const f of fitxers.values()) f.original = f.actual; // que no salti l'avís de sortir
	location.reload();
});

addEventListener('beforeunload', (e) => {
	if (hiHaCanvis()) e.preventDefault();
});

// En mòbil: pestanyes entre el codi i la vista prèvia.
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-panell]')) {
	b.addEventListener('click', () => (document.body.dataset.panell = b.dataset.panell!));
}

inicia();
