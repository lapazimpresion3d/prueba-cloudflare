// Explicit allowlist, no network requests or automatic imports of personal identity.
const redes=Object.freeze({facebook:["facebook.com","www.facebook.com"],instagram:["instagram.com","www.instagram.com"],tiktok:["tiktok.com","www.tiktok.com"],youtube:["youtube.com","www.youtube.com"],linkedin:["linkedin.com","www.linkedin.com"],x:["x.com","www.x.com"]});
const campos=["telefono","whatsapp","correo","direccion","coordenadas","mapa","sitio",...Object.keys(redes)];
const error=()=>{throw Error("Contacto inválido.");};
const objeto=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const texto=(x,max)=>{if(typeof x!=="string"||x.length>max||/[\u0000-\u001f\u007f-\u009f]/u.test(x))error();return x.trim();};
function telefono(x){
 const t=texto(x,40);if(!t)return "";
 if(!/^\+[0-9 ()-]+$/.test(t))error();
 const n=t.replace(/[ ()-]/g,"");if(!/^\+[1-9][0-9]{7,14}$/.test(n))error();return n;
}
function enlace(x,hosts){
 const t=texto(x,600);if(!t)return "";
 if(!/^https:\/\//i.test(t)||/[\\\s]/u.test(t))error();
 let u;try{u=new URL(t);}catch{error();}
 if(u.protocol!=="https:"||u.username||u.password||u.port||!u.hostname.includes(".")||u.hostname.endsWith(".")||/^\d+(?:\.\d+){3}$/.test(u.hostname)||/\.(?:local|localhost|internal|invalid|test)$/.test(u.hostname))error();
 if(hosts&&!hosts.includes(u.hostname))error();
 if(hosts&&u.pathname==="/")error();
 // Reject redirect endpoints and encoded path separators on platform URLs.
 if(hosts&&(/(?:^|\/)(?:redirect|url|l\.php|away|share|login)(?:\/|$)/i.test(u.pathname)||/%(?:2f|5c|00)/i.test(u.pathname)))error();
 if(u.href.length>600)error();return u.href;
}
export function validarContacto(d={}){
 if(!objeto(d)||Object.keys(d).some(k=>![...campos,"modalidades","visibilidad"].includes(k)))error();
 const r={telefono:telefono(d.telefono??""),whatsapp:telefono(d.whatsapp??""),correo:texto(d.correo??"",254),direccion:texto(d.direccion??"",500),coordenadas:null,mapa:enlace(d.mapa??"",["www.google.com","google.com","maps.google.com","maps.app.goo.gl"]),sitio:enlace(d.sitio??"")};
 if(r.correo&&!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(r.correo))error();
 if(r.correo&&(r.correo.includes("..")||r.correo.startsWith(".")||r.correo.split("@")[0].endsWith(".")))error();
 // Restrict Google full URLs to maps paths; short links are opaque and not resolved.
 if(r.mapa){const u=new URL(r.mapa);if(["www.google.com","google.com"].includes(u.hostname)&&!/^\/maps(?:\/|$)/.test(u.pathname))error();}
 for(const [k,hosts] of Object.entries(redes))r[k]=enlace(d[k]??"",hosts);
 if(d.coordenadas!=null){
  const c=d.coordenadas;if(!objeto(c)||Object.keys(c).length!==2||!Number.isFinite(c.latitud)||!Number.isFinite(c.longitud)||Math.abs(c.latitud)>90||Math.abs(c.longitud)>180)error();
  r.coordenadas={latitud:c.latitud,longitud:c.longitud};
 }
 const m=d.modalidades??[];if(!Array.isArray(m)||new Set(m).size!==m.length||m.some(x=>!["establecimiento","domicilio","en_linea"].includes(x)))error();
 r.modalidades=["establecimiento","domicilio","en_linea"].filter(x=>m.includes(x));
 const v=d.visibilidad??{};if(!objeto(v)||Object.keys(v).some(k=>!campos.includes(k)||typeof v[k]!=="boolean"))error();
 r.visibilidad=Object.fromEntries(campos.map(k=>[k,v[k]===true]));
 return r;
}
// Only explicitly selected fields; no private contact object spread or identity data.
export function proyectarContacto(d){
 const c=validarContacto(d),r={modalidades:c.modalidades};
 for(const k of campos)if(c.visibilidad[k]&&c[k]!==null&&c[k]!=="")r[k]=c[k];
 const enlaces={};
 if(r.telefono)enlaces.telefono="tel:"+r.telefono;
 if(r.whatsapp)enlaces.whatsapp="https://wa.me/"+r.whatsapp.slice(1);
 if(r.correo)enlaces.correo="mailto:"+encodeURIComponent(r.correo);
 if(r.mapa)enlaces.mapa=r.mapa;
 else if(r.coordenadas)enlaces.mapa="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r.coordenadas.latitud+","+r.coordenadas.longitud);
 for(const k of ["sitio",...Object.keys(redes)])if(r[k])enlaces[k]=r[k];
 return {...r,enlaces};
}
