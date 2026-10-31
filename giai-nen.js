/* giai-nen.js — Công cụ "Giải nén online" cho tab "Công cụ thường dùng".
   Tự chèn mục vào ô chọn #utSel và tạo khung #utGiaiNen, chỉ cần nạp file này sau jszip.
   ZIP (zip, cbz, jar, apk, docx, xlsx, pptx): chạy ngay bằng JSZip có sẵn trong index.html.
   ZIP có mật khẩu: tự nạp zip.js từ CDN khi cần. RAR/7z có mật khẩu: dùng usePassword của libarchive.
   RAR / 7z / TAR / GZ: cần thư mục libarchive/ (xem README ngắn ở cuối file). */
(function () {
  'use strict';
  var LA_DIR = 'libarchive/';            // thư mục chứa dist của libarchive.js (cùng tên miền với trang)
  var IMG = /\.(png|jpe?g|gif|webp|svg|bmp)$/i, TXT = /\.(txt|md|csv|json|js|css|html?|xml|log|py|ini|ya?ml)$/i;
  var LA = null, urls = [];

  function $(t, a, x) { var e = document.createElement(t); if (a) for (var k in a) { if (k === 'cls') e.className = a[k]; else e.setAttribute(k, a[k]); } if (x != null) e.textContent = x; return e; }
  function fmt(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function url(b) { var u = URL.createObjectURL(b); urls.push(u); return u; }
  function dl(blob, name) {
    var a = $('a'); a.href = url(blob); a.download = name.split('/').pop() || 'file';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Nhận dạng định dạng bằng chữ ký file ---------- */
  function sniff(file) {
    return file.slice(0, 8).arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      if (b[0] === 0x50 && b[1] === 0x4B) return 'zip';
      if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar';
      return 'other';                     // rar, 7z, tar, gz… giao cho libarchive
    });
  }

  /* ---------- Giải nén ---------- */
  function loadLA() {
    if (LA) return Promise.resolve(LA);
    return import(LA_DIR + 'libarchive.js').then(function (m) {
      m.Archive.init({ workerUrl: LA_DIR + 'worker-bundle.js' });
      LA = m.Archive; return LA;
    });
  }
  function walk(o, p, out) {
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v instanceof Blob) out.push({ path: p + k, blob: v }); else walk(v, p + k + '/', out);
    });
  }
  var ZIPJS = 'https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.34/dist/zip.min.js';
  function loadScript(src) { return new Promise(function (ok, no) { var t = document.createElement('script'); t.src = src; t.onload = ok; t.onerror = no; document.head.appendChild(t); }); }
  function pwErr() { var e = new Error('PW'); e.pw = true; return e; }
  /* ZIP có mật khẩu (ZipCrypto / AES) bằng zip.js */
  function zipJs(file, pw) {
    return (window.zip ? Promise.resolve() : loadScript(ZIPJS)).then(function () {
      var rd = new zip.ZipReader(new zip.BlobReader(file)), out = [];
      return rd.getEntries().then(function (es) {
        return es.filter(function (e) { return !e.directory; }).reduce(function (p, e) {
          return p.then(function () {
            return e.getData(new zip.BlobWriter(), pw ? { password: pw } : {}).then(function (b) { out.push({ path: e.filename, blob: b }); });
          });
        }, Promise.resolve());
      }).then(function () { rd.close(); return out; }, function (er) {
        rd.close(); throw /password|encrypt/i.test(er && er.message) ? pwErr() : er;
      });
    });
  }
  /* RAR: node-unrar-js (WebAssembly) nạp từ CDN, không cần thư mục trong repo */
  var UNRAR = 'https://cdn.jsdelivr.net/npm/node-unrar-js@2.0.2/';
  var unrarMod = null;
  function rarJs(file, pw) {
    var p = unrarMod ? Promise.resolve(unrarMod) : Promise.all([
      import(UNRAR + '+esm'),
      fetch(UNRAR + 'esm/js/unrar.wasm').then(function (r) { if (!r.ok) throw new Error('wasm'); return r.arrayBuffer(); })
    ]).then(function (a) { unrarMod = { mod: a[0], wasm: a[1] }; return unrarMod; });
    var bad = function (er) { return /password/i.test(String(er && (er.reason || er.message))); };
    return p.then(function (u) {
      return file.arrayBuffer().then(function (buf) {
        return u.mod.createExtractorFromData({ wasmBinary: u.wasm, data: new Uint8Array(buf), password: pw || undefined });
      });
    }).then(function (ex) {
      var names = [], hs = ex.getFileList().fileHeaders;
      for (var h of hs) if (!h.flags.directory) names.push(h.name);
      var out = [];
      for (var f of ex.extract({ files: names }).files) {
        if (f.extraction && f.extraction.data) out.push({ path: f.fileHeader.name, blob: new Blob([f.extraction.data]) });
      }
      return out;
    }).catch(function (er) { throw bad(er) ? pwErr() : er; });
  }
  function extract(file, pw) {
    return sniff(file).then(function (kind) {
      var out = [];
      if (kind === 'zip') {
        if (pw) return zipJs(file, pw);
        return JSZip.loadAsync(file).then(function (z) {
          var ps = [];
          z.forEach(function (path, e) {
            if (!e.dir) ps.push(e.async('blob').then(function (b) { out.push({ path: path, blob: b }); }));
          });
          return Promise.all(ps).then(function () { return out; });
        }).catch(function (er) { throw /ncrypt/i.test(er && er.message) ? pwErr() : er; });
      }
      var viaLA = function () { return laExtract(file, pw, out); };
      if (kind === 'rar') return rarJs(file, pw).catch(function (er) { if (er && er.pw) throw er; console.warn('unrar lỗi, thử libarchive', er); return viaLA(); });
      return viaLA();
    });
  }
  function laExtract(file, pw, out) {
    {
      return loadLA().then(function (A) { return A.open(file); }).then(function (ar) {
        return ar.hasEncryptedData().then(function (enc) {
          if (enc) { if (!pw) throw pwErr(); return ar.usePassword(pw); }
        }).then(function () {
          return ar.extractFiles().catch(function (er) { throw pw ? pwErr() : er; });
        });
      }).then(function (tree) { walk(tree, '', out); return out; });
    }
  }

  /* ---------- Giao diện ---------- */
  function build(root) {
    root.innerHTML = '';
    var st = $('style'); st.textContent =
      '.gn-drop{display:block;border:2px dashed var(--cy,#ffd166);border-radius:14px;padding:26px 12px;text-align:center;cursor:pointer;background:var(--card2,rgba(0,0,0,.2))}' +
      '.gn-drop.over{filter:brightness(1.25)}.gn-drop b{display:block;font-size:17px}.gn-drop span{font-size:13px;opacity:.8}' +
      '#utGiaiNen{display:none}#utGiaiNen.on{display:block}' +
      '.gn-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.gn-bx{width:min(380px,100%);background:var(--card2,#0a2c37);color:var(--fg,#fff);border:1px solid var(--bd,#2f8593);border-radius:14px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.5)}' +
      '.gn-arc{margin-top:14px;border:1px solid var(--bd,#2f8593);border-radius:12px;overflow:hidden}' +
      '.gn-h{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--card2,rgba(0,0,0,.2))}' +
      '.gn-h strong{word-break:break-all}' +
      '.gn-r{display:flex;gap:8px;align-items:center;padding:7px 12px;border-top:1px solid var(--bd,#2f8593)}' +
      '.gn-n{flex:1;min-width:0;word-break:break-all;background:none;border:0;box-shadow:none;padding:0;text-align:left;color:inherit;font:inherit;cursor:default}' +
      '.gn-n.can{color:var(--cy,#ffd166);text-decoration:underline;cursor:pointer}' +
      '.gn-s{font-size:12px;opacity:.75;white-space:nowrap}' +
      '#gnView{display:none;margin-top:14px;padding:12px;border:1px solid var(--bd,#2f8593);border-radius:12px}' +
      '#gnView img{max-width:100%;height:auto;display:block;margin-top:8px;border-radius:8px}' +
      '#gnView pre{white-space:pre-wrap;word-break:break-word;max-height:340px;overflow:auto;margin:8px 0 0;font-size:13px}';
    root.appendChild(st);
    root.appendChild($('h3', { style: 'margin:4px 0 8px' }, '📦 Giải nén online'));

    var lab = $('label', { cls: 'gn-drop' });
    var inp = $('input', { type: 'file', multiple: '', style: 'display:none', accept: '.zip,.rar,.7z,.tar,.gz,.tgz,.cbz,.cbr,.jar,.apk,.docx,.xlsx,.pptx' });
    lab.appendChild($('b', null, 'Chạm để chọn file nén (zip, rar, 7z…)'));
    lab.appendChild($('span', null, 'hoặc kéo thả vào đây · chọn được nhiều file · giải nén ngay trên máy, không tải lên mạng'));
    lab.appendChild(inp); root.appendChild(lab);

    var stat = $('div', { cls: 'status info', role: 'status' }, 'Chưa có file nào.');
    var out = $('div'), view = $('div', { id: 'gnView' });
    root.appendChild(stat); root.appendChild(out); root.appendChild(view);

    function say(t, err) { stat.textContent = t; stat.className = 'status ' + (err ? 'err' : 'info'); }

    function preview(it) {
      view.style.display = 'block'; view.textContent = '';
      view.appendChild($('strong', null, it.path));
      if (IMG.test(it.path)) view.appendChild($('img', { src: url(it.blob), alt: it.path }));
      else { var p = $('pre'); view.appendChild(p); it.blob.text().then(function (t) { p.textContent = t.slice(0, 60000); }); }
      view.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function render(name, list) {
      var box = $('section', { cls: 'gn-arc' }), h = $('div', { cls: 'gn-h' });
      h.appendChild($('strong', null, name + ' (' + list.length + ' file)'));
      var all = $('button', { type: 'button', cls: 'sm' }, '⬇ Tải tất cả (.zip)');
      all.onclick = function () {
        var z = new JSZip(); list.forEach(function (i) { z.file(i.path, i.blob); });
        z.generateAsync({ type: 'blob' }).then(function (b) { dl(b, name.replace(/\.[^.]+$/, '') + '-giainen.zip'); });
      };
      h.appendChild(all); box.appendChild(h);
      list.sort(function (a, b) { return a.path.localeCompare(b.path, 'vi'); }).forEach(function (it) {
        var r = $('div', { cls: 'gn-r' }), n = $('button', { type: 'button', cls: 'gn-n' }, it.path);
        if (IMG.test(it.path) || TXT.test(it.path)) { n.className += ' can'; n.onclick = function () { preview(it); }; }
        var b = $('button', { type: 'button', cls: 'sm ghost' }, 'Tải');
        b.onclick = function () { dl(it.blob, it.path); };
        r.appendChild(n); r.appendChild($('span', { cls: 'gn-s' }, fmt(it.blob.size))); r.appendChild(b); box.appendChild(r);
      });
      out.insertBefore(box, out.firstChild);
    }

    function askPw(f, wrong) {
      return new Promise(function (done) {
        var ov = $('div', { cls: 'gn-ov', role: 'dialog', 'aria-modal': 'true' }), bx = $('div', { cls: 'gn-bx' });
        bx.appendChild($('h3', { style: 'margin:0 0 6px' }, '🔒 File có mật khẩu'));
        bx.appendChild($('div', { style: 'word-break:break-all;font-weight:600' }, f.name));
        bx.appendChild($('div', { cls: 'note', style: 'margin:6px 0;' + (wrong ? 'color:#ff907a' : '') }, wrong ? 'Mật khẩu chưa đúng, hãy nhập lại.' : 'Nhập mật khẩu để tiếp tục giải nén.'));
        var pw = $('input', { type: 'password', autocomplete: 'off', placeholder: 'Mật khẩu', style: 'width:100%' });
        var sh = $('label', { cls: 'note', style: 'display:block;margin:6px 0' }), ck = $('input', { type: 'checkbox' });
        ck.onchange = function () { pw.type = ck.checked ? 'text' : 'password'; };
        sh.appendChild(ck); sh.appendChild(document.createTextNode(' Hiện mật khẩu'));
        var bar = $('div', { cls: 'bar', style: 'justify-content:flex-end;margin-top:8px' });
        var go = $('button', { type: 'button' }, '🔓 Giải nén'), no = $('button', { type: 'button', cls: 'sec' }, 'Bỏ qua file này');
        function close(v) { document.removeEventListener('keydown', key, true); ov.remove(); done(v); }
        function key(ev) { if (ev.key === 'Escape') close(null); }
        function submit() { if (!pw.value) { pw.focus(); return; } close(pw.value); }
        go.onclick = submit; no.onclick = function () { close(null); };
        pw.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
        document.addEventListener('keydown', key, true);
        bar.appendChild(no); bar.appendChild(go);
        bx.appendChild(pw); bx.appendChild(sh); bx.appendChild(bar); ov.appendChild(bx);
        document.body.appendChild(ov); pw.focus();
      });
    }
    function run(f, pw) {
      say('Đang giải nén ' + f.name + '…');
      return extract(f, pw).then(function (list) {
        if (!list.length) throw new Error('empty');
        render(f.name, list); say('Xong ' + f.name + ': ' + list.length + ' file.');
      }).catch(function (e) {
        if (e && e.pw) {
          say('Cần mật khẩu cho ' + f.name + '.');
          return askPw(f, !!pw).then(function (p) { if (p === null) { say('Đã bỏ qua ' + f.name + '.'); return; } return run(f, p); });
        }
        console.error(e);
        var zip = /\.(zip|cbz|jar|apk|docx|xlsx|pptx)$/i.test(f.name);
        say('Không giải nén được ' + f.name + '. ' + (zip
          ? 'File có thể bị hỏng.'
          : (/\.rar$/i.test(f.name) ? 'Không tải được thư viện giải nén RAR từ mạng, hãy kiểm tra kết nối rồi thử lại.' : 'Định dạng này cần thư mục "' + LA_DIR + '" (libarchive.js) trong repo.')), true);
      });
    }
    function handle(files) {
      files = Array.prototype.slice.call(files);
      files.reduce(function (p, f) { return p.then(function () { return run(f); }); }, Promise.resolve());
    }

    inp.onchange = function () { handle(inp.files); inp.value = ''; };
    ['dragenter', 'dragover'].forEach(function (e) { lab.addEventListener(e, function (ev) { ev.preventDefault(); lab.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (e) { lab.addEventListener(e, function (ev) { ev.preventDefault(); lab.classList.remove('over'); }); });
    lab.addEventListener('drop', function (ev) { handle(ev.dataTransfer.files); });
  }

  /* ---------- Gắn vào "Công cụ thường dùng" ---------- */
  function mount() {
    var sel = document.getElementById('utSel'), panel = document.getElementById('t8');
    if (!sel || !panel || document.getElementById('utGiaiNen')) return;
    var o = document.createElement('option'); o.value = 'utGiaiNen'; o.textContent = '📦 Giải nén online';
    sel.appendChild(o);
    var box = document.createElement('div'); box.className = 'ut'; box.id = 'utGiaiNen';
    var root = document.createElement('div'); root.id = 'gnRoot'; box.appendChild(root);
    panel.appendChild(box);
    build(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

/* ===== Để mở được RAR / 7z (một lần duy nhất) =====
   1. Tải thư mục dist của thư viện libarchive.js 2.0.2
      (https://cdn.jsdelivr.net/npm/libarchive.js@2.0.2/dist/): gồm libarchive.js, worker-bundle.js và thư mục wasm-gen.
   2. Đặt vào repo thành thư mục "libarchive/" cùng cấp với index.html.
   ZIP không cần bước này. */
