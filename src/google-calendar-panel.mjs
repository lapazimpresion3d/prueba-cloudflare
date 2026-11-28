// Private candidate HTTP adapter: explicitly injected, not mounted in public worker.
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
const html=(body,status=200)=>new Response('<!doctype html><html lang="es-MX"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Calendar</title><main>'+body+'</main></html>',{status,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
const redirect=(url)=>new Response(null,{status:303,headers:{...headers,Location:url}});
export function crearPanelGoogle({servicio,origen,habilitado=false,recursosEmpresa=async()=>[]}){
 const raiz="/privado/google-calendar",callback=raiz+"/callback";
 return async function atender(r){
 const u=new URL(r.url);if(!habilitado||u.origin!==origen||u.protocol!=="https:")return html("No disponible",404);
 try{
 // Cross-site callback has no Strict session cookie. No exchange here. Require same-site POST and reauthentication.
 if(u.pathname===callback&&r.method==="GET"){
 const state=u.searchParams.get("state"),code=u.searchParams.get("code");
 if(u.searchParams.has("error")||u.searchParams.getAll("state").length!==1||u.searchParams.getAll("code").length!==1||! /^[A-Za-z0-9_-]{43}$/.test(state??"")||!code||code.length>4096)return html("Autorización cancelada o inválida.",400);
 return html('<h1>Confirmar conexión</h1><p>Selecciona la empresa que inició la autorización. Tu sesión debe seguir vigente.</p><form method="post" action="'+raiz+'/confirmar"><label>Identificador de empresa <input name="empresa" required maxlength="128"></label><input type="hidden" name="state" value="'+esc(state)+'"><input type="hidden" name="code" value="'+esc(code)+'"><button>Confirmar autorización</button></form>');
 }
 if(r.method==="POST"){
 if(r.headers.get("Origin")!==origen||!r.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return html("No permitido",403);
 const raw=await r.text();if(raw.length>20000)return html("Solicitud demasiado grande",413);const f=new URLSearchParams(raw),empresa=f.get("empresa");if(!empresa||empresa.length>128||f.getAll("empresa").length!==1)throw Error();
 const accion=u.pathname.slice(raiz.length+1),volver=raiz+"?empresa="+encodeURIComponent(empresa);
 if(accion==="confirmar"){
 // Build a server-internal callback using the authenticated same-site request cookie, never identity from form.
 const q=new URL(origen+callback);q.searchParams.set("state",f.get("state")??"");q.searchParams.set("code",f.get("code")??"");await servicio.completar(new Request(q,{headers:{Cookie:r.headers.get("Cookie")??""}}),empresa);return redirect(volver);
 }
 if(accion==="conectar"){const x=await servicio.iniciar(r,empresa),url=new URL(x.url);if(url.origin!=="https://accounts.google.com"||url.pathname!=="/o/oauth2/v2/auth")throw Error();return redirect(url.href);}
 if(accion==="crear")await servicio.crear(r,empresa,f.get("nombre"));
 else if(accion==="configurar"){const recursos=Object.create(null),permitidos=await recursosEmpresa(r,empresa);for(const k of permitidos){const v=f.get("recurso:"+k.id);if(v)recursos[k.id]=v;}await servicio.configurar(r,empresa,{general:f.get("general"),recursos,activo:f.get("activo")==="1"});}
 else if(accion==="sincronizar")await servicio.sincronizar(r,empresa);
 else if(accion==="desconectar")await servicio.desconectar(r,empresa);
 else if(accion!=="crear")return html("No disponible",404);return redirect(volver);
 }
 if(r.method!=="GET"||u.pathname!==raiz)return html("No disponible",404);
 const e=u.searchParams.get("empresa");if(!e||e.length>128)throw Error();const d=await servicio.estado(r,e),form=(a,body)=>'<form method="post" action="'+raiz+'/'+a+'"><input type="hidden" name="empresa" value="'+esc(e)+'">'+body+'</form>';
 let body='<h1>Google Calendar</h1><p>Estado: '+(d.conectado?"Conectado":"Desconectado")+'</p>';
 if(!d.conectado)body+=form("conectar","<button>Conectar con Google</button>");
 else{const lista=await servicio.listar(r,e),opts=(actual,opcional=false)=>(opcional?'<option value="">Sin calendario individual</option>':'')+lista.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===actual?" selected":"")+'>'+esc(c.nombre)+'</option>').join("");
 const recursos=d.plan==="p2"?[]:await recursosEmpresa(r,e);
 body+=form("crear",'<label>Nombre del calendario <input name="nombre" maxlength="100" required></label><button>Crear calendario</button>');
 body+=form("configurar",'<label>Calendario general <select name="general" required>'+opts(d.general)+'</select></label>'+recursos.map(k=>'<p><label>'+esc(k.nombre)+' <select name="recurso:'+esc(k.id)+'">'+opts(d.recursos?.[k.id],true)+'</select></label></p>').join("")+'<label><input type="checkbox" name="activo" value="1"'+(d.activo?" checked":"")+'> Sincronización automática</label><button>Guardar configuración</button>');
 body+=form("sincronizar","<button>Sincronizar ahora / reintentar</button>")+form("desconectar","<p>Desconectar no elimina eventos existentes.</p><button>Desconectar cuenta</button>");}
 body+="<h2>Historial</h2>"+(d.historial??[]).map(x=>'<p>'+esc(new Date(x.fecha).toISOString())+' — '+esc(x.estado)+'</p>').join("");return html(body);
 }catch{return html("No se pudo completar la operación. Revisa tu sesión, permisos y estado de conexión.",400);}
 };
}
