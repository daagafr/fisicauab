// ─────────────────────────────────────────────────────────────────────────────
//  FRASARI — on viu el fitxer
//
//  És a la carpeta del costat del web, Frasari/frasari.json, com La Nostra
//  Història. La pàgina el llegeix del disc quan es construeix; l'editor, cada cop
//  que l'obres. Es desa igual que el llibre (i amb els mateixos admins i el mateix
//  token): al disc en local, i amb un commit a GitHub al web publicat, que Vercel
//  torna a publicar en un parell de minuts.
//
//  (No és dins de src/ a propòsit: en local, el servidor de desenvolupament
//  recarregaria l'editor cada vegada que desessis.)
//
//  Només es fa servir al servidor i en construir el web.
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { obreDiposit } from '../lnh/diposit';
import { esFrasari, type Frasari } from './frasari';

/** La carpeta, des de l'arrel del repositori. */
export const CARPETA = 'Frasari';
export const FITXER = 'frasari.json';

/** La carpeta al disc. `npm run dev` s'executa des de web/. */
function arrelLocal(): string | null {
	for (const base of [path.resolve(process.cwd(), '..'), process.cwd()]) {
		const arrel = path.join(base, CARPETA);
		if (existsSync(path.join(arrel, FITXER))) return arrel;
	}
	return null;
}

export const diposit = () => obreDiposit(CARPETA, import.meta.env.DEV ? arrelLocal() : null, 'fisicauab-frasari');

/**
 * El frasari llegit del disc, per a la pàgina i el banner. Si no el troba o està
 * malmès, s'atura: val més que falli la publicació que no pas publicar-lo buit.
 */
export function frasariDelDisc(): Frasari {
	const arrel = arrelLocal();
	if (!arrel) {
		throw new Error(
			`No trobo «${CARPETA}/${FITXER}» al costat del web. A Vercel, activa «Include files outside the root directory» (Settings → Build and Deployment).`,
		);
	}
	const dades = JSON.parse(readFileSync(path.join(arrel, FITXER), 'utf8'));
	if (!esFrasari(dades)) throw new Error(`«${CARPETA}/${FITXER}» està malmès.`);
	return dades;
}
