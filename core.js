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
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on',p.id===b.dataset.tab));
  window.dispatchEvent(new CustomEvent('tabshow',{detail:b.dataset.tab}));
}));
window.TG={names:()=>[]};
