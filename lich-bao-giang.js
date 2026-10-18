/* Lịch báo giảng tự động
 * - Đọc file Excel lịch báo giảng (.xlsx), chuyển sang tuần kế tiếp:
 *     "Tuần 5 (05/10/2026 - 10/10/2026)" -> "Tuần 6 (12/10/2026 - 17/10/2026)"
 * - Số tiết (PPCT) của TỪNG MÔN được chọn cộng thêm một số tiết tuỳ ý (có thể là số âm).
 *   Các môn hỗ trợ: xem SUBJECTS bên dưới (Toán, Công nghệ, Ngữ văn, LSĐL, Ngoại ngữ, ...).
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
  /* opts: { rules: [{ key: <key môn>, grade: '' | '6'..'9', n: số tiết cộng thêm }] }; luôn chuyển 1 tuần. Môn/khối nào không có luật thì giữ nguyên.
   * Ưu tiên nhận cột theo tiêu đề bảng (Môn học / Lớp học / Tiết theo PPCT); nếu không có thì dò theo vị trí. */
  /* Danh sách môn: key, nhãn hiển thị, và mẫu nhận diện tên môn trong file Excel (đã chuẩn hoá chữ thường, bỏ số khối cuối như "Toán 8").
   * Muốn nhận thêm cách ghi khác của một môn thì thêm vào biểu thức "re" của môn đó. */
  var SUBJECTS = [
    { key: 'toan',      label: 'Toán',               re: /^toán$/ },
    { key: 'toanHT',    label: 'Toán (HT)',          re: /^toán\s*\(\s*ht\s*\)$/ },
    { key: 'cn',        label: 'Công nghệ',          re: /^công nghệ$/ },
    { key: 'nguvan',    label: 'Ngữ văn',            re: /^ngữ văn$/ },
    { key: 'lsdl',      label: 'LSĐL',               re: /^(lsđl|ls\s*[-&,.]\s*đl|ls\s*(và|&)\s*đl|lịch sử\s*(và|&)\s*địa l[íý])$/ },
    { key: 'ngoaingu',  label: 'Ngoại ngữ',          re: /^(ngoại ngữ|ngoại ngữ 1)$/ },
    { key: 'nghethuat', label: 'Nghệ thuật',         re: /^nghệ thuật$/ },
    { key: 'tinhoc',    label: 'Tin học',            re: /^tin học$/ },
    { key: 'khtn',      label: 'Khoa học Tự nhiên',  re: /^(khtn|khoa học tự nhiên)$/ },
    { key: 'khtnLi',    label: 'KHTN (Lí)',          re: /^(khtn|khoa học tự nhiên)\s*\(\s*(vật\s*)?l[iíyý]\s*\)$/ },
    { key: 'gdcd',      label: 'GDCD',               re: /^(gdcd|giáo dục công dân)$/ },
    { key: 'gddp',      label: 'GDĐP',               re: /^(gdđp|giáo dục địa phương)$/ },
    { key: 'hdtn',      label: 'HĐTN',               re: /^(hđtn|hoạt động trải nghiệm.*)$/ },
    { key: 'gdtc',      label: 'Giáo dục thể chất',  re: /^(giáo dục thể chất|gdtc)$/ }
  ];
  var LABEL = {};
  SUBJECTS.forEach(function (x) { LABEL[x.key] = x.label; });
  function subjectOf(text) {
    var n = norm(text).replace(/\s+\d+$/, ''); /* "Toán 8" -> "toán" */
    for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].re.test(n)) return SUBJECTS[i].key;
    return '';
  }
  /* Đại số / Hình học có bộ đếm PPCT riêng, số tiết mỗi tuần khác nhau => không tự cộng, chỉ cảnh báo */
  function isOtherMath(text) { return /^(đại số|hình học)(\s+\d+)?$/.test(norm(text)); }
  /* Khối lớp của một dòng: lấy từ tên lớp ("7A1" -> "7"); nếu không có thì lấy số cuối tên môn ("Toán 8" -> "8"); không xác định được thì trả về '' */
  function gradeOf(cls, subjText) {
    var m = /^\s*(\d{1,2})/.exec(String(cls || '')) || /\s(\d{1,2})\s*$/.exec(norm(subjText));
    return m ? String(+m[1]) : '';
  }
  /* cộng thêm n vào mọi số trong ô PPCT, giữ nguyên dấu phân cách: "17,18" -> "21,22" */
  function bump(text, n) {
    if (!/^[\d\s,;\-–]*\d[\d\s,;\-–]*$/.test(text)) return null;
    var bad = false;
    var out = text.replace(/\d+/g, function (d) { var v = parseInt(d, 10) + n; if (v < 0) bad = true; return String(v); });
    return bad ? false : out;
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

    /* rules: [{key, grade, n}] — grade '' = mọi khối; dòng có khối cụ thể thì ưu tiên luật đúng khối, không có thì dùng luật "mọi khối".
     * (vẫn nhận kiểu cũ opts.inc = { key: n } cho các nơi khác đang gọi) */
    var inc0 = (opts && opts.inc) || {};
    var rules = (opts && opts.rules) || Object.keys(inc0).map(function (k) { return { key: k, grade: '', n: inc0[k] }; });
    var skipped = {};
    function findRule(kind, g) {
      var any = null;
      for (var q = 0; q < rules.length; q++) {
        if (rules[q].key !== kind) continue;
        if (g && rules[q].grade === g) return rules[q];
        if (!rules[q].grade) any = rules[q];
      }
      return any;
    }
    function hasRule(kind) { return rules.some(function (x) { return x.key === kind; }); }
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
        var g = gradeOf(cls, subjCell ? subjCell.v : '');
        var rule = findRule(kind, g);
        if (!rule) {
          if (!g && hasRule(kind)) warnings.push(S.name + '!' + (ppct ? ppct.ref : subjCell.ref) + ': không xác định được khối lớp của dòng ' + LABEL[kind] + ', giữ nguyên.');
          else skipped[kind + '|' + g] = LABEL[kind] + (g ? ' lớp ' + g : '');
          return;
        }
        var add = rule.n || 0;
        if (!ppct || !String(ppct.v).trim()) {
          warnings.push(S.name + '!' + (ppct ? ppct.ref : subjCell.ref) + ': dòng ' + LABEL[kind] + (cls ? ' ' + cls : '') + ' chưa có số tiết PPCT, bỏ qua.');
          return;
        }
        var oldT = ppct.v.trim(), neu = bump(oldT, add);
        if (neu === false) { warnings.push(S.name + '!' + ppct.ref + ': ' + LABEL[kind] + (cls ? ' ' + cls : '') + ' = ' + oldT + ' cộng ' + add + ' sẽ ra số âm, giữ nguyên.'); return; }
        if (neu === null) { warnings.push(S.name + '!' + ppct.ref + ': "' + oldT + '" không phải số tiết, giữ nguyên.'); return; }
        if (!add) { notes.push(S.name + '!' + ppct.ref + ': ' + LABEL[kind] + (cls ? ' ' + cls : '') + ' = ' + oldT + ' (giữ nguyên, cộng thêm 0)'); return; }
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
    if (!changes.some(function (c) { return c.kind !== 'Tuần'; })) warnings.push('Không tìm thấy dòng môn nào trong danh sách đã chọn có số tiết để cộng.');
    var sk = Object.keys(skipped).map(function (k) { return skipped[k]; });
    if (sk.length) notes.push('File có môn ' + sk.join(', ') + ' nhưng bạn chưa thêm vào danh sách cộng tiết (đúng môn và khối) nên giữ nguyên.');

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
    '<div class="note">Chọn file Excel lịch báo giảng của tuần hiện tại. Công cụ tự đổi dòng <b>Tuần … (từ ngày - đến ngày)</b> sang tuần kế tiếp, cộng số tiết PPCT cho <b>các môn bạn chọn bên dưới</b> (mỗi môn — và từng khối lớp nếu cần — một số tiết riêng, có thể nhập số âm; một môn có thể chọn nhiều lần với các khối khác nhau; ô có nhiều tiết như “17,18” thì cộng cho từng số), giữ nguyên mọi thông tin và định dạng khác rồi xuất file Excel mới.</div>' +
    '<div class="note" style="margin-top:6px"><b>Môn cần cộng tiết:</b></div>' +
    '<div id="lbgRows"></div>' +
    '<div class="bar"><button class="sec sm" id="lbgAdd" type="button">➕ Thêm môn</button></div>' +
    '<div class="bar"><button class="sm" id="lbgPick" type="button">📤 Chọn file Excel (.xlsx)</button>' +
    '<button class="green sm" id="lbgDl" type="button" disabled>📥 Tải file Excel mới</button>' +
    '<input type="file" id="lbgFile" hidden></div>' +
    '<div id="lbgMsg" class="note"></div>' +
    '<div id="lbgOut"></div>';

  var $ = function (id) { return document.getElementById(id); };
  var state = { buf: null, name: '', result: null, hkTouched: false };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ----- danh sách môn + khối lớp + số tiết cộng thêm ----- */
  var STORE = 'lbgRows.v3';
  var GRADES = [{ v: '', t: 'Tất cả khối' }, { v: '6', t: 'Lớp 6' }, { v: '7', t: 'Lớp 7' }, { v: '8', t: 'Lớp 8' }, { v: '9', t: 'Lớp 9' }];
  var DEFAULT_ROWS = [{ key: 'cn', grade: '', n: 1 }, { key: 'toan', grade: '', n: 4 }, { key: 'toanHT', grade: '', n: 1 }];
  var rowsData = loadRows();

  function validRow(r) {
    return r && LABEL[r.key] && typeof r.n === 'number' && isFinite(r.n) && GRADES.some(function (g) { return g.v === (r.grade || ''); });
  }
  function cleanRows(a) {
    var seen = {}, out = [];
    a.forEach(function (r) {
      var g = r.grade || '', id = r.key + '|' + g;
      if (seen[id]) return; seen[id] = true;
      out.push({ key: r.key, grade: g, n: r.n });
    });
    return out;
  }
  function loadRows() {
    try {
      var j = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (Array.isArray(j) && j.every(validRow)) return cleanRows(j);
      var old = JSON.parse(localStorage.getItem('lbgRows.v2') || 'null'); /* bản cũ chưa có khối lớp */
      if (Array.isArray(old) && old.every(validRow)) return cleanRows(old);
    } catch (e) { /* bỏ qua, dùng mặc định */ }
    return DEFAULT_ROWS.map(function (r) { return { key: r.key, grade: r.grade, n: r.n }; });
  }
  function saveRows() { try { localStorage.setItem(STORE, JSON.stringify(rowsData)); } catch (e) { /* bỏ qua */ } }

  /* cặp (môn, khối) chưa dùng để "Thêm môn": ưu tiên cùng môn với dòng cuối nhưng khối khác */
  function nextFree() {
    var used = {}; rowsData.forEach(function (r) { used[r.key + '|' + r.grade] = true; });
    var last = rowsData.length ? rowsData[rowsData.length - 1].key : '', order = [], gs = ['7', '8', '9', '6'];
    if (last) gs.forEach(function (g) { order.push([last, g]); });
    SUBJECTS.forEach(function (x) { order.push([x.key, '']); });
    SUBJECTS.forEach(function (x) { gs.forEach(function (g) { order.push([x.key, g]); }); });
    for (var k = 0; k < order.length; k++) if (!used[order[k][0] + '|' + order[k][1]]) return { key: order[k][0], grade: order[k][1] };
    return null;
  }

  function renderRows() {
    $('lbgRows').innerHTML = rowsData.map(function (r, i) {
      var optsHtml = SUBJECTS.map(function (x) {
        return '<option value="' + x.key + '"' + (x.key === r.key ? ' selected' : '') + '>' + esc(x.label) + '</option>';
      }).join('');
      var gradeHtml = GRADES.map(function (g) {
        return '<option value="' + g.v + '"' + (g.v === r.grade ? ' selected' : '') + '>' + esc(g.t) + '</option>';
      }).join('');
      return '<div class="bar" data-i="' + i + '" style="align-items:center">' +
        '<select class="lbgSub" style="min-width:170px">' + optsHtml + '</select>' +
        '<select class="lbgGrade" style="min-width:120px">' + gradeHtml + '</select>' +
        '<label>cộng thêm <input type="number" class="lbgN" value="' + r.n + '" step="1" style="width:80px"> tiết</label>' +
        '<button class="sec sm lbgDel" type="button" title="Xoá dòng này">🗑</button></div>';
    }).join('') || '<div class="note">Chưa chọn môn nào — bấm “Thêm môn”. Chỉ đổi tuần, không cộng tiết.</div>';
    $('lbgAdd').disabled = !nextFree();
  }

  function opts() {
    return { rules: rowsData.map(function (r) { return { key: r.key, grade: r.grade || '', n: Math.trunc(r.n) || 0 }; }) };
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
      var sum = rowsData.map(function (r) { return LABEL[r.key] + (r.grade ? ' lớp ' + r.grade : '') + ' ' + (r.n > 0 ? '+' : '') + (Math.trunc(r.n) || 0); }).join(', ');
      $('lbgMsg').innerHTML = (r.changes.length ? '✅ Đã chuẩn bị ' + r.changes.length + ' thay đổi' + (sum ? ' (' + esc(sum) + ')' : '') + '. Kiểm tra bảng dưới rồi bấm “Tải file Excel mới”.' : '⚠️ Không có thay đổi nào.') +
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
    if (!/\.xlsx$/i.test(f.name)) { this.value = ''; $('lbgMsg').textContent = '❌ Hãy chọn file có đuôi .xlsx (nếu là .xls, mở bằng Excel và “Lưu thành” .xlsx).'; return; }
    state.name = f.name; state.buf = await f.arrayBuffer(); this.value = '';
    run();
  });
  $('lbgRows').addEventListener('input', function (e) {
    if (!e.target.classList.contains('lbgN')) return;
    var i = +e.target.closest('[data-i]').getAttribute('data-i');
    rowsData[i].n = parseInt(e.target.value, 10) || 0;
    saveRows(); run();
  });
  $('lbgRows').addEventListener('change', function (e) {
    var isS = e.target.classList.contains('lbgSub'), isG = e.target.classList.contains('lbgGrade');
    if (!isS && !isG) return;
    var i = +e.target.closest('[data-i]').getAttribute('data-i'), r = rowsData[i];
    var key = isS ? e.target.value : r.key, grade = isG ? e.target.value : r.grade;
    var dup = rowsData.some(function (x, j) { return j !== i && x.key === key && x.grade === grade; });
    if (dup) { renderRows(); $('lbgMsg').textContent = '⚠️ ' + LABEL[key] + ' ' + (grade ? 'lớp ' + grade : '(tất cả khối)') + ' đã có trong danh sách.'; return; }
    r.key = key; r.grade = grade;
    saveRows(); renderRows(); run();
  });
  $('lbgRows').addEventListener('click', function (e) {
    var b = e.target.closest('.lbgDel'); if (!b) return;
    rowsData.splice(+b.closest('[data-i]').getAttribute('data-i'), 1);
    saveRows(); renderRows(); run();
  });
  $('lbgAdd').addEventListener('click', function () {
    var nx = nextFree(); if (!nx) return;
    rowsData.push({ key: nx.key, grade: nx.grade, n: 0 });
    saveRows(); renderRows(); run();
  });
  renderRows();
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
