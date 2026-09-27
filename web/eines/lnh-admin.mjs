// Dona d'alta un admin de l'editor de La Nostra Història.
//
//     npm run lnh:admin -- nom@exemple.com
//
// Et demana la contrasenya (no surt a la pantalla) i escriu la línia que has
// d'afegir a LNH_ADMINS: a Vercel (Settings → Environment Variables) i, si vols
// provar-ho en local, a web/.env. Si ja n'hi ha d'altres, separa'ls amb comes.
// La primera vegada també et dona un LNH_SECRET.
//
// La contrasenya no es guarda enlloc; només el seu hash (el mateix scrypt que fa
// servir src/lnh/sessio.ts).
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

const correu = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[^\s:,;@]+@[^\s:,;@]+\.[^\s:,;@]+$/.test(correu)) {
	console.error('Ús: npm run lnh:admin -- nom@exemple.com');
	process.exit(1);
}

/** Demana una cosa sense que surti el que escrius. */
function demana(pregunta) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
		rl._writeToOutput = (s) => {
			if (s.includes(pregunta)) rl.output.write(s);
		};
		rl.question(pregunta, (resposta) => {
			rl.close();
			process.stdout.write('\n');
			resolve(resposta);
		});
	});
}

// Per a scripts: la contrasenya també pot venir de LNH_CONTRASENYA.
let contrasenya = process.env.LNH_CONTRASENYA;
if (!contrasenya) {
	contrasenya = await demana('Contrasenya: ');
	if ((await demana('Repeteix-la: ')) !== contrasenya) {
		console.error('No coincideixen.');
		process.exit(1);
	}
}
if (contrasenya.length < 10) {
	console.error('Posa-hi com a mínim 10 caràcters.');
	process.exit(1);
}

const sal = randomBytes(16);
const hash = scryptSync(contrasenya.normalize('NFC'), sal, 32);

console.log(`
Afegeix aquest admin a LNH_ADMINS (separat per una coma dels que ja hi hagi):

  ${correu}:${sal.toString('hex')}:${hash.toString('hex')}

Si encara no tens LNH_SECRET, aquí en tens un (el mateix per a tots els admins):

  LNH_SECRET=${randomBytes(32).toString('hex')}
`);
