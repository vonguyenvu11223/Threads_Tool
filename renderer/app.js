/*
 * Logic giao diện.
 *
 * ⚠️ CSP trong index.html chặn `script-src` nội tuyến, nên KHÔNG gắn được
 * `onclick=` trong HTML — mọi thứ phải qua addEventListener. Đó là chủ ý: chặn
 * nội tuyến là hàng rào chống XSS, mà dữ liệu ở đây (chữ bình luận, tên người
 * dùng, kết quả tìm kiếm) đến từ người lạ trên Internet.
 *
 * Cùng lý do: dựng nội dung bằng `textContent`, KHÔNG bằng `innerHTML`. Một
 * bình luận chứa thẻ <img onerror=…> là đủ để chạy mã trong cửa sổ app.
 *
 * ⚠️ CSP còn đặt `style-src 'self'`, nên cũng không dùng được thuộc tính
 * `style=""` trong HTML. Gán qua CSSOM (`el.style.x = …`) thì vẫn được.
 */

/* ═══ Bắt lỗi toàn cục — ĐẶT ĐẦU TIÊN ═══
 *
 * Một lỗi ở tầng ngoài cùng của tệp này làm mọi addEventListener phía sau nó
 * KHÔNG được gắn. Hậu quả nhìn thấy: bấm nút không phản hồi gì cả, không lỗi,
 * không thông báo, giao diện vẫn vẽ ra bình thường. Đã vấp một lần.
 */
window.addEventListener('error', (e) => veLoiNang(e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', (e) => veLoiNang(String(e.reason?.message ?? e.reason)));

function veLoiNang(chu, tep, dong) {
  console.error('[lỗi nặng]', chu, tep, dong);
  let o = document.getElementById('loiNang');
  if (!o) {
    o = document.createElement('div');
    o.id = 'loiNang';
    document.body?.prepend(o);
  }
  o.textContent = `Lỗi giao diện — chụp màn hình này gửi lại:\n${chu}${tep ? `\n${tep}:${dong}` : ''}`;
}

const $ = (id) => document.getElementById(id);

/*
 * ⚠️ ĐẶT TÊN KHÁC `tt`, KHÔNG ĐƯỢC TRÙNG.
 *
 * `contextBridge.exposeInMainWorld('tt', …)` gắn `tt` lên window dưới dạng
 * thuộc tính KHÔNG cấu hình lại được. Khai `const tt` ở tầng ngoài cùng sẽ ném
 * `SyntaxError: Identifier 'tt' has already been declared`, mà lỗi CÚ PHÁP thì
 * cả tệp không chạy lấy một dòng — kể cả bộ bắt lỗi ngay trên đây.
 */
const api = window.tt;
if (!api) veLoiNang('Không nạp được cầu nối preload — window.tt không tồn tại.');

/* ═══════════════════ Icon ═══════════════════ */

/*
 * Icon vẽ bằng SVG thay vì emoji. Emoji đổi hình theo hệ điều hành và font,
 * nét dày mỏng không đồng đều, và không nhận màu chữ — ba thứ đủ để một giao
 * diện gọn gàng trông chắp vá.
 */
const HINH = {
  soan: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  bai: 'M4 5h16M4 12h16M4 19h10',
  chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20l1.3-3.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z',
  'banh-rang': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z',
  lich: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  tim: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  gui: 'M22 2 11 13M22 2l-7 20-4-9-9-4Z',
  xoa: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  an: 'M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-6M9.9 4.2A10 10 0 0 1 12 4c7 0 11 8 11 8a18.4 18.4 0 0 1-2.2 3.2M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2',
  bo: 'M18 6 6 18M6 6l12 12',
  mo: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  ok: 'M20 6 9 17l-5-5',
  canh: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  rong: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
};

const NS = 'http://www.w3.org/2000/svg';
function icon(ten) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.7');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  for (const d of (HINH[ten] ?? '').split(' M').filter(Boolean)) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d.startsWith('M') ? d : 'M' + d);
    s.append(p);
  }
  return s;
}

/* ═══════════════════ Tiện ích dựng DOM ═══════════════════ */

function el(the, thuocTinh = {}, con = []) {
  const e = document.createElement(the);
  for (const [k, v] of Object.entries(thuocTinh)) {
    if (v == null || v === false) continue;
    if (k === 'chu') e.textContent = v;
    else if (k === 'lop') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(con)) if (c) e.append(c);
  return e;
}

/** Nút có icon dẫn đầu. Gom lại vì kiểu nút này lặp ở khắp nơi. */
function nut(ten, chu, khiBam, lop = 'nut nho mo') {
  return el('button', { lop, onclick: khiBam, title: chu }, [icon(ten), el('span', { chu })]);
}

/** Trạng thái rỗng — luôn kèm lời chỉ dẫn, không bao giờ chỉ một câu cụt. */
function oRong(hinh, tieuDe, chiDan, nutPhu = null) {
  return el('div', { lop: 'rong-o' }, [icon(hinh), el('b', { chu: tieuDe }), el('span', { chu: chiDan }), nutPhu]);
}

const so = (x) => Number(x ?? 0).toLocaleString('vi-VN');
const hai = (x) => String(x).padStart(2, '0');

function gio(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const cach = Date.now() - d.getTime();
  if (cach < 60_000) return 'vừa xong';
  if (cach < 3600_000) return `${Math.floor(cach / 60_000)} phút trước`;
  if (cach < 86_400_000) return `${Math.floor(cach / 3600_000)} giờ trước`;
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/* ═══════════════════ Thông báo ═══════════════════ */

function bao(chu, loai = '') {
  const o = el('div', { lop: 'banh-mi ' + loai }, [
    loai ? icon(loai === 'tot' ? 'ok' : 'canh') : null,
    el('span', { chu }),
  ]);
  $('banhMiCot').append(o);
  const tat = () => {
    o.classList.add('di');
    setTimeout(() => o.remove(), 200);
  };
  setTimeout(tat, loai === 'xau' ? 7000 : 3200);
  o.addEventListener('click', tat);
}

/* ═══════════════════ Gọi tiến trình chính ═══════════════════ */

/**
 * Tiến trình chính LUÔN trả `{ok, du}` hoặc `{ok:false, loi}` — không bao giờ
 * ném. Ở đây quy ước lại thành ném, để nơi gọi viết try/catch cho gọn.
 */
async function goi(ten, thamSo) {
  const kq = await api[ten](thamSo);
  if (!kq.ok) {
    const e = new Error(kq.loi);
    e.hetHan = kq.hetHan;
    e.tho = kq.tho;
    throw e;
  }
  return kq.du;
}

/**
 * Bọc một thao tác: khoá nút + vòng quay trên chính nút đó, bắt lỗi, hiện thông báo.
 *
 * Không dùng lớp phủ toàn màn — che cả cửa sổ cho một lệnh gọi nửa giây là nặng
 * tay và làm người dùng mất chỗ đang đứng. Nhưng CHỈ khoá nút thôi cũng sai:
 * nút xám đứng im trông hệt như bấm hụt. Vòng quay ngay trên nút là mức vừa đủ —
 * biết là đang chạy, mà không mất ngữ cảnh.
 */
async function chay(ham, { imLang = false, nutKhoa = null } = {}) {
  if (nutKhoa) {
    nutKhoa.disabled = true;
    nutKhoa.classList.add('dang-cho');
  }
  try {
    return await ham();
  } catch (e) {
    if (!imLang) bao(e.message, 'xau');
    if (e.hetHan) chuyenMan('taiKhoan');
    return null;
  } finally {
    if (nutKhoa) {
      nutKhoa.disabled = false;
      nutKhoa.classList.remove('dang-cho');
    }
  }
}

/** Một dải xương chờ dữ liệu. */
const xuong = (lop = '') => el('span', { lop: 'xuong ' + lop });

/** Đặt khối "đang tải" có vòng quay vào một vùng danh sách. */
function dangTai(boc, chu) {
  boc.replaceChildren(el('div', { lop: 'tien-do', chu }));
}

/* ═══════════════════ Điều hướng ═══════════════════ */

const MAN = {
  soan: 'manSoan', baiDang: 'manBaiDang', tuongTac: 'manTuongTac',
  caiDat: 'manCaiDat', taiKhoan: 'manTaiKhoan',
};
let manDang = 'soan';

function chuyenMan(ten) {
  if (!MAN[ten]) return;
  manDang = ten;
  for (const [k, id] of Object.entries(MAN)) $(id).classList.toggle('dang', k === ten);
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('dang', t.dataset.man === ten);
  $('chipTaiKhoan').classList.toggle('dang', ten === 'taiKhoan');
  if (ten === 'baiDang') napBaiDang();
  if (ten === 'caiDat') veCaiDat();
}

for (const t of document.querySelectorAll('.tab')) {
  t.prepend(icon(t.dataset.icon));
  t.addEventListener('click', () => chuyenMan(t.dataset.man));
}
$('chipTaiKhoan').addEventListener('click', () => chuyenMan('taiKhoan'));

/* Phím tắt: Ctrl+1..4 đổi màn, Ctrl+Enter đăng bài. */
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const soMan = ['soan', 'baiDang', 'tuongTac', 'caiDat'][Number(e.key) - 1];
  if (soMan) { e.preventDefault(); chuyenMan(soMan); return; }
  if (e.key === 'Enter' && manDang === 'soan') { e.preventDefault(); $('nutDangNgay').click(); }
});

/* Nút phân đoạn trong màn Tương tác */
const O_TT = { binhLuan: 'oBinhLuan', nhacDen: 'oNhacDen', timKiem: 'oTimKiem' };
for (const b of document.querySelectorAll('.pd')) {
  b.addEventListener('click', () => {
    for (const [k, id] of Object.entries(O_TT)) $(id).classList.toggle('dang', k === b.dataset.o);
    for (const x of document.querySelectorAll('.pd')) x.classList.toggle('dang', x === b);
  });
}

/* ═══════════════════ Trạng thái chung ═══════════════════ */

let duLieu = null;
let hoSo = null;

async function napDuLieu() {
  duLieu = await goi('docDuLieu');
  return duLieu;
}

/* ═══════════════════ Tài khoản ═══════════════════ */

function oSo(nhan, giaTri, phu, lop = '') {
  return el('div', { lop: 'o-so ' + lop }, [
    el('span', { chu: nhan }),
    el('b', { chu: String(giaTri) }),
    phu ? el('small', { chu: phu }) : null,
  ]);
}

async function kiemPhien() {
  const p = await chay(() => goi('phienHienTai'), { imLang: true });
  if (!p?.daKetNoi) {
    hoSo = null;
    $('chuaKetNoi').hidden = false;
    $('daKetNoi').hidden = true;
    $('chipTen').textContent = 'Chưa kết nối';
    $('chipPhu').textContent = 'Bấm để kết nối';
    $('chipAnh').removeAttribute('src');
    $('hanMuc').hidden = true;
    return false;
  }

  hoSo = p.hoSo;
  $('chuaKetNoi').hidden = true;
  $('daKetNoi').hidden = false;
  $('chipTen').textContent = hoSo.name || hoSo.username || '–';
  $('chipPhu').textContent = '@' + (hoSo.username ?? '');
  $('hsTen').textContent = hoSo.name || hoSo.username || '–';
  $('hsUser').textContent = '@' + (hoSo.username ?? '');
  $('hsBio').textContent = hoSo.threads_biography ?? '';
  $('tenNhacDen').textContent = '@' + (hoSo.username ?? '');
  if (hoSo.threads_profile_picture_url) {
    $('hsAnh').src = hoSo.threads_profile_picture_url;
    $('chipAnh').src = hoSo.threads_profile_picture_url;
  }
  capNhatXemChuDe();

  // Đếm ngược hạn token. Người dùng cần thấy con số này TRƯỚC khi nó chết, vì
  // cứu được thì phải quay lại developers.facebook.com tạo mã mới.
  const conLai = Math.floor((p.hetHanLuc - Date.now()) / 86_400_000);
  $('soHetHan').replaceChildren(
    oSo('Token còn lại', `${conLai} ngày`, `hết hạn ${new Date(p.hetHanLuc).toLocaleDateString('vi-VN')}`,
      conLai < 7 ? 'xau' : conLai < 20 ? 'canh' : ''),
    oSo('Mã hoá', p.maHoa ? 'Có' : 'KHÔNG', p.maHoa ? 'khoá của Windows' : 'lưu chữ thường', p.maHoa ? '' : 'xau')
  );
  $('duongDuLieu').textContent = await goi('thuMucDuLieu');
  $('tinhTrangMaHoa').textContent = p.maHoa
    ? 'Token được mã hoá bằng kho khoá của hệ điều hành. Copy tệp sang máy khác cũng không đọc được.'
    : '⚠️ Máy này không dùng được kho khoá hệ điều hành, token đang lưu dạng chữ thường. Đừng chia sẻ thư mục trên.';

  napHanMuc();
  return true;
}

$('nutKetNoi').addEventListener('click', async (ev) => {
  const token = $('oToken').value.trim();
  if (!token) return bao('Chưa dán token.', 'xau');
  const kq = await chay(() => goi('ketNoi', { token }), { nutKhoa: ev.target });
  if (!kq) return;
  $('oToken').value = '';
  bao(`Đã kết nối @${kq.hoSo.username}`, 'tot');
  if (!kq.maHoa) bao('Máy này không mã hoá được — token lưu dạng chữ thường.', 'xau');
  await kiemPhien();
  chuyenMan('soan');
});

$('nutNgat').addEventListener('click', async () => {
  const dong = await xacNhan({
    tieuDe: 'Ngắt kết nối tài khoản?',
    dan: 'Token bị xoá khỏi máy này. Bài đã đăng và hàng đợi không bị ảnh hưởng, nhưng muốn dùng lại phải dán token.',
    nhan: 'Ngắt kết nối',
  });
  if (!dong) return;
  await chay(() => goi('ngatKetNoi'));
  await kiemPhien();
  chuyenMan('taiKhoan');
  bao('Đã ngắt kết nối.');
});

async function napHanMuc() {
  const h = await chay(() => goi('hanMuc'), { imLang: true });
  if (!h) return;
  $('hanMuc').hidden = false;
  const dat = (oChu, oThanh, dung, tran) => {
    $(oChu).textContent = `${dung}/${tran}`;
    const t = $(oThanh);
    const ty = tran ? dung / tran : 0;
    t.style.width = Math.min(100, ty * 100) + '%';
    t.className = ty >= 0.95 ? 'tran' : ty >= 0.8 ? 'gan-tran' : '';
  };
  dat('hanDang', 'hanDangThanh', h.daDang, h.tranDang);
  dat('hanTraLoi', 'hanTraLoiThanh', h.daTraLoi, h.tranTraLoi);
  dat('hanXoa', 'hanXoaThanh', h.daXoa, h.tranXoa);
}

/* ═══════════════════ Hộp xác nhận ═══════════════════ */

/**
 * `confirm()` sẵn có bị Electron chặn trong nhiều ngữ cảnh, và quan trọng hơn:
 * nó chỉ hiện được một dòng chữ. Thao tác không hoàn tác được thì phải cho
 * người ta ĐỌC LẠI thứ sắp mất — hỏi "Bạn chắc chứ?" trống rỗng thì họ bấm
 * Đồng ý theo phản xạ, và đó không phải xác nhận thật.
 */
function xacNhan({ tieuDe, dan, trich, nhan = 'Xoá' }) {
  return new Promise((xong) => {
    $('xnTieuDe').textContent = tieuDe;
    $('xnDan').textContent = dan;
    $('xnTrich').textContent = trich ?? '';
    $('xnTrich').hidden = !trich;
    $('xnDong').replaceChildren(el('span', { chu: nhan }));
    $('phuXacNhan').hidden = false;

    const dong = (kq) => {
      $('phuXacNhan').hidden = true;
      $('xnDong').removeEventListener('click', gat);
      $('xnHuy').removeEventListener('click', thoi);
      document.removeEventListener('keydown', phim, true);
      xong(kq);
    };
    const gat = () => dong(true);
    const thoi = () => dong(false);
    // Esc để thoát: thao tác nguy hiểm thì đường rút phải dễ hơn đường tiến.
    const phim = (e) => { if (e.key === 'Escape') { e.stopPropagation(); dong(false); } };

    $('xnDong').addEventListener('click', gat);
    $('xnHuy').addEventListener('click', thoi);
    document.addEventListener('keydown', phim, true);
    $('xnHuy').focus();
  });
}

/* ═══════════════════ Soạn & đăng ═══════════════════ */

const GIOI_HAN_CHU = 500;

function capNhatXemChuDe() {
  const cd = $('oChuDe').value.trim().replace(/^#+/, '') || 'skincare';
  $('xemChuDe').textContent = `@${hoSo?.username ?? 'bạn'} › ${cd}`;
}

function capNhatDemChu() {
  const chu = $('oChu').value;
  const khaiBao = $('oLink').value.trim() ? (duLieu?.caiDat.khaiBaoAffiliate ?? '') : '';
  const tong = chu.length + khaiBao.length;
  const d = $('demChu');
  d.textContent = `${tong} / ${GIOI_HAN_CHU}`;
  d.className = 'dem-chu' + (tong > GIOI_HAN_CHU ? ' qua' : tong > GIOI_HAN_CHU * 0.9 ? ' sap' : '');
  $('xemKhaiBao').textContent = khaiBao ? 'đã tính cả dòng khai báo tiếp thị liên kết' : '';
}

$('oChu').addEventListener('input', capNhatDemChu);
$('oLink').addEventListener('input', capNhatDemChu);
$('oChuDe').addEventListener('input', capNhatXemChuDe);

/*
 * Ô "cách gắn link" sống ở màn Soạn nhưng là một CÀI ĐẶT, không phải lựa chọn
 * cho riêng bài này — người ta chọn một kiểu rồi dùng mãi. Nên lưu ngay khi đổi.
 */
$('oKieuLink').addEventListener('change', async () => {
  await chay(() => goi('luuCaiDat', { caiDat: { kieuGanLink: $('oKieuLink').value } }), { imLang: true });
  await napDuLieu();
});

/*
 * Luật của Meta cho chủ đề: 1–50 ký tự, CẤM dấu chấm và dấu và.
 * Kiểm ở đây thay vì để máy chủ báo — lỗi từ Meta chỉ nói "tham số không hợp lệ"
 * mà không nói ký tự nào sai, và lúc đó bài đã đi được nửa đường.
 */
function kiemChuDe(chuDe) {
  if (!chuDe) return null;
  if (chuDe.length > 50) throw new Error(`Chủ đề dài ${chuDe.length} ký tự, Meta chỉ cho 50.`);
  const cam = [...chuDe].filter((c) => c === '.' || c === '&');
  if (cam.length) throw new Error(`Chủ đề không được chứa dấu ${[...new Set(cam)].join(' và ')}.`);
  // Người ta quen gõ hashtag nên hay thêm '#'. Cắt đi thay vì báo lỗi.
  return chuDe.replace(/^#+/, '').trim() || null;
}

function docBai() {
  const chu = $('oChu').value.trim();
  const link = $('oLink').value.trim();
  const anh = $('oAnh').value.trim();
  if (!chu && !anh) throw new Error('Bài trống — cần ít nhất nội dung hoặc ảnh.');
  const khaiBao = link ? (duLieu?.caiDat.khaiBaoAffiliate ?? '') : '';
  if (chu.length + khaiBao.length > GIOI_HAN_CHU)
    throw new Error(`Bài dài ${chu.length + khaiBao.length} ký tự, Threads chỉ cho ${GIOI_HAN_CHU}.`);
  return {
    chu, kieu: anh ? 'IMAGE' : 'TEXT', anhUrl: anh || null, link: link || null,
    chuDe: kiemChuDe($('oChuDe').value.trim()),
    kieuGanLink: $('oKieuLink').value, khaiBao,
  };
}

function xoaForm() {
  $('oChu').value = '';
  $('oLink').value = '';
  $('oAnh').value = '';
  // Chủ đề CỐ Ý giữ nguyên: người ta hay đăng nhiều bài cùng một chủ đề liên
  // tiếp, xoá đi là bắt gõ lại mỗi lần.
  capNhatDemChu();
}

$('nutDangNgay').addEventListener('click', async (ev) => {
  let bai;
  try { bai = docBai(); } catch (e) { return bao(e.message, 'xau'); }

  // Bài có ảnh phải chờ máy chủ Meta tải tệp về — nói trước để người dùng không
  // tưởng app treo rồi bấm lại lần nữa thành hai bài.
  if (bai.kieu !== 'TEXT') bao('Bài có ảnh mất khoảng 30 giây, đừng đóng app.');

  $('tienDoDang').hidden = false;
  $('tienDoDang').textContent = 'Bắt đầu…';
  const kq = await chay(() => goi('dangBai', { bai }), { nutKhoa: ev.currentTarget });
  $('tienDoDang').hidden = true;
  if (!kq) return;

  if (kq.canhBao) bao(kq.canhBao, 'xau');
  else bao('Đã đăng', 'tot');
  xoaForm();
  napHanMuc();
});

$('nutHenGio').addEventListener('click', () => {
  const t = $('theHenGio');
  t.hidden = !t.hidden;
  if (!t.hidden) $('oLuc').focus();
});

/* ── Hẹn giờ: gõ tay theo DD/MM/YYYY, hoặc bấm nút mở lịch ── */

$('nutLich').append(icon('lich'));

/**
 * Đọc "27/08/2026 14:22" thành mốc thời gian. Trả null nếu không đọc được.
 *
 * ⚠️ Phải kiểm ngược ngày sau khi dựng Date. `new Date(2026, 1, 31)` KHÔNG báo
 * lỗi mà lặng lẽ nhảy sang 03/03 — hẹn giờ vào 31/02 thì bài đăng lệch hai ngày
 * mà không có gì cảnh báo.
 */
function docThoiDiem(chu) {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?$/.exec((chu ?? '').trim());
  if (!m) return null;
  const [, ng, th, nam, g = '0', p = '0'] = m;
  if (+g > 23 || +p > 59) return null;
  const t = new Date(+nam, +th - 1, +ng, +g, +p, 0, 0);
  if (t.getDate() !== +ng || t.getMonth() !== +th - 1 || t.getFullYear() !== +nam) return null;
  return t.getTime();
}

function vietThoiDiem(t) {
  const d = new Date(t);
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/** Đọc lại ô và hiện câu xác nhận — người dùng thấy ngay mình gõ có đúng không. */
function xemThoiDiem() {
  const o = $('ghiLuc');
  const chu = $('oLuc').value.trim();
  if (!chu) return void (o.textContent = 'Định dạng: ngày/tháng/năm giờ:phút');

  const t = docThoiDiem(chu);
  if (t == null) return void (o.textContent = '⚠️ Chưa đọc được — cần dạng 27/08/2026 14:30');

  const d = new Date(t);
  const thu = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()];
  if (t <= Date.now()) return void (o.textContent = `⚠️ ${thu}, ${vietThoiDiem(t)} — thời điểm này đã trôi qua`);

  const phut = Math.round((t - Date.now()) / 60000);
  const con = phut < 60 ? `${phut} phút nữa` : phut < 1440 ? `${Math.round(phut / 60)} giờ nữa` : `${Math.round(phut / 1440)} ngày nữa`;
  o.textContent = `${thu}, ${vietThoiDiem(t)} — còn ${con}`;
}

$('oLuc').addEventListener('input', xemThoiDiem);

$('nutLich').addEventListener('click', () => {
  const o = $('oLucChon');
  // Nạp sẵn giá trị đang gõ để lịch mở đúng chỗ, chứ không nhảy về hôm nay.
  const t = docThoiDiem($('oLuc').value);
  const d = t ? new Date(t) : new Date(Date.now() + 3600_000);
  o.value = `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}T${hai(d.getHours())}:${hai(d.getMinutes())}`;
  if (typeof o.showPicker === 'function') o.showPicker();
  else o.focus();
});

$('oLucChon').addEventListener('change', () => {
  const v = $('oLucChon').value;
  if (!v) return;
  $('oLuc').value = vietThoiDiem(new Date(v).getTime());
  xemThoiDiem();
});

$('nutThemHangDoi').addEventListener('click', async (ev) => {
  let bai;
  try { bai = docBai(); } catch (e) { return bao(e.message, 'xau'); }
  const luc = docThoiDiem($('oLuc').value);
  if (luc == null) return bao('Chưa đọc được thời điểm. Gõ dạng 27/08/2026 14:30, hoặc bấm nút lịch.', 'xau');
  if (luc < Date.now()) return bao('Thời điểm đã trôi qua.', 'xau');

  await chay(() => goi('themHangDoi', { bai, luc }), { nutKhoa: ev.currentTarget });
  await napDuLieu();
  veHangDoi();
  xoaForm();
  bao(`Đã hẹn ${vietThoiDiem(luc)} — nhớ để app mở.`, 'tot');
});

const NHAN_TT = {
  cho: ['cho', 'Chờ'],
  'dang-dang': ['chay', 'Đang đăng'],
  xong: ['xong', 'Xong'],
  loi: ['loi', 'Lỗi'],
  'lo-gio': ['tre', 'Lỡ giờ'],
};

/** Bao lâu sau giờ hẹn thì máy chủ coi là lỡ — phải khớp CUA_SO_TRE bên main.cjs. */
const PHUT_TRE = 30;

function veHangDoi() {
  const ds = duLieu?.hangDoi ?? [];
  const cho = ds.filter((x) => x.trangThai === 'cho').length;
  const tre = ds.filter((x) => x.trangThai === 'lo-gio').length;
  $('demHangDoi').textContent = tre ? `${cho} · ${tre} lỡ giờ` : cho;

  const boc = $('dsHangDoi');
  if (!ds.length) {
    boc.replaceChildren(oRong('lich', 'Chưa có bài nào chờ', 'Soạn bài rồi bấm Hẹn giờ ở đầu màn để xếp vào đây.'));
    return;
  }

  boc.replaceChildren(
    ...[...ds].sort((a, b) => a.luc - b.luc).map((m) => {
      const [lop, chu] = NHAN_TT[m.trangThai] ?? ['cho', m.trangThai];
      const dangBuDuoc = m.trangThai === 'lo-gio' || m.trangThai === 'loi';

      return el('div', { lop: 'muc' }, [
        el('div', { lop: 'muc-dau' }, [
          el('span', { lop: 'nhan-tt ' + lop, chu }),
          el('time', { chu: vietThoiDiem(m.luc) }),
          m.bai.chuDe ? el('span', { lop: 'ghi-phu', chu: '› ' + m.bai.chuDe }) : null,
        ]),
        el('div', { lop: 'muc-chu', chu: (m.bai.chu || '(chỉ ảnh)').slice(0, 180) }),

        // Lỡ giờ không phải lỗi — giải thích rõ chuyện gì đã xảy ra và app đã
        // KHÔNG làm gì, để người dùng không phải đoán.
        m.trangThai === 'lo-gio'
          ? el('div', { lop: 'muc-goc', chu:
              `Đã qua giờ hẹn hơn ${PHUT_TRE} phút nên app không tự đăng — nhiều khả năng lúc đó máy tắt hoặc app đóng. Bài vẫn còn nguyên, bạn tự chọn đăng bù hay bỏ.` })
          : null,

        m.loi ? el('div', { lop: 'muc-goc', chu: m.loi }) : null,
        // Nguyên văn lỗi từ tầng dưới. Xấu, nhưng là thứ duy nhất truy được khi
        // câu dịch sẵn không đủ để biết chuyện gì thật sự xảy ra.
        m.tho ? el('div', { lop: 'muc-goc', chu: 'Chi tiết: ' + m.tho }) : null,
        m.canhBao ? el('div', { lop: 'muc-goc', chu: m.canhBao }) : null,

        el('div', { lop: 'hang' }, [
          dangBuDuoc
            ? el('button', {
                lop: 'nut chinh nho',
                onclick: async (ev) => {
                  const kq = await chay(() => goi('dangNgayHangDoi', { id: m.id }), { nutKhoa: ev.currentTarget });
                  await napDuLieu();
                  veHangDoi();
                  napHanMuc();
                  if (kq === 'xong') bao('Đã đăng bù', 'tot');
                },
              }, [icon('gui'), el('span', { chu: 'Đăng bây giờ' })])
            : null,
          nut('bo', m.trangThai === 'cho' ? 'Huỷ' : 'Xoá khỏi danh sách', async () => {
            await chay(() => goi('xoaHangDoi', { id: m.id }));
            await napDuLieu();
            veHangDoi();
          }),
        ]),
      ]);
    })
  );
}

api.nghe('tien-do-dang', (chu) => {
  $('tienDoDang').hidden = false;
  $('tienDoDang').textContent = chu;
});
api.nghe('hang-doi-doi', async () => {
  await napDuLieu();
  veHangDoi();
  napHanMuc();
});

/* ═══════════════════ Bài đăng & thống kê ═══════════════════ */

let baiDaNap = [];

async function napBaiDang() {
  if (!hoSo) {
    $('thanBangBai').replaceChildren(
      el('tr', {}, el('td', { colspan: '8' },
        oRong('chat', 'Chưa kết nối tài khoản', 'Dán token ở màn Tài khoản để xem bài đăng và thống kê.')))
    );
    return;
  }

  /*
   * Vẽ khung xương TRƯỚC khi gọi mạng. Màn này gọi 26 lệnh (1 lấy danh sách +
   * 25 lấy thống kê từng bài) nên mất vài giây — để trống suốt quãng đó thì
   * người dùng tưởng bấm hụt và bấm lại lần nữa.
   */
  $('soTaiKhoan').replaceChildren(...Array.from({ length: 6 }, () =>
    el('div', { lop: 'o-so' }, [xuong(), xuong('cao')])));
  $('thanBangBai').replaceChildren(...Array.from({ length: 6 }, () =>
    el('tr', {}, Array.from({ length: 8 }, () => el('td', {}, xuong())))));

  const tk = await chay(() => goi('thongKeTaiKhoan'), { imLang: true });
  if (tk) {
    $('soTaiKhoan').replaceChildren(
      oSo('Người theo dõi', so(tk.followers_count)),
      oSo('Lượt xem', so(tk.views)),
      oSo('Lượt thích', so(tk.likes)),
      oSo('Bình luận', so(tk.replies)),
      oSo('Đăng lại', so(tk.reposts)),
      oSo('Trích dẫn', so(tk.quotes))
    );
  }

  const bai = await chay(() => goi('layBaiDang', { limit: 25 }));
  if (!bai) { baiDaNap = []; veBangBai(); return; }

  // Thống kê phải hỏi TỪNG bài — Meta không có đường lấy cả cụm. Chạy song song
  // cho nhanh; hạn mức 4.800 lệnh/ngày nên không đáng lo.
  const ds = bai.data ?? [];
  const soLieu = await Promise.all(
    ds.map((b) => api.thongKeBai({ baiId: b.id }).then((r) => (r.ok ? r.du : {})).catch(() => ({})))
  );
  baiDaNap = ds.map((b, i) => ({ ...b, tk: soLieu[i] }));
  veBangBai();
}

function veBangBai() {
  const khoa = $('sapXep').value;
  const ds = [...baiDaNap].sort((a, b) =>
    khoa === 'timestamp' ? new Date(b.timestamp) - new Date(a.timestamp) : (b.tk[khoa] ?? 0) - (a.tk[khoa] ?? 0)
  );

  const than = $('thanBangBai');
  if (!ds.length) {
    than.replaceChildren(el('tr', {}, el('td', { colspan: '8' },
      oRong('bai', 'Chưa có bài nào', 'Sang màn Soạn & đăng để đăng bài đầu tiên.',
        el('button', { lop: 'nut', chu: 'Soạn bài', onclick: () => chuyenMan('soan') }))))
    );
    return;
  }

  than.replaceChildren(...ds.map((b) =>
    el('tr', {}, [
      el('td', { lop: 'chu-bai' }, [
        document.createTextNode((b.text ?? '(không có chữ)').slice(0, 120)),
        el('time', { chu: gio(b.timestamp) + (b.link_attachment_url ? ' · có link' : '') }),
      ]),
      el('td', { lop: 'r', chu: so(b.tk.views) }),
      el('td', { lop: 'r', chu: so(b.tk.likes) }),
      el('td', { lop: 'r', chu: so(b.tk.replies) }),
      el('td', { lop: 'r', chu: so(b.tk.reposts) }),
      el('td', { lop: 'r', chu: so(b.tk.shares) }),
      el('td', {}, el('span', { lop: 'the-chu-de', chu: b.topic_tag ? '› ' + b.topic_tag : '—' })),
      el('td', {}, el('div', { lop: 'o-nut' }, [
        b.permalink ? nut('mo', 'Mở', () => goi('moNgoai', { url: b.permalink }).catch(() => {})) : null,
        nut('xoa', 'Xoá', () => xoaMotBai(b), 'nut nho mo xoa'),
      ])),
    ])
  ));
}

$('sapXep').addEventListener('change', veBangBai);
$('nutLamMoiTK').addEventListener('click', (e) => chay(() => napBaiDang(), { nutKhoa: e.currentTarget }));

async function xoaMotBai(b) {
  const dong = await xacNhan({
    tieuDe: 'Xoá bài này khỏi Threads?',
    dan: 'Threads không có thùng rác — xoá rồi là mất hẳn. Bình luận và lượt thích dưới bài cũng mất theo.',
    trich: (b.text ?? '(bài không có chữ)') + (b.topic_tag ? `\n\n› ${b.topic_tag}` : ''),
    nhan: 'Xoá hẳn',
  });
  if (!dong) return;

  const kq = await chay(() => goi('xoaBai', { baiId: b.id }));
  if (!kq) return;
  bao('Đã xoá.', 'tot');
  // Bỏ khỏi danh sách tại chỗ thay vì nạp lại cả trang — nạp lại là 25 lệnh gọi
  // thống kê nữa, tốn hạn mức cho một thay đổi đã biết chắc kết quả.
  baiDaNap = baiDaNap.filter((x) => x.id !== b.id);
  veBangBai();
  napHanMuc();
}

/* ═══════════════════ Tương tác — bình luận ═══════════════════ */

/** Bao nhiêu bài gần nhất được quét. Quét hết là chậm mà bài cũ thì hiếm ai bình luận thêm. */
const SO_BAI_QUET = 15;

/** Soạn sẵn câu trả lời theo mẫu. Rỗng nghĩa là không mẫu nào khớp. */
function soanTraLoi(chuBinhLuan) {
  const thuong = (chuBinhLuan ?? '').toLowerCase();
  for (const m of duLieu?.mauTraLoi ?? []) {
    if (m.tuKhoa.some((t) => t && thuong.includes(t.toLowerCase()))) return m.cau;
  }
  return '';
}

$('nutQuetBinhLuan').addEventListener('click', quetBinhLuan);

async function quetBinhLuan() {
  if (!hoSo) return bao('Chưa kết nối tài khoản.', 'xau');
  const td = $('tienDoQuet');
  td.hidden = false;
  td.textContent = 'Đang lấy danh sách bài…';
  $('nutQuetBinhLuan').disabled = true;

  const bai = await chay(() => goi('layBaiDang', { limit: SO_BAI_QUET }));
  if (!bai) { td.hidden = true; $('nutQuetBinhLuan').disabled = false; return; }

  const ds = bai.data ?? [];
  const daXuLy = new Set(duLieu?.daXuLy ?? []);
  const gom = [];

  for (let i = 0; i < ds.length; i++) {
    td.textContent = `Đang quét bài ${i + 1}/${ds.length}…`;
    const r = await api.binhLuanCuaBai({ baiId: ds[i].id }).catch(() => ({ ok: false }));
    if (!r.ok) continue;
    for (const bl of r.du?.data ?? []) {
      // Bỏ trả lời của chính mình, và cái đã xử lý ở lần quét trước.
      if (bl.is_reply_owned_by_me) continue;
      if (bl.username && hoSo.username && bl.username === hoSo.username) continue;
      if (daXuLy.has(bl.id)) continue;
      gom.push({ ...bl, baiGoc: ds[i] });
    }
  }

  td.hidden = true;
  $('nutQuetBinhLuan').disabled = false;
  veBinhLuan(gom);
  bao(gom.length ? `Tìm thấy ${gom.length} bình luận chưa xử lý.` : 'Không có bình luận mới.', gom.length ? 'tot' : '');
}

function veBinhLuan(ds) {
  capNhatDemBinhLuan(ds.length);
  const boc = $('dsBinhLuan');
  if (!ds.length) {
    boc.replaceChildren(oRong('rong', 'Không có bình luận nào chờ xử lý',
      'Quét lại sau khi có người bình luận vào bài của bạn.'));
    return;
  }
  boc.replaceChildren(...ds.map(veMotBinhLuan));
}

function capNhatDemBinhLuan(n) {
  const a = $('demTuongTac'), b = $('demPdBinhLuan');
  a.hidden = b.hidden = !n;
  a.textContent = b.textContent = n;
}

function veMotBinhLuan(bl) {
  const goiY = soanTraLoi(bl.text);
  const oTraLoi = el('textarea', { rows: '2', placeholder: 'Câu trả lời…' });
  oTraLoi.value = goiY;

  const muc = el('div', { lop: 'muc' }, [
    el('div', { lop: 'muc-dau' }, [
      el('b', { chu: '@' + (bl.username ?? '?') }),
      el('time', { chu: gio(bl.timestamp) }),
      bl.permalink ? nut('mo', 'Xem trên Threads', () => goi('moNgoai', { url: bl.permalink }).catch(() => {})) : null,
    ]),
    el('div', { lop: 'muc-goc', chu: 'Dưới bài: ' + (bl.baiGoc?.text ?? '').slice(0, 80) }),
    el('div', { lop: 'muc-chu', chu: bl.text ?? '(không có chữ)' }),
    el('label', { chu: goiY ? 'Máy soạn sẵn — sửa rồi gửi' : 'Không mẫu nào khớp, tự viết' }),
    oTraLoi,
    el('div', { lop: 'hang' }, [
      el('button', {
        lop: 'nut chinh nho',
        onclick: async (ev) => {
          const chu = oTraLoi.value.trim();
          if (!chu) return bao('Câu trả lời đang trống.', 'xau');
          const kq = await chay(() => goi('traLoi', { binhLuanId: bl.id, chu }), { nutKhoa: ev.currentTarget });
          if (!kq) return;
          bao('Đã gửi', 'tot');
          muc.remove();
          demLaiBinhLuan();
          napHanMuc();
        },
      }, [icon('gui'), el('span', { chu: 'Gửi trả lời' })]),
      nut('bo', 'Bỏ qua', async () => {
        await chay(() => goi('boQua', { ids: [bl.id] }));
        await napDuLieu();
        muc.remove();
        demLaiBinhLuan();
      }),
      nut('an', 'Ẩn bình luận', async (ev) => {
        const kq = await chay(() => goi('anBinhLuan', { binhLuanId: bl.id, an: true }), { nutKhoa: ev.currentTarget });
        if (!kq) return;
        await chay(() => goi('boQua', { ids: [bl.id] }));
        await napDuLieu();
        bao('Đã ẩn.');
        muc.remove();
        demLaiBinhLuan();
      }, 'nut nho mo xoa'),
    ]),
  ]);
  return muc;
}

function demLaiBinhLuan() {
  const conLai = $('dsBinhLuan').querySelectorAll('.muc').length;
  capNhatDemBinhLuan(conLai);
  if (!conLai) {
    $('dsBinhLuan').replaceChildren(oRong('ok', 'Đã xử lý hết', 'Không còn bình luận nào chờ bạn.'));
  }
}

/* ═══════════════════ Tương tác — nhắc đến ═══════════════════ */

$('nutQuetNhacDen').addEventListener('click', async (ev) => {
  if (!hoSo) return bao('Chưa kết nối tài khoản.', 'xau');
  const boc = $('dsNhacDen');
  dangTai(boc, 'Đang tải lượt nhắc…');
  const r = await chay(() => goi('nhacDen'), { nutKhoa: ev.currentTarget });
  if (!r) {
    boc.replaceChildren(oRong('rong', 'Không tải được', 'Xem thông báo lỗi ở góc phải để biết lý do.'));
    return;
  }
  const ds = r.data ?? [];
  if (!ds.length) {
    boc.replaceChildren(oRong('rong', 'Không có lượt nhắc nào',
      'Rất có thể do quyền chưa được duyệt truy cập nâng cao chứ không phải không ai nhắc tới bạn — xem lưu ý phía trên.'));
    return;
  }
  boc.replaceChildren(...ds.map((m) => veBaiNgoai(m, 'Trả lời lượt nhắc này')));
  bao(`Có ${ds.length} lượt nhắc.`, 'tot');
});

/* ═══════════════════ Tương tác — tìm kiếm ═══════════════════ */

$('nutTim').append(icon('tim'));

function veTuKhoaLuu() {
  const ds = duLieu?.tuKhoaLuu ?? [];
  $('dsTuKhoaLuu').replaceChildren(...ds.map((t) =>
    el('button', {
      lop: 'the-tu-khoa', chu: t,
      onclick: () => { $('oTuKhoa').value = t; $('nutTim').click(); },
    })
  ));
}

$('nutTim').addEventListener('click', async (ev) => {
  if (!hoSo) return bao('Chưa kết nối tài khoản.', 'xau');
  const tuKhoa = $('oTuKhoa').value.trim();
  if (!tuKhoa) return bao('Chưa nhập từ khoá.', 'xau');

  dangTai($('dsTimKiem'), `Đang tìm “${tuKhoa}” trên Threads…`);
  const r = await chay(() => goi('timKiem', {
    tuKhoa, che: $('oCheTim').value, kieu: $('oKieuTim').value, soLuong: 25,
  }), { nutKhoa: ev.currentTarget });
  if (!r) {
    $('dsTimKiem').replaceChildren(oRong('tim', 'Không tìm được', 'Xem thông báo lỗi ở góc phải để biết lý do.'));
    return;
  }

  const ds = (r.data ?? []).filter((m) => m.username !== hoSo.username);
  const boc = $('dsTimKiem');
  if (!ds.length) {
    boc.replaceChildren(oRong('tim', 'Không tìm thấy bài nào',
      'Thử từ khoá khác, hoặc đổi sang chế độ Mới nhất. Truy vấn không ra kết quả thì không bị trừ hạn mức.'));
    return;
  }
  boc.replaceChildren(...ds.map((m) => veBaiNgoai(m, 'Trả lời bài này')));
  bao(`Tìm thấy ${ds.length} bài.`, 'tot');
});

$('oTuKhoa').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('nutTim').click(); });

/**
 * Một bài của người khác (kết quả tìm kiếm hoặc lượt nhắc), kèm ô trả lời.
 * Dùng chung để hai màn không lệch nhau về hành vi.
 */
function veBaiNgoai(m, nhanO) {
  const oTraLoi = el('textarea', { rows: '2', placeholder: 'Viết câu trả lời…' });

  const muc = el('div', { lop: 'muc' }, [
    el('div', { lop: 'muc-dau' }, [
      el('b', { chu: '@' + (m.username ?? '?') }),
      el('time', { chu: gio(m.timestamp) }),
      m.topic_tag ? el('span', { lop: 'ghi-phu', chu: '› ' + m.topic_tag }) : null,
      m.permalink ? nut('mo', 'Xem trên Threads', () => goi('moNgoai', { url: m.permalink }).catch(() => {})) : null,
    ]),
    el('div', { lop: 'muc-chu', chu: m.text ?? '(bài không có chữ)' }),
    el('label', { chu: nhanO }),
    oTraLoi,
    el('div', { lop: 'hang' }, [
      el('button', {
        lop: 'nut chinh nho',
        onclick: async (ev) => {
          const chu = oTraLoi.value.trim();
          if (!chu) return bao('Câu trả lời đang trống.', 'xau');
          const kq = await chay(() => goi('traLoiBai', { baiId: m.id, chu }), { nutKhoa: ev.currentTarget });
          if (!kq) return;
          bao('Đã gửi', 'tot');
          muc.remove();
          napHanMuc();
        },
      }, [icon('gui'), el('span', { chu: 'Gửi trả lời' })]),
      nut('bo', 'Bỏ qua', () => muc.remove()),
    ]),
  ]);
  return muc;
}

/* ═══════════════════ Cài đặt ═══════════════════ */

function veCaiDat() {
  if (!duLieu) return;
  $('oKhaiBao').value = duLieu.caiDat.khaiBaoAffiliate ?? '';
  veMau(duLieu.mauTraLoi ?? []);
  veTuKhoaSua(duLieu.tuKhoaLuu ?? []);
}

function veMau(ds) {
  $('dsMau').replaceChildren(...ds.map((m, i) => {
    const oTu = el('input', { type: 'text', placeholder: 'giá, bao nhiêu, price', value: (m.tuKhoa ?? []).join(', ') });
    const oCau = el('input', { type: 'text', placeholder: 'Câu trả lời soạn sẵn', value: m.cau ?? '' });
    oTu.dataset.chiSo = i; oTu.dataset.vaiTro = 'tuKhoa';
    oCau.dataset.chiSo = i; oCau.dataset.vaiTro = 'cau';
    return el('div', { lop: 'mau-dong' }, [
      oTu, oCau,
      nut('bo', 'Xoá mẫu', () => { const moi = docMauTuForm(); moi.splice(i, 1); veMau(moi); }, 'nut nho mo xoa'),
    ]);
  }));
}

function docMauTuForm() {
  const ds = [];
  for (const o of $('dsMau').querySelectorAll('input')) {
    const i = Number(o.dataset.chiSo);
    ds[i] ??= { tuKhoa: [], cau: '' };
    if (o.dataset.vaiTro === 'tuKhoa') ds[i].tuKhoa = o.value.split(',').map((s) => s.trim()).filter(Boolean);
    else ds[i].cau = o.value;
  }
  return ds.filter(Boolean);
}

function veTuKhoaSua(ds) {
  $('dsTuKhoaSua').replaceChildren(...ds.map((t, i) => {
    const o = el('input', { type: 'text', value: t, placeholder: 'kem chống nắng' });
    return el('div', { lop: 'tu-dong' }, [
      o,
      nut('bo', 'Xoá từ khoá', () => { const moi = docTuKhoaTuForm(); moi.splice(i, 1); veTuKhoaSua(moi); }, 'nut nho mo xoa'),
    ]);
  }));
}

const docTuKhoaTuForm = () =>
  [...$('dsTuKhoaSua').querySelectorAll('input')].map((o) => o.value.trim()).filter(Boolean);

$('nutThemMau').addEventListener('click', () => veMau([...docMauTuForm(), { tuKhoa: [], cau: '' }]));
$('nutThemTuKhoa').addEventListener('click', () => veTuKhoaSua([...docTuKhoaTuForm(), '']));

$('nutLuuCaiDat').addEventListener('click', async (ev) => {
  const mau = docMauTuForm().filter((m) => m.tuKhoa.length && m.cau.trim());
  const tu = docTuKhoaTuForm();
  const kq = await chay(async () => {
    await goi('luuCaiDat', { caiDat: { khaiBaoAffiliate: $('oKhaiBao').value } });
    await goi('luuMau', { mauTraLoi: mau });
    await goi('luuTuKhoa', { tuKhoaLuu: tu });
    return true;
  }, { nutKhoa: ev.currentTarget });
  if (!kq) return;
  await napDuLieu();
  veCaiDat();
  veTuKhoaLuu();
  capNhatDemChu();
  bao('Đã lưu cài đặt', 'tot');
});

/* ═══════════════════ Khởi động ═══════════════════ */

console.log('[khởi động] app.js nạp hết, đã gắn xong sự kiện');

(async function batDau() {
  await napDuLieu();
  $('oKieuLink').value = duLieu.caiDat.kieuGanLink ?? 'binh-luan';
  veHangDoi();
  veTuKhoaLuu();
  capNhatDemChu();
  capNhatXemChuDe();
  xemThoiDiem();
  veBinhLuan([]);
  $('dsNhacDen').replaceChildren(oRong('rong', 'Chưa tải', 'Bấm “Tải lượt nhắc” để xem.'));
  $('dsTimKiem').replaceChildren(oRong('tim', 'Chưa tìm gì', 'Nhập từ khoá rồi bấm Tìm, hoặc bấm một từ khoá đã lưu.'));

  const co = await kiemPhien();
  chuyenMan(co ? 'soan' : 'taiKhoan');
})();
