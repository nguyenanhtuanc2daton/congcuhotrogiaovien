/* Tính điểm & xếp loại (HK1, HK2, cả năm) */


/* ======================= MÔ-ĐUN 3: TÍNH ĐIỂM & XẾP LOẠI (HK1, HK2, cả năm) ======================= */
(function(){
  const KEY='tk_bangdiem_v1';
  let rows=[],mode=1,src={},meta={year:'',subj:''};const PL=['n','id','dob','sex']; // src: file Excel gốc đã nhập theo học kỳ (chỉ giữ trong bộ nhớ) // mode 1/2 = đang nhập HK1/HK2; 3 = xem cả năm
  const FL=['a','a2','a3','a4','a5','b','c']; // ĐĐGtx1..4, ĐĐGgk, ĐĐGck
  const KOF={a:0,a2:0,a3:0,a4:0,a5:0,b:1,c:2}; // ô nào dùng hệ số nào
  const fld=(f,s)=>s===2?f+'_2':f; // HK1 lưu ở a..c (tương thích bản cũ), HK2 lưu ở a_2..c_2
  const ALL=[...FL,...FL.map(f=>f+'_2')];
  const blank=()=>{const o={n:'',id:'',dob:'',sex:''};ALL.forEach(f=>o[f]='');return o;};
  const anyv=r=>r.n.trim()||ALL.some(f=>r[f]);
  const num=s=>{s=String(s==null?'':s).trim().replace(',','.');if(s==='')return{v:null};
    if(!/^(\d+(\.\d*)?|\.\d+)$/.test(s))return{bad:1};const v=parseFloat(s);return(v<0||v>10)?{bad:1}:{v};};
  const rd=(id,d)=>{const v=parseFloat(String($(id).value).replace(',','.'));return isFinite(v)&&v>=0?v:d;};
  const cfg=()=>({k:[rd('k1',1),rd('k2',2),rd('k3',3)],t:[rd('thG',8),rd('thK',6.5),rd('thT',5)]});
  const CL=[['G','Giỏi'],['K','Khá'],['T','Trung bình'],['Y','Yếu']];
  const r1=x=>Math.round(x*10+1e-9)/10;
  const cls=(v,C)=>v>=C.t[0]?0:v>=C.t[1]?1:v>=C.t[2]?2:3;
  // ĐTBmhk = trung bình có hệ số của CÁC Ô ĐÃ NHẬP (ô trống bỏ qua, mẫu số chỉ cộng hệ số của ô đã nhập).
  // Có ô sai (chữ, <0, >10) hoặc chưa nhập ô nào -> null, hiện "—".
  function avgSem(r,C,s){
    let sum=0,w=0;
    for(const f of FL){
      const k=C.k[KOF[f]],x=num(r[fld(f,s)]);
      if(x.bad) return null;
      if(x.v===null||k<=0) continue;
      sum+=x.v*k; w+=k;
    }
    return w?r1(sum/w):null; // làm tròn 1 chữ số
  }
  // ĐTBmcn = (ĐTBmhk1 + ĐTBmhk2 × 2) ÷ 3, dùng ĐTB học kì đã làm tròn; thiếu một học kì thì chưa tính
  function calcAll(r,C){
    const a=avgSem(r,C,1),b=avgSem(r,C,2),c=(a!==null&&b!==null)?r1((a+2*b)/3):null;
    return{hk1:a,hk2:b,cn:c};
  }
  const target=(x)=>[x.hk1,x.hk2,x.cn][mode-1];
  // Tương thích kiểm thử cũ: calc(r,C) = HK1
  function calc(r,C){const v=avgSem(r,C,1);return v===null?null:{avg:v,cl:cls(v,C)};}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({rows,mode,meta,cfg:['k1','k2','k3','thG','thK','thT'].map(i=>$(i).value)}));}catch(e){}}
  function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');
    if(d&&Array.isArray(d.rows)){rows=d.rows.map(r=>{const o=blank();o.n=String(r.n||'');o.id=String(r.id||'');o.dob=String(r.dob||'');o.sex=String(r.sex||'');ALL.forEach(f=>o[f]=String(r[f]||''));return o;});
      if(d.meta)meta={year:String(d.meta.year||''),subj:String(d.meta.subj||'')};
      if(d.mode>=1&&d.mode<=3)mode=d.mode;
      if(Array.isArray(d.cfg))['k1','k2','k3','thG','thK','thT'].forEach((id,i)=>{if(d.cfg[i]!=null)$(id).value=d.cfg[i];});}}catch(e){}
    if(!rows.length)for(let i=0;i<5;i++)rows.push(blank());}
  const TN=['ĐTBmhk1','ĐTBmhk2','ĐTBmcn'];
  function formula(){const C=cfg();
    $('fml').innerHTML='ĐTBmhk = (tổng ĐĐGtx ×'+C.k[0]+' + ĐĐGgk×'+C.k[1]+' + ĐĐGck×'+C.k[2]+') ÷ (tổng hệ số của các ô ĐÃ NHẬP), làm tròn 1 chữ số; ô trống bỏ qua. ĐTBmcn = (ĐTBmhk1 + ĐTBmhk2×2) ÷ 3. Xếp loại &amp; thống kê theo <b>'+TN[mode-1]+'</b>: Giỏi ≥ '+C.t[0]+' · Khá ≥ '+C.t[1]+' · Trung bình ≥ '+C.t[2]+' · còn lại Yếu. Có ô nhập sai → chưa tính.';
    $('thXl').textContent='Xếp loại ('+TN[mode-1]+')';
    document.querySelectorAll('.mb').forEach(b=>b.classList.toggle('on',+b.dataset.m===mode));}
  const show=v=>v===null?'—':v.toFixed(1);
  function paint(tr,i,C){
    const r=rows[i],x=calcAll(r,C),t=target(x);
    if(mode<3)FL.forEach(f=>tr.querySelector('[data-f='+f+']').classList.toggle('bad',!!num(r[fld(f,mode)]).bad));
    tr.querySelector('.d1').textContent=show(x.hk1);tr.querySelector('.d2').textContent=show(x.hk2);tr.querySelector('.dc').textContent=show(x.cn);
    const xl=tr.querySelector('.xl');xl.textContent=t===null?'':CL[cls(t,C)][1];xl.className='xl cl-'+(t===null?'':CL[cls(t,C)][0]);
  }
  function stats(){
    const C=cfg(),cnt=[0,0,0,0];let sum=0,m=0;
    const si=rows.filter(anyv).length;
    rows.forEach(r=>{const t=target(calcAll(r,C));if(t!==null){cnt[cls(t,C)]++;sum+=t;m++;}});
    $('gStats').innerHTML=[['Sĩ số',si],[TN[mode-1]+' lớp',m?(sum/m).toFixed(2):'—']].concat(CL.map((c,i)=>[c[1],cnt[i]]))
      .map(a=>'<div class="stat"><b>'+a[1]+'</b><span>'+a[0]+'</span></div>').join('');
  }
  function refresh(){const C=cfg();formula();showMeta();$('gBody').querySelectorAll('tr').forEach((tr,i)=>paint(tr,i,C));stats();save();}
  function build(){
    const tb=$('gBody');tb.innerHTML='';
    tb.closest('table').classList.toggle('notx',mode===3);
    tb.closest('table').classList.toggle('imp',rows.some(r=>r.id||r.dob||r.sex)||Object.keys(src).length>0);
    tb.closest('table').classList.toggle('m1',mode===1); // Học kỳ 1: ẩn ĐTBmhk2 và ĐTBmcn // "Cả năm": ẩn các cột ĐĐGtx, ĐĐGgk, ĐĐGck
    rows.forEach((r,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td class="stt"></td><td class="nm"><input type="text" data-f="n" placeholder="Họ và tên"></td><td class="ix"><input type="text" data-f="id" placeholder="Mã ĐD"></td><td class="ix"><input type="text" data-f="dob" placeholder="dd/mm/yyyy"></td><td class="ix"><input type="text" data-f="sex" placeholder="Nam/Nữ"></td>'+
        FL.map((f,j)=>'<td'+' class="tx"'+'><input type="text" inputmode="decimal" data-f="'+f+'"'+(mode===3?' disabled':'')+' placeholder="'+(mode===3?'—':j<5?'tx'+(j+1):f==='b'?'gk':'ck')+'"></td>').join('')+
        '<td class="d1"></td><td class="d2 h1x"></td><td class="dc h1x"></td><td class="xl"></td><td><button class="sm sec" type="button" data-del="1" title="Xóa dòng">✕</button></td>';
      tr.querySelectorAll('input').forEach(inp=>{const f=inp.dataset.f,key=PL.includes(f)?f:fld(f,mode);
        if(mode<3||PL.includes(f))inp.value=r[key]||'';
        inp.addEventListener('input',()=>{rows[i][PL.includes(f)?f:fld(f,mode)]=inp.value;const C=cfg();paint(tr,i,C);stats();save();});});
      tr.querySelector('[data-del]').addEventListener('click',()=>{rows.splice(i,1);if(!rows.length)rows.push(blank());build();});
      tr.querySelector('.stt').textContent=i+1;tb.appendChild(tr);
    });
    refresh();
  }
  document.querySelectorAll('.mb').forEach(b=>b.addEventListener('click',()=>{mode=+b.dataset.m;build();}));
  $('gAdd').addEventListener('click',()=>{rows.push(blank());build();});
  ['k1','k2','k3','thG','thK','thT'].forEach(id=>$(id).addEventListener('input',refresh));
  $('gClear').addEventListener('click',()=>{
    if(!confirm('Xóa toàn bộ bảng điểm đã lưu (cả hai học kỳ)?'))return;
    rows=[];for(let i=0;i<5;i++)rows.push(blank());
    try{localStorage.removeItem(KEY);}catch(e){}
    src={};meta={year:'',subj:''};build();$('gMsg').className='status ok';$('gMsg').textContent='Đã xóa dữ liệu.';
  });
  /* ---- Phân tích AI (Gemini) → báo cáo Word ----
     Số liệu (số đầu điểm đã có, đầu điểm còn thiếu, tổng điểm còn thiếu để đạt 5,0 / 8,0 / 9,0, thống kê lớp) do code tính chính xác;
     Gemini chỉ viết nhận xét/giải pháp. Dữ liệu gửi Gemini đã ẩn danh (chỉ số liệu tổng hợp — không gửi họ tên, mã định danh, ngày sinh).
     Có học sinh thiếu điểm → bảng 6 cột. Tất cả đã đủ điểm → đánh giá tổng thể học lực của lớp. */
  (()=>{
    const AK='ph_gemini_key_s',MILE=[5,8,9],SLOT=['ĐĐGtx1','ĐĐGtx2','ĐĐGtx3','ĐĐGtx4','ĐĐGtx5','ĐĐGgk','ĐĐGck'];
    const gk=()=>GKEY.get(),sk=v=>GKEY.set(v),dk=()=>GKEY.clear();
    const model=()=>{let m='';try{m=localStorage.getItem('ph_model_v1')||'';}catch(e){}return /^gemini-[\w.\-]+$/.test(m)?m:'gemini-3.8-flash';};
    const fv=x=>x.toFixed(1).replace('.',',');
    const hasData=s=>rows.some(r=>anyv(r)&&FL.some(f=>String(r[fld(f,s)]||'').trim()!==''));
    // điểm x nhỏ nhất (bước 0,1) để nếu mọi ô còn thiếu (tổng hệ số km) đều đạt x thì ĐTB làm tròn ≥ T
    const need=(sum,w,km,T)=>{if(km<=0)return null;for(let i=0;i<=100;i++){const x=i/10;if(r1((sum+x*km)/(w+km))>=T)return x;}return Infinity;};

    /* ---------- 1. Tính số liệu ---------- */
    function analyze(s,C){
      const base=[];
      rows.forEach((r,i)=>{if(!anyv(r))return;
        const v=FL.map(f=>num(r[fld(f,s)])),bad=v.some(x=>x.bad);let sum=0,w=0,tx=0,any=false,have=0;
        v.forEach((x,j)=>{if(x.v!==null&&!x.bad){any=true;if(j<5)tx++;const k=C.k[KOF[FL[j]]];if(k>0){sum+=x.v*k;w+=k;have++;}}});
        base.push({i,name:r.n.trim()||('(dòng '+(i+1)+')'),v,bad,sum,w,tx,any,have});});
      // Chuẩn số cột ĐĐGtx của lớp = số cột phổ biến nhất mà các học sinh đã có điểm đã nhập (hòa → lấy số lớn hơn)
      const cnt={};base.filter(b=>b.any&&!b.bad).forEach(b=>{if(b.tx>0)cnt[b.tx]=(cnt[b.tx]||0)+1;});
      let reqTx=0,best=0;Object.keys(cnt).forEach(k=>{if(cnt[k]>best||(cnt[k]===best&&+k>reqTx)){best=cnt[k];reqTx=+k;}});
      const st=base.map((b,n)=>{
        const avg=b.bad?null:avgSem(rows[b.i],C,s);
        const e={i:b.i,name:b.name,code:'HS'+(n+1),bad:b.bad,avg,have:b.have,miss:[],need:{}};
        if(b.bad){MILE.forEach(T=>{e.need[T]='—';});return e;}
        const empt=[];b.v.forEach((x,j)=>{if(x.v===null)empt.push(j);});
        const mi=[...empt.filter(j=>j<5).slice(0,Math.max(0,reqTx-b.tx)),...empt.filter(j=>j>=5)].filter(j=>C.k[KOF[FL[j]]]>0);
        e.miss=mi.map(j=>SLOT[j]);
        const km=mi.reduce((a,j)=>a+C.k[KOF[FL[j]]],0);
        MILE.forEach(T=>{
          if(!mi.length){e.need[T]='—';return;}
          if(avg!==null&&avg>=T){e.need[T]='Đã đạt';return;}
          const x=need(b.sum,b.w,km,T);
          e.need[T]=x===Infinity?'Không khả thi\n(cần > 10)':fv(r1(x*mi.length))+'\n(mỗi ô ≥ '+fv(x)+')';
        });
        return e;});
      const cl=[0,0,0,0];let sum=0,m=0,g9=0,mx=null,mn=null;
      st.forEach(e=>{if(e.avg!==null){cl[cls(e.avg,C)]++;sum+=e.avg;m++;if(e.avg>=9)g9++;mx=mx===null?e.avg:Math.max(mx,e.avg);mn=mn===null?e.avg:Math.min(mn,e.avg);}});
      const missing=st.filter(e=>e.bad||e.miss.length);
      const above=st.filter(e=>e.avg!==null&&e.avg>=C.t[2]).length;
      const slotCnt={};missing.forEach(e=>e.miss.forEach(t=>{slotCnt[t]=(slotCnt[t]||0)+1;}));
      return{s,C,reqTx,st,si:st.length,tinh:m,dtb:m?sum/m:null,cl,g9,mx,mn,above,missing,slotCnt,complete:st.length>0&&!missing.length};
    }
    const needTotal=e=>MILE.map(T=>fv(T)+': '+String(e.need[T]).replace('\n',' ')).join(' · ');

    /* ---------- 2. Gọi Gemini ---------- */
    const SYS='Bạn là trợ lý phân tích kết quả học tập cho giáo viên phổ thông Việt Nam. Mọi con số trong dữ liệu đã được hệ thống tính chính xác — TUYỆT ĐỐI không tính lại, không đổi số, không bịa thêm số liệu. Không đoán hay nhắc tên học sinh. Văn phong tiếng Việt, ngắn gọn, mang tính sư phạm, khích lệ. Chỉ trả về MỘT đối tượng JSON hợp lệ, không kèm markdown.';
    function mkPrompt(A,meta){
      const pt=n=>A.tinh?Math.round(n*1000/A.tinh)/10:0,names=['Giỏi','Khá','Trung bình','Yếu'];
      const d={mon_hoc:meta.subj||'',nam_hoc:meta.year||'',hoc_ky:A.s,si_so:A.si,tat_ca_da_du_diem:A.complete,
        so_hs_thieu_diem:A.missing.length,ty_le_thieu_diem_phan_tram:A.si?Math.round(A.missing.length*1000/A.si)/10:0,
        thong_ke_o_diem_thieu_theo_o:A.slotCnt,chuan_so_cot_DDGtx:A.reqTx,
        so_hs_da_tinh_dtb:A.tinh,dtb_lop:A.dtb===null?null:Math.round(A.dtb*100)/100,diem_cao_nhat:A.mx,diem_thap_nhat:A.mn,
        nguong_xep_loai:{gioi:A.C.t[0],kha:A.C.t[1],trung_binh:A.C.t[2]},
        phan_bo:Object.fromEntries(names.map((n,i)=>[n,{so_hs:A.cl[i],ty_le_phan_tram:pt(A.cl[i])}])),
        so_hs_tren_trung_binh:A.above,ty_le_tren_trung_binh_phan_tram:pt(A.above),so_hs_tu_9_tro_len:A.g9};
      const form=A.complete
        ?'Cả lớp đã đủ điểm. Trả về JSON đúng cấu trúc:\n{"tong_quan":"3-4 câu đánh giá tổng thể học lực của lớp (điểm trung bình, tỷ lệ trên trung bình)","nhan_xet_phan_bo":"2-4 câu nhận xét phân bố xếp loại: điểm mạnh và điểm cần cải thiện","giai_phap":["3-5 gợi ý hành động cụ thể cho giáo viên"]}'
        :'Lớp còn học sinh thiếu điểm. Trả về JSON đúng cấu trúc:\n{"tong_quan":"2-4 câu nhận xét về tình trạng thiếu điểm của lớp, ô điểm nào thiếu nhiều và ảnh hưởng đến việc đánh giá","giai_phap":["3-5 gợi ý cụ thể giúp giáo viên bổ sung điểm còn thiếu và hỗ trợ học sinh"]}';
      return 'Dưới đây là số liệu đã tính sẵn của một lớp học (JSON):\n'+JSON.stringify(d)+'\n\nHãy viết nhận xét cho giáo viên. '+form+'\nKhông nhắc lại các con số một cách sai lệch.';
    }
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    async function gem(key,prompt){
      const body=JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],systemInstruction:{parts:[{text:SYS}]},generationConfig:{maxOutputTokens:16384,temperature:0.4,responseMimeType:'application/json'}});
      const M=model(),url='https://generativelanguage.googleapis.com/v1beta/models/'+M+':generateContent';
      let res,data;
      for(let a=0;a<3;a++){
        const ctl=typeof AbortController==='function'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),180000):0;
        try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body,signal:ctl?ctl.signal:undefined});}
        catch(e){if(tm)clearTimeout(tm);throw new Error(e&&e.name==='AbortError'?'Gemini phản hồi quá lâu, hãy thử lại.':'Không kết nối được tới Gemini. Kiểm tra mạng (hoặc VPN/tường lửa chặn googleapis.com).');}
        if(tm)clearTimeout(tm);
        if((res.status===500||res.status===503)&&a<2){await wait(2500*(a+1));continue;}
        break;}
      try{data=await res.json();}catch(e){data=null;}
      if(!res.ok){
        const raw=(data&&data.error&&data.error.message)||('HTTP '+res.status);
        if(res.status===401||res.status===403||(res.status===400&&/api key|API_KEY/i.test(raw))){dk();const er=new Error('API key không hợp lệ hoặc không có quyền dùng '+M+'. Hãy nhập lại key.');er.key=1;throw er;}
        if(res.status===404)throw new Error('Không tìm thấy model '+M+' với key này (đổi model ở tab Prompt AI).');
        if(res.status===429)throw new Error('Đã hết hạn mức gọi của key. Đợi khoảng 1 phút rồi thử lại.');
        throw new Error('Gemini lỗi: '+raw);}
      const c=data&&data.candidates&&data.candidates[0];
      if(!c)throw new Error('Gemini không trả về kết quả.');
      const txt=((c.content&&c.content.parts)||[]).filter(p=>!p.thought).map(p=>p.text||'').join('').trim();
      if(!txt)throw new Error('Gemini trả về nội dung rỗng'+(c.finishReason&&c.finishReason!=='STOP'?' ('+c.finishReason+')':'')+'.');
      let j;try{j=JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch(e){j={tong_quan:txt};}
      const S=v=>typeof v==='string'?v.trim():'';
      return{tong_quan:S(j.tong_quan),nhan_xet_phan_bo:S(j.nhan_xet_phan_bo),giai_phap:Array.isArray(j.giai_phap)?j.giai_phap.map(S).filter(Boolean):[]};
    }

    /* ---------- 3. Dựng file Word (.docx, trang A4 ngang) ---------- */
    const X=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const wr=(t,o={})=>'<w:r><w:rPr>'+(o.b?'<w:b/>':'')+(o.i?'<w:i/>':'')+(o.c?'<w:color w:val="'+o.c+'"/>':'')+'<w:sz w:val="'+(o.sz||26)+'"/><w:szCs w:val="'+(o.sz||26)+'"/></w:rPr><w:t xml:space="preserve">'+X(t)+'</w:t></w:r>';
    const para=(t,o={})=>'<w:p><w:pPr>'+(o.keep?'<w:keepNext/>':'')+'<w:spacing w:before="'+(o.bf||0)+'" w:after="'+(o.af==null?80:o.af)+'" w:line="'+(o.ln||276)+'" w:lineRule="auto"/>'+(o.ind?'<w:ind w:left="'+o.ind+'" w:hanging="'+(o.hang||0)+'"/>':'')+(o.jc?'<w:jc w:val="'+o.jc+'"/>':'')+'</w:pPr>'+wr(t,o)+'</w:p>';
    const H=t=>para(t,{b:1,sz:28,bf:200,af:100,keep:1});
    const H2=t=>para(t,{b:1,sz:26,bf:140,af:80,keep:1});
    const P=t=>para(t,{jc:'both'});
    const B=t=>para('– '+t,{ind:340,hang:240,jc:'both'});
    // cen = danh sách chỉ số cột căn giữa (tiêu đề luôn căn giữa)
    function tbl(w,head,body,cen){
      cen=cen||[];const tot=w.reduce((a,b)=>a+b,0);
      const cell=(t,i,o)=>'<w:tc><w:tcPr><w:tcW w:w="'+w[i]+'" w:type="dxa"/>'+(o.sh?'<w:shd w:val="clear" w:color="auto" w:fill="'+o.sh+'"/>':'')+'<w:vAlign w:val="center"/></w:tcPr>'+String(t==null?'':t).split('\n').map(l=>para(l,{sz:22,b:o.b,af:0,ln:240,jc:o.jc})).join('')+'</w:tc>';
      const tr=(cells,o)=>'<w:tr><w:trPr><w:cantSplit/>'+(o.h?'<w:tblHeader/>':'')+'</w:trPr>'+cells.map((t,i)=>cell(t,i,{...o,jc:(o.h||cen.includes(i))?'center':undefined})).join('')+'</w:tr>';
      return '<w:tbl><w:tblPr><w:tblW w:w="'+tot+'" w:type="dxa"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(s=>'<w:'+s+' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('')+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+w.map(x=>'<w:gridCol w:w="'+x+'"/>').join('')+'</w:tblGrid>'+
        tr(head,{h:1,b:1,sh:'D9E2F3'})+body.map(r=>tr(r,{})).join('')+'</w:tbl>'+para('',{af:60});
    }
    const pctT=(n,si)=>si?(Math.round(n*1000/si)/10+'').replace('.',',')+'%':'—';
    const W_STAT=[6200,3200,3200],W_MISS=[3400,1700,3200,2090,2090,2090];
    function semXml(res,idx){
      const{A,ai}=res,C=A.C;let x='';
      x+=H(['I.','II.'][idx]+' HỌC KỲ '+A.s);
      if(!A.missing.length){
        x+=H2('1. Đánh giá tổng thể học lực của lớp');
        x+=P('Tất cả '+A.si+' học sinh đã đủ điểm.');
        x+=tbl(W_STAT,['Chỉ tiêu','Số học sinh','Tỷ lệ'],[
          ['Sĩ số',A.si,''],
          ['Giỏi (ĐTB ≥ '+fv(C.t[0])+')',A.cl[0],pctT(A.cl[0],A.tinh)],
          ['Khá (ĐTB ≥ '+fv(C.t[1])+')',A.cl[1],pctT(A.cl[1],A.tinh)],
          ['Trung bình (ĐTB ≥ '+fv(C.t[2])+')',A.cl[2],pctT(A.cl[2],A.tinh)],
          ['Yếu (ĐTB < '+fv(C.t[2])+')',A.cl[3],pctT(A.cl[3],A.tinh)],
          ['Trên trung bình (ĐTB ≥ '+fv(C.t[2])+')',A.above,pctT(A.above,A.tinh)],
          ['Từ 9,0 trở lên',A.g9,pctT(A.g9,A.tinh)],
          ['Điểm trung bình của lớp',A.dtb===null?'—':fv(A.dtb),''],
          ['Điểm cao nhất / thấp nhất',A.mx===null?'—':fv(A.mx)+' / '+fv(A.mn),'']],[1,2]);
      }else{
        x+=H2('1. Học sinh còn thiếu điểm ('+A.missing.length+'/'+A.si+' học sinh, '+pctT(A.missing.length,A.si)+')');
        x+=P('Chuẩn số cột ĐĐGtx của lớp: '+A.reqTx+' cột. Học sinh được xem là thiếu điểm khi chưa đủ số cột ĐĐGtx này, hoặc chưa có ĐĐGgk/ĐĐGck, hoặc có ô điểm nhập sai. "Tổng điểm còn thiếu" = tổng điểm tối thiểu của các ô còn thiếu để ĐTBmhk đạt mốc (giả sử các ô còn thiếu có điểm bằng nhau; ngoặc cho biết điểm mỗi ô).');
        x+=tbl(W_MISS,['Tên học sinh','Số đầu điểm đã có','Đầu điểm còn thiếu','Tổng điểm còn thiếu để đạt 5,0','Tổng điểm còn thiếu để đạt 8,0','Tổng điểm còn thiếu để đạt 9,0'],
          A.missing.map(e=>[e.name,e.have,e.bad?'Có ô điểm nhập sai':e.miss.join(', '),e.need[5],e.need[8],e.need[9]]),[1,3,4,5]);
      }
      x+=H2('2. Nhận xét của AI (Gemini)');
      const ts=[ai.tong_quan,ai.nhan_xet_phan_bo].filter(Boolean);
      if(ts.length)ts.forEach(t=>{x+=P(t);});else x+=P('(Không có nhận xét từ AI.)');
      if(ai.giai_phap.length){x+=H2('3. Giải pháp đề xuất');ai.giai_phap.forEach(t=>{x+=B(t);});}
      return x;
    }
    async function buildDocx(results,C,meta){
      let b='';const now=new Date(),d2=n=>String(n).padStart(2,'0');
      b+=para('BÁO CÁO PHÂN TÍCH ĐIỂM',{b:1,sz:32,jc:'center',af:60});
      b+=para([meta.subj,meta.year].filter(Boolean).join(' · ')||'Bảng điểm môn học',{jc:'center',sz:26,af:40});
      b+=para('Ngày lập: '+d2(now.getDate())+'/'+d2(now.getMonth()+1)+'/'+now.getFullYear(),{jc:'center',i:1,sz:24,af:160});
      b+=P('Công thức: ĐTBmhk = (tổng ĐĐGtx × '+C.k[0]+' + ĐĐGgk × '+C.k[1]+' + ĐĐGck × '+C.k[2]+') ÷ tổng hệ số các ô đã nhập, làm tròn 1 chữ số thập phân. Các mốc tính điểm còn thiếu: 5,0; 8,0; 9,0.');
      results.forEach((r,i)=>{b+=semXml(r,i);});
      if(results.length===2&&mode===3){
        const cl=[0,0,0,0];let n=0,sum=0;rows.forEach(r=>{if(!anyv(r))return;const v=calcAll(r,C).cn;if(v!==null){cl[cls(v,C)]++;n++;sum+=v;}});
        b+=H('III. ĐIỂM TRUNG BÌNH CẢ NĂM (ĐTBmcn)');
        b+=tbl(W_STAT,['Chỉ tiêu','Số học sinh','Tỷ lệ'],[['Đã tính được ĐTBmcn',n,''],...['Giỏi','Khá','Trung bình','Yếu'].map((t,i)=>[t,cl[i],pctT(cl[i],n)]),['Điểm trung bình của lớp',n?fv(sum/n):'—','']],[1,2]);
      }
      b+=para('Ghi chú: các số liệu do hệ thống tính từ bảng điểm; phần nhận xét và giải pháp do AI (Gemini) soạn dựa trên dữ liệu tổng hợp ẩn danh, giáo viên cần xem lại trước khi sử dụng.',{i:1,sz:22,bf:160});
      const NSW='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
      const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NSW+'><w:body>'+b+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
      const sty='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+NSW+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
      const z=new JSZip();
      z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
      z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
      z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
      z.file('word/document.xml',doc);z.file('word/styles.xml',sty);
      return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
    }

    /* ---------- 4. Giao diện ---------- */
    let busy=false;
    const msg=(t,c)=>{const m=$('gMsg');m.className='status'+(c?' '+c:'');m.textContent=t;};
    async function run(){
      if(busy)return;
      const key=gk(),box=$('gAiKey');
      if(!key){GKEY.open('Nhập key một lần ở đây, sau đó bấm lại “Phân tích AI”.');msg('Chưa có API key Gemini. Hãy nhập ở ô “API key Gemini” phía đầu trang (chỉ cần nhập một lần) rồi bấm lại “Phân tích AI”.','err');return;}
      box.style.display='none';
      const C=cfg(),sems=mode<3?[mode]:[1,2].filter(hasData);
      if(!sems.length||!sems.every(hasData)){msg(mode<3?'Học kỳ '+mode+' chưa có điểm để phân tích. Hãy nhập file Excel (hoặc nhập điểm) trước.':'Chưa có dữ liệu điểm để phân tích. Hãy nhập file Excel trước.','err');return;}
      busy=true;$('gAI').disabled=true;
      try{
        const results=[];
        for(const s of sems){
          msg('⏳ Đang tính số liệu và nhờ Gemini phân tích Học kỳ '+s+'… (có thể mất vài chục giây)');
          const A=analyze(s,C),ai=await gem(key,mkPrompt(A,meta));results.push({A,ai});}
        msg('⏳ Đang tạo file Word…');
        const blob=await buildDocx(results,C,meta),d=new Date(),nm='Phan-tich-diem_'+(mode<3?'HK'+mode:'ca-nam')+'_'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'.docx';
        await saveBlob(blob,nm);
        msg('✅ Đã tạo và tải về '+nm+'. Nhận xét do AI soạn — hãy xem lại trước khi sử dụng.','ok');
      }catch(err){
        msg('Không phân tích được: '+err.message,'err');
        if(err.key){GKEY.open('Key bị từ chối — hãy nhập lại key hợp lệ.');}
      }finally{busy=false;$('gAI').disabled=false;}
    }
    $('gAI').addEventListener('click',run);
    const setKey=()=>{const k=$('gAiK').value.trim();
      if(k.length<20||/\s/.test(k)){msg('⚠ API key không hợp lệ. Hãy dán lại đầy đủ key lấy từ Google AI Studio.','err');return;}
      sk(k);$('gAiK').value='';run();};
    $('gAiOk').addEventListener('click',setKey);
    $('gAiK').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setKey();}});
    window._gradeAI={analyze,buildDocx,needTotal,mkPrompt};
  })();
  // Dán từ Excel vào học kỳ đang chọn: cột cách nhau bằng Tab; tự bỏ cột STT nếu có
  $('gPasteBtn').addEventListener('click',()=>{
    const m=$('gMsg');
    if(mode===3){m.className='status err';m.textContent='Hãy chọn Học kỳ 1 hoặc Học kỳ 2 trước khi dán điểm.';return;}
    const lines=$('gPaste').value.split(/\r?\n/).filter(l=>l.trim());
    if(!lines.length){m.className='status err';m.textContent='Chưa có nội dung để dán.';return;}
    const isN=s=>/^\s*[\d.,]+\s*$/.test(s||'');
    const add=lines.map(l=>{let c=l.split('\t');if(c.length===1)c=l.trim().split(/\s{2,}/);
      c=c.map(s=>s.trim());if(c.length>=2&&isN(c[0])&&!isN(c[1]))c.shift();
      const o=blank();o.n=c[0]||'';const v=c.slice(1);
      if(v.length<=3){o[fld('a',mode)]=v[0]||'';o[fld('b',mode)]=v[1]||'';o[fld('c',mode)]=v[2]||'';} // dạng ngắn: tx, gk, ck
      else(v.length>=7?FL:['a','a2','a3','a4','b','c']).forEach((f,j)=>o[fld(f,mode)]=v[j]||'');
      return o;});
    while(rows.length&&!anyv(rows[rows.length-1]))rows.pop();
    rows=rows.concat(add);build();$('gPaste').value='';
    m.className='status ok';m.textContent='Đã thêm '+add.length+' dòng vào Học kỳ '+mode+'.';
  });
  /* ---- Nhập / xuất file Excel bảng điểm theo mẫu (đọc & sửa trực tiếp XML bằng JSZip → giữ nguyên định dạng file gốc) ---- */
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const xp=t=>new DOMParser().parseFromString(t.replace(/^\uFEFF/,''),'application/xml');
  const tags=(p,n)=>Array.from(p.getElementsByTagNameNS(NS,n));
  const colN=a=>{let n=0;for(const ch of a)n=n*26+ch.charCodeAt(0)-64;return n-1;};
  const colL=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
  const nrm=t=>String(t==null?'':t).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  function showMeta(){const el=$('gMeta');if(!el)return;
    const p=[1,2].filter(s=>src[s]).map(s=>'HK'+s+': '+src[s].name);if(meta.year)p.push(meta.year);if(meta.subj)p.push(meta.subj);
    el.style.display=p.length?'':'none';el.textContent=p.length?'📄 File đã nhập — '+p.join(' · '):'';}
  async function sheetPath(zip){
    const sh=xp(await zip.file('xl/workbook.xml').async('string')).getElementsByTagNameNS(NS,'sheet')[0],rid=sh.getAttributeNS(RNS,'id');
    const rels=xp(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
    for(const r of Array.from(rels.getElementsByTagName('Relationship')))if(r.getAttribute('Id')===rid){const t=r.getAttribute('Target');return t[0]==='/'?t.slice(1):'xl/'+t;}
    throw new Error('không tìm thấy trang tính đầu tiên');
  }
  async function readGrid(zip,path){
    const ss=[],f=zip.file('xl/sharedStrings.xml');
    if(f)tags(xp(await f.async('string')),'si').forEach(si=>ss.push(tags(si,'t').filter(t=>t.parentNode.localName!=='rPh').map(t=>t.textContent).join('')));
    const g=[];
    tags(xp(await zip.file(path).async('string')),'row').forEach(r=>{const ri=+r.getAttribute('r')-1;g[ri]=g[ri]||[];
      tags(r,'c').forEach(c=>{const t=c.getAttribute('t'),v=c.getElementsByTagNameNS(NS,'v')[0];let s='';
        if(t==='s'&&v)s=ss[+v.textContent]||'';else if(t==='inlineStr')s=tags(c,'t').map(x=>x.textContent).join('');else if(v)s=v.textContent;
        g[ri][colN(c.getAttribute('r').replace(/\d/g,''))]=s;});});
    return g;
  }
  // Nhận diện cột theo TIÊU ĐỀ (không gán cứng chữ cái cột)
  function parseGrid(g){
    const cell=(r,c)=>String((g[r]&&g[r][c])||'').trim();
    let h=-1;for(let r=0;r<Math.min(g.length,40)&&h<0;r++)if((g[r]||[]).some(x=>nrm(x)==='ho va ten'))h=r;
    if(h<0)throw new Error('không tìm thấy dòng tiêu đề (cột "Họ và tên").');
    const col={tx:[]};let txA=-1;
    g[h].forEach((x,i)=>{const k=nrm(x);
      if(k==='stt')col.stt=i;else if(k==='ho va ten')col.name=i;else if(k.startsWith('ma dinh danh'))col.id=i;else if(k==='ngay sinh')col.dob=i;else if(k==='gioi tinh')col.sex=i;
      else if(k==='ddgtx')txA=i;else if(k==='ddggk')col.gk=i;else if(k==='ddgck')col.ck=i;else if(k==='dtbmhk1')col.m1=i;else if(k==='dtbmhk2')col.m2=i;else if(k==='dtbmcn')col.cn=i;});
    if(txA<0||col.gk==null||col.ck==null)throw new Error('thiếu cột ĐĐGtx / ĐĐGgk / ĐĐGck.');
    for(let i=txA;i<col.gk&&col.tx.length<5;i++)col.tx.push(i);
    const students=[];let first=-1,last=-1;
    for(let r=h+1;r<g.length;r++){
      if(!/^\d+$/.test(cell(r,col.stt==null?0:col.stt))||!cell(r,col.name))continue;
      if(first<0)first=r;last=r;
      students.push({n:cell(r,col.name),id:col.id==null?'':cell(r,col.id),dob:col.dob==null?'':cell(r,col.dob),sex:col.sex==null?'':cell(r,col.sex),
        v:FL.map((f,j)=>f==='b'?cell(r,col.gk):f==='c'?cell(r,col.ck):(col.tx[j]!=null?cell(r,col.tx[j]):''))});
    }
    let sem=0,year='',subj='';
    for(let r=0;r<h;r++){const t=(g[r]||[]).filter(Boolean).join(' '),k=nrm(t);
      let m=k.match(/(?:hoc k[yi]|hk)\s*:?\s*(ii|i|1|2)(?![a-z0-9])/);if(m)sem=(m[1]==='ii'||m[1]==='2')?2:1;
      m=k.match(/nam hoc\s*:?\s*(\d{4}\s*-\s*\d{4})/);if(m)year='Năm học '+m[1].replace(/\s/g,'');
      if(/^mon hoc/.test(k))subj=t.replace(/\s*-\s*GV.*$/i,'').trim();}
    return{col,first,last,students,sem,year,subj};
  }
  $('gImp').addEventListener('click',()=>$('gFile').click());
  $('gFile').addEventListener('change',async e=>{
    const m=$('gMsg'),f=e.target.files[0];e.target.value='';if(!f)return;
    try{
      if(typeof JSZip==='undefined')throw new Error('chưa tải được thư viện JSZip (cần mạng để nạp từ CDN).');
      let zip;try{zip=await JSZip.loadAsync(await f.arrayBuffer());}catch(_){throw new Error('không mở được file (chỉ hỗ trợ .xlsx).');}
      const buf=await f.arrayBuffer(),path=await sheetPath(zip),P=parseGrid(await readGrid(zip,path));
      if(!P.students.length)throw new Error('không tìm thấy học sinh nào trong file.');
      let s=mode<3?mode:P.sem; // đang ở tab Học kỳ 1/2 → nhập vào đúng tab đang chọn; tab Cả năm → theo học kỳ ghi trong file
      if(!s){const a=prompt('Bạn đang ở tab Cả năm và file không ghi rõ học kỳ. Nhập 1 (Học kỳ 1) hoặc 2 (Học kỳ 2):','1');if(a!=='1'&&a!=='2')throw new Error('đã hủy nhập file.');s=+a;}
      while(rows.length&&!anyv(rows[rows.length-1]))rows.pop();
      let add=0;
      P.students.forEach(x=>{ // ghép theo Mã định danh; dự phòng Họ tên + Ngày sinh
        let r=rows.find(q=>(x.id&&q.id)?q.id===x.id:(q.n.trim()===x.n&&q.dob===x.dob));
        if(!r){r=blank();rows.push(r);add++;}
        r.n=x.n;r.id=x.id;r.dob=x.dob;r.sex=x.sex;FL.forEach((fl,j)=>r[fld(fl,s)]=x.v[j]);
      });
      src[s]={buf,path,name:f.name,P:{col:P.col,first:P.first,last:P.last}};
      if(P.year)meta.year=P.year;if(P.subj)meta.subj=P.subj;
      mode=s;build();
      m.className='status ok';m.textContent='Đã nhập '+P.students.length+' học sinh vào Học kỳ '+s+(add<P.students.length?' (ghép '+(P.students.length-add)+' học sinh đã có)':'')+'. ĐTB được tính tự động.'+(P.sem&&P.sem!==s?' Lưu ý: file ghi Học kỳ '+P.sem+' nhưng đã nhập vào Học kỳ '+s+' theo tab bạn đang chọn.':'');
    }catch(err){m.className='status err';m.textContent='Không nhập được file Excel: '+err.message;}
  });
  $('gExpImp').addEventListener('click',async()=>{
    const m=$('gMsg');
    try{
      if(typeof JSZip==='undefined')throw new Error('chưa tải được thư viện JSZip (cần mạng để nạp từ CDN).');
      if(mode===3)throw new Error('hãy chọn Học kỳ 1 hoặc Học kỳ 2 (học kỳ của file đã nhập) trước khi xuất.');
      const S=src[mode];
      if(!S)throw new Error('chưa nhập file Excel cho Học kỳ '+mode+' (sau khi tải lại trang cần nhập lại file gốc).');
      const zip=await JSZip.loadAsync(S.buf),d=xp(await zip.file(S.path).async('string')),C=cfg(),list=rows.filter(anyv),{col,first,last}=S.P;
      const sd=tags(d,'sheetData')[0],pre=sd.prefix,mk=n=>d.createElementNS(NS,(pre?pre+':':'')+n);
      const rn=r=>+r.getAttribute('r')-1,all=tags(d,'row');
      const orig=all.filter(r=>rn(r)>=first&&rn(r)<=last),foot=all.filter(r=>rn(r)>last);
      if(!orig.length)throw new Error('không tìm thấy vùng dòng học sinh trong file gốc.');
      const delta=list.length-(last-first+1);
      const tplS={};Array.from(orig[0].childNodes).forEach(c=>{if(c.localName==='c'&&c.getAttribute('s')!=null)tplS[colN(c.getAttribute('r').replace(/\d/g,''))]=c.getAttribute('s');});
      const setNum=(r,n)=>{r.setAttribute('r',n);Array.from(r.childNodes).forEach(c=>{if(c.localName==='c')c.setAttribute('r',c.getAttribute('r').replace(/\d+$/,n));});};
      const cellEls=r=>Array.from(r.childNodes).filter(c=>c.localName==='c');
      const setC=(row,ci,val)=>{
        const ref=colL(ci)+row.getAttribute('r');let c=cellEls(row).find(n=>n.getAttribute('r')===ref);
        if(!c){c=mk('c');c.setAttribute('r',ref);if(tplS[ci]!=null)c.setAttribute('s',tplS[ci]);
          row.insertBefore(c,cellEls(row).find(n=>colN(n.getAttribute('r').replace(/\d/g,''))>ci)||null);}
        while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');
        if(val===''||val==null)return;
        if(typeof val==='number'){const v=mk('v');v.textContent=String(val);c.appendChild(v);}
        else{c.setAttribute('t','inlineStr');const is=mk('is'),t=mk('t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=val;is.appendChild(t);c.appendChild(is);}
      };
      const anchor=foot[0]||null,tpl=orig[orig.length-1],stud=[];
      for(let i=0;i<list.length;i++){let el;
        if(i<orig.length)el=orig[i];else{el=tpl.cloneNode(true);cellEls(el).forEach(c=>{while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');});}
        stud.push(el);}
      orig.forEach(r=>sd.removeChild(r));
      stud.forEach((el,i)=>{setNum(el,first+i+1);sd.insertBefore(el,anchor);});
      foot.forEach(r=>setNum(r,rn(r)+1+delta));
      tags(d,'mergeCell').forEach(mc=>mc.setAttribute('ref',mc.getAttribute('ref').replace(/([A-Z]+)(\d+)/g,(t,c,n)=>+n-1>last?c+(+n+delta):t)));
      const dim=tags(d,'dimension')[0];if(dim)dim.setAttribute('ref',dim.getAttribute('ref').replace(/([A-Z]+)(\d+)$/,(t,c,n)=>c+(+n+delta)));
      let lost=false;
      list.forEach((r,i)=>{const row=stud[i],x=calcAll(r,C),val=k=>String(r[fld(k,mode)]||'').trim();
        setC(row,col.stt==null?0:col.stt,String(i+1));
        if(col.id!=null)setC(row,col.id,r.id.trim());setC(row,col.name,r.n.trim());
        if(col.dob!=null)setC(row,col.dob,r.dob.trim());if(col.sex!=null)setC(row,col.sex,r.sex.trim());
        FL.forEach((k,j)=>{if(k==='b')setC(row,col.gk,val(k));else if(k==='c')setC(row,col.ck,val(k));else if(col.tx[j]!=null)setC(row,col.tx[j],val(k));else if(val(k))lost=true;});
        if(col.m1!=null)setC(row,col.m1,x.hk1===null?'':x.hk1);
        if(col.m2!=null)setC(row,col.m2,x.hk2===null?'':x.hk2);
        if(col.cn!=null)setC(row,col.cn,x.cn===null?'':x.cn);
      });
      let xml=new XMLSerializer().serializeToString(d);if(!/^<\?xml/.test(xml))xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+xml;
      zip.file(S.path,xml);
      const out=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
      const nm=S.name.replace(/\.xlsx$/i,'')+'_co-dtb.xlsx';
      await saveBlob(out,nm);
      m.className='status ok';m.textContent='Đã xuất '+nm+' ('+list.length+' học sinh, đã điền ĐTBmhk1/ĐTBmhk2/ĐTBmcn).'+(lost?' Lưu ý: file gốc có ít cột ĐĐGtx hơn bảng, điểm ĐĐGtx thừa không được ghi.':'');
    }catch(err){m.className='status err';m.textContent='Không xuất được file Excel: '+err.message;}
  });
  window.TG.names=()=>rows.map(r=>r.n.trim()).filter(Boolean);
  window._gradeTest={calc,calcAll,avgSem,cfg,num,rows:()=>rows};
  load();build();
})();
