// /api/frasari/canvis — desa els canvis de l'editor (POST). Cal haver entrat.
//
// No rep el fitxer sencer, sinó la llista de canvis: el servidor llegeix el
// frasari tal com està ara, els hi aplica i el desa. Si algú altre desa just
// entremig, el sha ja no quadra; aleshores torna a llegir i a aplicar.
import type { APIRoute } from 'astro';
import { Conflicte, NoConfigurat } from '../../../lnh/diposit';
import { qui } from '../../../lnh/sessio';
import { diposit, FITXER } from '../../../frasari/diposit';
import { aplica, esCanvi, esFrasari, resum, serialitza } from '../../../frasari/frasari';
import { json, mateixOrigen } from '../lnh/_comu';

export const prerender = false;

const INTENTS = 3;

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!mateixOrigen(request)) return json({ error: 'origen' }, 403);
	const admin = qui(cookies);
	if (!admin) return json({ error: 'sense-sessio' }, 401);

	const cos = await request.json().catch(() => null);
	const canvis: unknown = cos?.canvis;
	if (!Array.isArray(canvis) || canvis.length === 0 || canvis.length > 2000 || !canvis.every(esCanvi)) {
		return json({ error: 'dades' }, 400);
	}

	try {
		const d = diposit();
		for (let intent = 0; intent < INTENTS; intent++) {
			const f = await d.llegeix(FITXER);
			const ara = f && JSON.parse(f.font);
			if (!f || !esFrasari(ara)) return json({ error: 'lectura', missatge: `${FITXER} no hi és o està malmès` }, 502);

			const { frasari, saltats } = aplica(ara, canvis);
			const font = serialitza(frasari);
			if (font === f.font) return json({ dades: frasari, saltats, iguals: true });
			try {
				const r = await d.desa(FITXER, font, f.sha, `Frasari: ${resum(canvis)} des del web`, admin);
				return json({ dades: frasari, saltats, enllac: r.enllac });
			} catch (e) {
				if (!(e instanceof Conflicte)) throw e;
			}
		}
		return json({ error: 'conflicte' }, 409);
	} catch (e) {
		if (e instanceof NoConfigurat) return json({ error: 'no-configurat', missatge: e.message }, 503);
		console.error(e);
		return json({ error: 'desat', missatge: e instanceof Error ? e.message : String(e) }, 502);
	}
};
