// Semillas ficticias independientes; no consultar /menu.json ni API operativas.
// Los alimentos de El Comal reutilizan referencias del menú estático, no sus datos vivos.
const semillas = [
  {
    "id": "cafe-mirador",
    "nombre": "Café Mirador",
    "giro": "cafeteria",
    "giroNombre": "Cafetería",
    "marca": {
      "icono": "☕",
      "color": "#68452d",
      "fondo": "#f4e9dc",
      "lema": "Tu momento, tu café",
      "descripcion": "Café artesanal, repostería y desayunos ligeros."
    },
    "horario": "Lunes a sábado · 8:00 a 19:00",
    "ubicacion": "Sucursal ficticia · La Paz, BCS",
    "catalogo": [
      [
        "espresso",
        "Espresso",
        "Bebidas",
        "alimento",
        4500,
        "Café de extracción corta."
      ],
      [
        "latte",
        "Latte de vainilla",
        "Bebidas",
        "alimento",
        6500,
        "Espresso con leche y vainilla."
      ],
      [
        "croissant",
        "Croissant",
        "Repostería",
        "alimento",
        5500,
        "Pan de mantequilla."
      ],
      [
        "chilaquiles",
        "Chilaquiles verdes",
        "Desayunos",
        "alimento",
        12500,
        "Con crema y queso."
      ],
      [
        "cafe-grano",
        "Café en grano 250 g",
        "Productos",
        "fisico",
        18000,
        "Bolsa de café tostado."
      ],
      [
        "cata",
        "Cata de café",
        "Experiencias",
        "servicio",
        25000,
        "Experiencia de degustación.",
        45
      ]
    ]
  },
  {
    "id": "barberia-elite",
    "nombre": "Barbería Elite",
    "giro": "barberia",
    "giroNombre": "Barbería",
    "marca": {
      "icono": "✂️",
      "color": "#293b49",
      "fondo": "#e6ecee",
      "lema": "Estilo con carácter",
      "descripcion": "Cortes, barba y cuidado personal."
    },
    "horario": "Martes a domingo · 10:00 a 20:00",
    "ubicacion": "Sucursal ficticia · La Paz, BCS",
    "catalogo": [
      [
        "corte",
        "Corte clásico",
        "Cortes",
        "servicio",
        18000,
        "Corte personalizado.",
        35
      ],
      [
        "barba",
        "Perfilado de barba",
        "Barba",
        "servicio",
        12000,
        "Arreglo y acabado.",
        25
      ],
      [
        "combo",
        "Corte y barba",
        "Paquetes",
        "servicio",
        27000,
        "Servicio combinado.",
        55
      ],
      [
        "pomada",
        "Pomada mate",
        "Productos",
        "fisico",
        19000,
        "Producto de peinado."
      ],
      [
        "aceite",
        "Aceite para barba",
        "Productos",
        "fisico",
        22000,
        "Cuidado diario."
      ]
    ]
  },
  {
    "id": "mundo-mascotas",
    "nombre": "Mundo Mascotas",
    "giro": "tienda",
    "giroNombre": "Tienda minorista",
    "marca": {
      "icono": "🐾",
      "color": "#176452",
      "fondo": "#e0f2e9",
      "lema": "Todo para sus mejores amigos",
      "descripcion": "Accesorios y artículos de cuidado para mascotas."
    },
    "horario": "Lunes a domingo · 9:00 a 19:00",
    "ubicacion": "Sucursal ficticia · La Paz, BCS",
    "catalogo": [
      [
        "alimento",
        "Alimento para perro 2 kg",
        "Alimentación",
        "fisico",
        26500,
        "Bolsa de alimento seco."
      ],
      [
        "correa",
        "Correa ajustable",
        "Accesorios",
        "fisico",
        14500,
        "Correa para paseo."
      ],
      [
        "juguete",
        "Juguete de caucho",
        "Juguetes",
        "fisico",
        9500,
        "Juguete resistente."
      ],
      [
        "arena",
        "Arena para gato 4 kg",
        "Higiene",
        "fisico",
        18000,
        "Arena absorbente."
      ],
      [
        "cepillo",
        "Cepillo para mascotas",
        "Higiene",
        "fisico",
        13000,
        "Para cuidado del pelaje."
      ]
    ]
  },
  {
    "id": "taqueria-el-comal",
    "nombre": "Taquería El Comal",
    "giro": "restaurante",
    "giroNombre": "Restaurante",
    "marca": {
      "icono": "🌮",
      "color": "#a02f1c",
      "fondo": "#fae8d8",
      "lema": "Sabor de México",
      "descripcion": "Tacos preparados al momento. Demo principal del giro restaurantero."
    },
    "horario": "Martes a domingo · 12:00 a 22:00",
    "ubicacion": "Sucursal ficticia · La Paz, BCS",
    "catalogo": [
      [
        "combo-el-comal",
        "Combo El Comal",
        "Combos",
        "alimento",
        8500,
        "Tres tacos al pastor; bebida a elegir.",
        null,
        "/imagenes/pastor.webp"
      ],
      [
        "pastor",
        "Taco al pastor",
        "Tacos",
        "alimento",
        2500,
        "Carne al pastor, cebolla y cilantro.",
        null,
        "/imagenes/pastor.webp"
      ],
      [
        "asada",
        "Taco de asada",
        "Tacos",
        "alimento",
        3000,
        "Carne asada, cebolla y cilantro.",
        null,
        "/imagenes/asada.webp"
      ],
      [
        "birria",
        "Taco de birria",
        "Tacos",
        "alimento",
        3500,
        "Taco de birria.",
        null,
        "/imagenes/birria.webp"
      ],
      [
        "quesadilla",
        "Quesadilla",
        "Especialidades",
        "alimento",
        4500,
        "Quesadilla de la casa.",
        null,
        "/imagenes/quesadilla.webp"
      ],
      [
        "jamaica",
        "Agua de jamaica",
        "Bebidas",
        "alimento",
        2500,
        "Bebida fresca.",
        null,
        "/imagenes/jamaica.webp"
      ]
    ]
  },
  {
    "id": "auto-servicio-bahia",
    "nombre": "Auto Servicio Bahía",
    "giro": "taller",
    "giroNombre": "Taller mecánico",
    "marca": {
      "icono": "🔧",
      "color": "#204c76",
      "fondo": "#e3edf6",
      "lema": "Servicio y confianza",
      "descripcion": "Mantenimiento preventivo y revisión automotriz."
    },
    "horario": "Lunes a sábado · 8:00 a 17:00",
    "ubicacion": "Sucursal ficticia · La Paz, BCS",
    "catalogo": [
      [
        "diagnostico",
        "Diagnóstico básico",
        "Diagnóstico",
        "servicio",
        35000,
        "Revisión inicial del vehículo.",
        45
      ],
      [
        "aceite",
        "Cambio de aceite",
        "Mantenimiento",
        "servicio",
        65000,
        "Precio ilustrativo desde.",
        60
      ],
      [
        "frenos",
        "Revisión de frenos",
        "Mantenimiento",
        "servicio",
        45000,
        "Inspección visual y funcional.",
        45
      ],
      [
        "filtro",
        "Filtro de aceite",
        "Refacciones",
        "fisico",
        18000,
        "Referencia ilustrativa; compatibilidad por verificar."
      ],
      [
        "limpiaparabrisas",
        "Limpiaparabrisas",
        "Accesorios",
        "fisico",
        22000,
        "Referencia ilustrativa."
      ]
    ]
  }
];
export const establecimientos = semillas.map(({catalogo,...perfil}) => ({
  ...perfil,
  configuracion: {moneda:"MXN", zonaHoraria:"America/Mazatlan", demo:true, qrOpcional:true},
  catalogo: catalogo.map(([id,nombre,categoria,tipo,precioCentavos,descripcion,duracionMinutos,imagen]) => ({
    id,nombre,categoria,tipo,precioCentavos,descripcion,
    ...(duracionMinutos ? {duracionMinutos} : {}), ...(imagen ? {imagen} : {})
  }))
}));
export function obtenerEstablecimiento(id) {
  return establecimientos.find(e=>e.id===id) ?? null;
}
export function filtrarCatalogo(establecimiento,{busqueda="",tipo="",categoria=""}={}) {
  const normalizar = s => s.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
  const q=normalizar(busqueda);
  return (establecimiento?.catalogo ?? []).filter(p=>
    (!tipo || p.tipo===tipo) && (!categoria || p.categoria===categoria) &&
    (!q || normalizar([p.nombre,p.descripcion,p.categoria].join(" ")).includes(q))
  );
}
