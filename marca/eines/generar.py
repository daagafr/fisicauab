# -*- coding: utf-8 -*-
"""
Genera la familia de la marca "Fisica UAB" a partir de ../../logo-idea.svg.

Com tria el dibuix
------------------
No hi ha cap id escrit a ma. L'script mesura tots els <path> del fitxer amb Inkscape
i es queda amb els que cauen dins de la pagina; els retalls de treball que deixes
fora del llenc s'ignoren sols. Aixi, si redibuixes una peca (la pinya, la gallina) o
en separes una en dos camins, nomes cal tornar a executar-lo.

Cap peca esta redibuixada aqui: tot son col.locacions, retalls i color del mateix
dibuix.

Requereix: Python 3 i Inkscape.

    python generar.py
"""
import os, re, io, sys, math, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT  = os.path.abspath(os.path.join(HERE, '..'))


def _troba_font():
    """El dibuix original. El busca a l'arrel del projecte i dins de marca/, i si no
    el troba pel nom, agafa el primer .svg que hi hagi en qualsevol de les dues."""
    for c in (os.path.join(ROOT, 'logo-idea.svg'), os.path.join(OUT, 'logo-idea.svg')):
        if os.path.exists(c):
            return c
    for d in (ROOT, OUT):
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.lower().endswith('.svg'):
                    return os.path.join(d, f)
    sys.exit('no trobo el dibuix original (logo-idea.svg) ni a %s ni a %s' % (ROOT, OUT))


SRC = _troba_font()
TMP  = os.path.join(HERE, '_tmp')
INK_EXE = r'C:/Program Files/Inkscape/bin/inkscape.exe'

# ---------------------------------------------------------------- paleta
BOR   = '#70143D'   # Borgonya      - el color de la marca
BORD  = '#4A0C28'   # Borgonya fosc - linies secundaries, text petit sobre os
BONE  = '#F4EFE6'   # Os            - paper, negatiu
INKC  = '#1A1416'   # Tinta         - text corrent

SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"

NOM  = 'F&#205;SICA UAB'
# El lema. Ara no n'hi ha: el segell porta el nom a dalt i, girat, a baix, i els
# lockups nomes el nom. Si algun dia en voleu un, poseu-lo aqui (p. ex.
# 'ARDENS ET GELIDA') i torna a sortir a l'anella de baix i sota els lockups.
LEMA = ''

# ---------------------------------------------------------------- lectura del dibuix
DOC_W, VIEW_W = 2000.0, 529.16666       # el llenc del fitxer original
K = DOC_W / VIEW_W                       # unitats de cami -> px d'Inkscape


def _ink(*args):
    return subprocess.run([INK_EXE] + list(args), capture_output=True, text=True).stdout


def _bbox_of(d, name):
    """Mesura un cami tot sol, en px, amb Inkscape. None si no dibuixa res."""
    p = os.path.join(TMP, 'q_%s.svg' % re.sub(r'\W', '_', name))
    io.open(p, 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%d" '
        'height="%d"><path id="p" fill="#000" d="%s"/></svg>'
        % (VIEW_W, VIEW_W, int(DOC_W), int(DOC_W), d))
    out = [l for l in _ink('--query-all', p).strip().splitlines() if l.startswith('p,')]
    return [float(x) for x in out[-1].split(',')[1:]] if out else None


def _dins_pagina(bb):
    return bool(bb) and bb[0] + bb[2] > 0 and bb[1] + bb[3] > 0 and bb[0] < DOC_W and bb[1] < DOC_W


def llegeix_marca():
    """Torna (d, bbox_en_unitats_de_cami) del dibuix que hi ha dins del llenc."""
    if not os.path.exists(INK_EXE):
        sys.exit('cal Inkscape a %s' % INK_EXE)
    os.makedirs(TMP, exist_ok=True)
    s = io.open(SRC, encoding='utf-8').read()
    trossos = []
    for n, at in enumerate(re.findall(r'<path\b((?:[^>"]|"[^"]*")*?)/?>', s)):
        md = re.search(r'\bd="([^"]+)"', at)
        if not md:
            continue
        d = md.group(1).strip()
        if d[:1] == 'm':          # un moveto relatiu inicial ja es, de fet, absolut;
            d = 'M' + d[1:]       # fer-lo explicit permet encadenar camins sense desplacar-los
        idm = re.search(r'\bid="([^"]+)"', at)
        nom = idm.group(1) if idm else 'p%d' % n
        if _dins_pagina(_bbox_of(d, nom)):
            trossos.append((nom, d))
    if not trossos:
        sys.exit('no he trobat cap cami dins del llenc de %s' % SRC)
    d = ' '.join(t[1] for t in trossos)
    bb = _bbox_of(d, 'marca')
    print('dibuix: %s (%d camins)' % (', '.join(t[0] for t in trossos), len(trossos)))
    return d, (bb[0] / K, bb[1] / K, bb[2] / K, bb[3] / K)


MARK, MARK_BB = llegeix_marca()
AR = MARK_BB[2] / MARK_BB[3]


def mark(cx, cy, h, fill=BOR, grossor=0.0):
    """Col.loca la marca amb alcada h i centre (cx, cy).

    grossor l'engreixa amb un tras del mateix color, en unitats del cami (l'alcada
    total de la marca son MARK_BB[3]). Serveix per a mides petites.
    """
    s = h / MARK_BB[3]
    w = MARK_BB[2] * s
    t = ('translate(%.4f,%.4f) scale(%.6f) translate(%.4f,%.4f)'
         % (cx - w / 2, cy - h / 2, s, -MARK_BB[0], -MARK_BB[1]))
    extra = ('' if not grossor else
             ' stroke="%s" stroke-width="%g" stroke-linejoin="round" stroke-linecap="round"'
             % (fill, grossor))
    return '<path fill="%s"%s transform="%s" d="%s"/>' % (fill, extra, t, MARK)


def arc_text(idn, cx, cy, r, s, size, fill, ls, top=True, weight=700, girat=False):
    """Text sobre un arc. A dalt les majuscules creixen cap enfora; a baix, cap endins.

    Amb girat=True el text de baix segueix la volta en el mateix sentit que el de
    dalt: creix cap enfora i es llegeix de cap per avall, com a les monedes.
    """
    if girat:
        d = 'M %g,%g A %g,%g 0 0,1 %g,%g' % (cx + r, cy, r, r, cx - r, cy)
    else:
        sweep = 1 if top else 0
        d = 'M %g,%g A %g,%g 0 0,%d %g,%g' % (cx - r, cy, r, r, sweep, cx + r, cy)
    return ('<path id="%s" d="%s" fill="none"/>'
            '<text font-family="%s" font-weight="%d" font-size="%g" letter-spacing="%g" '
            'fill="%s"><textPath href="#%s" startOffset="50%%" text-anchor="middle">%s'
            '</textPath></text>') % (idn, d, SERIF, weight, size, ls, fill, idn, s)


def line_text(x, y, s, size, fill, ls, anchor='middle', weight=700, fam=SERIF):
    if anchor == 'middle':
        x -= ls / 2.0             # compensa l'espaiat sobrant de l'ultima lletra
    return ('<text x="%g" y="%g" text-anchor="%s" font-family="%s" font-weight="%d" '
            'font-size="%g" letter-spacing="%g" fill="%s">%s</text>'
            % (x, y, anchor, fam, weight, size, ls, fill, s))


def rombe(cx, cy, r, ang, mida, fill):
    """Un rombe petit sobre la circumferencia de radi r, a l'angle ang (0 = 3 en punt)."""
    x = cx + r * math.cos(math.radians(ang))
    y = cy + r * math.sin(math.radians(ang))
    s = mida / 2.0
    return ('<path fill="%s" d="M %.2f,%.2f L %.2f,%.2f L %.2f,%.2f L %.2f,%.2f Z"/>'
            % (fill, x, y - s, x + s * 0.62, y, x, y + s, x - s * 0.62, y))


# ---------------------------------------------------------------- composicions
# Geometria del segell, en un llenc de 1000x1000 centrat a (500,500).
# La banda de text va de R_FILET a R_DISC; el nom i el lema hi queden centrats
# opticament perque les majuscules del nom creixen cap enfora i les del lema cap
# endins (vegeu arc_text).
R_DISC  = 472.0   # vora del disc
R_FILET = 366.0   # filet interior, unic
R_NOM   = 393.0   # linia de base del nom
R_LEMA  = 435.0   # linia de base del lema
SZ_NOM,  LS_NOM  = 74.0, 16.0
SZ_LEMA, LS_LEMA = 48.0, 14.0
# La marca dins del camp, a la mida maxima que deixa la cua i la flama lliures del
# filet. Per sobre de 490 el dibuix el talla, i el segell perd la vora neta.
MH, MCX, MCY = 478.0, 498.0, 521.0


def segell(disc=BOR, field=None, line=BONE, txt=BONE, markc=BONE,
           text=True, mh=MH, mcy=MCY, idn='s'):
    """Segell rodo: anella amb el nom (i el lema, si n'hi ha), filet i la marca al camp."""
    field = field or disc
    b = '<circle cx="500" cy="500" r="%g" fill="%s"/>' % (R_DISC, disc)
    if field != disc:
        b += '<circle cx="500" cy="500" r="%g" fill="%s"/>' % (R_FILET - 4, field)
    if text:
        b += arc_text(idn + 'n', 500, 500, R_NOM,  NOM,  SZ_NOM,  txt, LS_NOM,  top=True)
        if LEMA:
            b += arc_text(idn + 'm', 500, 500, R_LEMA, LEMA, SZ_LEMA, txt, LS_LEMA, top=False)
        else:   # sense lema: el nom altra vegada, girat, a la mateixa distancia
            b += arc_text(idn + 'm', 500, 500, R_NOM, NOM, SZ_NOM, txt, LS_NOM, girat=True)
        c = (R_DISC + R_FILET) / 2
        b += rombe(500, 500, c, 0, 32, txt) + rombe(500, 500, c, 180, 32, txt)
    b += ('<circle cx="500" cy="500" r="%g" fill="none" stroke="%s" stroke-width="7"/>'
          % (R_FILET, line))
    b += mark(MCX, mcy, mh, fill=markc)
    return b


ICO_PAD, ICO_DY, ICO_GROS = 0.86, 8.0, 1.4


def icona(disc=BOR, markc=BONE, idn='i'):
    """Marca reduida: el dibuix sencer dins d'un disc, sense retallar res.

    A mides molt petites es converteix en una taca, pero sempre es la marca
    sencera: mes val una pinya i una gallina poc nitides que mitja pinya nitida.
    """
    h = (2 * 470 * ICO_PAD) / AR
    return ('<circle cx="500" cy="500" r="470" fill="%s"/>%s'
            % (disc, mark(500, 500 + ICO_DY, h, fill=markc, grossor=ICO_GROS)))


def lockup_h(markc=BOR, tcol=BOR, ccol=BORD):
    b = mark(450, 470, 720, fill=markc)
    if LEMA:
        b += line_text(890, 466, NOM,  170, tcol, 16, anchor='start')
        b += line_text(896, 566, LEMA,  56, ccol, 36, anchor='start', weight=400)
    else:   # el nom sol, centrat a l'alcada del dibuix
        b += line_text(890, 530, NOM,  170, tcol, 16, anchor='start')
    return b


def lockup_v(markc=BOR, tcol=BOR, ccol=BORD):
    b = mark(650, 420, 690, fill=markc)
    b += line_text(650, 922, NOM,  160, tcol, 15)
    if LEMA:
        b += line_text(650, 1002, LEMA, 53, ccol, 33, weight=400)
    return b


# ---------------------------------------------------------------- carta de marca
# Un A4 (210x297 mm a 10 unitats per mm) amb el segell, la paleta i les regles
# basiques: el full que s'ensenya o s'imprimeix quan algu pregunta "quina marca es".
CW, CH, CM = 2100.0, 2970.0, 200.0


def _titol(x, y, t):
    return line_text(x, y, t, 26, BORD, 9, anchor='start', weight=700)


def _cos(x, y, t, size=29, fill=INKC, ls=0):
    return line_text(x, y, t, size, fill, ls, anchor='start', weight=400)


def _filet(y, col=BOR, w=1.8):
    return ('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="%g"/>'
            % (CM, y, CW - CM, y, col, w))


def carta_de_marca():
    b = '<rect width="%g" height="%g" fill="%s"/>' % (CW, CH, BONE)

    # capcalera: el segell i el nom
    b += '<g transform="translate(810,380) scale(0.48)">%s</g>' % segell(idn='k')
    if LEMA:
        b += line_text(CW/2, 1028, NOM,  116, BOR,  16)
        b += line_text(CW/2, 1098, LEMA,  32, BORD, 24, weight=400)
    else:
        b += line_text(CW/2, 1060, NOM,  116, BOR,  16)
    b += _filet(1200)

    # la familia
    b += _titol(CM, 1276, 'LA MARCA')
    peces = [('marca', 'marca'), ('segell', 'segell'),
             ('segell cec', 'segell-cec'), ('icona', 'icona')]
    cw = (CW - 2*CM) / 4.0
    for i, (cap, kind) in enumerate(peces):
        cx = CM + cw*i + cw/2
        if kind == 'marca':
            b += mark(cx, 1470, 250)
        elif kind == 'segell':
            b += '<g transform="translate(%g,%g) scale(0.30)">%s</g>' % (cx-150, 1320, segell(idn='k1'))
        elif kind == 'segell-cec':
            b += '<g transform="translate(%g,%g) scale(0.30)">%s</g>' % (cx-150, 1320, segell(text=False, idn='k2'))
        else:
            b += '<g transform="translate(%g,%g) scale(0.30)">%s</g>' % (cx-150, 1320, icona(idn='k3'))
        b += line_text(cx, 1680, cap, 24, BORD, 4, weight=400)
    b += _filet(1760)

    # color
    b += _titol(CM, 1836, 'COLOR')
    colors = [('Borgonya', BOR), ('Borgonya fosc', BORD), ('Os', BONE), ('Tinta', INKC)]
    sw = (CW - 2*CM - 3*30) / 4.0
    for i, (nm, hexa) in enumerate(colors):
        x = CM + i*(sw + 30)
        b += ('<rect x="%g" y="1880" width="%g" height="150" fill="%s" stroke="%s" '
              'stroke-width="1.2"/>' % (x, sw, hexa, BORD if hexa == BONE else 'none'))
        b += _cos(x, 2082, nm, 26, INKC)
        b += _cos(x, 2122, hexa.upper(), 24, BORD)
    b += _filet(2200)

    # tipografia i mides
    b += _titol(CM, 2276, 'TIPOGRAFIA')
    b += _cos(CM, 2334, 'Palatino Linotype, maj&#250;scules.')
    b += _cos(CM, 2380, 'Nom: negreta. Lema: normal, molt espaiat.' if LEMA
              else 'Nom: negreta, interlletratge obert.')
    b += _cos(CM, 2426, 'Lliures: EB Garamond, Cormorant.')

    b += _titol(CW/2 + 40, 2276, 'MIDES M&#205;NIMES')
    b += _cos(CW/2 + 40, 2334, 'Segell: 28 mm. Sota, el segell cec.')
    b += _cos(CW/2 + 40, 2380, 'Icona: 48 px.')
    b += _cos(CW/2 + 40, 2426, 'Marge: l&#8217;al&#231;ada de la corona.')

    b += _filet(2520)
    b += _titol(CM, 2596, 'UNA SOLA TINTA')
    b += _cos(CM, 2654, 'Tot el sistema funciona amb el borgonya sol: segell, lockups i icona.')
    b += _cos(CM, 2700, 'Serigrafia, gravat i segell de goma sense cap adaptaci&#243;.')

    b += line_text(CW/2, 2880, 'Proposta d&#8217;estudiants. No fa servir cap element de la '
                   'identitat institucional de la UAB.', 22, BORD, 2, weight=400)
    return b


# ---------------------------------------------------------------- aplicacions
SAMARRETA = ("M0.30,0.05 L0.19,0.09 L0.03,0.26 L0.15,0.40 L0.24,0.32 L0.24,0.97 "
             "L0.76,0.97 L0.76,0.32 L0.85,0.40 L0.97,0.26 L0.81,0.09 L0.70,0.05 "
             "C0.665,0.135 0.335,0.135 0.30,0.05 Z")


def _unitat(d, x, y, w, h, fill):
    return ('<path fill="%s" transform="translate(%g,%g) scale(%g,%g)" d="%s"/>'
            % (fill, x, y, w, h, d))


def _marc(x, y, w, h, r=0):
    return ('<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="none" '
            'stroke="%s" stroke-width="1.4" opacity="0.45"/>' % (x, y, w, h, r, BORD))


def _ratlla(x, y, w, gruix=7, op=0.30):
    return ('<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="%s" opacity="%g"/>'
            % (x, y, w, gruix, gruix / 2, BORD, op))


def _peu(cx, y, t):
    return line_text(cx, y, t, 27, BORD, 7, weight=400)


def _paper(cx, cy):
    """Un A4 amb el lockup a la capcalera."""
    w, h = 366.0, 518.0
    x, y = cx - w / 2, cy - h / 2
    b = '<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>' % (x, y, w, h, BONE)
    b += _marc(x, y, w, h)
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (x + 30, y + 34, 160.0 / 2560, lockup_h())
    for i in range(9):
        b += _ratlla(x + 30, y + 168 + i * 26, (w - 60) if i % 4 != 3 else (w - 60) * 0.62, 6, 0.26)
    for i in range(6):
        b += _ratlla(x + 30, y + 300 + i * 26, (w - 60) if i % 3 != 2 else (w - 60) * 0.5, 6, 0.26)
    b += ('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1.2" '
          'opacity="0.5"/>' % (x + 30, y + h - 54, x + w - 30, y + h - 54, BOR))
    b += _ratlla(x + 30, y + h - 40, w * 0.44, 5, 0.3)
    return b


def _targetes(cx, cy):
    """Dues targetes de 85x55: el dors amb el segell i la cara amb el lockup."""
    w, h = 430.0, 278.0
    b = '<g transform="translate(%g,%g) rotate(-5,%g,%g)">' % (cx - w / 2 - 34, cy - h / 2 - 28, w / 2, h / 2)
    b += '<rect width="%g" height="%g" fill="%s"/>' % (w, h, BOR)
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (w / 2 - 88, h / 2 - 88, 176.0 / 1000, segell(idn='t1'))
    b += '</g>'
    b += '<g transform="translate(%g,%g) rotate(4,%g,%g)">' % (cx - w / 2 + 40, cy - h / 2 + 34, w / 2, h / 2)
    b += '<rect width="%g" height="%g" fill="%s"/>' % (w, h, BONE)
    b += _marc(0, 0, w, h)
    b += '<g transform="translate(34,58) scale(%g)">%s</g>' % (250.0 / 2560, lockup_h())
    b += _ratlla(34, h - 78, 150, 5, 0.32) + _ratlla(34, h - 60, 210, 5, 0.32)
    b += '</g>'
    return b


def _xapes(cx, cy):
    """Xapes: el segell gran i la icona petita."""
    b = ('<circle cx="%g" cy="%g" r="%g" fill="none" stroke="%s" stroke-width="2" '
         'opacity="0.45"/>' % (cx - 60, cy, 200, BORD))
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (cx - 250, cy - 190, 380.0 / 1000, segell(idn='x1'))
    b += ('<circle cx="%g" cy="%g" r="%g" fill="none" stroke="%s" stroke-width="2" '
          'opacity="0.45"/>' % (cx + 220, cy + 96, 104, BORD))
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (cx + 126, cy + 2, 188.0 / 1000, icona(idn='x2'))
    return b


def _samarreta(cx, cy):
    w, h = 470.0, 470.0
    b = _unitat(SAMARRETA, cx - w / 2, cy - h / 2, w, h, BOR)
    b += mark(cx, cy + 30, 150, fill=BONE)
    return b


def _tampo(cx, cy):
    """Segell de goma: el segell cec, una sola tinta, lleugerament girat."""
    b = '<g transform="rotate(-7,%g,%g)">' % (cx, cy)
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (cx - 200, cy - 200, 400.0 / 1000, segell(text=False, idn='g1'))
    b += '</g>'
    return b


def _perfil(cx, cy):
    """Avatar i fitxa de xarxes."""
    w, h = 470.0, 300.0
    x, y = cx - w / 2, cy - h / 2
    b = '<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>' % (x, y, w, h, BONE)
    b += _marc(x, y, w, h, 8)
    b += '<g transform="translate(%g,%g) scale(%g)">%s</g>' % (x + 30, y + 34, 116.0 / 1000, icona(idn='p1'))
    b += line_text(x + 172, y + 96, 'F&#205;SICA UAB', 36, BOR, 4, anchor='start')
    b += _ratlla(x + 172, y + 116, 150, 7, 0.32)
    b += _ratlla(x + 30, y + 196, w - 60, 7, 0.24)
    b += _ratlla(x + 30, y + 222, (w - 60) * 0.7, 7, 0.24)
    for i in range(3):
        b += ('<rect x="%g" y="%g" width="72" height="42" rx="4" fill="%s" opacity="0.14"/>'
              % (x + 30 + i * 84, y + 250, BOR))
    return b


def carta_aplicacions():
    b = '<rect width="%g" height="%g" fill="%s"/>' % (CW, CH, BONE)
    b += '<g transform="translate(%g,200) scale(%g)">%s</g>' % (CM, 580.0 / 2560, lockup_h())
    b += line_text(CW - CM, 352, 'APLICACIONS', 40, BORD, 14, anchor='end')
    b += _filet(470)

    cel = [(CM, 560), (CW / 2 + 30, 560),
           (CM, 1280), (CW / 2 + 30, 1280),
           (CM, 2000), (CW / 2 + 30, 2000)]
    ampl = CW / 2 - CM - 30
    peces = [('Paper de carta', _paper), ('Targeta', _targetes), ('Xapes', _xapes),
             ('Samarreta', _samarreta), ('Segell de goma', _tampo), ('Xarxes', _perfil)]
    for (x, y), (cap, fn) in zip(cel, peces):
        cx, cy = x + ampl / 2, y + 290
        b += fn(cx, cy)
        b += _peu(cx, y + 640, cap)

    b += _filet(2740)
    b += line_text(CW / 2, 2830, 'Totes les aplicacions, amb el borgonya sol. '
                   'Cap necessita una segona tinta.', 27, INKC, 2, weight=400)
    b += line_text(CW / 2, 2890, 'Proposta d&#8217;estudiants. No fa servir cap element de la '
                   'identitat institucional de la UAB.', 22, BORD, 2, weight=400)
    return b


# ---------------------------------------------------------------- escriptura
def document(body, w, h, bg=None, title=''):
    rect = '<rect width="%g" height="%g" fill="%s"/>' % (w, h, bg) if bg else ''
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g" width="%g" '
            'height="%g"><title>%s</title>%s%s</svg>' % (w, h, w, h, title, rect, body))


def write(name, body, w, h, bg=None, title='', png=1400, to_paths=False):
    p = os.path.join(OUT, 'svg', name + '.svg')
    io.open(p, 'w', encoding='utf-8').write(document(body, w, h, bg, title))
    if to_paths:
        _ink('--export-type=svg', '--export-plain-svg', '--export-text-to-path',
             '--export-filename=' + p, p)
    if png:
        _ink('--export-type=png',
             '--export-filename=' + os.path.join(OUT, 'png', name + '.png'),
             '--export-width=%d' % png, p)
    return p


def main():
    for d in ('svg', 'png'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)

    # la marca sola, amb el llenc ajustat al dibuix i un marge del 4 %
    m = 0.04
    W = 1000.0
    H = W / AR
    write('marca', mark(W / 2, H / 2, H * (1 - 2 * m)), W, H, title='Marca Fisica UAB')
    write('marca-os', mark(W / 2, H / 2, H * (1 - 2 * m), fill=BONE), W, H,
          title='Marca Fisica UAB - os')

    write('segell', segell(idn='a'), 1000, 1000, to_paths=True, title='Segell Fisica UAB')
    write('segell-invers', segell(field=BONE, line=BOR, markc=BOR, idn='b'),
          1000, 1000, to_paths=True, title='Segell Fisica UAB - invers')
    write('segell-cec', segell(text=False, idn='e'), 1000, 1000,
          title='Segell cec Fisica UAB')
    write('segell-cec-invers', segell(field=BONE, line=BOR, markc=BOR, text=False, idn='f'),
          1000, 1000, title='Segell cec Fisica UAB - invers')

    write('icona', icona(idn='c'), 1000, 1000, png=512, title='Icona Fisica UAB')
    write('icona-invers', icona(disc=BONE, markc=BOR, idn='d'), 1000, 1000, png=512,
          title='Icona Fisica UAB - invers')

    write('lockup-horitzontal', lockup_h(), 2560, 940, to_paths=True,
          title='Fisica UAB - lockup horitzontal')
    write('lockup-horitzontal-negatiu',
          lockup_h(markc=BONE, tcol=BONE, ccol='#D9B9C6'), 2560, 940, bg=BOR,
          to_paths=True, title='Fisica UAB - lockup horitzontal negatiu')
    write('lockup-vertical', lockup_v(), 1300, 1080 if LEMA else 1000, to_paths=True,
          title='Fisica UAB - lockup vertical')

    write('carta-de-marca', carta_de_marca(), CW, CH, to_paths=True, png=1600,
          title='Fisica UAB - carta de marca')
    write('carta-aplicacions', carta_aplicacions(), CW, CH, to_paths=True, png=1600,
          title='Fisica UAB - aplicacions')

    shutil.rmtree(TMP, ignore_errors=True)      # neteja els fitxers de mesura
    print('fet ->', os.path.join(OUT, 'svg'))


if __name__ == '__main__':
    main()
