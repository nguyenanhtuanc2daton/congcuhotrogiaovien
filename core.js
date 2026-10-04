/* Hàm dùng chung: $, saveBlob, fmtNum, chuyển tab, window.TG */


/* =====================================================================
   PHẦN MỚI: tiện ích chung, chuyển tab, Mô-đun 2, 3, 4
   (Mô-đun 1 ở trên là mã gốc giữ nguyên, chỉ đổi giao diện)
   ===================================================================== */
const $=id=>document.getElementById(id);
async function saveBlob(blob,name){
  if(window.claude&&typeof window.claude.use==='function'){
    try{const d=await window.claude.use('downloads'); if(d){await d.save({filename:name,data:blob});return;}}
    catch(e){ if(e&&e.code==='declined') return; }
  }
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),3000);
}
function fmtNum(v,d){ if(!isFinite(v)) return '?'; if(Math.abs(v)<1e-6) return '0'; return String(parseFloat(v.toPrecision(d||6))); }

/* ---- Chuyển tab: mỗi lần chỉ hiện một mô-đun ---- */
/* Chuyển LaTeX (t1) nằm trong tab Công cụ Word (t3, mục wtLatex);
   Vòng quay gọi tên (t2) nằm trong tab Công cụ thường dùng (t8, mục utWheel).
   Hai nút ẩn data-tab="t1"/"t2" (trong #tabRoutes, ngoài thanh tab) được giữ lại để mọi mã cũ
   gọi .click() hay phát 'tabshow' t1/t2 vẫn chạy: chúng chuyển hướng sang chỗ mới. */
const TAB_ROUTE={t1:['t3','wtSel','wtLatex'],t2:['t8','utSel','utWheel']};
function syncLegacy(){
  const p3=$('t3'),p8=$('t8'),a1=$('t1'),a2=$('t2');
  if(a1) a1.classList.toggle('on',!!(p3&&p3.classList.contains('on')&&$('wtSel')&&$('wtSel').value==='wtLatex'));
  if(a2) a2.classList.toggle('on',!!(p8&&p8.classList.contains('on')&&$('utSel')&&$('utSel').value==='utWheel'));
}
function activateTab(id){
  const b=document.querySelector('.tab[data-tab="'+id+'"]');
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on',p.id===id));
  syncLegacy();
  window.dispatchEvent(new CustomEvent('tabshow',{detail:id}));
}
function openTool(tab,selId,toolId){
  const s=document.getElementById(selId);
  if(s&&s.value!==toolId){s.value=toolId;s.dispatchEvent(new Event('change'));}
  activateTab(tab);
  if(toolId==='utWheel') window.dispatchEvent(new CustomEvent('tabshow',{detail:'t2'}));
}
window.openTool=openTool;
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
  const r=TAB_ROUTE[b.dataset.tab];
  if(r) openTool(r[0],r[1],r[2]); else activateTab(b.dataset.tab);
}));
['wtSel','utSel'].forEach(id=>{const s=$(id); if(s) s.addEventListener('change',syncLegacy);});
window.TG={names:()=>[]};
