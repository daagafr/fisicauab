"""Importa un grup sencer de frases al Frasari (../Frasari/frasari.json).

Per a les frases soltes, fes servir l'editor del web. Això és per bolcar-hi de cop
una secció del frasari, escrita en un .txt amb aquest format:

    # Carles Domingo
    - “Això no és IFE. Això és IFE plus plus plus plus.”
    - ★★ “Un plat de llenties a 8000K no existiria, directament.”
    - Unai: “Yo siempre he querido ser monje”
      Carmelo: “Fora de la meva classe, i no tornis mai. Tinc l’autoritat”

- `# Nom` obre una persona.
- `- ` obre una frase; `★`, `★★` o `★★★` al davant són les estrelles.
- Les línies que comencen amb dos espais continuen la frase anterior (diàlegs).
- Dins del text: **negreta**, _cursiva_ i *accions*, com a l'editor.

    python eines/frasari-importa.py profes.txt --grup profes --nom Profes

Si el grup ja existeix, el substitueix sencer (les estrelles i els canvis fets des
del web es perden): pregunta-ho abans de fer-ho amb un grup que ja s'edita al web.
"""
import argparse
import json
import re
import secrets
import string
import unicodedata
from pathlib import Path

FITXER = Path(__file__).resolve().parent.parent.parent / 'Frasari' / 'frasari.json'
LLETRES = string.ascii_lowercase + string.digits


def slug(nom: str) -> str:
	net = unicodedata.normalize('NFD', nom).encode('ascii', 'ignore').decode().lower()
	return re.sub(r'[^a-z0-9]+', '-', net).strip('-')[:60] or 'persona'


def nou_id() -> str:
	return ''.join(secrets.choice(LLETRES) for _ in range(10))


def llegeix(text: str) -> list[dict]:
	persones: list[dict] = []
	frase = None
	for n, linia in enumerate(text.splitlines(), 1):
		if not linia.strip():
			frase = None
			continue
		if linia.startswith('# '):
			nom = linia[2:].strip()
			persones.append({'id': slug(nom), 'nom': nom, 'frases': []})
			frase = None
		elif linia.startswith('- '):
			if not persones:
				raise SystemExit(f'Línia {n}: una frase abans de cap «# Nom».')
			cos = linia[2:].strip()
			m = re.match(r'^(★{1,3})\s*', cos)
			frase = {'id': nou_id(), 'text': cos[m.end():] if m else cos, 'estrelles': len(m.group(1)) if m else 0}
			persones[-1]['frases'].append(frase)
		elif linia.startswith('  ') and frase:
			frase['text'] += '\n' + linia.strip()
		else:
			raise SystemExit(f'Línia {n}: no l’entenc: {linia!r}')
	for p in persones:
		for f in p['frases']:
			f['text'] = unicodedata.normalize('NFC', f['text'])
	return persones


def main() -> None:
	arg = argparse.ArgumentParser(description=__doc__.split('\n')[0])
	arg.add_argument('txt', type=Path)
	arg.add_argument('--grup', required=True, help='id del grup: profes, fisquims…')
	arg.add_argument('--nom', required=True, help='com surt al web: Profes, Fisquims…')
	a = arg.parse_args()

	persones = llegeix(a.txt.read_text(encoding='utf-8'))
	persones.sort(key=lambda p: unicodedata.normalize('NFD', p['nom']).lower())
	dades = json.loads(FITXER.read_text(encoding='utf-8')) if FITXER.exists() else {'grups': []}
	grup = {'id': a.grup, 'nom': a.nom, 'persones': persones}
	dades['grups'] = [g for g in dades['grups'] if g['id'] != a.grup] + [grup]

	FITXER.parent.mkdir(parents=True, exist_ok=True)
	FITXER.write_text(json.dumps(dades, ensure_ascii=False, indent='\t') + '\n', encoding='utf-8', newline='\n')
	n = sum(len(p['frases']) for p in persones)
	e = sum(f['estrelles'] for p in persones for f in p['frases'])
	print(f'{a.nom}: {len(persones)} persones, {n} frases, {e} estrelles → {FITXER.name}')


if __name__ == '__main__':
	main()
