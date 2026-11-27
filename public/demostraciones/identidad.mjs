// Recursos fijos de marcas ficticias. Nunca se construyen con entradas de usuario.
const productos=Object.freeze({"cafe-mirador":["espresso","latte","croissant","chilaquiles","cafe-grano","cata"],"barberia-elite":["corte","barba","combo","pomada","aceite"],"mundo-mascotas":["alimento","correa","juguete","arena","cepillo"],"auto-servicio-bahia":["diagnostico","aceite","frenos","filtro","limpiaparabrisas"]});
export const marcasDemo=Object.freeze(["cafe-mirador","barberia-elite","mundo-mascotas","auto-servicio-bahia","taqueria-el-comal"]);
export function portadaDemo(id){return id==="taqueria-el-comal"?"/imagenes/banner-el-comal.webp":Object.hasOwn(productos,id)?"/imagenes/demo-"+id+"-portada.webp":null;}
export function fotoDemo(id,producto){return Object.hasOwn(productos,id)&&productos[id].includes(producto)?"/imagenes/demo-"+id+"-"+producto+".webp":null;}
export function logoDemo(id){return marcasDemo.includes(id)?"/demostraciones/identidad/"+id+".svg":null;}
