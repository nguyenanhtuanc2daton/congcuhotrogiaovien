/* Sổ đăng kí và sử dụng đồ dùng dạy học
 * - "Nạp Excel CSDL": đọc file Lịch báo giảng (.xlsx, mỗi file 1 tuần, có thể chọn nhiều file) và lưu vào bộ nhớ trình duyệt.
 * - "Xuất Excel sổ đồ dùng": điền Môn học, Lớp, Tiết theo KHDH, Tên bài dạy vào đúng ô Tiết học TKB của mẫu Sổ đồ dùng
 *   (mỗi tuần 1 trang tính "Tuần N") rồi tải file "Sổ đồ dùng.xlsx".
 * Cần: SheetJS (XLSX) để đọc, JSZip để ghi. Hai thư viện này đã nạp trong index.html. */
(function () {
  'use strict';

  var TPL = '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';
  var STORE = 'sddCsdl_v1';
  var MORNING = 5, AFTERNOON = 3; /* mẫu sổ: 5 tiết sáng + 3 tiết chiều mỗi ngày */
  var NAMEROW = [12, 19, 28, 36, 44, 52];
  var DAYNAME = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  function nfc(s) { s = String(s == null ? '' : s); return s.normalize ? s.normalize('NFC') : s; }
  function norm(s) { return nfc(s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function xesc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function cellText(v) { return v == null ? '' : nfc(String(v)).replace(/\r\n?/g, '\n').trim(); }
  function dmy(d, m, y) { return p2(+d) + '/' + p2(+m) + '/' + y; }

  /* ---------- đọc file Lịch báo giảng ---------- */
  function findCols(row) {
    var h = {};
    row.forEach(function (v, i) {
      var n = norm(v);
      if (n === 'thứ') h.day = i;
      else if (n === 'buổi học' || n === 'buổi') h.ses = i;
      else if (/^tiết (học |theo )?tkb$/.test(n)) h.tkb = i;
      else if (n === 'môn học' || n === 'môn') h.subj = i;
      else if (n === 'lớp học' || n === 'lớp') h.cls = i;
      else if (/^tiết theo (ppct|khdh)$/.test(n)) h.ppct = i;
      else if (n === 'bài dạy' || n === 'tên bài dạy') h.les = i;
    });
    return (h.day != null && h.ses != null && h.tkb != null && h.subj != null && h.cls != null && h.ppct != null && h.les != null) ? h : null;
  }

  function parseWorkbookBuf(buf, fileName) {
    var wb = XLSX.read(buf, { type: 'array' });
    var best = null;
    wb.SheetNames.forEach(function (name) {
      if (best) return;
      var ws = wb.Sheets[name]; if (!ws || !ws['!ref']) return;
      var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
      for (var r = 0; r < aoa.length; r++) {
        var cols = findCols(aoa[r]);
        if (cols) { best = { aoa: aoa, hdr: r, cols: cols, sheet: name }; return; }
      }
    });
    if (!best) throw new Error('Không thấy bảng có đủ các cột: Thứ, Buổi học, Tiết học TKB, Môn học, Lớp học, Tiết theo PPCT, Bài dạy.');

    /* tiêu đề: giáo viên, tuần, năm học */
    var teacher = '', week = 0, start = '', end = '', year = '';
    var head = best.aoa.slice(0, best.hdr).map(function (row) { return row.map(cellText).join(' '); }).join('\n');
    var mt = /Giáo viên\s*:\s*(.*?)\s*[-–—]\s*Tuần học\s*:\s*Tuần\s*(\d+)\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-–—]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*\)/i.exec(head);
    if (mt) { teacher = mt[1]; week = +mt[2]; start = dmy(mt[3], mt[4], mt[5]); end = dmy(mt[6], mt[7], mt[8]); }
    else {
      var m2 = /Tuần\s*(\d+)\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-–—]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*\)/i.exec(head);
      if (m2) { week = +m2[1]; start = dmy(m2[2], m2[3], m2[4]); end = dmy(m2[5], m2[6], m2[7]); }
      var m3 = /Giáo viên\s*:\s*([^\n(]*?)\s*(?:[-–—]|\n|$)/i.exec(head); if (m3) teacher = m3[1];
    }
    var my = /Năm học\s*:?\s*(\d{4})\s*[-–—]\s*(\d{4})/i.exec(head); if (my) year = my[1] + '-' + my[2];
    if (!week) {
      var fm = /(?:tuan|tuần)[\s_]*(\d+)/i.exec(nfc(fileName || '')); if (fm) week = +fm[1];
    }

    var c = best.cols, lessons = [], dates = {}, warnings = [], prevDay = null, prevSes = null;
    for (var r = best.hdr + 1; r < best.aoa.length; r++) {
      var row = best.aoa[r];
      var dayTxt = cellText(row[c.day]);
      var dm = /Thứ\s*([2-7])[ \t]*(?:\n\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4}))?/i.exec(dayTxt), cn = /Chủ\s*nhật/i.test(dayTxt);
      var d;
      if (dm) { d = +dm[1] - 2; prevDay = { d: d, date: dm[2] ? dmy(dm[2], dm[3], dm[4]) : '' }; if (prevDay.date) dates[d] = prevDay.date; }
      else if (cn) { d = 6; prevDay = { d: 6, date: '' }; }
      else if (!dayTxt && prevDay) d = prevDay.d;
      else continue;
      var sesTxt = norm(row[c.ses]);
      var ses = /sáng/.test(sesTxt) ? 'S' : /chiều/.test(sesTxt) ? 'C' : (prevSes && !sesTxt ? prevSes : '');
      if (ses) prevSes = ses;
      var pm = /^\s*(\d+)/.exec(cellText(row[c.tkb]));
      var subj = cellText(row[c.subj]), cls = cellText(row[c.cls]), ppct = cellText(row[c.ppct]), les = cellText(row[c.les]);
      if (!subj && !cls && !ppct && !les) continue;
      var label = (d === 6 ? 'Chủ nhật' : DAYNAME[d]) + ' ' + (ses === 'S' ? 'sáng' : ses === 'C' ? 'chiều' : '?') + ' tiết ' + (pm ? pm[1] : '?');
      if (d > 5 || !ses || !pm) { warnings.push('Không có chỗ trong sổ cho dòng ' + label + ' (' + subj + ' ' + cls + '), bỏ qua.'); continue; }
      var p = +pm[1];
      if (p < 1 || p > (ses === 'S' ? MORNING : AFTERNOON)) { warnings.push('Mẫu sổ chỉ có ' + (ses === 'S' ? MORNING + ' tiết sáng' : AFTERNOON + ' tiết chiều') + ' mỗi ngày nên không ghi được ' + label + ': ' + subj + ' ' + cls + ' - ' + les.replace(/\n/g, ' ')); continue; }
      lessons.push({ d: d, s: ses, p: p, subj: subj, cls: cls, ppct: ppct, lesson: les });
    }
    if (!week) throw new Error('Không xác định được số tuần (cần dòng "Tuần … (dd/mm/yyyy - dd/mm/yyyy)").');
    if (!year && start) { var sm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(start); if (sm) { var yy = +sm[3]; year = (+sm[2] >= 8 ? yy + '-' + (yy + 1) : (yy - 1) + '-' + yy); } }
    if (!lessons.length) warnings.push('Tuần này không có tiết dạy nào.');
    return { week: week, teacher: teacher, start: start, end: end, year: year, dates: dates, lessons: lessons, warnings: warnings, file: fileName || '' };
  }

  /* ---------- tạo file Sổ đồ dùng từ mẫu ---------- */
  function setStr(xml, ref, text) {
    var re = new RegExp('<c r="' + ref + '"( s="\\d+")?/>');
    if (!re.test(xml)) throw new Error('Mẫu thiếu ô ' + ref);
    return xml.replace(re, function (m, s) { return '<c r="' + ref + '"' + (s || '') + ' t="inlineStr"><is><t xml:space="preserve">' + xesc(text) + '</t></is></c>'; });
  }
  function setNum(xml, ref, num) {
    var re = new RegExp('<c r="' + ref + '"( s="\\d+")?/>');
    if (!re.test(xml)) throw new Error('Mẫu thiếu ô ' + ref);
    return xml.replace(re, function (m, s) { return '<c r="' + ref + '"' + (s || '') + '><v>' + num + '</v></c>'; });
  }
  function setCellVal(xml, ref, text) { return /^\d{1,6}$/.test(text) ? setNum(xml, ref, String(parseInt(text, 10))) : setStr(xml, ref, text); }
  function setRowHeight(xml, r, ht) {
    return xml.replace(new RegExp('(<row r="' + r + '"[^>]*?) ht="[\\d.]+"'), '$1 ht="' + ht + '"');
  }
  function linesOf(text, per) {
    var n = 0; String(text).split('\n').forEach(function (ln) { n += Math.max(1, Math.ceil(ln.length / per)); });
    return n;
  }
  function rowOf(d, ses, p) { return 8 + d * 8 + (ses === 'S' ? 0 : MORNING) + (p - 1); }

  function fillSheet(tpl, w, first) {
    var xml = tpl.replace('__TAB__', first ? 'tabSelected="1" ' : '');
    xml = setStr(xml, 'B4', 'Năm học ' + (w.year || ''));
    xml = setStr(xml, 'A5', 'Giáo viên: ' + (w.teacher || '') + ' - Tuần học: Tuần ' + w.week +
      (w.start ? ' (Từ ngày ' + w.start + ' đến ngày ' + w.end + ')' : ''));
    for (var d = 0; d < 6; d++) {
      xml = setStr(xml, 'B' + NAMEROW[d], DAYNAME[d]); /* đúng ô tên thứ / ngày đã có sẵn trong mẫu */
      if (w.dates[d]) xml = setStr(xml, 'B' + (NAMEROW[d] + 1), w.dates[d]);
    }
    var used = {}, count = 0, extra = [];
    w.lessons.forEach(function (L) {
      var r = rowOf(L.d, L.s, L.p);
      if (used[r]) { extra.push('Trùng ô ' + DAYNAME[L.d] + ' tiết ' + L.p + ': ' + L.subj + ' ' + L.cls); return; }
      used[r] = true; count++;
      if (L.subj) xml = setStr(xml, 'E' + r, L.subj);
      if (L.cls) xml = setStr(xml, 'F' + r, L.cls);
      if (L.ppct) xml = setCellVal(xml, 'G' + r, L.ppct);
      if (L.lesson) xml = setStr(xml, 'H' + r, L.lesson);
      /* hàng cố định 24pt cắt mất chữ: nới chiều cao theo số dòng của Tên bài dạy / Môn học */
      var n = Math.max(linesOf(L.lesson, 36), linesOf(L.subj, 9), linesOf(L.ppct, 8));
      if (n > 1) xml = setRowHeight(xml, r, (n * 18.75 + 5).toFixed(2));
    });
    xml = setNum(xml, 'E56', String(count));
    return { xml: xml, count: count, extra: extra };
  }

  async function build(weeks) {
    var list = Object.keys(weeks).map(Number).sort(function (a, b) { return a - b; });
    if (!list.length) throw new Error('Chưa nạp dữ liệu.');
    var tz = await JSZip.loadAsync(TPL, { base64: true });
    var sheetTpl = await tz.file('sheet.xml').async('string');
    var out = new JSZip(), notes = [];
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
    var wbSheets = '', rels = '';
    list.forEach(function (n, i) {
      var f = fillSheet(sheetTpl, weeks[n], i === 0);
      f.extra.forEach(function (e) { notes.push('Tuần ' + n + ': ' + e); });
      out.file('xl/worksheets/sheet' + (i + 1) + '.xml', f.xml);
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      wbSheets += '<sheet name="Tuần ' + n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      rels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    var k = list.length;
    ct += '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
    rels += '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId' + (k + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
      '<Relationship Id="rId' + (k + 3) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>';
    out.file('[Content_Types].xml', ct);
    out.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    out.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="19440" windowHeight="10320" activeTab="0"/></bookViews><sheets>' + wbSheets + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    out.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>');
    out.file('xl/styles.xml', await tz.file('styles.xml').async('string'));
    out.file('xl/theme/theme1.xml', await tz.file('theme1.xml').async('string'));
    out.file('xl/sharedStrings.xml', await tz.file('sharedStrings.xml').async('string'));
    var bytes = await out.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return { out: bytes, sheets: list, notes: notes };
  }

  window.SoDoDung = { parse: parseWorkbookBuf, build: build, rowOf: rowOf };

  /* ---------- giao diện: thêm 2 nút cạnh "Chọn file Excel" và "Tải file Excel mới" ---------- */
  var pick = document.getElementById('lbgPick');
  if (!pick || !pick.parentNode) return;
  var bar = pick.parentNode;
  var weeks = {};
  try { weeks = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { weeks = {}; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(weeks)); } catch (e) { /* trình duyệt chặn lưu: vẫn dùng được trong phiên này */ } }

  var load = document.createElement('button');
  load.type = 'button'; load.className = 'sm'; load.id = 'sddLoad';
  load.title = 'Nạp file Lịch báo giảng (.xlsx) của một hay nhiều tuần vào cơ sở dữ liệu';
  load.textContent = '📚 Nạp Excel CSDL';
  var exp = document.createElement('button');
  exp.type = 'button'; exp.className = 'green sm'; exp.id = 'sddExport';
  exp.title = 'Xuất file "Sổ đồ dùng.xlsx", mỗi tuần đã nạp là một trang tính';
  exp.textContent = '📘 Xuất Excel sổ đồ dùng';
  var fi = document.createElement('input');
  fi.type = 'file'; fi.id = 'sddFile'; fi.accept = '.xlsx'; fi.multiple = true; fi.hidden = true;
  bar.appendChild(load); bar.appendChild(exp); bar.appendChild(fi);
  var msg = document.createElement('div'); msg.id = 'sddMsg'; msg.className = 'note';
  var out = document.createElement('div'); out.id = 'sddOut';
  bar.parentNode.insertBefore(msg, bar.nextSibling);
  bar.parentNode.insertBefore(out, msg.nextSibling);

  function summary() {
    var ks = Object.keys(weeks).map(Number).sort(function (a, b) { return a - b; });
    if (!ks.length) return 'Chưa nạp tuần nào. Bấm “Nạp Excel CSDL” và chọn file Lịch báo giảng (có thể chọn nhiều file cùng lúc).';
    return 'CSDL hiện có ' + ks.length + ' tuần: ' + ks.map(function (n) { return 'Tuần ' + n + ' (' + weeks[n].lessons.length + ' tiết)'; }).join(', ') +
      '. <a href="#" id="sddClear">Xóa CSDL</a>';
  }
  function render(extraHtml, preview) {
    msg.innerHTML = (extraHtml ? extraHtml + '<br>' : '') + summary();
    exp.disabled = !Object.keys(weeks).length;
    var clr = document.getElementById('sddClear');
    if (clr) clr.addEventListener('click', function (e) {
      e.preventDefault();
      if (!confirm('Xóa toàn bộ dữ liệu đã nạp?')) return;
      weeks = {}; save(); out.innerHTML = ''; render('');
    });
    if (preview) {
      var w = preview, rows = w.lessons.slice().sort(function (a, b) { return rowOf(a.d, a.s, a.p) - rowOf(b.d, b.s, b.p); }).map(function (L) {
        return '<tr><td>' + DAYNAME[L.d] + (L.s === 'S' ? ' (sáng)' : ' (chiều)') + '</td><td>' + L.p + '</td><td>' + esc(L.subj) + '</td><td>' + esc(L.cls) + '</td><td>' + esc(L.ppct) + '</td><td>' + esc(L.lesson) + '</td></tr>';
      }).join('');
      out.innerHTML = '<div class="note">Dữ liệu Tuần ' + w.week + ' vừa nạp — kiểm tra trước khi xuất:</div><div class="tw"><table class="g"><thead><tr><th>Thứ / Buổi</th><th>Tiết học TKB</th><th>Môn học</th><th>Lớp</th><th>Tiết theo KHDH</th><th>Tên bài dạy</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
  }
  render('');

  load.addEventListener('click', function () { fi.click(); });
  fi.addEventListener('change', async function () {
    var files = Array.prototype.slice.call(this.files || []); this.value = '';
    if (!files.length) return;
    var okN = 0, lines = [], last = null;
    for (var i = 0; i < files.length; i++) {
      try {
        var w = parseWorkbookBuf(await files[i].arrayBuffer(), files[i].name);
        var replaced = !!weeks[w.week];
        weeks[w.week] = w; okN++; last = w;
        lines.push('✅ ' + esc(files[i].name) + ' → Tuần ' + w.week + ': ' + w.lessons.length + ' tiết' + (replaced ? ' (thay dữ liệu cũ của tuần này)' : ''));
        w.warnings.forEach(function (t) { lines.push('⚠️ Tuần ' + w.week + ': ' + esc(t)); });
      } catch (e) {
        lines.push('❌ ' + esc(files[i].name) + ': ' + esc(e && e.message ? e.message : 'không đọc được file .xlsx'));
      }
    }
    if (okN) save();
    render(lines.join('<br>'), files.length === 1 ? last : null);
  });
  exp.addEventListener('click', async function () {
    exp.disabled = true;
    try {
      var r = await build(weeks);
      var blob = new Blob([r.out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Sổ đồ dùng.xlsx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      render('✅ Đã xuất “Sổ đồ dùng.xlsx” gồm ' + r.sheets.length + ' trang tính (' + r.sheets.map(function (n) { return 'Tuần ' + n; }).join(', ') + ').' + (r.notes.length ? '<br>⚠️ ' + r.notes.map(esc).join('<br>⚠️ ') : ''));
    } catch (e) {
      render('❌ ' + esc(e && e.message ? e.message : 'Không xuất được file.'));
    }
  });
})();
