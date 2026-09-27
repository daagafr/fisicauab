# -*- coding: utf-8 -*-
"""
Genera public/lnh/og.png, la imatge que surt quan algú comparteix
fisicauab.com/la-nostra-historia a WhatsApp, Telegram o Instagram. 1200 x 630.

És la portada del llibre posada en horitzontal: el pergamí, el marc doble, el
lotus (el mateix de src/components/lnh/Lotus.astro, rasteritzat amb l'Inkscape,
com fa og.py) i el títol en EB Garamond (la del web, de node_modules).

    python eines/og-lnh.py
"""
import io, os, re, subprocess
from PIL import Image, ImageDraw, ImageFont

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INK = r'C:/Program Files/Inkscape/bin/inkscape.exe'
FONTS = os.path.join(WEB, 'node_modules', '@fontsource', 'eb-garamond', 'files')

W, H = 1200, 630
PERGAMI, GRANA, TEXT = (219, 196, 160), (143, 37, 35), (74, 43, 37)


def font(pes, cursiva=False, mida=40):
    nom = 'eb-garamond-latin-%d-%s.woff' % (pes, 'italic' if cursiva else 'normal')
    return ImageFont.truetype(os.path.join(FONTS, nom), mida)


# El pergamí. Sense el gra del web: en una miniatura no es veu i la imatge
# pesaria deu vegades més.
img = Image.new('RGB', (W, H), PERGAMI)
d = ImageDraw.Draw(img)

# El marc doble: dues línies gruixudes amb pergamí al mig.
for inset, gruix in ((20, 9), (36, 9)):
    d.rectangle([inset, inset, W - 1 - inset, H - 1 - inset], outline=GRANA, width=gruix)

# El lotus, dels mateixos traçats que el component.
astro = io.open(os.path.join(WEB, 'src', 'components', 'lnh', 'Lotus.astro'), encoding='utf-8').read()
vb = re.search(r'viewBox="([^"]+)"', astro).group(1)
camins = ''.join('<path d="%s"/>' % p for p in re.findall(r'<path style="[^"]*" d="([^"]+)"', astro))
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"><g fill="#8F2523">%s</g></svg>' % (vb, camins)
tmp_svg, tmp_png = os.path.join(WEB, 'eines', '_lotus.svg'), os.path.join(WEB, 'eines', '_lotus.png')
io.open(tmp_svg, 'w', encoding='utf-8').write(svg)
subprocess.run([INK, tmp_svg, '--export-type=png', '--export-filename=' + tmp_png, '-w', '430'], check=True)
lotus = Image.open(tmp_png).convert('RGBA')
img.paste(lotus, (330 - lotus.width // 2, 318 - lotus.height // 2), lotus)
os.remove(tmp_svg)
os.remove(tmp_png)


def espaiat(text, f, espai):
    """L'amplada d'un text amb espai entre lletres."""
    return sum(f.getlength(c) for c in text) + espai * (len(text) - 1)


def escriu(text, f, cy, color=GRANA, espai=0, cx=880):
    x = cx - espaiat(text, f, espai) / 2
    for c in text:
        d.text((x, cy), c, font=f, fill=color, anchor='ls')
        x += f.getlength(c) + espai


titol = font(700, mida=86)
escriu('LA NOSTRA', titol, 188, espai=3)
escriu('HISTÒRIA', titol, 282, espai=3)
d.rectangle([880 - 215, 318, 880 + 215, 324], fill=GRANA)
subtitol = font(400, True, 34)
escriu('Una arqueologia sentimental', subtitol, 384, TEXT)
escriu('del coneixement compartit', subtitol, 426, TEXT)
escriu('FÍSICA UAB', font(700, mida=38), 530, espai=3)

sortida = os.path.join(WEB, 'public', 'lnh', 'og.png')
img.save(sortida, optimize=True)
print(sortida)
