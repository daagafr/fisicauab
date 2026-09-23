// Porta la marca (../marca) dins del web. No redibuixa res: només copia fitxers.
// Torna-ho a executar cada cop que regeneris la marca amb marca/eines/generar.py:
//
//     npm run marca
//
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARCA = join(WEB, '..', 'marca');

if (!existsSync(MARCA)) {
	console.error(`No trobo la carpeta de la marca a ${MARCA}`);
	process.exit(1);
}

const copia = (de, a) => {
	mkdirSync(dirname(a), { recursive: true });
	copyFileSync(de, a);
	console.log('  ' + a.slice(WEB.length + 1));
};

// Descàrregues de la pàgina «Comunitat»: tots els SVG i PNG, menys els A4 en SVG
// (pesen mig mega cadascun; dels A4 n'hi ha prou amb el PNG).
for (const format of ['svg', 'png']) {
	for (const f of readdirSync(join(MARCA, format))) {
		if (format === 'svg' && f.startsWith('carta-')) continue;
		copia(join(MARCA, format, f), join(WEB, 'public', 'marca', f));
	}
}

// El dibuix sol, que el web posa en línia i pinta amb el color del tema.
copia(join(MARCA, 'svg', 'marca.svg'), join(WEB, 'src', 'assets', 'marca.svg'));

// Icones del navegador.
copia(join(MARCA, 'svg', 'icona.svg'), join(WEB, 'public', 'favicon.svg'));
copia(join(MARCA, 'png', 'icona.png'), join(WEB, 'public', 'apple-touch-icon.png'));
