import React from 'react';

// import all common image files from src/assets using Vite's glob (eager + url)
// use `query: '?url', import: 'default'` to be compatible with newer Vite deprecation
const modules = import.meta.glob('/src/assets/*.{jpg,jpeg,png,gif,webp}', { eager: true, query: '?url', import: 'default' });

export default function AssetsPreview(){
  const images = Object.values(modules);
  if(images.length === 0) return <div style={{padding:16}}>No images found in <code>src/assets</code>.</div>;
  return (
    <div style={{padding:16}}>
      <h2>Assets preview ({images.length})</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginTop:12}}>
        {images.map((src,idx)=> (
          <div key={idx} style={{border:'1px solid #e5e7eb',padding:8,borderRadius:6,background:'#fff'}}>
            <img src={src} alt={`asset-${idx}`} style={{width:'100%',height:120,objectFit:'cover',borderRadius:4}} />
            <div style={{marginTop:8,wordBreak:'break-all',fontSize:12,color:'#374151'}}>{src}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
