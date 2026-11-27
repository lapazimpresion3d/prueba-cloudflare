// Structural JPEG allowlist for browser and Worker. Not a complete image decoder.
const prefijo="data:image/jpeg;base64,";
const error=()=>{throw Error("JPEG inválido o dimensiones fuera del límite.");};
export function inspeccionarJpeg(valor,{maximo=100000,lado=1000}={}){
 if(typeof valor!=="string"||valor.length>maximo||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(valor))error();
 const b64=valor.slice(prefijo.length);if(b64.length%4!==0)error();
 let b;try{b=atob(b64);if(btoa(b)!==b64)error();}catch{error();}
 const byte=i=>b.charCodeAt(i),word=i=>byte(i)*256+byte(i+1);
 if(b.length<16||word(0)!==0xffd8||word(b.length-2)!==0xffd9)error();
 let pos=2,ancho=0,alto=0,componentes=0,escaneo=false,tablasQ=false,tablasH=false;
 while(pos<b.length-2){
  if(byte(pos++)!==255)error();while(byte(pos)===255)pos++;
  const m=byte(pos++);if(![0xe0,0xdb,0xc0,0xc2,0xc4,0xdd,0xda].includes(m)||pos+2>b.length)error();
  const n=word(pos),fin=pos+n;if(n<2||fin>b.length-2)error();
  if(m===0xe0){if(n<16||b.slice(pos+2,pos+7)!=="JFIF\0"||n!==16+3*byte(pos+14)*byte(pos+15))error();}
  if(m===0xdb){if(n<67)error();tablasQ=true;}
  if(m===0xc4){if(n<19)error();tablasH=true;}
  if(m===0xdd&&n!==4)error();
  if(m===0xc0||m===0xc2){if(ancho||n<11||byte(pos+2)!==8)error();alto=word(pos+3);ancho=word(pos+5);componentes=byte(pos+7);if(!ancho||!alto||ancho>lado||alto>lado||![1,3].includes(componentes)||n!==8+3*componentes)error();}
  if(m===0xda){if(!ancho||!tablasQ||!tablasH||n<8||byte(pos+2)<1||byte(pos+2)>componentes||n!==6+2*byte(pos+2))error();escaneo=true;pos=fin;const inicio=pos;while(pos<b.length-2){if(byte(pos)!==255){pos++;continue;}let k=pos+1;while(byte(k)===255)k++;const siguiente=byte(k);if(siguiente===0||siguiente>=0xd0&&siguiente<=0xd7){pos=k+1;continue;}break;}if(pos===inicio)error();continue;}
  pos=fin;
 }
 if(pos!==b.length-2||!escaneo||!ancho)error();return {ancho,alto};
}
