/* nen-file.js — Công cụ "Nén file online" (nén nhiều file / thư mục thành ZIP ngay trên trình duyệt)
 * Gắn vào tab "Công cụ thường dùng" (#t8, ô chọn #utSel), nằm giữa "Lưu file tạm" và "Giải nén online".
 * Dùng JSZip (index.html đã nạp sẵn từ cdnjs; nếu thiếu sẽ tự nạp dự phòng).
 * File không rời khỏi máy người dùng. */
(function () {
  'use strict';
  if (window.NenFileOnline) return;

  var VALUE = 'utNen';
  var LABEL = '🗜️ Nén file online';
  var items = [];          // {file, path, size}
  var keys = {};           // chống thêm trùng
  var paths = {};          // chống trùng tên trong ZIP
  var busy = false;
  var outBlob = null, outUrl = null, outName = '';
  var els = {};
  var built = false;

  /* ---------- tiện ích ---------- */
  function fmt(n) {
    if (!isFinite(n) || n < 0) n = 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''); }

  var ALREADY = /\.(zip|rar|7z|gz|tgz|bz2|xz|zst|jpg|jpeg|png|gif|webp|heic|heif|avif|mp3|aac|m4a|ogg|opus|flac|mp4|m4v|mov|mkv|avi|webm|wmv|3gp|pdf|docx|xlsx|pptx|odt|ods|odp|epub|apk|jar|woff|woff2)$/i;

  function cleanPath(p) {
    p = String(p || '').replace(/\\/g, '/').replace(/[\u0000-\u001f]/g, '');
    var parts = p.split('/'), out = [];
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i].replace(/^\s+|\s+$/g, '');
      if (!s || s === '.' || s === '..') continue;
      out.push(s);
    }
    return out.join('/');
  }
  function uniquePath(p) {
    var low = p.toLowerCase();
    if (!paths[low]) { paths[low] = 1; return p; }
    var slash = p.lastIndexOf('/');
    var dir = slash >= 0 ? p.slice(0, slash + 1) : '';
    var name = slash >= 0 ? p.slice(slash + 1) : p;
    var dot = name.lastIndexOf('.');
    var base = dot > 0 ? name.slice(0, dot) : name;
    var ext = dot > 0 ? name.slice(dot) : '';
    for (var n = 2; n < 100000; n++) {
      var np = dir + base + ' (' + n + ')' + ext;
      if (!paths[np.toLowerCase()]) { paths[np.toLowerCase()] = 1; return np; }
    }
    return p;
  }
  function safeZipName(v) {
    v = String(v || '').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '').replace(/^\s+|\s+$/g, '').replace(/\.+$/, '');
    if (!v) v = 'nen-file';
    if (!/\.zip$/i.test(v)) v += '.zip';
    return v;
  }

  /* ---------- JSZip ---------- */
  var jszipPromise = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('load fail')); };
      document.head.appendChild(s);
    });
  }
  function ensureJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (jszipPromise) return jszipPromise;
    jszipPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
      .catch(function () { return loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'); })
      .then(function () {
        if (!window.JSZip) throw new Error('no jszip');
        return window.JSZip;
      })
      .catch(function (e) { jszipPromise = null; throw e; });
    return jszipPromise;
  }

  /* ---------- giao diện ---------- */
  function injectCss() {
    if (document.getElementById('nf-css')) return;
    var st = document.createElement('style');
    st.id = 'nf-css';
    st.textContent =
      '#utNen .nf-drop{border:2px dashed var(--bd,rgba(120,150,210,.6));border-radius:14px;padding:18px 12px;text-align:center;cursor:pointer;background:rgba(120,150,210,.08);transition:background .15s,border-color .15s}' +
      '#utNen .nf-drop.nf-over{background:rgba(37,99,235,.18);border-color:#2563eb}' +
      '#utNen .nf-drop .nf-ic{font-size:34px;line-height:1.1}' +
      '#utNen .nf-drop .nf-t{font-weight:700;margin-top:4px}' +
      '#utNen .nf-drop .nf-s{font-size:13px;opacity:.75;margin-top:2px}' +
      '#utNen .nf-list{margin:10px 0;max-height:260px;overflow:auto;border:1px solid var(--bd,rgba(120,150,210,.45));border-radius:12px;display:none}' +
      '#utNen .nf-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--bd,rgba(120,150,210,.25));font-size:14px}' +
      '#utNen .nf-row:last-child{border-bottom:0}' +
      '#utNen .nf-nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#utNen .nf-sz{flex:0 0 auto;font-size:12px;opacity:.75}' +
      '#utNen .nf-x{flex:0 0 auto;border:0;background:rgba(220,38,38,.15);color:#dc2626;border-radius:8px;width:30px;height:30px;padding:0;font-size:15px;line-height:30px;cursor:pointer;box-shadow:none}' +
      '#utNen .nf-more{padding:8px 10px;font-size:13px;opacity:.75;text-align:center}' +
      '#utNen .nf-sum{font-size:14px;font-weight:600;margin:6px 0}' +
      '#utNen .nf-opt{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0}' +
      '#utNen .nf-opt label{display:flex;align-items:center;gap:6px;font-size:14px}' +
      '#utNen .nf-opt input[type=text]{min-width:0;width:170px}' +
      '#utNen .nf-pg{height:12px;border-radius:99px;background:rgba(128,128,128,.28);overflow:hidden;margin:10px 0 4px;display:none}' +
      '#utNen .nf-pg>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2563eb,#7c3aed);transition:width .15s}' +
      '#utNen .nf-st{font-size:14px;margin:6px 0;padding:8px 10px;border-radius:10px;display:none;background:rgba(37,99,235,.14)}' +
      '#utNen .nf-st.nf-ok{background:rgba(22,163,74,.18)}' +
      '#utNen .nf-st.nf-er{background:rgba(220,38,38,.18)}' +
      '#utNen .nf-st.nf-wa{background:rgba(234,179,8,.22)}' +
      '#utNen .nf-note{font-size:12.5px;opacity:.75;text-align:center;margin-top:8px}' +
      '#utNen button[disabled]{opacity:.5;cursor:not-allowed}';
    document.head.appendChild(st);
  }

  function build() {
    if (built) return true;
    var host = document.getElementById('t8');
    if (!host) return false;
    injectCss();
    var root = document.getElementById(VALUE);
    if (!root) {
      root = el('div', 'ut');
      root.id = VALUE;
      var after = document.getElementById('utFile');
      if (after && after.parentNode === host) host.insertBefore(root, after.nextSibling);
      else host.appendChild(root);
    }
    root.textContent = '';

    var h = el('h3', null, '🗜️ Nén file online (ZIP)');
    h.style.margin = '4px 0 8px';
    root.appendChild(h);

    var fin = document.createElement('input');
    fin.type = 'file'; fin.multiple = true; fin.style.display = 'none';
    var din = document.createElement('input');
    din.type = 'file'; din.multiple = true; din.style.display = 'none';
    din.setAttribute('webkitdirectory', ''); din.setAttribute('directory', '');
    root.appendChild(fin); root.appendChild(din);

    var drop = el('div', 'nf-drop');
    drop.setAttribute('role', 'button'); drop.tabIndex = 0;
    drop.appendChild(el('div', 'nf-ic', '📦'));
    drop.appendChild(el('div', 'nf-t', 'Chạm để chọn file (hoặc kéo thả vào đây)'));
    drop.appendChild(el('div', 'nf-s', 'Chọn được nhiều file cùng lúc, kể cả cả thư mục'));
    root.appendChild(drop);

    var bar1 = el('div', 'bar');
    bar1.style.marginTop = '10px';
    var bFile = el('button', 'sm', '📄 Chọn file'); bFile.type = 'button';
    var bDir = el('button', 'ghost sm', '📁 Chọn thư mục'); bDir.type = 'button';
    var bClr = el('button', 'sec sm', '🗑 Xóa hết'); bClr.type = 'button';
    bar1.appendChild(bFile); bar1.appendChild(bDir); bar1.appendChild(bClr);
    root.appendChild(bar1);

    var sum = el('div', 'nf-sum', 'Chưa có file nào.');
    root.appendChild(sum);
    var list = el('div', 'nf-list');
    root.appendChild(list);

    var opt = el('div', 'nf-opt');
    var l1 = el('label', null, 'Tên file ZIP ');
    var inName = document.createElement('input');
    inName.type = 'text'; inName.value = 'nen-file'; inName.autocomplete = 'off';
    inName.autocapitalize = 'off'; inName.spellcheck = false;
    l1.appendChild(inName);
    var l2 = el('label', null, 'Mức nén ');
    var selLv = document.createElement('select');
    [['auto', 'Tự động (khuyên dùng)'], ['max', 'Nén tối đa (chậm hơn)'], ['fast', 'Nén nhanh'], ['store', 'Chỉ đóng gói (không nén)']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; selLv.appendChild(op);
    });
    l2.appendChild(selLv);
    opt.appendChild(l1); opt.appendChild(l2);
    root.appendChild(opt);

    var bar2 = el('div', 'bar');
    var bGo = el('button', null, '🗜️ Nén thành ZIP'); bGo.type = 'button'; bGo.disabled = true;
    bar2.appendChild(bGo);
    root.appendChild(bar2);

    var pg = el('div', 'nf-pg'); var pgi = document.createElement('i'); pg.appendChild(pgi);
    root.appendChild(pg);
    var st = el('div', 'nf-st');
    root.appendChild(st);

    var bar3 = el('div', 'bar');
    bar3.style.justifyContent = 'center';
    var bDl = el('button', null, '⬇ Tải file ZIP'); bDl.type = 'button'; bDl.style.display = 'none';
    bar3.appendChild(bDl);
    root.appendChild(bar3);

    root.appendChild(el('div', 'nf-note', 'File được nén ngay trên máy của bạn, không tải lên mạng. Với file ảnh, video, PDF, Word, Excel (vốn đã nén sẵn) chế độ Tự động chỉ đóng gói để nhanh hơn.'));

    els = { root: root, fin: fin, din: din, drop: drop, bFile: bFile, bDir: bDir, bClr: bClr, sum: sum, list: list,
      inName: inName, selLv: selLv, bGo: bGo, pg: pg, pgi: pgi, st: st, bDl: bDl };

    /* sự kiện */
    function pick(input) { try { input.value = ''; } catch (e) {} input.click(); }
    drop.addEventListener('click', function () { if (!busy) pick(fin); });
    drop.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); pick(fin); } });
    bFile.addEventListener('click', function () { if (!busy) pick(fin); });
    bDir.addEventListener('click', function () { if (!busy) pick(din); });
    bClr.addEventListener('click', function () { if (!busy) clearAll(); });
    fin.addEventListener('change', function () { addFileList(fin.files); try { fin.value = ''; } catch (e) {} });
    din.addEventListener('change', function () { addFileList(din.files); try { din.value = ''; } catch (e) {} });
    bGo.addEventListener('click', compress);
    bDl.addEventListener('click', download);
    list.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== list && !(t.getAttribute && t.getAttribute('data-i') != null)) t = t.parentNode;
      if (!t || t === list || busy) return;
      removeAt(parseInt(t.getAttribute('data-i'), 10));
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); if (!busy) drop.classList.add('nf-over'); });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      drop.addEventListener(ev, function () { drop.classList.remove('nf-over'); });
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('nf-over');
      if (busy) return;
      handleDrop(e.dataTransfer);
    });

    built = true;
    render();
    return true;
  }

  /* ---------- trạng thái / danh sách ---------- */
  function setStatus(msg, type) {
    var s = els.st;
    if (!s) return;
    if (!msg) { s.style.display = 'none'; s.textContent = ''; return; }
    s.className = 'nf-st' + (type ? ' nf-' + type : '');
    s.textContent = msg;
    s.style.display = 'block';
  }
  function resetResult() {
    if (outUrl) { try { URL.revokeObjectURL(outUrl); } catch (e) {} }
    outUrl = null; outBlob = null; outName = '';
    if (els.bDl) { els.bDl.style.display = 'none'; }
  }
  function totalSize() {
    var t = 0; for (var i = 0; i < items.length; i++) t += items[i].size; return t;
  }
  function render() {
    if (!built) return;
    var n = items.length;
    els.bGo.disabled = busy || n === 0;
    els.sum.textContent = n ? ('Đã chọn ' + n + ' file • tổng ' + fmt(totalSize())) : 'Chưa có file nào.';
    els.list.textContent = '';
    if (!n) { els.list.style.display = 'none'; return; }
    els.list.style.display = 'block';
    var MAX = 200, show = Math.min(n, MAX);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < show; i++) {
      var r = el('div', 'nf-row');
      r.appendChild(el('span', null, /\//.test(items[i].path) ? '📁' : '📄'));
      var nm = el('span', 'nf-nm', items[i].path); nm.title = items[i].path;
      r.appendChild(nm);
      r.appendChild(el('span', 'nf-sz', fmt(items[i].size)));
      var x = el('button', 'nf-x', '✕'); x.type = 'button'; x.setAttribute('data-i', String(i));
      x.setAttribute('aria-label', 'Bỏ file này');
      r.appendChild(x);
      frag.appendChild(r);
    }
    if (n > MAX) frag.appendChild(el('div', 'nf-more', '… và ' + (n - MAX) + ' file khác (vẫn được nén)'));
    els.list.appendChild(frag);
  }
  function removeAt(i) {
    if (isNaN(i) || i < 0 || i >= items.length) return;
    var it = items.splice(i, 1)[0];
    delete keys[it.key]; delete paths[it.path.toLowerCase()];
    resetResult(); setStatus('');
    render();
  }
  function clearAll() {
    items = []; keys = {}; paths = {};
    resetResult(); setStatus('');
    if (els.pg) { els.pg.style.display = 'none'; els.pgi.style.width = '0'; }
    render();
  }

  function addOne(file, path) {
    if (!file) return false;
    var p = cleanPath(path || file.name);
    if (!p) p = 'file';
    var key = p + '|' + file.size + '|' + (file.lastModified || 0);
    if (keys[key]) return false;
    var up = uniquePath(p);
    keys[key] = 1;
    items.push({ file: file, path: up, size: file.size || 0, key: key });
    return true;
  }
  function addFileList(fl) {
    if (!fl || !fl.length || busy) return;
    var arr = Array.prototype.slice.call(fl), added = 0, i;
    for (i = 0; i < arr.length; i++) {
      if (addOne(arr[i], arr[i].webkitRelativePath || arr[i].name)) added++;
    }
    afterAdd(added, arr.length);
  }
  function afterAdd(added, total) {
    resetResult();
    render();
    if (total && !added) setStatus('Các file này đã có trong danh sách.', 'wa');
    else if (added < total) setStatus('Đã thêm ' + added + ' file (bỏ qua ' + (total - added) + ' file trùng).', 'wa');
    else setStatus('');
  }

  /* kéo thả (hỗ trợ cả thư mục) */
  function readAllEntries(reader) {
    return new Promise(function (res) {
      var all = [];
      (function next() {
        reader.readEntries(function (b) {
          if (!b.length) return res(all);
          all = all.concat(Array.prototype.slice.call(b));
          next();
        }, function () { res(all); });
      })();
    });
  }
  function walk(entry, base, out) {
    if (entry.isFile) {
      return new Promise(function (res) {
        entry.file(function (f) { out.push({ file: f, path: base + f.name }); res(); }, function () { res(); });
      });
    }
    if (entry.isDirectory) {
      return readAllEntries(entry.createReader()).then(function (list) {
        var sub = base + entry.name + '/';
        return Promise.all(list.map(function (e) { return walk(e, sub, out); }));
      });
    }
    return Promise.resolve();
  }
  function handleDrop(dt) {
    if (!dt) return;
    var entries = [], files = Array.prototype.slice.call(dt.files || []);
    try {
      var its = dt.items;
      if (its && its.length) {
        for (var i = 0; i < its.length; i++) {
          if (its[i].kind === 'file' && its[i].webkitGetAsEntry) {
            var en = its[i].webkitGetAsEntry();
            if (en) entries.push(en);
          }
        }
      }
    } catch (e) { entries = []; }
    if (!entries.length) { addFileList(files); return; }
    setStatus('Đang đọc danh sách file…', '');
    var out = [];
    Promise.all(entries.map(function (e) { return walk(e, '', out); })).then(function () {
      var added = 0;
      for (var i = 0; i < out.length; i++) if (addOne(out[i].file, out[i].path)) added++;
      afterAdd(added, out.length);
    }).catch(function () {
      addFileList(files);
    });
  }

  /* ---------- nén ---------- */
  function setBusy(b) {
    busy = b;
    if (!built) return;
    els.bGo.disabled = b || !items.length;
    els.bFile.disabled = b; els.bDir.disabled = b; els.bClr.disabled = b;
    els.inName.disabled = b; els.selLv.disabled = b;
    els.drop.style.opacity = b ? '.6' : '';
  }
  function compress() {
    if (busy || !items.length) return;
    var total = totalSize();
    var limit = isMobile() ? 600 * 1048576 : 1500 * 1048576;
    if (total > limit) {
      var ok = true;
      try {
        ok = window.confirm('Tổng dung lượng ' + fmt(total) + ' khá lớn, có thể làm trình duyệt chậm hoặc bị treo do thiếu bộ nhớ. Vẫn tiếp tục nén?');
      } catch (e) { ok = true; }
      if (!ok) return;
    }
    resetResult();
    setBusy(true);
    els.pg.style.display = 'block'; els.pgi.style.width = '0';
    setStatus('Đang chuẩn bị…', '');
    var lv = els.selLv.value;
    var name = safeZipName(els.inName.value);
    var snapshot = items.slice();
    var t0 = Date.now();

    ensureJSZip().then(function (JSZip) {
      var zip = new JSZip();
      var level = lv === 'max' ? 9 : (lv === 'fast' ? 1 : 6);
      for (var i = 0; i < snapshot.length; i++) {
        var it = snapshot[i];
        var store = lv === 'store' || (lv === 'auto' && ALREADY.test(it.path));
        var d = it.file.lastModified ? new Date(it.file.lastModified) : new Date();
        if (isNaN(d.getTime())) d = new Date();
        zip.file(it.path, it.file, {
          binary: true,
          date: d,
          createFolders: true,
          compression: store ? 'STORE' : 'DEFLATE',
          compressionOptions: store ? null : { level: level }
        });
      }
      setStatus('Đang nén… 0%', '');
      return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/zip',
        compression: 'DEFLATE',
        compressionOptions: { level: level },
        streamFiles: true,
        platform: 'DOS'
      }, function (m) {
        var p = Math.max(0, Math.min(100, m.percent || 0));
        els.pgi.style.width = p.toFixed(1) + '%';
        setStatus('Đang nén… ' + Math.floor(p) + '%' + (m.currentFile ? ' — ' + m.currentFile : ''), '');
      });
    }).then(function (blob) {
      outBlob = blob; outName = name;
      outUrl = URL.createObjectURL(blob);
      els.pgi.style.width = '100%';
      var secs = ((Date.now() - t0) / 1000).toFixed(1);
      var saved = total > 0 ? Math.max(0, (1 - blob.size / total) * 100) : 0;
      setStatus('✅ Xong! ' + snapshot.length + ' file: ' + fmt(total) + ' → ' + fmt(blob.size) +
        (total > 0 ? ' (giảm ' + saved.toFixed(0) + '%)' : '') + ' • ' + secs + ' giây. Bấm "Tải file ZIP" bên dưới.', 'ok');
      els.bDl.style.display = ''; els.bDl.textContent = '⬇ Tải ' + name;
      setBusy(false);
      render();
    }).catch(function (err) {
      resetResult();
      els.pg.style.display = 'none';
      var msg = 'Không nén được. ';
      if (err && /jszip|load fail/i.test(String(err.message))) msg += 'Chưa nạp được thư viện nén (kiểm tra mạng rồi tải lại trang).';
      else if (err && /memory|quota|allocation|array buffer/i.test(String(err.message || err))) msg += 'Thiếu bộ nhớ, hãy chia nhỏ số file rồi nén từng phần.';
      else msg += 'Có thể một file bị đổi hoặc bị xóa sau khi chọn; hãy chọn lại file rồi thử lại.';
      setStatus('⚠️ ' + msg, 'er');
      setBusy(false);
      render();
    });
  }

  function download() {
    if (!outBlob || !outUrl) return;
    try {
      var a = document.createElement('a');
      a.href = outUrl; a.download = outName || 'nen-file.zip';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
    } catch (e) {
      window.open(outUrl, '_blank');
    }
  }
  /* ---------- gắn vào ô chọn công cụ ---------- */
  function ensureOption() {
    var sel = document.getElementById('utSel');
    if (!sel) return false;
    var opt = null, fileOpt = null, i;
    for (i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === VALUE) opt = sel.options[i];
      if (sel.options[i].value === 'utFile') fileOpt = sel.options[i];
    }
    if (!opt) {
      opt = document.createElement('option');
      opt.value = VALUE; opt.textContent = LABEL;
    }
    if (fileOpt) {
      if (fileOpt.nextElementSibling !== opt) sel.insertBefore(opt, fileOpt.nextSibling);
    } else if (!opt.parentNode) {
      sel.appendChild(opt);
    }
    return true;
  }

  function init() {
    var sel = document.getElementById('utSel');
    if (!sel || !document.getElementById('t8')) return false;
    build();
    ensureOption();
    if (!sel.__nfBound) {
      sel.__nfBound = true;
      sel.addEventListener('change', function () {
        if (sel.value === VALUE) {
          if (!built) build();
          var r = document.getElementById(VALUE);
          if (r) {
            /* phòng khi script khác chưa bật panel */
            var all = document.querySelectorAll('.ut');
            for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === r);
          }
        }
      });
      try {
        /* nếu module khác chèn thêm option sau này, giữ đúng thứ tự: Lưu file tạm → Nén file online → Giải nén online */
        new MutationObserver(function () { ensureOption(); }).observe(sel, { childList: true });
      } catch (e) {}
    }
    return true;
  }

  window.NenFileOnline = {
    open: function () {
      var sel = document.getElementById('utSel');
      if (!sel) return;
      ensureOption();
      sel.value = VALUE;
      sel.dispatchEvent(new Event('change'));
    }
  };

  if (!init()) {
    document.addEventListener('DOMContentLoaded', init);
  }
  window.addEventListener('load', function () { init(); setTimeout(ensureOption, 300); setTimeout(ensureOption, 1500); });
})();
