/* Công cụ Word · Mô-đun 1: chuyển LaTeX → công thức Word (OMML), xử lý XML của Word */

const WNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MNS='http://schemas.openxmlformats.org/officeDocument/2006/math';
const XMLNS_NS='http://www.w3.org/2000/xmlns/';

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ======================= LaTeX parser -> AST ======================= */
/* Nhật ký chuyển đổi: dùng để báo cáo công thức có cảnh báo / phải giữ dạng chữ / đối tượng MathType. */
const EQ_LOG={cur:null,total:0,warned:[],degraded:[],opaque:0,skipped:0};
function eqLogReset(){EQ_LOG.cur=null;EQ_LOG.total=0;EQ_LOG.warned=[];EQ_LOG.degraded=[];EQ_LOG.opaque=0;EQ_LOG.skipped=0;}
function eqWarn(m){ if(EQ_LOG.cur && EQ_LOG.cur.indexOf(m)<0) EQ_LOG.cur.push(m); }

const SYMBOLS = {
  alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',
  iota:'ι',kappa:'κ',varkappa:'ϰ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',omicron:'ο',pi:'π',varpi:'ϖ',rho:'ρ',varrho:'ϱ',
  sigma:'σ',varsigma:'ς',tau:'τ',upsilon:'υ',phi:'φ',varphi:'ϕ',chi:'χ',psi:'ψ',omega:'ω',
  Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Upsilon:'Υ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',
  /* quan hệ */
  le:'≤',leq:'≤',leqslant:'⩽',ge:'≥',geq:'≥',geqslant:'⩾',ne:'≠',neq:'≠',approx:'≈',equiv:'≡',sim:'∼',simeq:'≃',
  cong:'≅',propto:'∝',ll:'≪',gg:'≫',lt:'<',gt:'>',nleq:'≰',ngeq:'≱',nless:'≮',ngtr:'≯',doteq:'≐',asymp:'≍',
  prec:'≺',succ:'≻',preceq:'⪯',succeq:'⪰',models:'⊨',vdash:'⊢',dashv:'⊣',mid:'∣',nmid:'∤',parallel:'∥',nparallel:'∦',
  perp:'⊥',bot:'⊥',top:'⊤',triangleq:'≜',ncong:'≇',nsim:'≁',
  /* tập hợp, logic */
  in:'∈',notin:'∉',ni:'∋',owns:'∋',subset:'⊂',supset:'⊃',subseteq:'⊆',supseteq:'⊇',nsubseteq:'⊈',nsupseteq:'⊉',
  subsetneq:'⊊',supsetneq:'⊋',cup:'∪',cap:'∩',setminus:'∖',smallsetminus:'∖',emptyset:'∅',varnothing:'∅',
  sqcup:'⊔',sqcap:'⊓',uplus:'⊎',forall:'∀',exists:'∃',nexists:'∄',neg:'¬',lnot:'¬',land:'∧',lor:'∨',wedge:'∧',vee:'∨',
  therefore:'∴',because:'∵',complement:'∁',
  /* toán tử */
  times:'×',div:'÷',cdot:'⋅',pm:'±',mp:'∓',ast:'∗',star:'⋆',circ:'∘',bullet:'•',oplus:'⊕',ominus:'⊖',otimes:'⊗',
  oslash:'⊘',odot:'⊙',dagger:'†',ddagger:'‡',diamond:'⋄',bigtriangleup:'△',bigtriangledown:'▽',amalg:'⨿',wr:'≀',
  /* mũi tên */
  to:'→',rightarrow:'→',leftarrow:'←',gets:'←',leftrightarrow:'↔',Rightarrow:'⇒',Leftarrow:'⇐',Leftrightarrow:'⇔',
  longrightarrow:'⟶',longleftarrow:'⟵',longleftrightarrow:'⟷',Longrightarrow:'⟹',Longleftarrow:'⟸',
  Longleftrightarrow:'⟺',implies:'⟹',iff:'⟺',impliedby:'⟸',mapsto:'↦',longmapsto:'⟼',uparrow:'↑',downarrow:'↓',
  updownarrow:'↕',Uparrow:'⇑',Downarrow:'⇓',nearrow:'↗',searrow:'↘',swarrow:'↙',nwarrow:'↖',hookrightarrow:'↪',
  hookleftarrow:'↩',rightharpoonup:'⇀',leftharpoonup:'↼',rightleftharpoons:'⇌',
  /* khác */
  infty:'∞',partial:'∂',nabla:'∇',hbar:'ℏ',ell:'ℓ',Re:'ℜ',Im:'ℑ',aleph:'ℵ',beth:'ℶ',wp:'℘',imath:'ı',jmath:'ȷ',
  angle:'∠',measuredangle:'∡',sphericalangle:'∢',triangle:'△',triangledown:'▽',vartriangle:'△',square:'□',Box:'□',
  blacksquare:'■',Diamond:'◇',lozenge:'◊',checkmark:'✓',prime:'′',backprime:'‵',degree:'°',
  cdots:'⋯',ldots:'…',dots:'…',dotsc:'…',dotsb:'⋯',dotsm:'⋯',dotsi:'⋯',vdots:'⋮',ddots:'⋱',
  spadesuit:'♠',heartsuit:'♥',diamondsuit:'♦',clubsuit:'♣',flat:'♭',natural:'♮',sharp:'♯',
  /* dấu ngoặc & ký tự đặc biệt dạng lệnh */
  langle:'⟨',rangle:'⟩',lceil:'⌈',rceil:'⌉',lfloor:'⌊',rfloor:'⌋',lbrace:'{',rbrace:'}',lbrack:'[',rbrack:']',
  vert:'|',Vert:'‖',lvert:'|',rvert:'|',lVert:'‖',rVert:'‖',backslash:'\\',slash:'/',
  textdegree:'°',textbackslash:'\\',pounds:'£',euro:'€',
  /* khoảng trắng */
  quad:'\u2003',qquad:'\u2003\u2003',enspace:'\u2002',thinspace:'\u2009',medspace:'\u2005',thickspace:'\u2004',
  space:' ',nobreakspace:'\u00a0'
};
/* Ký hiệu "nary" (Sigma, tích phân...) → khối m:nary thật, thân (m:e) lấy từ biểu thức đi sau. */
const NARY = {sum:'∑',int:'∫',oint:'∮',iint:'∬',iiint:'∭',oiint:'∯',prod:'∏',coprod:'∐',bigcup:'⋃',bigcap:'⋂',
  bigvee:'⋁',bigwedge:'⋀',bigoplus:'⨁',bigotimes:'⨂',bigodot:'⨀',biguplus:'⨄',bigsqcup:'⨆'};
const FUNC_NAMES = new Set(['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','arccot','arcsec','arccsc',
  'sinh','cosh','tanh','coth','sech','csch','log','ln','lg','exp','det','dim','gcd','lcm','arg','ker','hom','deg','lim',
  'limsup','liminf','max','min','sup','inf','Pr','sgn','tg','cotg','cosec']);
const FUNC_LIMITS = new Set(['lim','limsup','liminf','max','min','sup','inf','det','gcd','Pr']);
/* Dấu phụ: tên lệnh → dấu kết hợp Unicode (m:acc) */
const ACCENTS = {vec:'\u20D7',overrightarrow:'\u20D7',overleftarrow:'\u20D6',overleftrightarrow:'\u20E1',
  hat:'\u0302',widehat:'\u0302',tilde:'\u0303',widetilde:'\u0303',dot:'\u0307',ddot:'\u0308',dddot:'\u20DB',
  check:'\u030C',breve:'\u0306',acute:'\u0301',grave:'\u0300',mathring:'\u030A'};
const NOT_MAP = {'=':'≠','<':'≮','>':'≯','∈':'∉','⊂':'⊄','⊃':'⊅','⊆':'⊈','⊇':'⊉','≡':'≢','∼':'∼\u0338','≤':'≰','≥':'≱',
  '≈':'≉','≅':'≇','∃':'∄','∣':'∤','∥':'∦','→':'↛','⇒':'⇏','⇔':'⇎','↔':'↮','≃':'≄','⊢':'⊬','⊨':'⊭','∋':'∌'};
const XARROWS = {xrightarrow:'→',xleftarrow:'←',xRightarrow:'⇒',xLeftarrow:'⇐',xleftrightarrow:'↔',
  xLeftrightarrow:'⇔',xmapsto:'↦',xlongequal:'=',xhookrightarrow:'↪'};
const TEXT_CMDS = new Set(['text','mbox','hbox','textrm','textnormal','textup','textmd','textsf','texttt','textit',
  'textbf','textsl','emph','mathnormal_text']);
const IGNORE_ARG_CMDS = new Set(['label','tag','hspace','vspace','hskip','vskip','ref','eqref','cite','phantom','hphantom',
  'vphantom','mspace','kern','raisebox_','rule','pagebreak','newline_']);
const NOOP_CMDS = new Set(['displaystyle','textstyle','scriptstyle','scriptscriptstyle','limits','nolimits','nonumber',
  'notag','hline','hfill','vfill','centering','noindent','allowbreak','relax','protect','strut','bigstrut','toprule',
  'midrule','bottomrule','left_','displaylimits','mathstrut','smash','nobreak','break','par','indent','Bigl_']);
const TRANSPARENT_CMDS = new Set(['mathop','mathbin','mathrel','mathord','mathpunct','mathinner','ensuremath','mathclap',
  'boldmath','unboldmath','displaystyle_','operatorfont','fbox_']);
/* Lệnh kết thúc "thân" của nary / hàm (quan hệ, phép cộng trừ, dấu phân cách...) */
const TERM_STOP_CMDS = new Set(['le','leq','ge','geq','ne','neq','approx','equiv','sim','simeq','cong','propto','pm','mp',
  'to','rightarrow','Rightarrow','leftarrow','Leftarrow','leftrightarrow','Leftrightarrow','iff','implies','impliedby',
  'mapsto','longrightarrow','Longrightarrow','in','notin','ni','subset','supset','subseteq','supseteq','cup','cap',
  'setminus','vee','wedge','land','lor','quad','qquad','ll','gg','lt','gt','leqslant','geqslant','text','mbox',
  'forall','exists','therefore','because','right','end','middle','parallel','perp','mid','nmid','neg','lnot']);
const TERM_STOP_CHARS = '+-=<>,;:&)]';
const MAX_DEPTH = 60;

/* ---- tiện ích quét chuỗi ở cấp ngoài cùng (bỏ qua {...} và \begin..\end) ---- */
function envJump(str,i,nm){ const j=str.indexOf('}',i); return j<0?str.length:j; }
function findTopCmd(str,names){
  let depth=0, env=0, lr=0;
  for(let i=0;i<str.length;i++){
    const ch=str[i];
    if(ch==='{'){depth++;continue;} if(ch==='}'){depth--;continue;}
    if(ch!=='\\') continue;
    const m=/^\\([A-Za-z]+)/.exec(str.slice(i,i+14));
    if(!m){ i++; continue; }
    const nm=m[1];
    if(nm==='begin'||nm==='end'){ if(nm==='begin')env++; else env--; i=envJump(str,i); continue; }
    if(nm==='left') lr++; else if(nm==='right') lr--;
    else if(depth===0&&env===0&&lr===0&&names.indexOf(nm)>=0) return {idx:i,name:nm,len:m[0].length};
    i+=nm.length;
  }
  return null;
}
function splitLevel0(str,mode){
  const parts=[]; let last=0, depth=0, env=0;
  for(let i=0;i<str.length;i++){
    const ch=str[i];
    if(ch==='{'){depth++;continue;} if(ch==='}'){depth--;continue;}
    if(ch==='\\'){
      const nx=str[i+1];
      if(nx==='\\'){ if(mode==='rows'&&depth===0&&env===0){ parts.push(str.slice(last,i)); last=i+2; } i++; continue; }
      const m=/^\\([A-Za-z]+)/.exec(str.slice(i,i+14));
      if(m){ const nm=m[1];
        if(nm==='begin'||nm==='end'){ if(nm==='begin')env++; else env--; i=envJump(str,i); continue; }
        i+=nm.length; continue; }
      i++; continue;
    }
    if(ch==='&'&&mode==='cells'&&depth===0&&env===0){ parts.push(str.slice(last,i)); last=i+1; }
  }
  parts.push(str.slice(last)); return parts;
}
function findEnvEnd(str,from,name){
  const re=/\\(begin|end)\s*\{([^}]*)\}/g; re.lastIndex=from; let depth=1, m;
  while((m=re.exec(str))){
    if(m[2].trim()!==name) continue;
    if(m[1]==='begin') depth++; else { depth--; if(depth===0) return {idx:m.index,len:m[0].length}; }
  }
  return null;
}
function findMatchingRight(str,from){
  const re=/\\(left|right)(?![A-Za-z])/g; re.lastIndex=from; let depth=1, m;
  while((m=re.exec(str))){ if(m[1]==='left') depth++; else { depth--; if(depth===0) return m.index; } }
  return -1;
}
function splitEnvBody(body){
  body=body.replace(/\\(hline|toprule|midrule|bottomrule)(?![A-Za-z])|\\cline\{[^}]*\}/g,'');
  let rowStrs=splitLevel0(body,'rows').map((r,k)=> k>0 ? r.replace(/^\s*\[\s*-?[\d.]+\s*(pt|em|ex|mm|cm|in|bp|pc)\s*\]/,'') : r);
  rowStrs=rowStrs.filter((r,k)=> !(r.trim()==='' && (k===rowStrs.length-1 || rowStrs.length>1)) || rowStrs.length===1);
  return rowStrs.map(r=>splitLevel0(r,'cells').map(c=>P(c.trim())));
}
/* Bảng chữ hoa dạng \mathbb, \mathcal, \mathfrak */
function alphaMap(s,kind){
  const ex={bb:{C:'ℂ',H:'ℍ',N:'ℕ',P:'ℙ',Q:'ℚ',R:'ℝ',Z:'ℤ'},cal:{B:'ℬ',E:'ℰ',F:'ℱ',H:'ℋ',I:'ℐ',L:'ℒ',M:'ℳ',R:'ℛ',e:'ℯ',g:'ℊ',o:'ℴ'},
            frak:{C:'ℭ',H:'ℌ',I:'ℑ',R:'ℜ',Z:'ℨ'}}[kind];
  const base={bb:[0x1D538,0x1D552,0x1D7D8],cal:[0x1D49C,0x1D4B6,null],frak:[0x1D504,0x1D51E,null]}[kind];
  let out='';
  for(const ch of s){
    if(ex[ch]){ out+=ex[ch]; continue; }
    const c=ch.charCodeAt(0);
    if(c>=65&&c<=90) out+=String.fromCodePoint(base[0]+c-65);
    else if(c>=97&&c<=122) out+=String.fromCodePoint(base[1]+c-97);
    else if(c>=48&&c<=57&&base[2]) out+=String.fromCodePoint(base[2]+c-48);
    else out+=ch;
  }
  return out;
}
function mkText(c){
  if(c==='-') return {t:'text',v:'\u2212'};
  if(c==="'") return {t:'text',v:'\u2032'};
  if(c==='~') return {t:'text',v:'\u00a0'};
  return {t:'text',v:c};
}
function strToTextNodes(s){ const o=[]; for(const ch of s) o.push({t:'text',v:ch}); return o; }

/* Chuẩn hoá thô: bỏ chú thích %, đổi xuống dòng thành khoảng trắng, cân bằng ngoặc {} */
function preprocessLatex(s){
  let out='', depth=0, fixed=false;
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==='\\'){ if(i+1<s.length){ out+=ch+s[i+1]; i++; } continue; }
    if(ch==='%'){ while(i<s.length && s[i]!=='\n') i++; continue; }
    if(ch==='{') depth++;
    else if(ch==='}'){ if(depth===0){ fixed=true; continue; } depth--; }
    out+=ch;
  }
  if(depth>0){ fixed=true; out+='}'.repeat(depth); }
  if(fixed) eqWarn('ngoặc {} không cân – đã tự sửa');
  return out.replace(/[\r\n\t\u00a0]+/g,' ');
}
/* Văn bản trong \text{...}: giữ khoảng trắng, hiểu \% \$ \& ..., cho phép $...$ lồng bên trong */
function rawTextNodes(raw,fmt){
  const out=[]; let buf='';
  const flush=()=>{ if(buf){ out.push({t:'rawtext',v:buf,b:!!fmt.b,i:!!fmt.i}); buf=''; } };
  for(let k=0;k<raw.length;k++){
    const ch=raw[k];
    if(ch==='\\'){
      const nx=raw[k+1]||'';
      if(/[A-Za-z]/.test(nx)){
        let j=k+1; while(j<raw.length && /[A-Za-z]/.test(raw[j])) j++;
        const nm=raw.slice(k+1,j);
        if(SYMBOLS.hasOwnProperty(nm)) buf+=SYMBOLS[nm];
        else if(!TEXT_CMDS.has(nm) && nm!=='relax' && nm!=='ldots') eqWarn('lệnh \\'+nm+' trong \\text bị bỏ qua');
        k=j-1; continue;
      }
      if(nx){ const map={'%':'%','$':'$','&':'&','_':'_','#':'#','{':'{','}':'}','\\':' ',',':'\u2009',';':' ',':':' ',' ':' ','!':'','-':''};
        buf+= Object.prototype.hasOwnProperty.call(map,nx)?map[nx]:nx; k++; }
      continue;
    }
    if(ch==='{'||ch==='}') continue;
    if(ch==='~'){ buf+='\u00a0'; continue; }
    if(ch==='$'){
      const j=raw.indexOf('$',k+1);
      if(j<0){ buf+='$'; continue; }
      flush(); out.push({t:'seq',c:P(raw.slice(k+1,j))}); k=j; continue;
    }
    buf+=ch;
  }
  flush(); return out;
}

function parseLatex(src){
  src=preprocessLatex(String(src==null?'':src));
  const rows=splitLevel0(src,'rows');
  if(rows.length>1){
    const mrows=rows.filter((r,k)=>r.trim()!==''||k===0).map(r=>splitLevel0(r,'cells').map(c=>P(c.trim())));
    if(mrows.length>1) return [{t:'matrix',kind:'aligned',rows:mrows}];
    return mrows.length?mrows[0].reduce((a,c)=>a.concat(c),[]):[];
  }
  const cells=splitLevel0(src,'cells');
  if(cells.length>1) return cells.reduce((a,c)=>a.concat(P(c.trim())),[]);
  return P(src);
}

let P_DEPTH=0;
function P(str){
  if(P_DEPTH>MAX_DEPTH){ eqWarn('công thức lồng quá sâu'); return [{t:'text',v:str}]; }
  P_DEPTH++;
  try{ return P_inner(str); } finally { P_DEPTH--; }
}
function P_inner(str){
  const ov=findTopCmd(str,['over','atop','choose']);
  if(ov){
    const a=P(str.slice(0,ov.idx)), b=P(str.slice(ov.idx+ov.len));
    if(ov.name==='choose') return [{t:'binom',top:a,bottom:b}];
    return [{t:'frac',num:a,den:b,noBar:ov.name==='atop'}];
  }
  let i=0; const n=str.length;
  function skipSp(){ while(i<n && /\s/.test(str[i])) i++; }
  function readBraced(){
    i++; let depth=1, start=i;
    while(i<n){ const ch=str[i]; if(ch==='\\'){ i+=2; continue; } if(ch==='{')depth++; else if(ch==='}'){ depth--; if(depth===0)break; } i++; }
    const inner=str.slice(start,Math.min(i,n)); i++; return inner;
  }
  function readOptional(){ skipSp(); if(str[i]!=='[') return null; const j=str.indexOf(']',i); if(j<0) return null; const r=str.slice(i+1,j); i=j+1; return r; }
  function readArg(){
    skipSp(); if(i>=n) return [];
    const c=str[i];
    if(c==='{') return P(readBraced());
    if(c==='\\'){ const nd=readCommand(); return nd?[nd]:[]; }
    i++; return [mkText(c)];
  }
  function readRawArg(){ skipSp(); if(i>=n) return ''; if(str[i]==='{') return readBraced(); const c=str[i]; i++; return c; }
  function readDelimChar(){
    skipSp();
    if(i>=n) return '';
    if(str[i]==='\\'){
      i++; const s=i; while(i<n && /[A-Za-z]/.test(str[i])) i++;
      const nm=str.slice(s,i);
      if(nm===''){ const c=str[i]||''; i++; if(c==='|') return '‖'; if(c==='.'||c===',') return ''; return c; }
      const map={langle:'⟨',rangle:'⟩',lceil:'⌈',rceil:'⌉',lfloor:'⌊',rfloor:'⌋',lbrace:'{',rbrace:'}',lbrack:'[',rbrack:']',
        vert:'|',Vert:'‖',lvert:'|',rvert:'|',lVert:'‖',rVert:'‖',backslash:'\\',uparrow:'↑',downarrow:'↓',updownarrow:'↕'};
      return map.hasOwnProperty(nm)?map[nm]:'';
    }
    const c=str[i]; i++;
    if(c==='.') return '';
    if(c==='<') return '⟨';
    if(c==='>') return '⟩';
    return c;
  }
  function funcNode(name){ return {t:'funcname',name}; }
  function readCommand(){
    i++; const st=i;
    while(i<n && /[A-Za-z]/.test(str[i])) i++;
    let name=str.slice(st,i);
    if(name===''){
      const ch=str[i]||''; i++;
      switch(ch){
        case ',': return {t:'text',v:'\u2009'};
        case ':': return {t:'text',v:'\u2005'};
        case ';': return {t:'text',v:'\u2004'};
        case ' ': return {t:'text',v:' '};
        case '!': case '-': case '/': case '@': case '\'': case '"': case '^': case '`': case '=': case '.': return null;
        case '\\': { const m=/^\s*\[\s*-?[\d.]+\s*(pt|em|ex|mm|cm|in)\s*\]/.exec(str.slice(i)); if(m) i+=m[0].length; return null; }
        case '|': return {t:'text',v:'‖'};
        case '{': return {t:'text',v:'{'};
        case '}': return {t:'text',v:'}'};
        case '': return null;
        default: return {t:'text',v:ch};
      }
    }
    if(name==='frac'||name==='dfrac'||name==='tfrac'||name==='cfrac'){
      if(name==='cfrac') readOptional();
      const num=readArg(); const den=readArg(); return {t:'frac',num,den};
    }
    if(name==='sqrt'){
      const o=readOptional(); const idx=o!==null?P(o):null; const rad=readArg(); return {t:'sqrt',idx,rad};
    }
    if(name==='binom'||name==='dbinom'||name==='tbinom'){ const top=readArg(); const bottom=readArg(); return {t:'binom',top,bottom}; }
    if(TEXT_CMDS.has(name)){
      const fmt={b:name==='textbf',i:name==='textit'||name==='emph'||name==='textsl'};
      return {t:'seq',c:rawTextNodes(readRawArg(),fmt)};
    }
    if(name==='mathrm'||name==='mathsf'||name==='mathtt'||name==='mathnormal'||name==='mathbf_'){ return {t:'upright',c:readArg()}; }
    if(name==='mathbf'||name==='boldsymbol'||name==='bm'||name==='pmb'||name==='textbf_'){ return {t:'styled',sty:(name==='mathbf'?'b':'bi'),c:readArg()}; }
    if(name==='mathit'){ return {t:'styled',sty:'i',c:readArg()}; }
    if(name==='mathbb'||name==='Bbb'||name==='mathcal'||name==='mathscr'||name==='mathfrak'){
      const kind=(name==='mathbb'||name==='Bbb')?'bb':(name==='mathfrak'?'frak':'cal');
      const raw=readRawArg();
      const plain=raw.replace(/\\[A-Za-z]+|[{}\s]/g,'');
      return {t:'upright',c:strToTextNodes(alphaMap(plain,kind))};
    }
    if(name==='operatorname'){
      if(str[i]==='*') i++;
      const raw=readRawArg().replace(/\\[,;: ]|\s/g,'').replace(/\\[A-Za-z]+/g,'');
      return funcNode(raw||'op');
    }
    if(ACCENTS.hasOwnProperty(name)) return {t:'accent',mark:name,e:readArg()};
    if(name==='overline'||name==='bar'){ return {t:'accent',mark:'bar',e:readArg()}; }
    if(name==='underline'){ return {t:'accent',mark:'underline',e:readArg()}; }
    if(name==='boxed'||name==='fbox'){ return {t:'accent',mark:'boxed',e:readArg()}; }
    if(name==='cancel'||name==='bcancel'||name==='xcancel'||name==='sout'){ return {t:'accent',mark:'cancel',e:readArg()}; }
    if(name==='overbrace'){ return {t:'groupbrace',mark:'over',e:readArg()}; }
    if(name==='underbrace'){ return {t:'groupbrace',mark:'under',e:readArg()}; }
    if(name==='stackrel'||name==='overset'){ const top=readArg(); const base=readArg(); return {t:'stackrel',top,base}; }
    if(name==='underset'){ const lim=readArg(); const base=readArg(); return {t:'limlow',base,lim}; }
    if(XARROWS.hasOwnProperty(name)){ const o=readOptional(); const top=readArg(); return {t:'xarrow',chr:XARROWS[name],top,bot:o!==null?P(o):null}; }
    if(name==='substack'){
      const body=readRawArg();
      return {t:'matrix',kind:'subs',rows:splitLevel0(body,'rows').filter(r=>r.trim()!=='').map(r=>[P(r.trim())])};
    }
    if(name==='pmod'){ const nn=readArg(); return {t:'seq',c:[{t:'rawtext',v:' (mod '}].concat(nn).concat([{t:'rawtext',v:')'}])}; }
    if(name==='bmod'||name==='mod'){ return {t:'rawtext',v:' mod '}; }
    if(name==='not'){
      skipSp(); let ch='';
      if(str[i]==='\\'){ const nd=readCommand(); if(nd && nd.t==='text') ch=nd.v; else return nd; }
      else if(i<n){ ch=str[i]; i++; }
      return {t:'text',v:NOT_MAP.hasOwnProperty(ch)?NOT_MAP[ch]:ch+'\u0338'};
    }
    if(name==='begin') return readEnv();
    if(name==='end'){ skipSp(); if(str[i]==='{') readBraced(); return null; }
    if(name==='left'){
      const beg=readDelimChar();
      const close=findMatchingRight(str,i);
      let inner,end='';
      if(close<0){ inner=str.slice(i); i=n; eqWarn('\\left không có \\right – đã tự đóng'); }
      else { inner=str.slice(i,close); i=close+6; end=readDelimChar(); }
      return {t:'delim',beg,end,body:P(inner)};
    }
    if(name==='right'){ eqWarn('\\right không có \\left – đã bỏ qua'); readDelimChar(); return null; }
    if(name==='middle'){ const c=readDelimChar(); return c?{t:'text',v:c}:null; }
    if(/^(big|Big|bigg|Bigg)[lrm]?$/.test(name)){ const c=readDelimChar(); return c?{t:'text',v:c}:null; }
    if(NARY.hasOwnProperty(name)) return {t:'narysym',v:NARY[name]};
    if(SYMBOLS.hasOwnProperty(name)) return {t:'text',v:SYMBOLS[name]};
    if(FUNC_NAMES.has(name)) return funcNode(name);
    if(NOOP_CMDS.has(name)) return null;
    if(IGNORE_ARG_CMDS.has(name)){ skipSp(); if(str[i]==='*') i++; skipSp(); if(str[i]==='{') readBraced(); else if(str[i]==='[') readOptional(); return null; }
    if(name==='textcolor'||name==='colorbox'){ skipSp(); if(str[i]==='[') readOptional(); readRawArg(); return {t:'seq',c:readArg()}; }
    if(name==='color'){ skipSp(); if(str[i]==='[') readOptional(); readRawArg(); return null; }
    if(TRANSPARENT_CMDS.has(name)) return {t:'seq',c:readArg()};
    /* Lệnh chưa hỗ trợ: giữ nội dung đối số (nếu có), không bao giờ để lọt tên lệnh thô vào Word */
    eqWarn('lệnh \\'+name+' chưa hỗ trợ');
    skipSp();
    if(str[i]==='{') return {t:'seq',c:readArg()};
    return null;
  }
  function readEnv(){
    skipSp();
    if(str[i]!=='{'){ eqWarn('\\begin thiếu tên môi trường'); return null; }
    const envName=readBraced().trim();
    let spec=null;
    if(/^(array|tabular\*?|subarray|alignedat|alignat\*?|tabularx|longtable)$/.test(envName)){
      skipSp(); if(str[i]==='[') readOptional(); skipSp();
      if(str[i]==='{') spec=readBraced();
    } else if(/^[pbBvV]?matrix\*$/.test(envName)){ readOptional(); }
    const en=findEnvEnd(str,i,envName);
    let body;
    if(!en){ body=str.slice(i); i=n; eqWarn('thiếu \\end{'+envName+'} – đã tự đóng'); }
    else { body=str.slice(i,en.idx); i=en.idx+en.len; }
    const rows=splitEnvBody(body);
    if(/^(equation|displaymath|math|split|subequations)\*?$/.test(envName)){
      if(rows.length===1&&rows[0].length===1) return {t:'seq',c:rows[0][0]};
      return {t:'matrix',kind:'aligned',rows};
    }
    if(/^(aligned|align|alignat|alignedat|flalign|eqnarray|gather|gathered|multline)\*?$/.test(envName)) return {t:'matrix',kind:'aligned',rows};
    if(/^d?cases\*?$/.test(envName)) return {t:'matrix',kind:'cases',rows};
    if(/^rcases\*?$/.test(envName)) return {t:'matrix',kind:'rcases',rows};
    const mm=/^([pbBvV]?matrix|smallmatrix)\*?$/.exec(envName);
    if(mm) return {t:'matrix',kind:mm[1],rows};
    if(envName==='array'||/^tabular/.test(envName)||envName==='longtable'){
      let cols=[];
      if(spec){ const cs=spec.replace(/@\{[^}]*\}|!\{[^}]*\}|[pmb]\{[^}]*\}/g,'l').replace(/[^lcr]/g,''); cols=cs.split(''); }
      return {t:'matrix',kind:'array',rows,cols};
    }
    if(envName==='subarray') return {t:'matrix',kind:'subs',rows};
    eqWarn('môi trường '+envName+' chưa hỗ trợ – hiển thị dạng phẳng');
    const flat=[]; rows.forEach((row,ri)=>{ if(ri>0) flat.push({t:'text',v:' '}); row.forEach((cell,ci)=>{ if(ci>0) flat.push({t:'text',v:' '}); flat.push(...cell); }); });
    return {t:'seq',c:flat};
  }
  /* Thân của nary / hàm: gom các nguyên tử đi sau cho tới toán tử quan hệ / cộng trừ / dấu phân cách ở cấp ngoài */
  function captureTerm(kind){
    const out=[]; let depth=0, startedParen=false;
    while(true){
      skipSp(); if(i>=n) break;
      const ch=str[i];
      if(ch==='\\'){
        const m=/^\\([A-Za-z]+|.)/.exec(str.slice(i,i+20)); const nm=m?m[1]:'';
        if(depth===0){
          if(TERM_STOP_CMDS.has(nm)) break;
          if(nm==='\\') break;
          if(kind==='func' && (FUNC_NAMES.has(nm)||NARY.hasOwnProperty(nm)||nm==='cdot'||nm==='times'||nm==='operatorname')) break;
          if(kind==='nary' && out.length>0 && nm==='operatorname') break;
        }
      } else {
        if(depth===0 && TERM_STOP_CHARS.indexOf(ch)>=0) break;
        if(ch==='('||ch==='['){ depth++; if(out.length===0) startedParen=true; }
        else if(ch===')'||ch===']'){ if(depth===0) break; depth--; }
      }
      const a=parseAtom(); if(!a) break; out.push(a);
      if(startedParen && depth===0) break;
      if(kind==='func' && out.length===1 && a.t==='delim') break;
    }
    return out;
  }
  function parseAtom(){
    skipSp(); if(i>=n) return null;
    const c=str[i]; let base;
    if(c==='\\'){ const nd=readCommand(); if(nd===null) return {t:'seq',c:[]}; base=[nd]; }
    else if(c==='{'){ base=[{t:'seq',c:P(readBraced())}]; }
    else if(c==='^'||c==='_'){ base=[]; }
    else if(c==='&'||c==='#'){ i++; return {t:'seq',c:[]}; }
    else { i++; base=[mkText(c)]; }
    let sup=null, sub=null;
    while(true){
      skipSp();
      const d=str[i];
      if(d==='^'){ i++; sup=(sup||[]).concat(readArg()); }
      else if(d==='_'){ i++; sub=(sub||[]).concat(readArg()); }
      else if(d==="'"){ i++; sup=(sup||[]).concat([mkText("'")]); }
      else break;
    }
    if(sup && sup.length===1 && sup[0].t==='text' && sup[0].v==='∘') sup=[{t:'text',v:'°'}];
    const b0=base.length===1?base[0]:null;
    if(b0 && b0.t==='narysym'){
      return {t:'nary',chr:b0.v,sub,sup,e:captureTerm('nary')};
    }
    if(b0 && b0.t==='funcname'){
      const up={t:'upright',c:strToTextNodes(b0.name)};
      let head;
      if(FUNC_LIMITS.has(b0.name) && sub && !sup) head={t:'limlow',base:[up],lim:sub};
      else if(sup&&sub) head={t:'subsup',base:[up],sub,sup};
      else if(sup) head={t:'sup',base:[up],sup};
      else if(sub) head={t:'sub',base:[up],sub};
      else head=up;
      return {t:'func',name:[head],e:captureTerm('func')};
    }
    if(b0 && b0.t==='groupbrace' && (sup||sub)){
      if(b0.mark==='over' && sup && !sub) return {t:'stackrel',top:sup,base:[b0]};
      if(b0.mark==='under' && sub && !sup) return {t:'limlow',base:[b0],lim:sub};
    }
    if(sup && sub) return {t:'subsup',base,sub,sup};
    if(sup) return {t:'sup',base,sup};
    if(sub) return {t:'sub',base,sub};
    return {t:'seq',c:base};
  }
  const out=[];
  while(i<n){ skipSp(); if(i>=n) break; const nd=parseAtom(); if(!nd) break; out.push(nd); }
  return out;
}

/* ======================= AST -> OMML (Equation thật của Word) ======================= */
const OM_ENC_RE=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
function xesc(s){return String(s).replace(OM_ENC_RE,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function xattr(s){return xesc(s).replace(/"/g,'&quot;');}
function omRun(text,st){
  let rp='';
  if(st==='p') rp='<m:rPr><m:sty m:val="p"/></m:rPr>';
  else if(st==='b') rp='<m:rPr><m:sty m:val="b"/></m:rPr>';
  else if(st==='bi') rp='<m:rPr><m:sty m:val="bi"/></m:rPr>';
  else if(st==='i') rp='<m:rPr><m:sty m:val="i"/></m:rPr>';
  return '<m:r>'+rp+'<m:t xml:space="preserve">'+xesc(text)+'</m:t></m:r>';
}
function omRaw(n){
  const wr=(n.b||n.i)?'<w:rPr>'+(n.b?'<w:b/>':'')+(n.i?'<w:i/>':'')+'</w:rPr>':'';
  return '<m:r><m:rPr><m:nor/></m:rPr>'+wr+'<m:t xml:space="preserve">'+xesc(n.v)+'</m:t></m:r>';
}
function omFlat(nodes,out){ for(const n of (nodes||[])){ if(!n) continue; if(n.t==='seq') omFlat(n.c,out); else out.push(n); } return out; }
function om(nodes,st){
  const fl=omFlat(nodes,[]); let xml='', buf='';
  const flush=()=>{ if(buf){ xml+=omRun(buf,st); buf=''; } };
  for(const n of fl){
    if(n.t==='text'){ buf+=n.v; continue; }
    flush(); xml+=omNode(n,st);
  }
  flush(); return xml;
}
function nodesToOMML(nodes){ return om(nodes,null); }
function omDelim(beg,end,inner){
  return '<m:d><m:dPr><m:begChr m:val="'+xattr(beg||'')+'"/><m:endChr m:val="'+xattr(end||'')+'"/><m:grow/></m:dPr><m:e>'+inner+'</m:e></m:d>';
}
function omMatrix(n,st){
  const rows=n.rows.length?n.rows:[[[]]];
  const ncol=Math.max(1,...rows.map(r=>r.length));
  const alnMark='<m:r><m:rPr><m:aln/></m:rPr><m:t></m:t></m:r>';
  if(n.kind==='aligned'||n.kind==='subs'){
    const es=rows.map(r=>'<m:e>'+r.map((c,k)=>(k>0&&n.kind==='aligned'?alnMark:'')+om(c,st)).join('')+'</m:e>').join('');
    return '<m:eqArr><m:eqArrPr/>'+es+'</m:eqArr>';
  }
  let cols;
  if(n.kind==='cases'||n.kind==='rcases') cols=new Array(ncol).fill('l');
  else if(n.kind==='array'&&n.cols&&n.cols.length) cols=Array.from({length:ncol},(_,k)=>n.cols[k]||'c');
  else cols=new Array(ncol).fill('c');
  const jc={l:'left',c:'center',r:'right'};
  let mcs='', k=0;
  while(k<cols.length){ let j=k; while(j<cols.length&&cols[j]===cols[k]) j++;
    mcs+='<m:mc><m:mcPr><m:count m:val="'+(j-k)+'"/><m:mcJc m:val="'+jc[cols[k]]+'"/></m:mcPr></m:mc>'; k=j; }
  const body=rows.map(r=>{ const cells=r.slice(); while(cells.length<ncol) cells.push([]);
    return '<m:mr>'+cells.map(c=>'<m:e>'+om(c,st)+'</m:e>').join('')+'</m:mr>'; }).join('');
  const inner='<m:m><m:mPr><m:mcs>'+mcs+'</m:mcs></m:mPr>'+body+'</m:m>';
  const dl={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['‖','‖'],cases:['{',''],rcases:['','}']}[n.kind];
  return dl?omDelim(dl[0],dl[1],inner):inner;
}
function omNode(n,st){
  switch(n.t){
    case 'text': return omRun(n.v,st);
    case 'rawtext': return omRaw(n);
    case 'funcname': return omRun(n.name,'p');
    case 'narysym': return omRun(n.v,st);
    case 'frac': return '<m:f>'+(n.noBar?'<m:fPr><m:type m:val="noBar"/></m:fPr>':'<m:fPr/>')+'<m:num>'+om(n.num,st)+'</m:num><m:den>'+om(n.den,st)+'</m:den></m:f>';
    case 'sqrt':
      if(n.idx&&n.idx.length) return '<m:rad><m:radPr/><m:deg>'+om(n.idx,st)+'</m:deg><m:e>'+om(n.rad,st)+'</m:e></m:rad>';
      return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>'+om(n.rad,st)+'</m:e></m:rad>';
    case 'sup': return '<m:sSup><m:sSupPr/><m:e>'+om(n.base,st)+'</m:e><m:sup>'+om(n.sup,st)+'</m:sup></m:sSup>';
    case 'sub': return '<m:sSub><m:sSubPr/><m:e>'+om(n.base,st)+'</m:e><m:sub>'+om(n.sub,st)+'</m:sub></m:sSub>';
    case 'subsup': return '<m:sSubSup><m:sSubSupPr/><m:e>'+om(n.base,st)+'</m:e><m:sub>'+om(n.sub,st)+'</m:sub><m:sup>'+om(n.sup,st)+'</m:sup></m:sSubSup>';
    case 'upright': return om(n.c,'p');
    case 'styled': return om(n.c,n.sty);
    case 'nary': {
      const side=/[∫∬∭∮∯]/.test(n.chr);
      const hs=(n.sub&&n.sub.length)?'':'<m:subHide m:val="1"/>', hp=(n.sup&&n.sup.length)?'':'<m:supHide m:val="1"/>';
      return '<m:nary><m:naryPr><m:chr m:val="'+xattr(n.chr)+'"/><m:limLoc m:val="'+(side?'subSup':'undOvr')+'"/><m:grow m:val="1"/>'+hs+hp+'</m:naryPr>'+
        '<m:sub>'+om(n.sub,st)+'</m:sub><m:sup>'+om(n.sup,st)+'</m:sup><m:e>'+om(n.e,st)+'</m:e></m:nary>';
    }
    case 'func': return '<m:func><m:funcPr/><m:fName>'+om(n.name,'p')+'</m:fName><m:e>'+om(n.e,st)+'</m:e></m:func>';
    case 'limlow': return '<m:limLow><m:limLowPr/><m:e>'+om(n.base,st)+'</m:e><m:lim>'+om(n.lim,st)+'</m:lim></m:limLow>';
    case 'stackrel': return '<m:limUpp><m:limUppPr/><m:e>'+om(n.base,st)+'</m:e><m:lim>'+om(n.top,st)+'</m:lim></m:limUpp>';
    case 'xarrow': {
      let x='<m:limUpp><m:limUppPr/><m:e>'+omRun(n.chr,null)+'</m:e><m:lim>'+om(n.top,st)+'</m:lim></m:limUpp>';
      if(n.bot&&n.bot.length) x='<m:limLow><m:limLowPr/><m:e>'+x+'</m:e><m:lim>'+om(n.bot,st)+'</m:lim></m:limLow>';
      return x;
    }
    case 'accent': {
      const e=om(n.e,st), mk=n.mark;
      if(mk==='bar') return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>'+e+'</m:e></m:bar>';
      if(mk==='underline') return '<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>'+e+'</m:e></m:bar>';
      if(mk==='boxed') return '<m:borderBox><m:borderBoxPr/><m:e>'+e+'</m:e></m:borderBox>';
      if(mk==='cancel') return '<m:borderBox><m:borderBoxPr><m:hideTop m:val="1"/><m:hideBot m:val="1"/><m:hideLeft m:val="1"/><m:hideRight m:val="1"/><m:strikeH m:val="1"/></m:borderBoxPr><m:e>'+e+'</m:e></m:borderBox>';
      if(mk==='overrightarrow'||mk==='overleftarrow'||mk==='overleftrightarrow'){
        const chr={overrightarrow:'→',overleftarrow:'←',overleftrightarrow:'↔'}[mk];
        return '<m:groupChr><m:groupChrPr><m:chr m:val="'+chr+'"/><m:pos m:val="top"/><m:vertJc m:val="bot"/></m:groupChrPr><m:e>'+e+'</m:e></m:groupChr>';
      }
      return '<m:acc><m:accPr><m:chr m:val="'+xattr(ACCENTS[mk]||'\u0302')+'"/></m:accPr><m:e>'+e+'</m:e></m:acc>';
    }
    case 'groupbrace': {
      const over=n.mark==='over';
      return '<m:groupChr><m:groupChrPr><m:chr m:val="'+(over?'⏞':'⏟')+'"/><m:pos m:val="'+(over?'top':'bot')+'"/><m:vertJc m:val="'+(over?'bot':'top')+'"/></m:groupChrPr><m:e>'+om(n.e,st)+'</m:e></m:groupChr>';
    }
    case 'binom': return omDelim('(',')','<m:f><m:fPr><m:type m:val="noBar"/></m:fPr><m:num>'+om(n.top,st)+'</m:num><m:den>'+om(n.bottom,st)+'</m:den></m:f>');
    case 'delim': return omDelim(n.beg,n.end,om(n.body,st));
    case 'matrix': return omMatrix(n,st);
    default: return '';
  }
}

/* ======================= Kiểm tra cấu trúc OMML theo đặc tả (schema-order) ======================= */
const OM_ELEM=new Set(['r','f','d','nary','rad','sSup','sSub','sSubSup','sPre','func','limLow','limUpp','acc','bar',
  'borderBox','box','eqArr','groupChr','m','phant','oMath']);
const OM_CONT=new Set(['e','num','den','sub','sup','deg','lim','fName','oMath']);
const OM_SPEC={f:['fPr?','num','den'],rad:['radPr?','deg','e'],nary:['naryPr?','sub','sup','e'],d:['dPr?','e+'],
  sSup:['sSupPr?','e','sup'],sSub:['sSubPr?','e','sub'],sSubSup:['sSubSupPr?','e','sub','sup'],func:['funcPr?','fName','e'],
  limLow:['limLowPr?','e','lim'],limUpp:['limUppPr?','e','lim'],acc:['accPr?','e'],bar:['barPr?','e'],
  borderBox:['borderBoxPr?','e'],groupChr:['groupChrPr?','e'],eqArr:['eqArrPr?','e+'],m:['mPr?','mr+'],mr:['e+'],
  r:['rPr?','w:rPr?','t']};
function omName(el){ return el.namespaceURI===MNS?el.localName:(el.namespaceURI===WNS?'w:'+el.localName:'?'+el.localName); }
function omCheck(el){
  const nm=omName(el), kids=Array.from(el.children);
  if(OM_SPEC[nm]){
    let k=0;
    for(const it of OM_SPEC[nm]){
      const plus=it.endsWith('+'), opt=it.endsWith('?'), name=it.replace(/[?+]$/,'');
      let c=0; while(k<kids.length && omName(kids[k])===name){ c++; k++; if(!plus) break; }
      if(c===0 && !opt) return 'm:'+nm+' thiếu <'+name+'>';
    }
    if(k<kids.length) return 'm:'+nm+' có phần tử thừa/sai thứ tự: <'+omName(kids[k])+'>';
    if(nm==='m'){ const cnt=kids.filter(x=>omName(x)==='mr').map(x=>x.children.length); if(cnt.some(x=>x!==cnt[0])) return 'm:m số cột không đều'; }
  } else if(OM_CONT.has(nm)){
    for(const c of kids){ const cn=omName(c); if(!(OM_ELEM.has(cn)&&c.namespaceURI===MNS)&&c.namespaceURI!==WNS) return 'm:'+nm+' chứa phần tử không hợp lệ <'+cn+'>'; }
  }
  for(const c of kids){ if(c.namespaceURI===MNS){ const r=omCheck(c); if(r) return r; } }
  return null;
}
function validateOMML(omathXml){
  const d=new DOMParser().parseFromString('<m:root xmlns:m="'+MNS+'" xmlns:w="'+WNS+'">'+omathXml+'</m:root>','application/xml');
  if(d.getElementsByTagName('parsererror').length) return 'XML không well-formed';
  const om0=d.documentElement.firstElementChild;
  if(!om0||omName(om0)!=='oMath') return 'thiếu m:oMath';
  return omCheck(om0);
}
function fallbackOMath(latex){
  return '<m:oMath><m:r><m:rPr><m:nor/></m:rPr><m:t xml:space="preserve">'+xesc(String(latex).replace(/\s+/g,' ').trim())+'</m:t></m:r></m:oMath>';
}
/* Hàm chính: LaTeX → <m:oMath> luôn hợp lệ (nếu không dựng được thì giữ nguyên chữ LaTeX + ghi cảnh báo) */
function buildOMath(latex){
  EQ_LOG.total++; const warns=[]; EQ_LOG.cur=warns; P_DEPTH=0;
  let xml='', why='';
  try{
    xml='<m:oMath>'+om(parseLatex(latex),null)+'</m:oMath>';
    why=validateOMML(xml)||'';
  }catch(e){ why='lỗi nội bộ: '+(e&&e.message?e.message:e); }
  EQ_LOG.cur=null;
  if(why){ EQ_LOG.degraded.push({latex:String(latex),why}); return fallbackOMath(latex); }
  if(warns.length) EQ_LOG.warned.push({latex:String(latex),warn:warns});
  return xml;
}
function latexToOMML(latex){ return buildOMath(latex); }

/* ======================= Nhận diện $..$ $$..$$ \(..\) \[..\] và môi trường \begin{..} ======================= */
function looksLikeLatex(s){
  const t=s.trim();
  if(t.length===0) return false;
  if(/^\d[\d.,\s]*$/.test(t)) return false;   // chỉ là số: nhiều khả năng là tiền tệ
  return true;
}
function bracesBalanced(s){ let d=0; for(let i=0;i<s.length;i++){ const ch=s[i]; if(ch==='\\'){i++;continue;} if(ch==='{')d++; else if(ch==='}'){d--; if(d<0)return false;} } return d===0; }
const DOLLAR_MASK='\uE000\uE001';
function scanSegments(fullText){
  const masked=String(fullText).replace(/(\\+)\$/g,(m,bs)=>(bs.length%2===1)?bs.slice(1)+DOLLAR_MASK:m);
  const patterns=[
    {re:/\$\$([\s\S]+?)\$\$/g, display:true},
    {re:/\\\[([\s\S]+?)\\\]/g, display:true},
    {re:/\\\(([^\n]+?)\\\)/g, display:false},
    {re:/\$([^\$\n]+?)\$/g, display:false, dollar:true},
    {re:/\\begin\{(equation|align|gather|multline|eqnarray|displaymath|flalign|alignat)(\*?)\}[\s\S]*?\\end\{\1\2\}/g, display:true, whole:true}
  ];
  let segments=[{type:'text',content:masked}];
  for(const p of patterns){
    const next=[];
    for(const seg of segments){
      if(seg.type!=='text'){ next.push(seg); continue; }
      let last=0, m; p.re.lastIndex=0;
      while((m=p.re.exec(seg.content))){
        const inner=p.whole?m[0]:m[1];
        let ok=looksLikeLatex(inner);
        if(ok && p.dollar){
          const after=seg.content[m.index+m[0].length]||'';
          const strong=/[\\^_{}=+\-*\/<>()|]/.test(inner);
          const before=seg.content[m.index-1]||'';
          if(/^\s/.test(inner) && /\d/.test(before)) ok=false;           // "5$ và 10$": dấu $ sau số = tiền tệ
          else if(!strong && (/^\s/.test(inner)||/\s$/.test(inner)||/\d/.test(after))) ok=false;
        }
        if(m.index>last) next.push({type:'text',content:seg.content.slice(last,m.index)});
        if(ok) next.push({type:'eq',content:inner,display:p.display,raw:m[0]});
        else next.push({type:'text',content:m[0]});
        last=m.index+m[0].length;
      }
      if(last<seg.content.length) next.push({type:'text',content:seg.content.slice(last)});
    }
    segments=next;
  }
  const unmask=s=>s.split(DOLLAR_MASK);
  return segments.map(s=>{
    const rawO=unmask(s.type==='eq'&&s.raw?s.raw:s.content).join('\\$');
    if(s.type==='eq') return {type:'eq',content:unmask(s.content).join('\\$'),display:s.display,raw:rawO};
    return {type:'text',content:unmask(s.content).join('$'),raw:rawO};
  }).filter(s=>s.raw.length>0||s.content.length>0);
}

/* ======================= XỬ LÝ XML CỦA WORD - GIỮ NGUYÊN MỌI THỨ, CHỈ SỬA ĐOẠN CÓ LATEX ======================= */
function importOMath(mainDoc, latex){
  const xml=buildOMath(latex);
  const fragDoc=new DOMParser().parseFromString('<m:root xmlns:m="'+MNS+'" xmlns:w="'+WNS+'">'+xml+'</m:root>','application/xml');
  if(fragDoc.getElementsByTagName('parsererror').length){
    const fb=new DOMParser().parseFromString('<m:root xmlns:m="'+MNS+'" xmlns:w="'+WNS+'">'+fallbackOMath(latex)+'</m:root>','application/xml');
    return mainDoc.importNode(fb.documentElement.firstElementChild,true);
  }
  return mainDoc.importNode(fragDoc.documentElement.firstElementChild,true);
}
function makeTextRun(mainDoc, text, rPrTemplate){
  const r=mainDoc.createElementNS(WNS,'w:r');
  if(rPrTemplate) r.appendChild(rPrTemplate.cloneNode(true));
  const t=mainDoc.createElementNS(WNS,'w:t');
  t.setAttribute('xml:space','preserve');
  t.textContent=text.replace(OM_ENC_RE,'');
  r.appendChild(t);
  return r;
}
const W_TRANSP=new Set(['proofErr','bookmarkStart','bookmarkEnd','permStart','permEnd']);
function isPureTextRun(c){
  if(c.nodeType!==1||c.namespaceURI!==WNS||c.localName!=='r') return false;
  const k=Array.from(c.children);
  return k.some(x=>x.localName==='t') && k.every(x=>x.localName==='rPr'||x.localName==='t'||x.localName==='lastRenderedPageBreak');
}
function runText(r){ return Array.from(r.children).filter(x=>x.localName==='t').map(x=>x.textContent).join(''); }
function rPrOf(r){ return Array.from(r.children).find(x=>x.localName==='rPr')||null; }
/* Xử lý một "vùng chạy" (đoạn văn, hoặc nội dung hyperlink/ins/smartTag...): các w:r chỉ chứa chữ liền nhau được ghép
   thành "nhóm" (công thức bị tách qua nhiều run vẫn nhận ra); mọi phần tử khác (ảnh, OMML có sẵn, xuống dòng...) giữ nguyên tại chỗ. */
const W_WRAP=new Set(['hyperlink','ins','smartTag','sdtContent','fldSimple','customXml']);
function processRuns(mainDoc, container, allowDisplay){
  const kids=Array.from(container.childNodes);
  const groups=[]; let cur=null;
  for(const c of kids){
    if(c.nodeType!==1){ if(cur) cur.nodes.push(c); continue; }
    if(isPureTextRun(c)){ if(!cur){cur={nodes:[],runs:[]}; groups.push(cur);} cur.nodes.push(c); cur.runs.push(c); }
    else if(c.namespaceURI===WNS && W_TRANSP.has(c.localName) && cur){ cur.nodes.push(c); }
    else cur=null;
  }
  let eqCount=0;
  for(const g of groups){
    let full='', spans=[];
    for(const r of g.runs){ const t=runText(r); spans.push({r,s:full.length,e:full.length+t.length,rPr:rPrOf(r)}); full+=t; }
    const segs=scanSegments(full);
    if(!segs.some(s=>s.type==='eq')) continue;
    const ref=g.nodes[g.nodes.length-1].nextSibling;
    const others=kids.filter(c=>c.nodeType===1&&c.localName!=='pPr'&&g.nodes.indexOf(c)<0);
    const frag=[];
    const keepMarks=g.nodes.filter(n=>n.nodeType===1&&W_TRANSP.has(n.localName)&&n.localName!=='proofErr');
    const onlyDisplay = allowDisplay && groups.length===1 && others.length===0 &&
      segs.filter(s=>s.type==='eq').length===1 && segs.find(s=>s.type==='eq').display &&
      segs.every(s=>s.type==='eq'||s.content.trim()==='');
    let off=0;
    for(const s of segs){
      const a=off, b=off+s.raw.length; off=b;
      if(s.type==='text'){
        for(const sp of spans){
          const x=Math.max(a,sp.s), y=Math.min(b,sp.e); if(x>=y) continue;
          const piece=full.slice(x,y).replace(/\\\$/g,'$');
          if(piece) frag.push(makeTextRun(mainDoc,piece,sp.rPr));
        }
      } else {
        const om0=importOMath(mainDoc,s.content); eqCount++;
        if(onlyDisplay){ const para=mainDoc.createElementNS(MNS,'m:oMathPara'); para.appendChild(om0); frag.push(para); }
        else frag.push(om0);
      }
    }
    keepMarks.forEach(m=>frag.push(m));   // dấu bookmark giữ lại, đặt sau nội dung mới
    for(const n of g.nodes) if(n.parentNode===container) container.removeChild(n);
    for(const n of frag) container.insertBefore(n,ref);
  }
  for(const c of kids){
    if(c.nodeType===1 && c.namespaceURI===WNS && W_WRAP.has(c.localName) && c.parentNode===container) eqCount+=processRuns(mainDoc,c,false);
  }
  return eqCount;
}
function ownText(p){
  let t='';
  for(const x of Array.from(p.getElementsByTagNameNS(WNS,'t'))){
    let a=x.parentNode; while(a&&!(a.namespaceURI===WNS&&a.localName==='p')) a=a.parentNode;
    if(a===p) t+=x.textContent;
  }
  return t;
}
function processParagraph(mainDoc, p){
  const expected=scanSegments(ownText(p)).filter(s=>s.type==='eq').length;
  const eqCount=processRuns(mainDoc,p,true);
  if(expected>eqCount) EQ_LOG.skipped+=expected-eqCount;
  return {changed:eqCount>0, count:eqCount};
}
function countMathTypeObjects(doc){
  let n=0; const all=doc.getElementsByTagName('*');
  for(let k=0;k<all.length;k++){ const e=all[k]; if(e.localName==='OLEObject' && /Equation|MathType/i.test(e.getAttribute('ProgID')||'')) n++; }
  return n;
}
function convertDocumentXML(xmlString){
  const doc=new DOMParser().parseFromString(xmlString,'application/xml');
  if(doc.getElementsByTagName('parsererror').length>0){
    throw new Error('Không đọc được cấu trúc XML của file Word (file có thể bị lỗi).');
  }
  const root=doc.documentElement;
  root.setAttributeNS(XMLNS_NS,'xmlns:w',WNS);
  root.setAttributeNS(XMLNS_NS,'xmlns:m',MNS);
  const paragraphs=Array.from(doc.getElementsByTagNameNS(WNS,'p'));
  let totalEq=0, changedParas=0;
  for(const p of paragraphs){
    const res=processParagraph(doc,p);
    if(res.changed){ changedParas++; totalEq+=res.count; }
  }
  EQ_LOG.opaque+=countMathTypeObjects(doc);
  const serialized=new XMLSerializer().serializeToString(doc);
  return {xml:serialized, totalEq, changedParas, doc};
}
/* Báo cáo ngắn cho người dùng sau khi chuyển đổi */
function eqSummaryHTML(){
  const L=EQ_LOG, parts=[];
  if(!L.total && !L.skipped && !L.opaque) return '';
  const cut=s=>{ s=String(s).replace(/\s+/g,' '); return esc(s.length>70?s.slice(0,70)+'…':s); };
  if(L.degraded.length){
    parts.push('<b>⚠ '+L.degraded.length+' công thức không dựng được Equation</b> – đã giữ nguyên chữ LaTeX để file Word không bị lỗi:<ul>'+
      L.degraded.slice(0,5).map(d=>'<li><code>'+cut(d.latex)+'</code> – '+esc(d.why)+'</li>').join('')+(L.degraded.length>5?'<li>… và '+(L.degraded.length-5)+' công thức khác</li>':'')+'</ul>');
  }
  if(L.warned.length){
    parts.push('ℹ '+L.warned.length+' công thức đã chuyển được nhưng có phần được xử lý gần đúng:<ul>'+
      L.warned.slice(0,5).map(d=>'<li><code>'+cut(d.latex)+'</code> – '+esc(d.warn.join('; '))+'</li>').join('')+(L.warned.length>5?'<li>… và '+(L.warned.length-5)+' công thức khác</li>':'')+'</ul>');
  }
  if(L.skipped) parts.push('⚠ '+L.skipped+' công thức bị ngắt bởi ảnh/xuống dòng thủ công/trường đặc biệt của Word nên chưa chuyển được (giữ nguyên) – hãy gõ liền công thức trên một dòng.');
  if(L.opaque) parts.push('⚠ '+L.opaque+' công thức dạng MathType/đối tượng nhúng – không chuyển được, giữ nguyên trong file.');
  if(!parts.length) parts.push('✅ Tất cả '+L.total+' công thức đã chuyển thành Equation hợp lệ.');
  return parts.join('');
}


/* ---- Xem trước có giữ bảng (dựng lại từ DOM sau khi convert) ---- */
function omathToPreviewText(omathEl){
  const ts = omathEl.getElementsByTagNameNS(MNS,'t');
  return Array.from(ts).map(t=>t.textContent).join('');
}
function renderParaContent(p){
  let out='';
  for(const child of p.children){
    if(child.localName==='r'){
      const tEls = Array.from(child.children).filter(c=>c.localName==='t');
      for(const t of tEls) out += esc(t.textContent);
    } else if(child.localName==='hyperlink'){
      for(const r of Array.from(child.children).filter(c=>c.localName==='r')){
        for(const t of Array.from(r.children).filter(c=>c.localName==='t')) out += esc(t.textContent);
      }
    } else if(child.localName==='oMath'){
      out += '<span class="eqinline">'+esc(omathToPreviewText(child))+'</span>';
    } else if(child.localName==='oMathPara'){
      const om = Array.from(child.children).find(c=>c.localName==='oMath');
      if(om) out += '<span class="eqdisplay">'+esc(omathToPreviewText(om))+'</span>';
    }
  }
  return out;
}
function renderTable(tbl){
  const rows = Array.from(tbl.children).filter(c=>c.localName==='tr');
  let html='<table>';
  for(const tr of rows){
    html+='<tr>';
    const cells = Array.from(tr.children).filter(c=>c.localName==='tc');
    for(const tc of cells){
      const paras = Array.from(tc.children).filter(c=>c.localName==='p');
      html+='<td>'+paras.map(p=>renderParaContent(p)||'&nbsp;').join('<br>')+'</td>';
    }
    html+='</tr>';
  }
  html+='</table>';
  return html;
}
function previewFromDoc(doc){
  const body=doc.getElementsByTagNameNS(WNS,'body')[0];
  if(!body) return '<p>(Không đọc được nội dung)</p>';
  let html='';
  for(const child of Array.from(body.children)){
    if(child.localName==='p') html+='<p>'+(renderParaContent(child)||'&nbsp;')+'</p>';
    else if(child.localName==='tbl') html+=renderTable(child);
  }
  return html || '<p>(Tài liệu trống)</p>';
}

/* ======================= Chế độ dán văn bản thuần (không có bảng) - fallback ======================= */
function buildDocumentXMLFromPlainText(fullText){
  const segs=scanSegments(fullText);
  let body=''; let curRuns='';
  const flushPara=()=>{ body+='<w:p>'+curRuns+'</w:p>'; curRuns=''; };
  for(const seg of segs){
    if(seg.type==='text'){
      const parts=seg.content.split(/\r\n|\r|\n/);
      for(let k=0;k<parts.length;k++){
        if(parts[k].length>0) curRuns+='<w:r><w:t xml:space="preserve">'+xesc(parts[k])+'</w:t></w:r>';
        if(k<parts.length-1) flushPara();
      }
    } else {
      if(seg.display){
        if(curRuns.trim()!=='') flushPara();
        body+='<w:p><m:oMathPara>'+buildOMath(seg.content)+'</m:oMathPara></w:p>';
      } else {
        curRuns+=latexToOMML(seg.content);
      }
    }
  }
  flushPara();
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="'+WNS+'" xmlns:m="'+MNS+'"><w:body>'+body+'<w:sectPr/></w:body></w:document>';
}
