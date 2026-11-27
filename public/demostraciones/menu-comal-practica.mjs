// Copia versionada del menú original estático. No usa la API ni la D1 operativas.
// Los precios especiales por fecha y la edición de modificadores son otro bloque.
export const menuComalPractica=[
  {
    "id": "combo-el-comal",
    "nombre": "Combo El Comal",
    "categoria": "Combos",
    "tipo": "alimento",
    "precioCentavos": 8500,
    "descripcion": "Elige la bebida de tu combo.",
    "imagen": "/imagenes/pastor.webp"
  },
  {
    "id": "pastor",
    "nombre": "Taco al pastor",
    "categoria": "Tacos",
    "tipo": "alimento",
    "precioCentavos": 2500,
    "descripcion": "Carne al pastor, cebolla y cilantro.",
    "imagen": "/imagenes/pastor.webp"
  },
  {
    "id": "asada",
    "nombre": "Taco de asada",
    "categoria": "Tacos",
    "tipo": "alimento",
    "precioCentavos": 3000,
    "descripcion": "Carne asada, cebolla y cilantro.",
    "imagen": "/imagenes/asada.webp"
  },
  {
    "id": "birria",
    "nombre": "Taco de birria",
    "categoria": "Tacos",
    "tipo": "alimento",
    "precioCentavos": 3500,
    "descripcion": "Carne de birria con cebolla y cilantro.",
    "imagen": "/imagenes/birria.webp"
  },
  {
    "id": "carnitas",
    "nombre": "Taco de carnitas",
    "categoria": "Tacos",
    "tipo": "alimento",
    "precioCentavos": 3000,
    "descripcion": "Carnitas de cerdo con cebolla y cilantro.",
    "imagen": "/imagenes/carnitas.webp"
  },
  {
    "id": "quesadilla",
    "nombre": "Quesadilla",
    "categoria": "Especialidades",
    "tipo": "alimento",
    "precioCentavos": 4500,
    "descripcion": "Tortilla de harina con queso fundido.",
    "imagen": "/imagenes/quesadilla.webp"
  },
  {
    "id": "agua",
    "nombre": "Agua natural",
    "categoria": "Bebidas",
    "tipo": "alimento",
    "precioCentavos": 2000,
    "descripcion": "Vaso de agua natural fría con hielo.",
    "imagen": "/imagenes/agua.webp"
  },
  {
    "id": "refresco",
    "nombre": "Refresco",
    "categoria": "Bebidas",
    "tipo": "alimento",
    "precioCentavos": 2500,
    "descripcion": "Refresco frío acompañado de hielo.",
    "imagen": "/imagenes/refresco.webp"
  },
  {
    "id": "jamaica",
    "nombre": "Agua de jamaica",
    "categoria": "Bebidas",
    "tipo": "alimento",
    "precioCentavos": 2500,
    "descripcion": "Agua fresca de jamaica servida con hielo.",
    "imagen": "/imagenes/jamaica.webp",
    "disponible": false
  }
];
const opciones={
  "combo-el-comal": {
    "ingredientes": [],
    "extras": [],
    "variantes": [
      {
        "id": "agua",
        "nombre": "Agua natural regular",
        "centavos": 0,
        "productoId": "agua"
      },
      {
        "id": "refresco",
        "nombre": "Refresco",
        "centavos": 500,
        "productoId": "refresco"
      }
    ],
    "incluye": [
      "3 tacos al pastor"
    ],
    "etiqueta": "Bebida",
    "maxExtras": 0
  },
  "pastor": {
    "ingredientes": [
      {
        "id": "cebolla",
        "nombre": "Cebolla",
        "incluido": true
      },
      {
        "id": "cilantro",
        "nombre": "Cilantro",
        "incluido": true
      }
    ],
    "extras": [
      {
        "id": "queso",
        "nombre": "Queso extra",
        "centavos": 1000
      }
    ],
    "variantes": [],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 1
  },
  "asada": {
    "ingredientes": [
      {
        "id": "cebolla",
        "nombre": "Cebolla",
        "incluido": true
      },
      {
        "id": "cilantro",
        "nombre": "Cilantro",
        "incluido": true
      },
      {
        "id": "salsa",
        "nombre": "Salsa roja",
        "incluido": true
      }
    ],
    "extras": [
      {
        "id": "queso",
        "nombre": "Queso extra",
        "centavos": 1000
      },
      {
        "id": "aguacate",
        "nombre": "Aguacate extra",
        "centavos": 1500
      }
    ],
    "variantes": [],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 2
  },
  "birria": {
    "ingredientes": [
      {
        "id": "cebolla",
        "nombre": "Cebolla",
        "incluido": true
      },
      {
        "id": "cilantro",
        "nombre": "Cilantro",
        "incluido": true
      }
    ],
    "extras": [
      {
        "id": "queso",
        "nombre": "Queso extra",
        "centavos": 1000
      },
      {
        "id": "consome",
        "nombre": "Consomé extra",
        "centavos": 1500
      }
    ],
    "variantes": [],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 2
  },
  "carnitas": {
    "ingredientes": [
      {
        "id": "cebolla",
        "nombre": "Cebolla",
        "incluido": true
      },
      {
        "id": "cilantro",
        "nombre": "Cilantro",
        "incluido": true
      },
      {
        "id": "salsa_verde",
        "nombre": "Salsa verde",
        "incluido": true
      }
    ],
    "extras": [
      {
        "id": "aguacate",
        "nombre": "Aguacate extra",
        "centavos": 1500
      },
      {
        "id": "queso",
        "nombre": "Queso extra",
        "centavos": 1000
      }
    ],
    "variantes": [],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 2
  },
  "quesadilla": {
    "ingredientes": [
      {
        "id": "queso",
        "nombre": "Queso",
        "incluido": true,
        "obligatorio": true
      }
    ],
    "extras": [
      {
        "id": "carne_asada",
        "nombre": "Carne asada",
        "centavos": 2000
      },
      {
        "id": "champiñones",
        "nombre": "Champiñones",
        "centavos": 1500
      },
      {
        "id": "aguacate",
        "nombre": "Aguacate extra",
        "centavos": 1500
      }
    ],
    "variantes": [],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 2
  },
  "agua": {
    "ingredientes": [],
    "extras": [],
    "variantes": [
      {
        "id": "regular",
        "nombre": "Regular",
        "centavos": 0
      },
      {
        "id": "grande",
        "nombre": "Grande",
        "centavos": 1000
      }
    ],
    "incluye": [],
    "etiqueta": "Tamaño",
    "maxExtras": 0
  }
};
export function opcionesComal(id,p,catalogo){
 if(id!=="taqueria-el-comal"||p?.tipo!=="alimento"||!Object.hasOwn(opciones,p.id))return null;
 const o=opciones[p.id];
 const disponibles=o.variantes.filter(v=>!v.productoId||catalogo.some(x=>x.id===v.productoId&&x.disponible!==false));
 return {...o,variantes:disponibles,requiereVariante:o.variantes.length>0};
}
export function normalizarOpciones(id,p,catalogo,valor){
 const o=opcionesComal(id,p,catalogo);
 if(!o){if(valor!==undefined)throw Error("Este producto no admite personalización.");return {precio:p.precioCentavos};}
 if(o.requiereVariante&&!o.variantes.length)throw Error("No hay opciones disponibles para este producto.");
 const d=valor===undefined?{omitir:[],extras:[],variante:o.variantes[0]?.id||""}:valor;
 if(!d||typeof d!=="object"||!Array.isArray(d.omitir)||!Array.isArray(d.extras)||typeof d.variante!=="string"||d.omitir.length>o.ingredientes.length||d.extras.length>o.maxExtras||new Set(d.omitir).size!==d.omitir.length||new Set(d.extras).size!==d.extras.length)throw Error("Personalización inválida.");
 if(d.omitir.some(x=>!o.ingredientes.some(i=>i.id===x&&!i.obligatorio&&i.incluido))||d.extras.some(x=>!o.extras.some(e=>e.id===x)))throw Error("Ingrediente o extra inválido.");
 const v=o.variantes.find(x=>x.id===d.variante);
 if(o.requiereVariante?!v:d.variante!=="")throw Error("Selecciona una opción disponible.");
 const omitir=o.ingredientes.filter(i=>d.omitir.includes(i.id)),extras=o.extras.filter(e=>d.extras.includes(e.id));
 const seleccion={omitir:omitir.map(x=>x.id),extras:extras.map(x=>x.id),variante:d.variante};
 const detalles=[...o.incluye,...(v?[o.etiqueta+": "+v.nombre]:[]),...omitir.map(x=>"Sin "+x.nombre),...extras.map(x=>"+ "+x.nombre)];
 return {precio:p.precioCentavos+(v?.centavos||0)+extras.reduce((n,e)=>n+e.centavos,0),seleccion,detalles};
}
export function claveLinea(l){return JSON.stringify([l.id,l.opciones||null]);}
export function textoLinea(l){return l.nombre+(l.personalizacion?.length?" ("+l.personalizacion.join(" · ")+")":"");}
