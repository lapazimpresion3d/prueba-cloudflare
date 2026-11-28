import {leerJsonLimitado} from "./seguridad.mjs";
import {crearVerificadorIdentidad} from "./identidad-oidc.mjs";
const ACR="urn:logto:acr:mfa";
function url(v){if(typeof v!=="string"||v.length>512)throw Error("Configuración OIDC inválida.");const u=new URL(v);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.href!==v)throw Error("Configuración OIDC inválida.");return u;}
const incluye=(a,v)=>Array.isArray(a)&&a.includes(v);
export function crearConfiguracionLogto(env,{habilitado=false,transporte=fetch,reloj=Date.now}={}){
 if(habilitado!==true||env.COMERCIAL_ENTORNO!=="desarrollo"||env.COMERCIAL_HABILITADO!=="no")throw Error("Configuración de identidad deshabilitada.");
 const emisor=env.OIDC_EMISOR,issuer=url(emisor),retorno=url(env.OIDC_RETORNO),audiencia=env.OIDC_CLIENT_ID,secreto=env.OIDC_CLIENT_SECRET;
 if(issuer.pathname!=="/oidc"||typeof audiencia!=="string"||!audiencia||audiencia.length>256||typeof secreto!=="string"||!secreto||secreto.length>4096||retorno.origin===issuer.origin)throw Error("Configuración OIDC inválida.");
 const esperado={autorizacion:emisor+"/auth",intercambio:emisor+"/token",jwks:emisor+"/jwks"};
 let cache=null,vence=0,enCurso=null;
 async function json(destino){const r=await transporte(destino,{method:"GET",headers:{Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error("Proveedor no disponible.");const d=await leerJsonLimitado(r,65536);if(!d||typeof d!=="object"||Array.isArray(d))throw Error("Metadatos inválidos.");return d;}
 async function cargar(){
  const d=await json(emisor+"/.well-known/openid-configuration");
  if(d.issuer!==emisor||d.authorization_endpoint!==esperado.autorizacion||d.token_endpoint!==esperado.intercambio||d.jwks_uri!==esperado.jwks||!incluye(d.response_types_supported,"code")||!incluye(d.code_challenge_methods_supported,"S256")||!incluye(d.token_endpoint_auth_methods_supported,"client_secret_post")||!incluye(d.id_token_signing_alg_values_supported,"RS256"))throw Error("Proveedor incompatible.");
  const j=await json(esperado.jwks);
  if(!Array.isArray(j.keys)||j.keys.length>30)throw Error("Claves inválidas.");
  const claves=j.keys.filter(k=>k?.kty==="RSA"&&k.alg==="RS256"&&k.use==="sig");
  const config={emisor,audiencia,retorno:retorno.href,secreto,acrCentral:ACR,autorizacion:esperado.autorizacion,intercambio:esperado.intercambio,claves};
  crearVerificadorIdentidad(config);
  // Freeze the trusted configuration, not exposed in HTTP responses.
  for(const k of claves)Object.freeze(k);Object.freeze(claves);
  cache=Object.freeze(config);vence=reloj()+300000;return cache;
 }
 return Object.freeze({async obtener(){if(cache&&reloj()<vence)return cache;if(!enCurso)enCurso=cargar().finally(()=>{enCurso=null});return enCurso;}});
}
