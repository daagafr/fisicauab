// Tot el que és «del lloc» i no d'una pàgina concreta: nom, textos per defecte,
// navegació i contacte. Si canvies alguna cosa aquí, canvia a tot el web.

export const lloc = {
	nom: 'Física UAB',
	url: 'https://fisicauab.com',
	descripcio:
		'La comunitat d’estudiants de física de la UAB: apunts, clubs, projectes i la nostra cultura, tot en un sol lloc.',
	idioma: 'ca',

	// TODO: crea aquest correu (o posa’n un que ja tingueu). Surt a «Participa»
	// i al peu de pàgina.
	correu: 'hola@fisicauab.com',

	// Xarxes pròpies de Física UAB. Deixa-la buida si encara no en teniu.
	xarxes: [] as { nom: string; url: string }[],

	avis:
		'Web d’estudiants. No és un lloc oficial de la Universitat Autònoma de Barcelona.',
};

// La navegació principal. Per afegir una pàgina nova: crea-la a src/pages/ i
// afegeix-la aquí.
export const navegacio = [
	{ text: 'Phihub', href: '/phihub' },
	{ text: 'Tauler', href: '/tauler' },
	{ text: 'Comunitat', href: '/comunitat' },
];
