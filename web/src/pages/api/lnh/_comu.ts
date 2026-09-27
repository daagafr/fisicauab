// Coses que comparteixen les rutes de l'editor de La Nostra Història.
// (El _ del nom fa que Astro no el publiqui com a ruta.)

export const json = (dades: unknown, estat = 200) =>
	new Response(JSON.stringify(dades), {
		status: estat,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
	});

/** Les peticions que canvien coses només poden venir del mateix web. */
export const mateixOrigen = (request: Request) => {
	const origen = request.headers.get('origin');
	return !origen || origen === new URL(request.url).origin;
};

export const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
