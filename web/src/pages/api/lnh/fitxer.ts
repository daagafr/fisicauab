// /api/lnh/fitxer — desa un .tex del llibre (PUT). Cal haver entrat.
//
// Rep el fitxer sencer i el sha que tenia quan l'editor el va llegir. Si algú
// l'ha desat mentrestant, el sha ja no quadra i torna un 409: l'editor avisa i
// no trepitja el canvi de ningú.
import type { APIRoute } from 'astro';
import { camiValid, Conflicte, diposit, NoConfigurat, NoExisteix } from '../../../lnh/diposit';
import { qui } from '../../../lnh/sessio';
import { json, mateixOrigen } from './_comu';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies }) => {
	if (!mateixOrigen(request)) return json({ error: 'origen' }, 403);
	const admin = qui(cookies);
	if (!admin) return json({ error: 'sense-sessio' }, 401);

	const dades = await request.json().catch(() => null);
	const { cami, font, sha, titol } = dades ?? {};
	if (!camiValid(cami) || typeof font !== 'string' || font.length > 500_000 || typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
		return json({ error: 'dades' }, 400);
	}
	const que = typeof titol === 'string' && titol.trim() ? `«${titol.trim().slice(0, 80)}»` : cami;

	try {
		const r = await diposit().desa(cami, font, sha, `La Nostra Història: edita ${que} des del web`, admin);
		return json(r);
	} catch (e) {
		if (e instanceof Conflicte) return json({ error: 'conflicte' }, 409);
		if (e instanceof NoExisteix) return json({ error: 'no-existeix' }, 404);
		if (e instanceof NoConfigurat) return json({ error: 'no-configurat', missatge: e.message }, 503);
		console.error(e);
		return json({ error: 'desat', missatge: e instanceof Error ? e.message : String(e) }, 502);
	}
};
