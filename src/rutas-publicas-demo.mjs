// Alias de demostraciones públicas; no contienen permisos ni datos privados.
import {obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
import {planesRepresentativos,enlacesDemo} from "../public/demostraciones/presentaciones.mjs";
export function destinoDemo(url){
 const m=/^\/([a-z0-9-]+)(\/panel)?\/?$/.exec(url.pathname);
 if(!m)return null;
 const id=m[1]==="torque-automotriz"?"auto-servicio-bahia":m[1];
 if(!obtenerEstablecimiento(id))return null;
 const plan=url.searchParams.get("plan")??planesRepresentativos[id];
 if(!planes.some(p=>p.id===plan))return null;
 const e=enlacesDemo(id,plan);
 return m[2]?e.administracion:e.negocio;
}
