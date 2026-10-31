import { site, services } from '../data/site';

/**
 * Datos estructurados (JSON-LD, schema.org) comunes a todo el sitio.
 * Se enlazan entre sí por @id para que Google entienda que la marca, la persona
 * y la web son la misma entidad.
 */
export function baseGraph(origin: URL) {
  const url = (path = '/') => new URL(path, origin).href;
  const ids = {
    website: url('/#website'),
    person: url('/#alejandro'),
    business: url('/#negocio'),
  };
  const image = url(site.ogImage.src);

  const person = {
    '@type': 'Person',
    '@id': ids.person,
    name: site.person,
    jobTitle: site.role,
    description: site.description,
    url: url('/sobre-mi'),
    image,
    sameAs: [site.instagram],
    knowsAbout: site.knowsAbout,
    worksFor: { '@id': ids.business },
    nationality: { '@type': 'Country', name: site.countryName },
  };

  const business = {
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': ids.business,
    name: site.name,
    description: site.description,
    url: url('/'),
    image,
    logo: url('/icon-512.png'),
    telephone: site.phone,
    priceRange: '$$$',
    address: { '@type': 'PostalAddress', addressCountry: site.country },
    areaServed: { '@type': 'Country', name: site.countryName },
    founder: { '@id': ids.person },
    employee: { '@id': ids.person },
    sameAs: [site.instagram],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: site.phone,
      url: `https://wa.me/${site.whatsapp}`,
      availableLanguage: ['es'],
      areaServed: site.country,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.title, description: s.text, provider: { '@id': ids.business } },
      })),
    },
  };

  const website = {
    '@type': 'WebSite',
    '@id': ids.website,
    url: url('/'),
    name: site.name,
    description: site.description,
    inLanguage: site.lang,
    publisher: { '@id': ids.business },
  };

  return { ids, url, nodes: [website, business, person] };
}

/** Ruta de migas de pan para páginas internas. */
export function breadcrumbs(origin: URL, items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, origin).href,
    })),
  };
}
