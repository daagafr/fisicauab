// /api/lnh/sessio — entrar (POST), saber qui ha entrat (GET) i sortir (DELETE).
import type { APIRoute } from 'astro';
import { comprova, configurat, obre, qui, tanca } from '../../../lnh/sessio';
import { espera, json, mateixOrigen } from './_comu';

export const prerender = false;

export const GET: APIRoute = ({ cookies }) => {
	if (!configurat()) return json({ error: 'no-configurat' }, 503);
	const correu = qui(cookies);
	return correu ? json({ correu }) : json({ error: 'sense-sessio' }, 401);
};

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!mateixOrigen(request)) return json({ error: 'origen' }, 403);
	if (!configurat()) return json({ error: 'no-configurat' }, 503);

	const dades = await request.json().catch(() => null);
	const correu = typeof dades?.correu === 'string' ? dades.correu : '';
	const contrasenya = typeof dades?.contrasenya === 'string' ? dades.contrasenya : '';
	if (!correu || !contrasenya || correu.length > 200 || contrasenya.length > 500) {
		return json({ error: 'dades' }, 400);
	}

	const admin = comprova(correu, contrasenya);
	if (!admin) {
		await espera(700); // que provar contrasenyes a cegues sigui lent
		return json({ error: 'credencials' }, 401);
	}
	obre(cookies, admin);
	return json({ correu: admin });
};

export const DELETE: APIRoute = ({ request, cookies }) => {
	if (!mateixOrigen(request)) return json({ error: 'origen' }, 403);
	tanca(cookies);
	return json({ ok: true });
};
