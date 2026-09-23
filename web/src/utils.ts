const FORMAT_DATA = new Intl.DateTimeFormat('ca', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Europe/Madrid',
});

export const data = (d: Date) => FORMAT_DATA.format(d);
export const dataIso = (d: Date) => d.toISOString().slice(0, 10);

/** Els enllaços que surten del web s'obren en una pestanya nova. */
export const esExtern = (href: string) => /^https?:\/\//.test(href);
