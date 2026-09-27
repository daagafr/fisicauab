// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

// Node 24 a Windows es mor sense dir res a fs.cpSync si el camí porta accents, i
// la carpeta es diu «Física UAB». L'adaptador de Vercel el fa servir en construir
// (npm run build). Aquí el canviem per una còpia feta a mà. A Vercel no cal.
if (process.platform === 'win32') {
	/** @param {string | URL} src @param {string | URL} dest @param {fs.CopySyncOptions} [opts] */
	const copia = (src, dest, opts = {}) => {
		const s = src instanceof URL ? fileURLToPath(src) : String(src);
		const d = dest instanceof URL ? fileURLToPath(dest) : String(dest);
		if (opts.filter && !opts.filter(s, d)) return;
		const info = opts.dereference ? fs.statSync(s) : fs.lstatSync(s);
		if (info.isDirectory()) {
			fs.mkdirSync(d, { recursive: true });
			for (const nom of fs.readdirSync(s)) copia(path.join(s, nom), path.join(d, nom), opts);
		} else if (info.isSymbolicLink()) {
			fs.rmSync(d, { force: true });
			fs.symlinkSync(fs.readlinkSync(s), d);
		} else if (opts.force !== false || !fs.existsSync(d)) {
			fs.copyFileSync(s, d);
		}
	};
	fs.cpSync = copia;
	syncBuiltinESMExports();
}

// https://astro.build/config
export default defineConfig({
	site: 'https://fisicauab.com',

	// El web continua sent estàtic. L'adaptador només fa falta per a les rutes de
	// l'editor de La Nostra Història (src/pages/api/lnh/), que corren a Vercel.
	adapter: vercel(),

	// Els secrets de l'editor. Van a Vercel (Settings → Environment Variables) i,
	// en local, a web/.env. Vegeu el README.
	env: {
		schema: {
			LNH_ADMINS: envField.string({ context: 'server', access: 'secret', optional: true }),
			LNH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
			LNH_GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			LNH_GITHUB_REPO: envField.string({ context: 'server', access: 'secret', optional: true }),
			LNH_GITHUB_BRANCA: envField.string({ context: 'server', access: 'secret', optional: true }),
		},
	},
});
