/* Lịch báo giảng tự động
 * - Đọc file Excel lịch báo giảng (.xlsx), chuyển sang tuần kế tiếp:
 *     "Tuần 5 (05/10/2026 - 10/10/2026)" -> "Tuần 6 (12/10/2026 - 17/10/2026)"
 * - Số tiết (PPCT) của môn Toán cộng thêm N, môn Công nghệ cộng thêm M.
 * - Sửa trực tiếp XML trong file .xlsx (JSZip) nên giữ nguyên toàn bộ định dạng, ô gộp, khung viền...
 * Cần: JSZip (đã nạp trong index.html). */
(function () {
  'use strict';

  var NS_XML = 'http://www.w3.org/XML/1998/namespace';
  var TITLE = /Tuần\s*(\d+)\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*([-–—])\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*\)/i;

  /* ---------- tiện ích ---------- */
  function nfc(s) { s = String(s == null ? '' : s); return s.normalize ? s.normalize('NFC') : s; }
  function norm(s) { return nfc(s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function colIdx(ref) {
    var m = /^([A-Z]+)/i.exec(ref || ''); if (!m) return 0;
    var n = 0, t = m[1].toUpperCase();
    for (var i = 0; i < t.length; i++) n = n * 26 + t.charCodeAt(i) - 64;
    return n;
  }
  function addDays(y, m, d, k) { return new Date(Date.UTC(y, m - 1, d + k)); }
  function fmt(dt) { return p2(dt.getUTCDate()) + '/' + p2(dt.getUTCMonth() + 1) + '/' + dt.getUTCFullYear(); }

  function shiftTitle(text, weeks) {
    return nfc(text).replace(TITLE, function (m, w, d1, m1, y1, sep, d2, m2, y2) {
      var a = addDays(+y1, +m1, +d1, 7 * weeks), b = addDays(+y2, +m2, +d2, 7 * weeks);
      return 'Tuần ' + (+w + weeks) + ' (' + fmt(a) + ' ' + sep + ' ' + fmt(b) + ')';
    });
  }
  function isInt(s) { return /^\s*\d+\s*$/.test(String(s)); }
  function isClass(s) { return /^\s*\d{1,2}\s*[A-Za-z]\s*\d*\s*$/.test(String(s)); }

  /* Tìm thẻ theo tên cục bộ, bất kể tiền tố namespace (file Excel xuất từ hệ thống khác dùng <x:row>, <x:t>... thay vì <row>, <t>) */
  function byTag(el, name) { return el.getElementsByTagNameNS('*', name); }
  function mk(doc, root, name) { return doc.createElementNS(root.namespaceURI, root.prefix ? root.prefix + ':' + name : name); }

  function parseXml(str) {
    str = String(str).replace(/^\uFEFF/, ''); /* bỏ BOM đầu file nếu có */
    var doc = new DOMParser().parseFromString(str, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Không đọc được cấu trúc file Excel.');
    return doc;
  }
  function serialize(doc) {
    var s = new XMLSerializer().serializeToString(doc);
    if (!/^<\?xml/.test(s)) s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + s;
    return s;
  }
  function tNodes(el) {
    var out = [], all = byTag(el, 't');
    for (var i = 0; i < all.length; i++) {
      var p = all[i].parentNode;
      if (p && p.localName === 'rPh') continue;
      out.push(all[i]);
    }
    return out;
  }
  function siText(si) { return tNodes(si).map(function (t) { return t.textContent; }).join(''); }
  function setT(t, txt) { t.textContent = txt; t.setAttributeNS(NS_XML, 'xml:space', 'preserve'); }
  function child(el, name) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.localName === name) return c;
    return null;
  }

  /* ---------- xử lý chính ---------- */
  /* opts: { toan, cn, toanHT } = số tiết cộng thêm; luôn chuyển 1 tuần.
   * Ưu tiên nhận cột theo tiêu đề bảng (Môn học / Lớp học / Tiết theo PPCT); nếu không có thì dò theo vị trí. */
  function subjectOf(text) {
    var n = norm(text);
    if (/^toán(\s+\d+)?$/.test(n)) return 'toan';
    if (/^công nghệ(\s+\d+)?$/.test(n)) return 'cn';
    if (/^toán\s*\(\s*ht\s*\)$/.test(n)) return 'toanHT';
    return '';
  }
  /* Đại số / Hình học có bộ đếm PPCT riêng, số tiết mỗi tuần khác nhau => không tự cộng, chỉ cảnh báo */
  function isOtherMath(text) { return /^(đại số|hình học)(\s+\d+)?$/.test(norm(text)); }
  var LABEL = { toan: 'Toán', cn: 'Công nghệ', toanHT: 'Toán (HT)' };
  /* cộng thêm n vào mọi số trong ô PPCT, giữ nguyên dấu phân cách: "17,18" -> "21,22" */
  function bump(text, n) {
    if (!/^[\d\s,;\-–]*\d[\d\s,;\-–]*$/.test(text)) return null;
    return text.replace(/\d+/g, function (d) { return String(parseInt(d, 10) + n); });
  }

  async function process(buf, opts) {
    var weeks = 1;
    var zip = await JSZip.loadAsync(buf);

    /* --- chuỗi dùng chung --- */
    var sst = [], sstDoc = null, sstRoot = null, plain = {}, sstAdded = 0, sstFile = zip.file('xl/sharedStrings.xml');
    if (sstFile) {
      sstDoc = parseXml(await sstFile.async('string'));
      sstRoot = sstDoc.documentElement;
      var sis = byTag(sstDoc, 'si');
      for (var i = 0; i < sis.length; i++) {
        var tx = siText(sis[i]); sst.push(tx);
        var kids = [], k;
        for (k = sis[i].firstChild; k; k = k.nextSibling) if (k.nodeType === 1) kids.push(k.localName);
        if (kids.length === 1 && kids[0] === 't' && plain[nfc(tx)] === undefined) plain[nfc(tx)] = i;
      }
    }
    function sstIndex(text) {
      if (plain[text] !== undefined) return plain[text];
      var si = mk(sstDoc, sstRoot, 'si'), t = mk(sstDoc, sstRoot, 't');
      setT(t, text); si.appendChild(t); sstRoot.appendChild(si);
      sst.push(text); plain[text] = sst.length - 1; sstAdded++;
      return plain[text];
    }

    /* --- tên trang tính --- */
    var sheetNames = {};
    try {
      var wbDoc = parseXml(await zip.file('xl/workbook.xml').async('string'));
      var rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
      var rmap = {}, rl = byTag(rels, 'Relationship');
      for (i = 0; i < rl.length; i++) rmap[rl[i].getAttribute('Id')] = rl[i].getAttribute('Target');
      var shs = byTag(wbDoc, 'sheet');
      for (i = 0; i < shs.length; i++) {
        var rid = shs[i].getAttribute('r:id') || shs[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        var tg = (rmap[rid] || '').replace(/^\/?(xl\/)?/, 'xl/');
        sheetNames[tg] = shs[i].getAttribute('name');
      }
    } catch (e) { /* không có tên thì dùng tên file */ }

    /* --- đọc toàn bộ trang tính --- */
    var files = Object.keys(zip.files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort();
    var sheets = [];
    for (var fi = 0; fi < files.length; fi++) {
      var path = files[fi];
      var doc = parseXml(await zip.file(path).async('string'));
      var S = { path: path, name: sheetNames[path] || path.replace(/^xl\/worksheets\//, '').replace('.xml', ''), doc: doc, rows: [], hdr: null, dirty: false };
      var rowEls = byTag(doc, 'row');
      for (var ri = 0; ri < rowEls.length; ri++) {
        var cells = [], cs = rowEls[ri].childNodes;
        for (var ci = 0; ci < cs.length; ci++) {
          var c = cs[ci]; if (c.nodeType !== 1 || c.localName !== 'c') continue;
          var t = c.getAttribute('t') || 'n', vEl = child(c, 'v'), isEl = child(c, 'is'), val = '';
          if (t === 's') val = vEl ? (sst[+vEl.textContent] || '') : '';
          else if (t === 'inlineStr') val = isEl ? siText(isEl) : '';
          else val = vEl ? vEl.textContent : '';
          cells.push({ el: c, col: colIdx(c.getAttribute('r')), ref: c.getAttribute('r'), t: t, v: nfc(val), vEl: vEl, isEl: isEl, hasF: !!child(c, 'f') });
        }
        cells.sort(function (a, b) { return a.col - b.col; });
        S.rows.push(cells);
      }
      /* dòng tiêu đề bảng */
      for (ri = 0; ri < S.rows.length && !S.hdr; ri++) {
        var h = { s: 0, c: 0, p: 0, row: ri };
        S.rows[ri].forEach(function (x) {
          var n = norm(x.v);
          if (n === 'môn học' || n === 'môn') h.s = x.col;
          else if (n === 'lớp học' || n === 'lớp') h.c = x.col;
          else if (/ppct/.test(n)) h.p = x.col;
        });
        if (h.s && h.p) S.hdr = h;
      }
      sheets.push(S);
    }
    var anyHdr = sheets.some(function (S) { return !!S.hdr; });

    var changes = [], warnings = [], notes = [], titleSeen = 0, firstTitle = null, siDone = {};

    /* ghi giá trị mới vào ô */
    function writeCell(S, k, text) {
      S.dirty = true;
      if (k.t === 's') { k.vEl.textContent = String(sstIndex(text)); }
      else if (k.t === 'inlineStr' && k.isEl) { var q = tNodes(k.isEl); if (q.length) setT(q[0], text); }
      else if (k.vEl) { k.vEl.textContent = text; }
    }

    sheets.forEach(function (S) {
      /* 1) tiêu đề tuần (mọi trang tính) */
      S.rows.forEach(function (cells) {
        cells.forEach(function (k) {
          if (!TITLE.test(k.v)) return;
          var neu = shiftTitle(k.v, weeks);
          titleSeen++;
          if (!firstTitle) firstTitle = { old: k.v, neu: neu };
          changes.push({ kind: 'Tuần', sheet: S.name, ref: k.ref, info: '', old: k.v, neu: neu });
          if (k.hasF) { warnings.push(S.name + '!' + k.ref + ': ô tuần là công thức, không sửa.'); return; }
          if (k.t === 's') {
            var idx = +k.vEl.textContent;
            if (!siDone[idx]) {
              siDone[idx] = true;
              var si = byTag(sstDoc, 'si')[idx], ts = tNodes(si), done = false, q;
              for (q = 0; q < ts.length; q++) {
                if (TITLE.test(nfc(ts[q].textContent))) { setT(ts[q], shiftTitle(ts[q].textContent, weeks)); done = true; break; }
              }
              if (!done && ts.length) { setT(ts[0], neu); for (q = 1; q < ts.length; q++) ts[q].textContent = ''; }
              delete plain[nfc(sst[idx])]; sst[idx] = neu;
            }
          } else if (k.t === 'inlineStr' && k.isEl) {
            var its = tNodes(k.isEl); if (its.length) { setT(its[0], neu); for (var z = 1; z < its.length; z++) its[z].textContent = ''; S.dirty = true; }
          } else if (k.vEl) { k.vEl.textContent = neu; S.dirty = true; }
        });
      });

      /* 2) số tiết theo môn */
      function handle(kind, subjCell, ppct, cls) {
        var inc = opts[kind] || 0;
        if (!ppct || !String(ppct.v).trim()) {
          warnings.push(S.name + '!' + (ppct ? ppct.ref : subjCell.ref) + ': dòng ' + LABEL[kind] + (cls ? ' ' + cls : '') + ' chưa có số tiết PPCT, bỏ qua.');
          return;
        }
        var oldT = ppct.v.trim(), neu = bump(oldT, inc);
        if (neu === null) { warnings.push(S.name + '!' + ppct.ref + ': "' + oldT + '" không phải số tiết, giữ nguyên.'); return; }
        if (!inc) { notes.push(S.name + '!' + ppct.ref + ': ' + LABEL[kind] + (cls ? ' ' + cls : '') + ' = ' + oldT + ' (giữ nguyên, cộng thêm 0)'); return; }
        if (ppct.hasF) { warnings.push(S.name + '!' + ppct.ref + ': số tiết là công thức, không sửa.'); return; }
        changes.push({ kind: LABEL[kind], sheet: S.name, ref: ppct.ref, info: cls || '', old: oldT, neu: neu });
        if (ppct.t === 'n' && /^\d+$/.test(neu)) { ppct.vEl.textContent = neu; S.dirty = true; }
        else if (ppct.t === 'n') { warnings.push(S.name + '!' + ppct.ref + ': ô số có dạng lạ, giữ nguyên.'); changes.pop(); }
        else writeCell(S, ppct, neu);
      }
      function at(cells, col) { for (var i = 0; i < cells.length; i++) if (cells[i].col === col) return cells[i]; return null; }

      if (S.hdr) {
        for (var r = S.hdr.row + 1; r < S.rows.length; r++) {
          var cells = S.rows[r], sc = at(cells, S.hdr.s), kind = sc ? subjectOf(sc.v) : '';
          if (!kind) {
            var pc = sc && isOtherMath(sc.v) ? at(cells, S.hdr.p) : null;
            if (pc && String(pc.v).trim()) warnings.push(S.name + '!' + pc.ref + ': môn "' + sc.v.trim() + '" = ' + pc.v.trim() + ' — công cụ chưa tự cộng cho môn này, giữ nguyên, hãy tự kiểm tra.');
            continue;
          }
          var cc = S.hdr.c ? at(cells, S.hdr.c) : null;
          handle(kind, sc, at(cells, S.hdr.p), cc ? cc.v.trim() : '');
        }
      } else if (!anyHdr) {
        S.rows.forEach(function (cells) {
          for (var a = 0; a < cells.length; a++) {
            var kind = subjectOf(cells[a].v); if (!kind) continue;
            var end = cells.length;
            for (var b = a + 1; b < cells.length; b++) if (subjectOf(cells[b].v)) { end = b; break; }
            var seg = cells.slice(a + 1, end), cls = '', target = null;
            for (var s = 0; s < seg.length; s++) {
              if (!cls && isClass(seg[s].v)) { cls = seg[s].v.trim(); continue; }
              if (isInt(seg[s].v)) { target = seg[s]; if (cls) break; }
            }
            if (target) handle(kind, cells[a], target, cls);
          }
        });
      }
    });

    /* --- ghi lại các phần đã sửa --- */
    sheets.forEach(function (S) { if (S.dirty) zip.file(S.path, serialize(S.doc)); });
    if (sstDoc && (sstAdded || Object.keys(siDone).length)) {
      var u = parseInt(sstRoot.getAttribute('uniqueCount') || '0', 10);
      if (sstAdded && sstRoot.hasAttribute('uniqueCount')) sstRoot.setAttribute('uniqueCount', String(u + sstAdded));
      zip.file('xl/sharedStrings.xml', serialize(sstDoc));
    }

    if (!titleSeen) warnings.unshift('Không tìm thấy dòng "Tuần … (dd/mm/yyyy - dd/mm/yyyy)" trong file.');
    if (!changes.some(function (c) { return c.kind !== 'Tuần'; })) warnings.push('Không tìm thấy dòng môn Toán / Công nghệ có số tiết.');

    var out = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return { out: out, changes: changes, warnings: warnings, notes: notes, title: firstTitle };
  }

  function outName(name, newTitle) {
    var base = String(name || 'lich-bao-giang.xlsx').replace(/\.xlsx$/i, '');
    var wk = newTitle ? (/Tuần\s*(\d+)/i.exec(newTitle) || [])[1] : '';
    if (wk && /(Tuần|Tuan)[\s_]*\d+/i.test(base)) return base.replace(/(Tuần|Tuan)([\s_]*)\d+/i, function (m, a, b) { return a + b + wk; }) + '.xlsx';
    return base + (wk ? ' - Tuần ' + wk : ' - moi') + '.xlsx';
  }

  window.LichBaoGiang = { process: process, shiftTitle: shiftTitle, outName: outName };

  /* ---------- giao diện ---------- */
  var root = document.getElementById('lbgRoot');
  if (!root) return;

  root.innerHTML =
    '<h2>📅 Lịch báo giảng tự động</h2>' +
    '<div class="note">Chọn file Excel lịch báo giảng của tuần hiện tại. Công cụ tự đổi dòng <b>Tuần … (từ ngày - đến ngày)</b> sang tuần kế tiếp, cộng số tiết PPCT cho môn Toán và Công nghệ (ô có nhiều tiết như “17,18” thì cộng cho từng số), giữ nguyên mọi thông tin và định dạng khác rồi xuất file Excel mới.</div>' +
    '<div class="cfg">' +
    '<div><label for="lbgCn">Công nghệ cộng thêm (tiết)</label><input type="number" id="lbgCn" value="1" min="0" step="1"></div>' +
    '<div><label for="lbgToan">Toán cộng thêm (tiết)</label><input type="number" id="lbgToan" value="4" min="0" step="1"></div>' +
    '<div><label for="lbgHt" title="Dòng môn ghi là Toán (HT) có bộ đếm tiết riêng">Toán học thêm (HT) cộng thêm (tiết)</label><input type="number" id="lbgHt" value="1" min="0" step="1"></div>' +
    '</div>' +
    '<div class="bar"><button class="sm" id="lbgPick" type="button">📤 Chọn file Excel (.xlsx)</button>' +
    '<button class="green sm" id="lbgDl" type="button" disabled>📥 Tải file Excel mới</button>' +
    '<input type="file" id="lbgFile" accept=".xlsx" hidden></div>' +
    '<div id="lbgMsg" class="note"></div>' +
    '<div id="lbgOut"></div>';

  var $ = function (id) { return document.getElementById(id); };
  var state = { buf: null, name: '', result: null, hkTouched: false };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function opts() {
    return { toan: Math.max(0, parseInt($('lbgToan').value, 10) || 0), cn: Math.max(0, parseInt($('lbgCn').value, 10) || 0), toanHT: Math.max(0, parseInt($('lbgHt').value, 10) || 0) };
  }

  var runSeq = 0;
  async function run() {
    if (!state.buf) return;
    var mySeq = ++runSeq;
    $('lbgMsg').textContent = 'Đang xử lý…';
    $('lbgDl').disabled = true;
    try {
      var r = await process(state.buf, opts());
      if (mySeq !== runSeq) return;
      state.result = r;
      var rowsHtml = r.changes.map(function (c) {
        return '<tr><td>' + esc(c.kind) + '</td><td>' + esc(c.sheet) + '</td><td>' + esc(c.ref) + '</td><td>' + esc(c.info) + '</td><td>' + esc(c.old) + '</td><td>' + esc(c.neu) + '</td></tr>';
      }).join('');
      var o = opts();
      $('lbgMsg').innerHTML = (r.changes.length ? '✅ Đã chuẩn bị ' + r.changes.length + ' thay đổi (Toán +' + o.toan + ', Công nghệ +' + o.cn + ', Toán (HT) +' + o.toanHT + '). Kiểm tra bảng dưới rồi bấm “Tải file Excel mới”.' : '⚠️ Không có thay đổi nào.') +
        (r.warnings.length ? '<br>⚠️ ' + r.warnings.map(esc).join('<br>⚠️ ') : '') +
        (r.notes.length ? '<br>ℹ️ ' + r.notes.map(esc).join('<br>ℹ️ ') : '');
      $('lbgOut').innerHTML = r.changes.length ?
        '<div class="tw"><table class="g"><thead><tr><th>Nội dung</th><th>Trang tính</th><th>Ô</th><th>Lớp</th><th>Cũ</th><th>Mới</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' : '';
      $('lbgDl').disabled = !r.changes.length;
    } catch (e) {
      if (mySeq !== runSeq) return;
      state.result = null;
      $('lbgOut').innerHTML = '';
      $('lbgMsg').textContent = '❌ Không đọc được file. Hãy dùng file .xlsx (nếu là .xls, mở bằng Excel và “Lưu thành” .xlsx). ' + (e && e.message ? '(' + e.message + ')' : '');
    }
  }

  $('lbgPick').addEventListener('click', function () { $('lbgFile').click(); });
  $('lbgFile').addEventListener('change', async function () {
    var f = this.files && this.files[0]; if (!f) return;
    state.name = f.name; state.buf = await f.arrayBuffer(); this.value = '';
    run();
  });
  $('lbgToan').addEventListener('input', run);
  $('lbgCn').addEventListener('input', run);
  $('lbgHt').addEventListener('input', run);
  $('lbgDl').addEventListener('click', function () {
    if (!state.result) return;
    var blob = new Blob([state.result.out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = outName(state.name, state.result.title && state.result.title.neu);
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  });
})();
