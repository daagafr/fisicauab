// El tauler d'avisos: cada fitxer .md de src/content/avisos/ és un avís.
// El nom del fitxer és l'adreça: `obrim-el-web.md` → /tauler/obrim-el-web
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const avisos = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/avisos' }),
	schema: z.object({
		titol: z.string(),
		data: z.coerce.date(),
		resum: z.string(),
		etiqueta: z.string().default('Física UAB'),
		esborrany: z.boolean().default(false), // true: no surt enlloc
	}),
});

export const collections = { avisos };
