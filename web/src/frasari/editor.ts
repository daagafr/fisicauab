// ─────────────────────────────────────────────────────────────────────────────
//  FRASARI — l'editor
//
//  1. Mira si ja has entrat (/api/lnh/sessio, la mateixa sessió que La Nostra
//     Història). Si no, ensenya el formulari.
//  2. Llegeix el frasari tal com està ara (/api/frasari/dades).
//  3. Cada cosa que fas (afegir, editar, esborrar, estrelles, canviar un nom) és
//     un canvi que s'apunta en una llista; el que veus és el frasari amb tots els
//     canvis aplicats. «Desfés» treu l'últim.
//  4. «Desa» envia la llista (/api/frasari/canvis). El servidor l'aplica sobre el
//     frasari tal com estigui en aquell moment i en fa un sol commit.
// ─────────────────────────────────────────────────────────────────────────────
import {
	aplica,
	htmlDe,
	netejaNom,
	netejaText,
	nouId,
	perBuscar,
	perNom,
	slug,
	type Canvi,
	type Estrelles,
	type Frase,
	type Frasari,
} from './frasari';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

const vistes = {
	carregant: $('#vista-carregant'),
	entrada: $('#vista-entrada'),
	configura: $('#vista-configura'),
	editor: $('#vista-editor'),
};

let original: Frasari | null = null; // l'últim que hi ha desat
let actual: Frasari | null = null; // amb els teus canvis
let canvis: Canvi[] = [];
let mode: 'local' | 'github' = 'local';
let desant = false;
let desaEnEntrar = false; // la sessió ha caducat en desar: quan tornis a entrar, desa
let editant: string | null = null; // l'id de la frase que tens oberta
let acabada: string | null = null; // l'última que has afegit, per marcar-la

const NOVA = '__nova__';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function mostra(nom: keyof typeof vistes) {
	for (const [k, el] of Object.entries(vistes)) el.hidden = k !== nom;
}

async function api(ruta: string, opcions: RequestInit = {}) {
	const r = await fetch(ruta, {
		...opcions,
		headers: { 'Content-Type': 'application/json', ...(opcions.headers ?? {}) },
		credentials: 'same-origin',
	});
	const dades = await r.json().catch(() => ({}));
	return { estat: r.status, dades };
}

// ── Sessió ──────────────────────────────────────────────────────────────────

async function inicia() {
	mostra('carregant');
	try {
		const { estat } = await api('/api/lnh/sessio');
		if (estat === 200) return carrega();
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
		const { estat } = await api('/api/lnh/sessio', {
			method: 'POST',
			body: JSON.stringify({ correu: $<HTMLInputElement>('#correu').value, contrasenya: $<HTMLInputElement>('#contrasenya').value }),
		});
		if (estat === 200) {
			$<HTMLInputElement>('#contrasenya').value = '';
			if (original) {
				mostra('editor');
				if (desaEnEntrar) desa();
			} else carrega();
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
	if (canvis.length && !confirm('Tens canvis sense desar. Vols sortir igualment?')) return;
	canvis = [];
	await api('/api/lnh/sessio', { method: 'DELETE' }).catch(() => {});
	location.reload();
}
document.querySelectorAll('[data-surt]').forEach((b) => b.addEventListener('click', surt));

// ── Llegir ──────────────────────────────────────────────────────────────────

async function carrega() {
	mostra('carregant');
	const { estat, dades } = await api('/api/frasari/dades').catch(() => ({ estat: 0, dades: {} as any }));
	if (estat === 401) return mostra('entrada');
	if (estat !== 200) {
		$('#carregant-text').textContent =
			estat === 503
				? 'L’editor encara no pot desar enlloc: falta configurar LNH_GITHUB_TOKEN (vegeu el README).'
				: `No s’ha pogut llegir el frasari${dades?.missatge ? `: ${dades.missatge}` : '.'}`;
		return;
	}
	original = dades.dades as Frasari;
	mode = dades.mode;
	canvis = [];
	recalcula();
	mostra('editor');
}

// ── Canvis ──────────────────────────────────────────────────────────────────

function recalcula() {
	actual = aplica(original!, canvis).frasari;
	pintaFormulari();
	pinta();
	pintaEstat();
}

function fes(c: Canvi, avis = '') {
	canvis.push(c);
	recalcula();
	if (avis) estat(avis, 'brut');
}

function desfes() {
	if (!canvis.length) return;
	canvis.pop();
	editant = null;
	recalcula();
}

const frase = (id: string): Frase | undefined =>
	actual!.grups.flatMap((g) => g.persones.flatMap((p) => p.frases)).find((f) => f.id === id);

// ── Pintar ──────────────────────────────────────────────────────────────────

function estat(text: string, to: '' | 'brut' | 'error' = '') {
	const el = $('#estat');
	el.textContent = text;
	el.dataset.to = to;
}

function pintaEstat() {
	$<HTMLButtonElement>('#desa').disabled = desant || canvis.length === 0;
	$<HTMLButtonElement>('#desfes').disabled = desant || canvis.length === 0;
	if (desant) return;
	if (canvis.length) estat(`${canvis.length} ${canvis.length === 1 ? 'canvi' : 'canvis'} sense desar`, 'brut');
	const persones = actual!.grups.reduce((n, g) => n + g.persones.length, 0);
	const frases = actual!.grups.reduce((n, g) => n + g.persones.reduce((m, p) => m + p.frases.length, 0), 0);
	$('#xifres').textContent = `${frases} frases · ${persones} persones`;
}

function pintaFormulari() {
	const selGrup = $<HTMLSelectElement>('#nova-grup');
	const selPersona = $<HTMLSelectElement>('#nova-persona');
	const grupAbans = selGrup.value;
	const personaAbans = selPersona.value;

	selGrup.replaceChildren(...actual!.grups.map((g) => new Option(g.nom, g.id)));
	if (grupAbans) selGrup.value = grupAbans;
	$('#camp-grup').hidden = actual!.grups.length < 2;

	const grup = actual!.grups.find((g) => g.id === selGrup.value) ?? actual!.grups[0];
	selPersona.replaceChildren(
		new Option('Tria qui…', ''),
		...[...grup.persones].sort(perNom).map((p) => new Option(p.nom, p.id)),
		new Option('＋ Una persona nova…', NOVA),
	);
	if ([...selPersona.options].some((o) => o.value === personaAbans)) selPersona.value = personaAbans;
	$('#camp-nom').hidden = selPersona.value !== NOVA;
}

const estrellaBoto = (n: number, f: Frase) =>
	`<button type="button" class="ed-estrella" data-accio="estrella" data-n="${n}" aria-pressed="${f.estrelles >= n}" title="${
		f.estrelles === n ? `Treu-li una estrella` : `${n} ${n === 1 ? 'estrella' : 'estrelles'}`
	}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#estrella"/></svg></button>`;

function fila(f: Frase, abans: Frase | undefined): string {
	if (editant === f.id) {
		const files = Math.min(12, Math.max(3, f.text.split('\n').length + Math.ceil(f.text.length / 90)));
		return `<li class="ed-frase editant" data-id="${f.id}">
			<textarea class="ed-text" rows="${files}" maxlength="3000" aria-label="Text de la frase">${esc(f.text)}</textarea>
			<div class="ed-botons">
				<button type="button" class="boto-guix ple" data-accio="fet">Fet</button>
				<button type="button" class="boto-guix" data-accio="cancela">Cancel·la</button>
				<span class="ajuda">Ctrl Enter per acabar, Esc per cancel·lar</span>
			</div>
		</li>`;
	}
	const marca = !abans ? 'nova' : abans.text !== f.text || abans.estrelles !== f.estrelles ? 'canviada' : '';
	return `<li class="ed-frase${marca === 'nova' ? ' nova-frase' : marca ? ' canviada' : ''}" data-id="${f.id}">
		<div class="ed-estrelles" role="group" aria-label="Estrelles">${[1, 2, 3].map((n) => estrellaBoto(n, f)).join('')}</div>
		<p class="frase-text">${htmlDe(f.text)}</p>
		<div class="ed-botons">
			<button type="button" class="enllac" data-accio="edita">Edita</button>
			<button type="button" class="enllac perill" data-accio="esborra">Esborra</button>
		</div>
		${marca ? `<span class="ed-marca">${marca}</span>` : ''}
	</li>`;
}

function pinta() {
	const q = perBuscar($<HTMLInputElement>('#busca').value.trim());
	const abans = new Map(original!.grups.flatMap((g) => g.persones.flatMap((p) => p.frases.map((f) => [f.id, f] as const))));
	const html: string[] = [];
	for (const g of actual!.grups) {
		for (const p of g.persones) {
			const frases = p.frases.filter((f) => !q || f.id === editant || perBuscar(`${f.text} ${p.nom}`).includes(q));
			if (!frases.length) continue;
			html.push(`<section class="ed-persona" data-persona="${p.id}" data-grup="${g.id}">
				<header class="ed-persona-cap">
					<h2>${esc(p.nom)}</h2>
					<span class="compte">${p.frases.length} ${p.frases.length === 1 ? 'frase' : 'frases'}</span>
					<button type="button" class="enllac" data-accio="afegeix-aqui">＋ Una frase seva</button>
					<button type="button" class="enllac" data-accio="reanomena">Canvia el nom</button>
				</header>
				<ol class="ed-frases">${frases.map((f) => fila(f, abans.get(f.id))).join('')}</ol>
			</section>`);
		}
	}
	const cont = $('#persones');
	cont.innerHTML = html.join('') || '<p class="ed-buit">Cap frase amb això.</p>';

	if (editant) {
		const t = cont.querySelector<HTMLTextAreaElement>('.ed-text');
		if (t && document.activeElement !== t) {
			t.focus();
			t.setSelectionRange(t.value.length, t.value.length);
		}
	}
	if (acabada) {
		cont.querySelector(`[data-id="${acabada}"]`)?.scrollIntoView({ block: 'nearest' });
		acabada = null;
	}
}

// ── Afegir ──────────────────────────────────────────────────────────────────

$('#nova-grup').addEventListener('change', pintaFormulari);
$('#nova-persona').addEventListener('change', () => {
	$('#camp-nom').hidden = $<HTMLSelectElement>('#nova-persona').value !== NOVA;
	if (!$('#camp-nom').hidden) $('#nova-nom').focus();
});

const errorNova = (text: string) => {
	const el = $('#nova-error');
	el.textContent = text;
	el.hidden = !text;
};

$('#form-nova').addEventListener('submit', (e) => {
	e.preventDefault();
	errorNova('');
	const grup = actual!.grups.find((g) => g.id === $<HTMLSelectElement>('#nova-grup').value) ?? actual!.grups[0];
	const triada = $<HTMLSelectElement>('#nova-persona').value;
	const text = netejaText($<HTMLTextAreaElement>('#nova-text').value);
	const estrelles = Number(document.querySelector<HTMLInputElement>('input[name="nova-estrelles"]:checked')!.value) as Estrelles;

	let persona: { id: string; nom: string } | undefined;
	if (triada === NOVA) {
		const nom = netejaNom($<HTMLInputElement>('#nova-nom').value);
		if (!nom) return errorNova('Falta el nom de la persona.');
		// Si ja hi és (amb el mateix nom), és la mateixa; si no, un id que no estigui agafat.
		const igual = grup.persones.find((p) => perNom(p, { nom }) === 0);
		let id = igual?.id ?? slug(nom);
		for (let i = 2; !igual && grup.persones.some((p) => p.id === id); i++) id = `${slug(nom)}-${i}`;
		persona = { id, nom: igual?.nom ?? nom };
	} else {
		const p = grup.persones.find((x) => x.id === triada);
		if (!p) return errorNova('Tria qui la va dir.');
		persona = { id: p.id, nom: p.nom };
	}
	if (!text) return errorNova('Falta la frase.');

	const id = nouId();
	acabada = id;
	fes({ tipus: 'afegeix', grup: grup.id, persona, frase: { id, text, estrelles } });
	$<HTMLSelectElement>('#nova-persona').value = persona.id;
	$('#camp-nom').hidden = true;
	$<HTMLInputElement>('#nova-nom').value = '';
	$<HTMLTextAreaElement>('#nova-text').value = '';
	document.querySelector<HTMLInputElement>('input[name="nova-estrelles"][value="0"]')!.checked = true;
	$('#nova-text').focus();
});

// ── La llista: estrelles, editar, esborrar ──────────────────────────────────

$('#busca').addEventListener('input', pinta);

$('#persones').addEventListener('click', (e) => {
	const boto = (e.target as HTMLElement).closest<HTMLElement>('[data-accio]');
	if (!boto) return;
	const accio = boto.dataset.accio;
	const id = boto.closest<HTMLElement>('[data-id]')?.dataset.id;
	const seccio = boto.closest<HTMLElement>('[data-persona]');

	if (accio === 'estrella' && id) {
		const n = Number(boto.dataset.n);
		const ara = frase(id)?.estrelles ?? 0;
		fes({ tipus: 'estrelles', id, estrelles: (ara === n ? n - 1 : n) as Estrelles });
	} else if (accio === 'edita' && id) {
		editant = id;
		pinta();
	} else if (accio === 'fet' && id) {
		acabaEdicio(id);
	} else if (accio === 'cancela') {
		editant = null;
		pinta();
	} else if (accio === 'esborra' && id) {
		fes({ tipus: 'esborra', id }, 'Frase esborrada. Si t’has equivocat, «Desfés».');
	} else if (accio === 'reanomena' && seccio) {
		const p = actual!.grups.flatMap((g) => g.persones).find((x) => x.id === seccio.dataset.persona);
		const nom = p && prompt('Com es diu?', p.nom);
		if (p && nom && netejaNom(nom) && netejaNom(nom) !== p.nom) fes({ tipus: 'reanomena', persona: p.id, nom: netejaNom(nom) });
	} else if (accio === 'afegeix-aqui' && seccio) {
		$<HTMLSelectElement>('#nova-grup').value = seccio.dataset.grup!;
		pintaFormulari();
		$<HTMLSelectElement>('#nova-persona').value = seccio.dataset.persona!;
		$('#camp-nom').hidden = true;
		$('#form-nova').scrollIntoView({ block: 'start' });
		$('#nova-text').focus({ preventScroll: true });
	}
});

function acabaEdicio(id: string) {
	const t = document.querySelector<HTMLTextAreaElement>(`[data-id="${id}"] .ed-text`);
	const text = netejaText(t?.value ?? '');
	editant = null;
	if (!text) {
		estat('Una frase no pot quedar buida. Si la vols treure, «Esborra».', 'error');
		return pinta();
	}
	if (text !== frase(id)?.text) fes({ tipus: 'edita', id, text });
	else pinta();
}

$('#persones').addEventListener('keydown', (e) => {
	const t = e.target as HTMLElement;
	if (!t.matches('.ed-text')) return;
	const id = t.closest<HTMLElement>('[data-id]')!.dataset.id!;
	if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
		e.preventDefault();
		acabaEdicio(id);
	} else if (e.key === 'Escape') {
		editant = null;
		pinta();
	}
});

// ── Desar ───────────────────────────────────────────────────────────────────

async function desa() {
	if (desant) return;
	if (editant) acabaEdicio(editant); // el que tinguis obert també es desa
	if (!canvis.length) return;
	desant = true;
	desaEnEntrar = false;
	estat('Desant…');
	pintaEstat();
	$('#commit').hidden = true;

	const enviats = canvis.slice();
	const { estat: codi, dades } = await api('/api/frasari/canvis', {
		method: 'POST',
		body: JSON.stringify({ canvis: enviats }),
	}).catch(() => ({ estat: 0, dades: {} as any }));
	desant = false;

	if (codi === 200) {
		original = dades.dades as Frasari;
		canvis = canvis.slice(enviats.length); // el que hagis fet mentre desava, es queda
		recalcula();
		let text = dades.iguals
			? 'No hi havia res a canviar.'
			: mode === 'github'
				? 'Desat. Sortirà al web en un parell de minuts.'
				: 'Desat al disc.';
		if (dades.saltats) {
			text += ` ${dades.saltats === 1 ? 'Un canvi no s’ha pogut aplicar' : `${dades.saltats} canvis no s’han pogut aplicar`}: algú altre havia esborrat aquelles frases.`;
		}
		if (!canvis.length) estat(text);
		if (dades.enllac) {
			$<HTMLAnchorElement>('#commit').href = dades.enllac;
			$('#commit').hidden = false;
		}
	} else if (codi === 401) {
		desaEnEntrar = true;
		mostra('entrada');
		errorEntrada('La sessió ha caducat. Torna a entrar i es desarà.');
		pintaEstat();
	} else {
		pintaEstat();
		estat(
			codi === 409
				? 'Hi ha massa gent desant alhora. Torna-ho a provar.'
				: codi === 503
					? 'Encara no es pot desar: falta configurar LNH_GITHUB_TOKEN (vegeu el README).'
					: `No s’ha pogut desar${dades?.missatge ? `: ${dades.missatge}` : '.'}`,
			'error',
		);
	}
}

$('#desa').addEventListener('click', desa);
$('#desfes').addEventListener('click', desfes);

document.addEventListener('keydown', (e) => {
	if (vistes.editor.hidden) return;
	const mod = e.ctrlKey || e.metaKey;
	if (mod && e.key.toLowerCase() === 's') {
		e.preventDefault();
		desa();
	} else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !(e.target as HTMLElement).matches('input, textarea')) {
		e.preventDefault();
		desfes();
	}
});

addEventListener('beforeunload', (e) => {
	if (canvis.length) e.preventDefault();
});

inicia();
