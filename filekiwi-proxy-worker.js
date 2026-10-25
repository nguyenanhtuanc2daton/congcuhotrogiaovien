/* Cloudflare Worker — cầu nối CORS cho luu-file-tam.js (chỉ cần khi trình duyệt chặn gọi thẳng file.kiwi)
   Cách dùng: Cloudflare Dashboard → Workers & Pages → Create → Hello World → dán file này → Deploy.
   Sau đó chép địa chỉ Worker (…workers.dev) vào hằng PROXY trong luu-file-tam.js.
   QUAN TRỌNG: sửa ALLOWED_ORIGINS thành đúng địa chỉ trang web của bạn, để người lạ không dùng ké. */
const ALLOWED_ORIGINS=['https://TEN-CUA-BAN.github.io'];

export default{
  async fetch(req){
    const origin=req.headers.get('Origin')||'';
    const ok=ALLOWED_ORIGINS.includes(origin);
    const cors={
      'Access-Control-Allow-Origin':ok?origin:'null',
      'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers':'*',
      'Access-Control-Max-Age':'86400',
      'Vary':'Origin'
    };
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(!ok)return new Response('forbidden',{status:403,headers:cors});

    const url=new URL(req.url);
    let target;
    if(url.pathname.startsWith('/api/')){
      target='https://api.file.kiwi'+url.pathname.slice(4)+url.search;
    }else if(url.pathname==='/put'){
      target=url.searchParams.get('u')||'';
      let h;
      try{h=new URL(target)}catch(e){return new Response('bad url',{status:400,headers:cors})}
      if(h.protocol!=='https:'||!h.hostname.endsWith('.r2.cloudflarestorage.com'))
        return new Response('forbidden target',{status:403,headers:cors});
    }else{
      return new Response('not found',{status:404,headers:cors});
    }

    const headers=new Headers();
    for(const [k,v] of req.headers){
      if(k==='content-type'||k.startsWith('x-amz-'))headers.set(k,v);
    }
    const res=await fetch(target,{
      method:req.method,headers,
      body:(req.method==='GET'||req.method==='HEAD')?undefined:req.body
    });
    const out=new Headers(res.headers);
    for(const k in cors)out.set(k,cors[k]);
    return new Response(res.body,{status:res.status,headers:out});
  }
};
