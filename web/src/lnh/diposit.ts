// ─────────────────────────────────────────────────────────────────────────────
//  LA NOSTRA HISTÒRIA — on viuen els fitxers .tex
//
//  El llibre és a la carpeta del costat del web (../La Nostra Història) i el web
//  el llegeix d'allà: la pàgina quan es construeix, i l'editor cada cop que
//  l'obres. Quan un admin desa, el canvi va a parar al mateix .tex:
//
//  - En local (npm run dev), s'escriu directament al disc.
//  - Al web publicat, es fa un commit a GitHub. Vercel el veu i torna a publicar
//    el web amb el text nou (triga un minut o dos).
//
//  Només es fa servir al servidor.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LNH_GITHUB_BRANCA, LNH_GITHUB_REPO, LNH_GITHUB_TOKEN } from 'astro:env/server';
import { inputsDe, llegeixLlibre, type Llibre } from './latex';

/** La carpeta del llibre, des de l'arrel del repositori. */
export const CARPETA = 'La Nostra Història';
/** El fitxer principal, des de la carpeta del llibre. */
export const PRINCIPAL = 'La Nostra Història.tex';

export interface Fitxer {
	font: string;
	sha: string; // el de git: si algú l'ha canviat mentrestant, no coincideix
}

export interface Diposit {
	mode: 'local' | 'github';
	llegeix(cami: string): Promise<Fitxer | null>;
	desa(cami: string, font: string, sha: string, missatge: string, autor: string): Promise<{ sha: string; enllac?: string }>;
}

/** Algú ha desat el mateix fitxer mentre l'editaves. */
export class Conflicte extends Error {}

/** Falta configuració (el token de GitHub, normalment). */
export class NoConfigurat extends Error {}

/** L'editor només canvia fitxers que ja existeixen. */
export class NoExisteix extends Error {}

/** El mateix sha que calcula git per a un fitxer. */
export const shaGit = (text: string) => {
	const b = Buffer.from(text, 'utf8');
	return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
};

/**
 * Un camí que es pot escriure: un .tex dins de la carpeta del llibre, sense
 * pujar de carpeta. El fitxer principal no: és la maquetació, no el text.
 */
export const camiValid = (cami: unknown): cami is string =>
	typeof cami === 'string' &&
	cami.length < 300 &&
	cami.endsWith('.tex') &&
	cami !== PRINCIPAL &&
	!/[\\:\0]/.test(cami) &&
	cami.split('/').every((tros) => tros !== '' && tros !== '.' && tros !== '..');

// ── En local: el disc ───────────────────────────────────────────────────────

/** La carpeta del llibre al disc. `npm run dev` s'executa des de web/. */
function arrelLocal(): string | null {
	for (const base of [path.resolve(process.cwd(), '..'), process.cwd()]) {
		const arrel = path.join(base, CARPETA);
		if (existsSync(path.join(arrel, PRINCIPAL))) return arrel;
	}
	return null;
}

function local(arrel: string): Diposit {
	const ruta = (cami: string) => {
		const p = path.resolve(arrel, cami);
		if (!p.startsWith(arrel + path.sep)) throw new Error(`Camí fora del llibre: ${cami}`);
		return p;
	};
	const llegeix = async (cami: string) => {
		try {
			const font = await fs.readFile(ruta(cami), 'utf8');
			return { font, sha: shaGit(font) };
		} catch {
			return null;
		}
	};
	return {
		mode: 'local',
		llegeix,
		async desa(cami, font, sha) {
			const ara = await llegeix(cami);
			if (!ara) throw new NoExisteix(cami);
			if (ara.sha !== sha) throw new Conflicte();
			await fs.writeFile(ruta(cami), font, 'utf8');
			return { sha: shaGit(font) };
		},
	};
}

// ── Publicat: GitHub ────────────────────────────────────────────────────────

/** `carpeta`: des de l'arrel del repositori, amb barres (pot tenir subcarpetes). */
function github(token: string, carpeta: string, agent: string): Diposit {
	const repo = LNH_GITHUB_REPO || 'daagafr/fisicauab';
	const branca = LNH_GITHUB_BRANCA || 'main';
	const url = (cami: string) =>
		`https://api.github.com/repos/${repo}/contents/${[...carpeta.split('/'), ...cami.split('/')].map(encodeURIComponent).join('/')}`;
	const capcaleres = {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': agent,
	};

	return {
		mode: 'github',
		async llegeix(cami) {
			const r = await fetch(`${url(cami)}?ref=${encodeURIComponent(branca)}`, { headers: capcaleres, cache: 'no-store' });
			if (r.status === 404) return null;
			if (!r.ok) throw new Error(`GitHub ha respost ${r.status} en llegir ${cami}`);
			const dades = (await r.json()) as { content: string; sha: string };
			return { font: Buffer.from(dades.content, 'base64').toString('utf8'), sha: dades.sha };
		},
		async desa(cami, font, sha, missatge, autor) {
			const r = await fetch(url(cami), {
				method: 'PUT',
				headers: { ...capcaleres, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: missatge,
					content: Buffer.from(font, 'utf8').toString('base64'),
					sha,
					branch: branca,
					author: { name: autor.split('@')[0], email: autor },
				}),
			});
			if (r.status === 409) throw new Conflicte();
			if (r.status === 404) throw new NoExisteix(cami);
			if (!r.ok) throw new Error(`GitHub ha respost ${r.status}: ${(await r.text()).slice(0, 200)}`);
			const dades = (await r.json()) as { content: { sha: string }; commit: { html_url: string } };
			return { sha: dades.content.sha, enllac: dades.commit.html_url };
		},
	};
}

/**
 * On es desa una carpeta del repositori: al disc en local (si `arrel`, la mateixa
 * carpeta al disc, existeix), a GitHub al web publicat. També el fa servir el
 * Frasari (src/frasari/diposit.ts), amb els mateixos admins i el mateix token.
 */
export function obreDiposit(carpeta: string, arrel: string | null, agent: string): Diposit {
	if (import.meta.env.DEV && arrel) return local(arrel);
	if (LNH_GITHUB_TOKEN) return github(LNH_GITHUB_TOKEN, carpeta, agent);
	throw new NoConfigurat('Falta LNH_GITHUB_TOKEN');
}

/** On es desa el llibre. */
export const diposit = (): Diposit =>
	obreDiposit(CARPETA, import.meta.env.DEV ? arrelLocal() : null, 'fisicauab-la-nostra-historia');

/** El fitxer principal i tots els que inclou, amb el seu sha. */
export async function fitxersDelLlibre(d: Diposit): Promise<Record<string, Fitxer>> {
	const out: Record<string, Fitxer> = {};
	const visita = async (cami: string): Promise<void> => {
		if (cami in out) return;
		const f = await d.llegeix(cami);
		if (!f) return;
		out[cami] = f;
		await Promise.all(inputsDe(f.font, PRINCIPAL).map(visita));
	};
	await visita(PRINCIPAL);
	return out;
}

// ── En construir el web ─────────────────────────────────────────────────────

/**
 * El llibre llegit del disc, per a la pàgina. Si no troba la carpeta, s'atura:
 * val més que falli la publicació que no pas publicar un llibre buit.
 */
export function llibreDelDisc(): Llibre {
	const arrel = arrelLocal();
	if (!arrel) {
		throw new Error(
			`No trobo «${CARPETA}/${PRINCIPAL}» al costat del web. A Vercel, activa «Include files outside the root directory» (Settings → Build and Deployment).`,
		);
	}
	const fitxers: Record<string, string> = {};
	const visita = (cami: string) => {
		if (cami in fitxers) return;
		const p = path.join(arrel, cami);
		if (!existsSync(p)) return;
		fitxers[cami] = readFileSync(p, 'utf8');
		inputsDe(fitxers[cami], PRINCIPAL).forEach(visita);
	};
	visita(PRINCIPAL);
	return llegeixLlibre(fitxers, PRINCIPAL);
}
