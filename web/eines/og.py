# -*- coding: utf-8 -*-
"""
Genera public/og.png, la imatge que surt quan algú enganxa fisicauab.com a
WhatsApp, Telegram o Instagram. 1200 x 630, com demanen totes les xarxes.

Fa servir el segell tal com surt de la marca (public/marca/segell.svg) i
l'Inkscape per rasteritzar, igual que marca/eines/generar.py.

    python eines/og.py
"""
import io, os, re, subprocess

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INK = r'C:/Program Files/Inkscape/bin/inkscape.exe'
SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', serif"

BOR, BONE = '#70143D', '#F4EFE6'

segell = io.open(os.path.join(WEB, 'public', 'marca', 'segell.svg'), encoding='utf-8').read()
segell = re.sub(r'<\?xml[^>]*>\s*', '', segell)
segell = re.sub(r'\s(width|height)="[^"]*"', '', segell, count=2)
segell = segell.replace('<svg', '<svg x="690" y="75" width="480" height="480"', 1)

# Paper mil·limetrat, com a la portada del web.
quad = ''.join('<line x1="%d" y1="0" x2="%d" y2="630"/>' % (x, x) for x in range(0, 1201, 30))
quad += ''.join('<line x1="0" y1="%d" x2="1200" y2="%d"/>' % (y, y) for y in range(0, 631, 30))

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<rect width="1200" height="630" fill="{BONE}"/>
<g stroke="{BOR}" stroke-opacity="0.07" stroke-width="1">{quad}</g>
<g font-family="{SERIF}" fill="{BOR}">
  <text x="74" y="265" font-size="138" font-weight="700" letter-spacing="7">FÍSICA</text>
  <text x="74" y="390" font-size="138" font-weight="700" letter-spacing="7">UAB</text>
</g>
<rect x="72" y="440" width="560" height="52" rx="14" fill="#FFD23F" transform="rotate(-1.5 352 466)"/>
<text x="92" y="476" font-family="'Segoe UI', Arial, sans-serif" font-size="30" font-weight="700" fill="#1A1416">Tot Física UAB, en un sol lloc.</text>
<text x="80" y="545" font-family="'Segoe UI', Arial, sans-serif" font-size="24" fill="#1A1416" fill-opacity="0.72">OneDrive, clubs, projectes i la nostra cultura</text>
<text x="80" y="580" font-family="'Segoe UI', Arial, sans-serif" font-size="24" font-weight="700" fill="#70143D">fisicauab.com</text>
{segell}
</svg>'''

tmp = os.path.join(WEB, 'eines', '_og.svg')
io.open(tmp, 'w', encoding='utf-8').write(svg)
out = os.path.join(WEB, 'public', 'og.png')
subprocess.run([INK, tmp, '--export-type=png', '--export-filename=' + out, '-w', '1200', '-h', '630'], check=True)
os.remove(tmp)
print(out)
