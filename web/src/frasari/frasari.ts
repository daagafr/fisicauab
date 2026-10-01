// ─────────────────────────────────────────────────────────────────────────────
//  FRASARI — les dades i com es pinten
//
//  Tot el frasari és un sol fitxer, ../Frasari/frasari.json: grups (ara, només
//  «Profes»), dins de cada grup les persones i dins de cada persona les frases.
//  Cada frase té de 0 a 3 estrelles.
//
//  L'editor no envia el fitxer sencer: envia la llista de canvis que has fet
//  (afegeix, edita, esborra, estrelles, reanomena) i el servidor els aplica al
//  fitxer tal com estigui en aquell moment. Així dos admins poden editar alhora
//  sense trepitjar-se.
//
//  Aquest fitxer el fan servir la pàgina, l'editor (al navegador) i el servidor.
// ─────────────────────────────────────────────────────────────────────────────

export type Estrelles = 0 | 1 | 2 | 3;

export interface Frase {
	id: string;
	/**
	 * Tal com al frasari: amb les cometes i el context entre parèntesis. Pot tenir
	 * diverses línies (els diàlegs, «Nom: …»). **negreta**, _cursiva_ i *accions*.
	 */
	text: string;
	estrelles: Estrelles;
}

export interface Persona {
	id: string;
	nom: string;
	frases: Frase[];
}

export interface Grup {
	id: string;
	nom: string;
	persones: Persona[];
}

export interface Frasari {
	grups: Grup[];
}

export type Canvi =
	| { tipus: 'afegeix'; grup: string; persona: { id: string; nom: string }; frase: Frase }
	| { tipus: 'edita'; id: string; text: string }
	| { tipus: 'esborra'; id: string }
	| { tipus: 'estrelles'; id: string; estrelles: Estrelles }
	| { tipus: 'reanomena'; persona: string; nom: string };

export const MAX_TEXT = 3000;
export const MAX_NOM = 80;

// ── Petites ajudes ──────────────────────────────────────────────────────────

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const idValid = (x: unknown): x is string => typeof x === 'string' && ID.test(x);

/** Un id curt i aleatori per a una frase nova. */
export function nouId(): string {
	const bytes = new Uint8Array(6);
	globalThis.crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

/** «Ramón Muñoz» → «ramon-munoz». */
export const slug = (nom: string) =>
	nom
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60) || 'persona';

/** Salts de línia d'Unix, sense espais sobrers al final de les línies ni als extrems. */
export const netejaText = (text: string) =>
	text
		.normalize('NFC')
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((l) => l.trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

export const netejaNom = (nom: string) => nom.normalize('NFC').replace(/\s+/g, ' ').trim();

const esEstrelles = (x: unknown): x is Estrelles => x === 0 || x === 1 || x === 2 || x === 3;

const ordre = new Intl.Collator('ca', { sensitivity: 'base' });
export const perNom = (a: { nom: string }, b: { nom: string }) => ordre.compare(a.nom, b.nom);

/** El fitxer, tal com es desa: tabulacions i un salt de línia al final. */
export const serialitza = (f: Frasari) => JSON.stringify(f, null, '\t') + '\n';

/** Totes les frases, amb qui les va dir. */
export function totes(f: Frasari) {
	return f.grups.flatMap((grup) =>
		grup.persones.flatMap((persona) => persona.frases.map((frase) => ({ grup, persona, frase }))),
	);
}

// ── Validar el que arriba de fora ───────────────────────────────────────────

export function esFrasari(x: unknown): x is Frasari {
	const f = x as Frasari;
	return (
		!!f &&
		Array.isArray(f.grups) &&
		f.grups.every(
			(g) =>
				idValid(g?.id) &&
				typeof g.nom === 'string' &&
				Array.isArray(g.persones) &&
				g.persones.every(
					(p) =>
						idValid(p?.id) &&
						typeof p.nom === 'string' &&
						Array.isArray(p.frases) &&
						p.frases.every((fr) => idValid(fr?.id) && typeof fr.text === 'string' && esEstrelles(fr.estrelles)),
				),
		)
	);
}

const textValid = (t: unknown): t is string => typeof t === 'string' && netejaText(t).length > 0 && t.length <= MAX_TEXT;
const nomValid = (n: unknown): n is string => typeof n === 'string' && netejaNom(n).length > 0 && n.length <= MAX_NOM;

export function esCanvi(x: unknown): x is Canvi {
	const c = x as Canvi;
	if (!c || typeof c !== 'object') return false;
	switch (c.tipus) {
		case 'afegeix':
			return (
				idValid(c.grup) &&
				idValid(c.persona?.id) &&
				nomValid(c.persona.nom) &&
				idValid(c.frase?.id) &&
				textValid(c.frase.text) &&
				esEstrelles(c.frase.estrelles)
			);
		case 'edita':
			return idValid(c.id) && textValid(c.text);
		case 'esborra':
			return idValid(c.id);
		case 'estrelles':
			return idValid(c.id) && esEstrelles(c.estrelles);
		case 'reanomena':
			return idValid(c.persona) && nomValid(c.nom);
		default:
			return false;
	}
}

// ── Aplicar canvis ──────────────────────────────────────────────────────────

/**
 * Aplica els canvis, en ordre, a una còpia del frasari. Els que ja no tenen sentit
 * (editar una frase que algú altre ha esborrat, per exemple) se salten i es
 * compten. Les persones que es queden sense frases desapareixen.
 */
export function aplica(original: Frasari, canvis: Canvi[]): { frasari: Frasari; saltats: number } {
	const f: Frasari = structuredClone(original);
	let saltats = 0;

	const trobaFrase = (id: string) => {
		for (const g of f.grups)
			for (const p of g.persones) {
				const i = p.frases.findIndex((fr) => fr.id === id);
				if (i >= 0) return { persona: p, i };
			}
		return null;
	};

	for (const c of canvis) {
		switch (c.tipus) {
			case 'afegeix': {
				const grup = f.grups.find((g) => g.id === c.grup);
				if (!grup || trobaFrase(c.frase.id)) {
					saltats++;
					break;
				}
				let persona = grup.persones.find((p) => p.id === c.persona.id);
				if (!persona) {
					persona = { id: c.persona.id, nom: netejaNom(c.persona.nom), frases: [] };
					grup.persones.push(persona);
				}
				persona.frases.push({ id: c.frase.id, text: netejaText(c.frase.text), estrelles: c.frase.estrelles });
				break;
			}
			case 'edita':
			case 'esborra':
			case 'estrelles': {
				const on = trobaFrase(c.id);
				if (!on) {
					saltats++;
					break;
				}
				const frase = on.persona.frases[on.i];
				if (c.tipus === 'edita') frase.text = netejaText(c.text);
				else if (c.tipus === 'estrelles') frase.estrelles = c.estrelles;
				else on.persona.frases.splice(on.i, 1);
				break;
			}
			case 'reanomena': {
				const persona = f.grups.flatMap((g) => g.persones).find((p) => p.id === c.persona);
				if (persona) persona.nom = netejaNom(c.nom);
				else saltats++;
				break;
			}
		}
	}

	for (const g of f.grups) {
		g.persones = g.persones.filter((p) => p.frases.length > 0);
		g.persones.sort(perNom);
	}
	return { frasari: f, saltats };
}

/** «afegeix 2 frases, edita'n 1…», per al missatge del commit. */
export function resum(canvis: Canvi[]): string {
	const n = (tipus: Canvi['tipus']) => canvis.filter((c) => c.tipus === tipus).length;
	const trossos = [
		n('afegeix') && `afegeix ${n('afegeix')} ${n('afegeix') === 1 ? 'frase' : 'frases'}`,
		n('edita') && `edita'n ${n('edita')}`,
		n('esborra') && `esborra'n ${n('esborra')}`,
		n('estrelles') && `canvia les estrelles de ${n('estrelles')}`,
		n('reanomena') && `reanomena ${n('reanomena') === 1 ? 'una persona' : `${n('reanomena')} persones`}`,
	].filter(Boolean);
	return trossos.join(', ') || 'sense canvis';
}

// ── Pintar una frase ────────────────────────────────────────────────────────

const escapa = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Embolica cada parèntesi de primer nivell (amb els que porti dins) en un <span>. */
function contextos(linia: string): string {
	let out = '';
	let fondaria = 0;
	let obert = -1;
	for (let i = 0; i < linia.length; i++) {
		const ch = linia[i];
		if (ch === '(') {
			if (fondaria === 0) obert = out.length;
			fondaria++;
			out += ch;
		} else if (ch === ')' && fondaria > 0) {
			fondaria--;
			out += ch;
			if (fondaria === 0) out = `${out.slice(0, obert)}<span class="context">${out.slice(obert)}</span>`;
		} else out += ch;
	}
	return out;
}

/** Qui parla, als diàlegs: «Unai: …» a l'inici de la línia. */
const QUI = /^([A-ZÀ-ÖØ-Þ][^:“”"(<]{0,24}):(\s|$)/;

/**
 * El text d'una frase, en HTML (segur: tot el que no és format s'escapa).
 * Cada línia va en un <span class="linia">.
 */
export function htmlDe(text: string): string {
	return text
		.split('\n')
		.map((linia) => {
			let h = contextos(escapa(linia));
			h = h.replace(QUI, '<span class="qui">$1</span>:$2');
			h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
			h = h.replace(/_([^_]+)_/g, '<em>$1</em>');
			h = h.replace(/\*([^*]+)\*/g, '<span class="accio">*$1*</span>');
			return `<span class="linia">${h}</span>`;
		})
		.join('');
}

/** El text pla, per buscar: sense format, en minúscules i sense accents. */
export const perBuscar = (text: string) =>
	text
		.replace(/\*\*|[_*]/g, '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
