"""Retalla la CMU Serif (la Computer Modern de LaTeX) per al web.

La font sencera pesa uns 200 kB per estil; el web només en necessita el llatí, el
grec i quatre símbols de física, i així queda en una fracció. Surt del paquet npm
`computer-modern` (llicència OFL, la còpia és a src/assets/fonts/cmu/OFL.txt):

    npm pack computer-modern@0.1.3
    tar -xzf computer-modern-0.1.3.tgz
    python eines/cmu.py package/fonts

Cal `pip install fonttools brotli`.
"""
import sys
from pathlib import Path
from fontTools import subset

ESTILS = ['500-roman', '500-italic', '700-roman', '700-italic']

# Llatí (amb la l·l), grec, cometes i guions, l'espai fi dels milers, primes,
# superíndexs i subíndexs, fletxes i els operadors que surten a les figures.
LLETRES = ','.join([
	'U+0020-007E', 'U+00A0-017F', 'U+0391-03C9', 'U+03D1', 'U+03D5',
	'U+2010-2027', 'U+202F-2033', 'U+2039-203A', 'U+2070-209F', 'U+20AC',
	'U+210F', 'U+2113', 'U+2190-2199', 'U+2202', 'U+2206-2207', 'U+2212',
	'U+221A', 'U+221D-221E', 'U+2248', 'U+2260', 'U+2264-2265', 'U+22C5',
])

origen = Path(sys.argv[1] if len(sys.argv) > 1 else 'package/fonts')
desti = Path(__file__).resolve().parent.parent / 'src' / 'assets' / 'fonts' / 'cmu'
desti.mkdir(parents=True, exist_ok=True)

for estil in ESTILS:
	sortida = desti / f'cmu-serif-{estil}.woff2'
	subset.main([
		str(origen / f'cmu-serif-{estil}.ttf'),
		f'--unicodes={LLETRES}',
		'--layout-features=*',
		'--no-hinting',
		'--flavor=woff2',
		f'--output-file={sortida}',
	])
	print(f'{sortida.name}: {sortida.stat().st_size // 1024} kB')
