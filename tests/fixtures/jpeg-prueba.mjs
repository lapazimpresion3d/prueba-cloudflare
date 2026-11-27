// Synthetic JPEG marker structure for parser tests, not a decodable photo.
export function jpegPrueba({ancho=1,alto=1,relleno=1}={}){
 const segmento=(m,d)=>[255,m,(d.length+2)>>8,(d.length+2)&255,...d];
 const b=[255,216,...segmento(219,[0,...Array(64).fill(1)]),...segmento(192,[8,alto>>8,alto&255,ancho>>8,ancho&255,1,1,17,0]),...segmento(196,[0,1,...Array(15).fill(0),0]),...segmento(218,[1,1,0,0,63,0]),...Array(relleno).fill(1),255,217];
 return "data:image/jpeg;base64,"+Buffer.from(b).toString("base64");
}
