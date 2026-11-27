// PKCE y cifrado de credenciales; exclusivamente servidor.
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const random=n=>b64(crypto.getRandomValues(new Uint8Array(n)));
export async function prepararOAuth({clientId,redirectUri}){
 const uri=new URL(redirectUri);
 if(uri.protocol!=="https:"||uri.username||uri.password||uri.hash||!/^\d+$/.test(clientId))throw Error("Configuración OAuth inválida.");
 const state=random(32),verifier=random(32),challenge=b64(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(verifier))));
 const url=new URL("https://auth.mercadopago.com/authorization");
 url.search=new URLSearchParams({client_id:clientId,response_type:"code",platform_id:"mp",redirect_uri:redirectUri,state,code_challenge:challenge,code_challenge_method:"S256"});
 return {url:url.href,state,verifier};
}
async function clave(secret){
 const raw=unb64(secret);if(raw.length!==32)throw Error("Clave de cifrado inválida.");
 return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
}
function contexto(comercio,entorno){if(typeof comercio!=="string"||!comercio||!["prueba","produccion"].includes(entorno))throw Error("Contexto inválido.");return enc.encode(JSON.stringify(["mp-point-v1",comercio,entorno]));}
export async function cifrarCredenciales(datos,{secret,comercio,entorno}){
 const iv=crypto.getRandomValues(new Uint8Array(12)),k=await clave(secret);
 const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:contexto(comercio,entorno)},k,enc.encode(JSON.stringify(datos)));
 return {version:1,iv:b64(iv),datos:b64(new Uint8Array(cipher))};
}
export async function descifrarCredenciales(registro,{secret,comercio,entorno}){
 if(registro?.version!==1)throw Error("Versión de credencial inválida.");
 const k=await clave(secret);
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(registro.iv),additionalData:contexto(comercio,entorno)},k,unb64(registro.datos));
 return JSON.parse(dec.decode(plain));
}
