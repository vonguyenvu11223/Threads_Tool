/*
 * Nơi cất dữ liệu trên máy.
 *
 * Chia làm HAI tệp, cố ý:
 *   `phien.json`  — token, mã hoá bằng safeStorage của hệ điều hành
 *   `du-lieu.json` — mọi thứ còn lại, chữ thường đọc được
 *
 * Tách ra vì token là thứ duy nhất mất đi thì thiệt hại thật. Gộp chung thì mỗi
 * lần sửa một cái mẫu trả lời cũng phải giải mã và mã hoá lại cả tệp — nhiều
 * đường ghi hơn nghĩa là nhiều đường làm hỏng token hơn.
 */
const fs = require('node:fs');
const path = require('node:path');
const { app, safeStorage } = require('electron');

const THU_MUC = app.getPath('userData');
const TEP_PHIEN = path.join(THU_MUC, 'phien.json');
const TEP_DU_LIEU = path.join(THU_MUC, 'du-lieu.json');

function docJson(tep, macDinh) {
  try {
    return JSON.parse(fs.readFileSync(tep, 'utf8'));
  } catch {
    return macDinh;
  }
}

function ghiJson(tep, du) {
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  fs.writeFileSync(tep, JSON.stringify(du, null, 2));
}

/* ═══════════════════ Token ═══════════════════ */

/**
 * Cất token.
 *
 * `safeStorage` khoá bằng DPAPI của Windows (Keychain trên macOS) — khoá nằm
 * trong tài khoản người dùng của hệ điều hành, nên kẻ copy được tệp sang máy
 * khác vẫn không đọc nổi.
 *
 * ⚠️ Không phải máy nào cũng có. Máy Linux thiếu keyring, hoặc profile Windows
 * hỏng, thì `isEncryptionAvailable()` trả false. Khi đó vẫn cho chạy nhưng lưu
 * chữ thường VÀ ghi cờ `maHoa:false` — để giao diện nói thẳng với người dùng,
 * chứ không lặng lẽ hạ mức bảo vệ sau lưng họ.
 */
function luuToken(token) {
  const coTheMaHoa = safeStorage.isEncryptionAvailable();
  ghiJson(TEP_PHIEN, {
    maHoa: coTheMaHoa,
    token: coTheMaHoa ? safeStorage.encryptString(token).toString('base64') : token,
    taoLuc: Date.now(),
    giaHanLuc: Date.now(),
  });
  return coTheMaHoa;
}

function docToken() {
  const p = docJson(TEP_PHIEN, null);
  if (!p?.token) return null;
  try {
    const token = p.maHoa ? safeStorage.decryptString(Buffer.from(p.token, 'base64')) : p.token;
    return { token, maHoa: !!p.maHoa, taoLuc: p.taoLuc ?? 0, giaHanLuc: p.giaHanLuc ?? p.taoLuc ?? 0 };
  } catch {
    // Giải mã hỏng = đổi máy hoặc profile Windows dựng lại. Coi như chưa đăng nhập.
    return null;
  }
}

/** Ghi đè token sau khi gia hạn, giữ nguyên mốc tạo ban đầu để biết đã dùng bao lâu. */
function capNhatToken(token) {
  const cu = docJson(TEP_PHIEN, {});
  const coTheMaHoa = safeStorage.isEncryptionAvailable();
  ghiJson(TEP_PHIEN, {
    maHoa: coTheMaHoa,
    token: coTheMaHoa ? safeStorage.encryptString(token).toString('base64') : token,
    taoLuc: cu.taoLuc ?? Date.now(),
    giaHanLuc: Date.now(),
  });
}

function xoaToken() {
  try {
    fs.unlinkSync(TEP_PHIEN);
  } catch {}
}

/* ═══════════════════ Dữ liệu thường ═══════════════════ */

const MAC_DINH = {
  caiDat: {
    // Meta bắt công khai quan hệ có trả tiền. Để mặc định BẬT và cho sửa chữ,
    // chứ không cho tắt — quên một bài là rủi ro khoá tài khoản.
    khaiBaoAffiliate: '\n\n—\nBài có gắn link tiếp thị liên kết, tôi nhận hoa hồng khi bạn mua qua link.',
    // 'trong-bai' gắn thẳng link_attachment · 'binh-luan' đăng link ở trả lời đầu
    kieuGanLink: 'binh-luan',
    tuDongLayBinhLuan: true,
  },
  // Hàng đợi hẹn giờ. CHỈ chạy khi app đang mở — máy tắt thì không có gì đăng.
  hangDoi: [],
  // Mẫu trả lời: từ khoá → câu soạn sẵn. Máy chỉ SOẠN, người bấm gửi.
  mauTraLoi: [
    { tuKhoa: ['giá', 'bao nhiêu', 'bnhiêu', 'price'], cau: 'Giá đang là {gia} bạn nhé, link mình để ở bình luận đầu ạ 👇' },
    { tuKhoa: ['link', 'mua ở đâu', 'shop nào', 'ở đâu'], cau: 'Link mình để ngay bình luận đầu tiên nha bạn 👆' },
    { tuKhoa: ['ship', 'giao hàng', 'freeship'], cau: 'Shop có hỗ trợ ship toàn quốc bạn nhé, phí tuỳ khu vực ạ.' },
    { tuKhoa: ['còn hàng', 'còn ko', 'còn không', 'hết hàng'], cau: 'Còn hàng bạn nhé, bạn bấm link ở bình luận đầu để đặt ạ 👇' },
  ],
  // Id bình luận đã xử lý — để không soạn lại cái đã trả lời hoặc đã bỏ qua.
  daXuLy: [],
  // Từ khoá theo dõi thường xuyên. Hạn mức tìm kiếm là 2.200 lượt/24h nên lưu
  // sẵn để bấm một cái là tra, đỡ gõ lại và đỡ gõ sai làm tốn lượt.
  tuKhoaLuu: ['kem chống nắng', 'gợi ý skincare'],
  // Bản nháp đang soạn dở, giữ lại khi lỡ đóng app.
  nhap: null,
};

function doc() {
  const d = docJson(TEP_DU_LIEU, {});
  // Gộp nông với mặc định để bản cũ thiếu khoá mới vẫn chạy được sau khi nâng cấp.
  return {
    ...MAC_DINH,
    ...d,
    caiDat: { ...MAC_DINH.caiDat, ...(d.caiDat ?? {}) },
  };
}

function ghi(du) {
  ghiJson(TEP_DU_LIEU, du);
  return du;
}

function sua(bien) {
  const d = doc();
  const moi = typeof bien === 'function' ? bien(d) : { ...d, ...bien };
  return ghi(moi);
}

/**
 * Đánh dấu một bình luận đã xử lý.
 *
 * ⚠️ Cắt danh sách còn 5.000 id gần nhất. Không cắt thì tệp phình vô hạn và mỗi
 * lần mở app phải nạp cả cục vào RAM. 5.000 là quá đủ: bình luận cũ hơn thế thì
 * cũng không ai đi trả lời nữa.
 */
function danhDauDaXuLy(ids) {
  return sua((d) => {
    const tap = new Set([...d.daXuLy, ...ids]);
    return { ...d, daXuLy: [...tap].slice(-5000) };
  });
}

module.exports = {
  THU_MUC,
  luuToken,
  docToken,
  capNhatToken,
  xoaToken,
  doc,
  ghi,
  sua,
  danhDauDaXuLy,
};
