// ─────────────────────────────────────────────────────────────────────────────
//  LA NOSTRA HISTÒRIA — qui pot editar
//
//  Els admins són a la variable d'entorn LNH_ADMINS, un per línia o separats per
//  comes, amb el format `correu:sal:hash`. La contrasenya no es guarda enlloc:
//  només el seu hash (scrypt). Per afegir-ne un:
//
//      npm run lnh:admin -- nom@exemple.com
//
//  En entrar, el navegador rep una galeta signada amb LNH_SECRET que dura 14
//  dies. Si esborres algú de LNH_ADMINS, la seva galeta deixa de valer.
//
//  Només es fa servir al servidor.
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { LNH_ADMINS, LNH_SECRET } from 'astro:env/server';

const GALETA = 'lnh_sessio';
/** Sense cap secret: només serveix perquè la pàgina del llibre ensenyi «Edita». */
const GALETA_VISIBLE = 'lnh_admin';
const DURADA = 60 * 60 * 24 * 14;

interface Admin {
	sal: Buffer;
	hash: Buffer;
}

function admins(): Map<string, Admin> {
	const out = new Map<string, Admin>();
	for (const entrada of (LNH_ADMINS ?? '').split(/[\s,;]+/).filter(Boolean)) {
		const [correu, sal, hash] = entrada.split(':');
		if (correu && sal && hash) {
			out.set(correu.toLowerCase(), { sal: Buffer.from(sal, 'hex'), hash: Buffer.from(hash, 'hex') });
		}
	}
	return out;
}

export const configurat = () => admins().size > 0 && (LNH_SECRET ?? '').length >= 32;

export const hashDe = (contrasenya: string, sal: Buffer = randomBytes(16)) => ({
	sal,
	hash: scryptSync(contrasenya.normalize('NFC'), sal, 32),
});

/** El correu, si la contrasenya és bona. */
export function comprova(correu: string, contrasenya: string): string | null {
	const c = correu.trim().toLowerCase();
	const admin = admins().get(c);
	// Calculem el hash encara que el correu no hi sigui, perquè el temps de
	// resposta no delati quins correus són d'admins.
	const { hash } = hashDe(contrasenya, admin?.sal ?? Buffer.alloc(16));
	if (!admin || admin.hash.length !== hash.length) return null;
	return timingSafeEqual(admin.hash, hash) ? c : null;
}

const signa = (dades: string) => createHmac('sha256', LNH_SECRET!).update(dades).digest('base64url');

export function obre(galetes: AstroCookies, correu: string) {
	const fi = Math.floor(Date.now() / 1000) + DURADA;
	const dades = `${Buffer.from(correu).toString('base64url')}.${fi}`;
	const comunes = { path: '/', secure: import.meta.env.PROD, sameSite: 'strict', maxAge: DURADA } as const;
	galetes.set(GALETA, `${dades}.${signa(dades)}`, { ...comunes, httpOnly: true });
	galetes.set(GALETA_VISIBLE, '1', comunes);
}

export function tanca(galetes: AstroCookies) {
	galetes.delete(GALETA, { path: '/' });
	galetes.delete(GALETA_VISIBLE, { path: '/' });
}

/** Qui ha entrat, o `null`. */
export function qui(galetes: AstroCookies): string | null {
	if (!configurat()) return null;
	const [b64, fi, signatura] = (galetes.get(GALETA)?.value ?? '').split('.');
	if (!b64 || !fi || !signatura) return null;
	const bona = Buffer.from(signa(`${b64}.${fi}`));
	const donada = Buffer.from(signatura);
	if (bona.length !== donada.length || !timingSafeEqual(bona, donada)) return null;
	if (Number(fi) < Date.now() / 1000) return null;
	const correu = Buffer.from(b64, 'base64url').toString();
	return admins().has(correu) ? correu : null;
}
