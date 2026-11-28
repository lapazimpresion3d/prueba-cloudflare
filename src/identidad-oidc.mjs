// Internal OIDC ID-token verification, not a login endpoint. Trusted keys/config supplied by server.
const enc=new TextEncoder(),dec=new TextDecoder("utf-8",{fatal:true});
const b64=s=>{if(typeof s!=="string"||!s||! /^[A-Za-z0-9_-]+$/.test(s)||s.length%4===1)throw Error("Identidad no verificada.");const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/"));const canonical=btoa(raw).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");if(canonical!==s)throw Error("Identidad no verificada.");return Uint8Array.from(raw,c=>c.charCodeAt(0));};
const obj=s=>{const x=JSON.parse(dec.decode(b64(s)));if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Identidad no verificada.");return x;};
const str=(x,max)=>typeof x==="string"&&x.length>0&&x.length<=max;
const https=x=>{try{const u=new URL(x);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}};
export function crearVerificadorIdentidad({emisor,audiencia,claves,acrCentral,reloj=Date.now}={}){
 if(!str(emisor,128)||!https(emisor)||!str(audiencia,256)||!Array.isArray(claves)||!claves.length||claves.length>10||!str(acrCentral,128))throw Error("Proveedor de identidad no configurado.");
 const keys=new Map();
 for(const k of claves){if(!str(k?.kid,128)||keys.has(k.kid)||k.kty!=="RSA"||k.alg!=="RS256"||k.use!=="sig"||!str(k.n,1024)||!str(k.e,16)||b64(k.n).length<256||Object.hasOwn(k,"d"))throw Error("Clave no válida.");keys.set(k.kid,{kty:"RSA",n:k.n,e:k.e,alg:"RS256",ext:true});}
 return async function verificar(token,{nonce,central=false}={}){
  try{
   if(!str(token,16384)||!str(nonce,256)||nonce.length<32||typeof central!=="boolean")throw Error();
   const partes=token.split(".");if(partes.length!==3)throw Error();
   const [h,p,f]=partes,header=obj(h);
   if(header.alg!=="RS256"||!keys.has(header.kid)||Object.keys(header).some(x=>!["alg","kid","typ"].includes(x))||(header.typ!==undefined&&header.typ!=="JWT"))throw Error();
   const key=await crypto.subtle.importKey("jwk",keys.get(header.kid),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
   if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64(f),enc.encode(h+"."+p)))throw Error();
   const c=obj(p),n=Math.floor(reloj()/1000);
   if(!Number.isSafeInteger(n)||c.iss!==emisor||c.aud!==audiencia||(c.azp!==undefined&&c.azp!==audiencia)||!str(c.sub,128)||c.nonce!==nonce||c.email_verified!==true||!str(c.email,254)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))throw Error();
   if(![c.exp,c.iat,c.auth_time].every(Number.isSafeInteger)||c.exp<=n||c.iat>n+30||c.iat<n-300||c.exp<=c.iat||c.exp-c.iat>3600||c.auth_time>c.iat+30||c.auth_time<n-300||c.nbf!==undefined&&(!Number.isSafeInteger(c.nbf)||c.nbf>n))throw Error();
   if(central&&c.acr!==acrCentral)throw Error();
   return Object.freeze({emisor:c.iss,sujeto:c.sub,email:c.email,emailVerified:true,mfaCentral:central});
  }catch{throw Error("Identidad no verificada.");}
 };
}
