// Optimización en el navegador: no se envía el original, ni se conserva EXIF.
export async function optimizarImagenPerfil(archivo,tipo){
  if(!archivo||!["image/jpeg","image/png","image/webp"].includes(archivo.type)||archivo.size>8*1024*1024||archivo.size<1)throw Error("Selecciona JPG, PNG o WebP de hasta 8 MB.");
  const url=URL.createObjectURL(archivo);
  try{
    const img=new Image();
    await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error("No se pudo leer la imagen."));img.src=url;});
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw Error("Imagen demasiado grande.");
    const max=tipo==="logo"?320:1000;
    const escala=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement("canvas");
    let w=Math.max(1,Math.round(img.naturalWidth*escala)),h=Math.max(1,Math.round(img.naturalHeight*escala));
    for(let i=0;i<6;i++){
      canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("No se pudo preparar la imagen.");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      for(const calidad of [.85,.7,.55,.4]){
        const data=canvas.toDataURL("image/jpeg",calidad);
        if(data.startsWith("data:image/jpeg;base64,")&&data.length<=100000)return data;
      }
      w=Math.max(1,Math.round(w*.75));h=Math.max(1,Math.round(h*.75));
    }
    throw Error("No se pudo reducir la imagen al tamaño permitido.");
  }finally{URL.revokeObjectURL(url);}
}
