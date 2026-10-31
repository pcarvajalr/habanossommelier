export const site = {
  name: 'Habanos Sommelier',
  person: 'Alejandro',
  role: 'Sommelier y especialista en habanos y alta gastronomía',
  description:
    'Alejandro, sommelier y representante y distribuidor exclusivo de habanos en Colombia. Asesorías, formación, consultoría gastronómica y maridajes excepcionales.',
  instagram: 'https://www.instagram.com/habanossommelier/',
  instagramHandle: '@habanossommelier',
  whatsapp: '573174841911',
  whatsappLabel: '+57 317 484 1911',
};

/** Enlace de WhatsApp con un mensaje ya escrito. */
export const waLink = (text = 'Hola Alejandro, quiero más información.') =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

/** Texto unificado de presentación (inicio y "Sobre mí"). */
export const bio = {
  lead:
    'Entiendo el mundo del habano, el vino y los destilados no solo como productos de excelencia, sino como piezas de una cultura milenaria basada en la paciencia, el origen y la maestría artesanal.',
  paragraphs: [
    'Con más de una década de trayectoria en el sector del lujo en Colombia, soy representante y distribuidor exclusivo de los habanos en el país, y conecto a los conocedores con la máxima expresión del tabaco cubano.',
    'Mi trabajo une el dominio técnico de los terruños, los procesos de guarda y las denominaciones de origen con una visión comercial y estratégica. Como sommelier profesional, mi propósito va más allá de la cata: educar, inspirar y elevar la experiencia sensorial de quienes buscan la excelencia, desde programas de formación especializada y consultoría gastronómica hasta la curaduría de maridajes excepcionales.',
  ],
  closing:
    'Cada asesoría, curso o maridaje que diseño nace del respeto por el detalle, la búsqueda constante del equilibrio y el compromiso absoluto con la calidad.',
};

export const services = [
  {
    n: '01',
    title: 'Asesoría personalizada',
    text: 'Selección de habanos según tu paladar, la ocasión y tu cava. Te acompaño en la compra, la guarda y la evolución de tu colección.',
  },
  {
    n: '02',
    title: 'Formación y catas',
    text: 'Programas de formación especializada para entusiastas y profesionales: historia, vitolas, terruños, cata y ritual del habano.',
  },
  {
    n: '03',
    title: 'Maridajes de autor',
    text: 'Curaduría de maridajes entre habanos, vinos, rones, whiskies y destilados finos, diseñados al detalle para cada experiencia.',
  },
  {
    n: '04',
    title: 'Consultoría gastronómica',
    text: 'Diseño de cartas, programas de habanos y servicio para restaurantes, hoteles y clubes que buscan los estándares más exigentes.',
  },
  {
    n: '05',
    title: 'Eventos privados',
    text: 'Veladas, lanzamientos y encuentros corporativos con sommelier, torcido en vivo y una experiencia sensorial integral.',
  },
];

export const ritual = [
  { k: 'Origen', t: 'La vega cubana: tierra roja, sol filtrado bajo el tapado y generaciones de veguero que dan al tabaco su carácter inconfundible.', img: 'vega' },
  { k: 'Torcido', t: 'Tripa, capote y capa unidos por manos expertas. Cada habano se tuerce a mano, hoja a hoja.', img: 'torcido' },
  { k: 'Guarda', t: 'Humedad, temperatura y paciencia. La guarda correcta afina los aromas con el paso de los años.', img: 'humidor' },
  { k: 'Encendido', t: 'Fuego sin prisa, girando el pie hasta un anillo de brasa parejo. Después, el humo marca el ritmo.', img: 'humo' },
  { k: 'Maridaje', t: 'Un ron añejo, un cóctel de autor, un café de origen. El equilibrio que eleva cada calada.', img: 'maridaje' },
] as const;

export const stats = [
  { v: '+10', l: 'años en el sector del lujo' },
  { v: 'COL', l: 'Representación y distribución exclusiva en Colombia' },
  { v: '100%', l: 'tabaco cubano' },
];
