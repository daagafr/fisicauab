// /api/frasari/dades — el frasari acabat de llegir, per a l'editor. Cal haver entrat.
import type { APIRoute } from 'astro';
import { NoConfigurat } from '../../../lnh/diposit';
import { qui } from '../../../lnh/sessio';
import { diposit, FITXER } from '../../../frasari/diposit';
import { esFrasari } from '../../../frasari/frasari';
import { json } from '../lnh/_comu';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	if (!qui(cookies)) return json({ error: 'sense-sessio' }, 401);
	try {
		const d = diposit();
		const f = await d.llegeix(FITXER);
		const dades = f && JSON.parse(f.font);
		if (!esFrasari(dades)) return json({ error: 'lectura', missatge: `${FITXER} no hi és o està malmès` }, 502);
		return json({ mode: d.mode, dades });
	} catch (e) {
		if (e instanceof NoConfigurat) return json({ error: 'no-configurat', missatge: e.message }, 503);
		console.error(e);
		return json({ error: 'lectura', missatge: e instanceof Error ? e.message : String(e) }, 502);
	}
};
