// /api/lnh/llibre — tots els .tex del llibre, acabats de llegir, per a l'editor.
import type { APIRoute } from 'astro';
import { diposit, fitxersDelLlibre, NoConfigurat, PRINCIPAL } from '../../../lnh/diposit';
import { qui } from '../../../lnh/sessio';
import { json } from './_comu';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	if (!qui(cookies)) return json({ error: 'sense-sessio' }, 401);
	try {
		const d = diposit();
		return json({ mode: d.mode, principal: PRINCIPAL, fitxers: await fitxersDelLlibre(d) });
	} catch (e) {
		if (e instanceof NoConfigurat) return json({ error: 'no-configurat', missatge: e.message }, 503);
		console.error(e);
		return json({ error: 'lectura', missatge: e instanceof Error ? e.message : String(e) }, 502);
	}
};
