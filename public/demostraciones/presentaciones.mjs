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
