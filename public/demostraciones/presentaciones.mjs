// Presentaciones públicas independientes de los controles de desarrollo.
// Las cinco plantillas comparten los datos, no duplican los módulos.
export const presentaciones={
  "cafe-mirador":{
    estilo:"cafe",sigla:"CM",distintivo:"CAFÉ · REPOSTERÍA · DESAYUNOS",
    titulo:"Una buena pausa empieza con un buen café.",
    entrada:"Descubre nuestras bebidas, desayunos y pequeños antojos.",
    catalogo:"Nuestro menú",accion:"Explorar el menú",
    seccion:"Un espacio para disfrutar",texto:"Desde un espresso hasta una degustación, encuentra tu momento favorito.",
    destacados:["Café artesanal","Repostería","Desayunos"],iconos:{Bebidas:"☕",Repostería:"🥐",Desayunos:"🍳",Productos:"☕",Experiencias:"☕"}
  },
  "barberia-elite":{
    estilo:"barberia",sigla:"BE",distintivo:"BARBERÍA · ESTILO · CUIDADO",
    titulo:"Estilo que habla por ti.",
    entrada:"Conoce nuestros cortes, servicios de barba y productos de cuidado personal.",
    catalogo:"Servicios y productos",accion:"Conocer los servicios",
    seccion:"El detalle hace la diferencia",texto:"Cortes clásicos, perfilado y acabados para tu rutina de cuidado.",
    destacados:["Cortes","Barba","Cuidado personal"],iconos:{Cortes:"✂️",Barba:"🪒",Paquetes:"✂️",Productos:"🧴"}
  },
  "mundo-mascotas":{
    estilo:"mascotas",sigla:"MM",distintivo:"ALIMENTACIÓN · JUEGO · CUIDADO",
    titulo:"Pequeños detalles, grandes colitas felices.",
    entrada:"Explora artículos para alimentar, consentir y cuidar a tu mejor amigo.",
    catalogo:"Explora nuestra tienda",accion:"Ver productos",
    seccion:"Para cada momento de su día",texto:"Encuentra accesorios para pasear, jugar y cuidar a tus mascotas.",
    destacados:["Alimentación","Accesorios","Higiene"],iconos:{Alimentación:"🐕",Accesorios:"🐾",Juguetes:"🎾",Higiene:"🧴"}
  },
  "taqueria-el-comal":{
    estilo:"comal",sigla:"EC",distintivo:"TACOS · COMBOS · ANTOJOS",
    titulo:"El sabor de México, recién salido del comal.",
    entrada:"Conoce nuestros tacos, especialidades y bebidas.",
    catalogo:"Nuestro menú",accion:"Ver la carta",
    seccion:"Para todos los antojos",texto:"Explora la carta de ejemplo de nuestra taquería.",
    destacados:["Tacos","Combos","Especialidades"],iconos:{Tacos:"🌮",Combos:"🌮",Especialidades:"🧀",Bebidas:"🥤"}
  },
  "auto-servicio-bahia":{
    estilo:"taller",sigla:"AB",distintivo:"DIAGNÓSTICO · MANTENIMIENTO · REFACCIONES",
    titulo:"Tu auto, en buenas manos.",
    entrada:"Consulta servicios de mantenimiento, revisiones y refacciones de ejemplo.",
    catalogo:"Servicios y refacciones",accion:"Consultar servicios",
    seccion:"Cuida cada kilómetro",texto:"Conoce las opciones de mantenimiento preventivo y revisión automotriz.",
    destacados:["Diagnóstico","Mantenimiento","Refacciones"],iconos:{Diagnóstico:"🔧",Mantenimiento:"⚙️",Refacciones:"🔩",Accesorios:"🚗"}
  }
};
export function presentacionDe(id){return Object.hasOwn(presentaciones,id)?presentaciones[id]:null;}
export function enlacesDemo(id,plan,practica=false){
  const q=new URLSearchParams({negocio:id,plan});
  const administracion="/demostraciones/?"+q+"&vista=administracion";
  const negocio="/demostraciones/negocio/?"+q+(practica?"&practica=1":"");
  return {administracion,negocio,comparador:"/demostraciones/?"+q};
}

// Símbolos vectoriales originales, decorativos y sin recursos externos.
export const simbolos={
 cafe:'<path d="M18 42h50v10a25 25 0 0 1-50 0z"/><path d="M68 45h9a9 9 0 0 1 0 18h-14M13 79h61M30 32c-9-8 9-12 0-20M45 32c-9-8 9-12 0-20M60 32c-9-8 9-12 0-20"/>',
 barberia:'<circle cx="25" cy="72" r="13"/><circle cx="65" cy="72" r="13"/><path d="M34 62 74 15 77 29 46 65M56 62 16 15 13 29 44 65"/><circle cx="45" cy="48" r="3"/>',
 mascotas:'<ellipse cx="22" cy="35" rx="9" ry="12" transform="rotate(-24 22 35)"/><ellipse cx="39" cy="22" rx="9" ry="12" transform="rotate(-10 39 22)"/><ellipse cx="59" cy="22" rx="9" ry="12" transform="rotate(10 59 22)"/><ellipse cx="76" cy="35" rx="9" ry="12" transform="rotate(24 76 35)"/><path d="M49 44c-12 0-15 12-26 22-14 14 4 29 18 20 5-3 11-3 16 0 14 9 32-6 18-20C64 56 61 44 49 44Z"/>',
 comal:'<path d="M10 72C10 28 80 15 88 72Z"/><path d="M15 55l8-9 9 5 9-10 10 5 8-9 9 6 7-4M25 65h3m11-8h3m11 8h3m10-11h3"/><path d="M22 29l-4-8m24 1 1-10m20 12 5-8"/>',
 taller:'<path d="M64 12a20 20 0 0 0-21 27L14 68a10 10 0 0 0 14 14l29-29a20 20 0 0 0 27-21L70 43 57 30Z"/><circle cx="21" cy="75" r="3"/><path d="M12 20h20M22 10v20M70 73h16M78 65v16"/>'
};
