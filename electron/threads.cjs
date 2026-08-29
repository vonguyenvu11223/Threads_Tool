/*
 * Tầng gọi API Threads. TOÀN BỘ hiểu biết về máy chủ Meta nằm ở đây.
 *
 * Chạy trong tiến trình CHÍNH của Electron, không phải trong giao diện. Hai lý do:
 *   1. Không dính CORS — graph.threads.net không đặt Access-Control-Allow-Origin
 *      nên gọi từ tầng hiển thị sẽ bị trình duyệt chặn thẳng.
 *   2. Token không bao giờ đi vào tầng hiển thị, nên một lỗi XSS ở giao diện
 *      cũng không lấy được nó.
 *
 * ⚠️ HAI SỐ ID DỄ NHẦM:
 *     Meta App ID     1054123914199281   ← chỉ dùng trên developers.facebook.com
 *     Threads App ID  1761855418151863   ← số thật của API, nhưng cách lấy token
 *                                          bằng "Công cụ tạo mã người dùng" KHÔNG
 *                                          cần tới nó. Ghi lại phòng khi sau này
 *                                          chuyển sang OAuth.
 */
const GOC = 'https://graph.threads.net/v1.0';

/** Lỗi có mang theo mã và gợi ý cách chữa, để giao diện hiện được câu tử tế. */
class LoiThreads extends Error {
  constructor(thongDiep, { ma = null, tho = null, hetHan = false, mang = false, giaiDoan = null } = {}) {
    super(thongDiep);
    this.name = 'LoiThreads';
    this.ma = ma;
    this.tho = tho;
    this.hetHan = hetHan;
    // `mang` = hỏng ở tầng kết nối, chưa chạm tới Meta. Bộ hẹn giờ dựa vào cờ
    // này để biết có nên thử lại không — lỗi do Meta từ chối thì thử lại vô ích.
    this.mang = mang;
    // Hỏng ở nhịp nào: 'tao-hop' (chưa đăng gì) hay 'xuat-ban' (có thể đã lên).
    this.giaiDoan = giaiDoan;
  }
}

/*
 * Meta trả lỗi trong thân JSON với HTTP 400, và thông điệp gốc là tiếng Anh
 * kỹ thuật. Dịch những mã hay gặp sang câu người dùng hiểu được — còn lại thì
 * đưa nguyên văn ra, đừng nuốt: nuốt lỗi lạ là lần sau mò lại từ đầu.
 */
function dichLoi(ma, maPhu, thongDiep) {
  if (ma === 190 || maPhu === 463) {
    return { chu: 'Token đã hết hạn hoặc bị thu hồi. Vào lại developers.facebook.com tạo mã mới.', hetHan: true };
  }
  if (ma === 190) {
    return { chu: 'Token không hợp lệ. Kiểm tra lại chuỗi đã dán, hoặc tạo mã mới.', hetHan: true };
  }
  if (ma === 4 || ma === 17 || ma === 32 || ma === 613) {
    return { chu: 'Đã chạm hạn mức của Meta. Đợi ít phút rồi thử lại.', hetHan: false };
  }
  if (ma === 100) {
    return { chu: `Meta từ chối tham số gửi lên: ${thongDiep}`, hetHan: false };
  }
  if (ma === 10 || ma === 200 || ma === 803) {
    return { chu: `Thiếu quyền cho thao tác này: ${thongDiep}`, hetHan: false };
  }
  return { chu: thongDiep || 'Meta trả về lỗi không rõ.', hetHan: false };
}

/**
 * Một lệnh gọi tới Graph API.
 *
 * ⚠️ Token đi trong THÂN yêu cầu với POST, và trong query với GET. Đưa token vào
 * query của POST vẫn chạy, nhưng chuỗi đó lọt vào log máy chủ của Meta — thói
 * quen xấu, và với token 60 ngày thì hậu quả kéo dài đúng 60 ngày.
 */
async function goi(duong, { token, phuongThuc = 'GET', thamSo = {} } = {}) {
  const url = new URL(duong.startsWith('http') ? duong : GOC + duong);
  const tuyChon = { method: phuongThuc };

  if (phuongThuc === 'GET') {
    for (const [k, v] of Object.entries(thamSo)) if (v != null) url.searchParams.set(k, v);
    if (token) url.searchParams.set('access_token', token);
  } else {
    const than = new URLSearchParams();
    for (const [k, v] of Object.entries(thamSo)) if (v != null) than.set(k, String(v));
    if (token) than.set('access_token', token);
    tuyChon.body = than;
    tuyChon.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }

  let phanHoi;
  try {
    phanHoi = await fetch(url, tuyChon);
  } catch (e) {
    // Không phân biệt được "mất mạng" với "Meta chết" — nói đúng những gì biết.
    // ⚠️ Giữ CẢ `e.cause`: fetch của Node bọc lỗi thật vào đó, và thông điệp
    // ngoài luôn là "fetch failed" chẳng nói lên gì. Mất cause là mất manh mối
    // duy nhất phân biệt mất mạng, DNS hỏng, và chứng chỉ sai.
    throw new LoiThreads('Không kết nối được tới máy chủ Meta. Kiểm tra mạng, và tắt VPN nếu đang bật.', {
      tho: e.message + (e.cause?.message ? ` | ${e.cause.message}` : ''),
      mang: true,
    });
  }

  const chu = await phanHoi.text();
  let du;
  try {
    du = chu ? JSON.parse(chu) : {};
  } catch {
    throw new LoiThreads('Meta trả về nội dung không phải JSON.', { tho: chu.slice(0, 300) });
  }

  if (du.error) {
    const { code, error_subcode, message } = du.error;
    const { chu: cau, hetHan } = dichLoi(code, error_subcode, message);
    throw new LoiThreads(cau, { ma: code, tho: message, hetHan });
  }
  if (!phanHoi.ok) {
    throw new LoiThreads(`Meta trả mã ${phanHoi.status}.`, { ma: phanHoi.status, tho: chu.slice(0, 300) });
  }
  return du;
}

/* ═══════════════════ Tài khoản ═══════════════════ */

const TRUONG_HO_SO = 'id,username,name,threads_profile_picture_url,threads_biography';

async function layHoSo(token) {
  return goi('/me', { token, thamSo: { fields: TRUONG_HO_SO } });
}

/**
 * Gia hạn token. Meta cho phép đổi một token 60 ngày lấy token 60 ngày MỚI,
 * nhưng chỉ khi token hiện tại đã sống **quá 24 giờ** và chưa hết hạn.
 *
 * ⚠️ Gọi sớm hơn 24 giờ thì Meta trả lỗi chứ không trả token — nên nơi gọi phải
 * tự canh, đừng gọi mỗi lần mở app.
 */
async function giaHanToken(token) {
  return goi('/refresh_access_token', { token, thamSo: { grant_type: 'th_refresh_token' } });
}

/* ═══════════════════ Bài đăng ═══════════════════ */

const TRUONG_BAI =
  'id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,is_quote_post,link_attachment_url,topic_tag';

async function layBaiDang(token, { limit = 25, sau = null, tu = null, den = null } = {}) {
  return goi('/me/threads', {
    token,
    thamSo: { fields: TRUONG_BAI, limit, after: sau, since: tu, until: den },
  });
}

/**
 * Đăng bài — LUÔN hai nhịp: tạo hộp chứa rồi mới xuất bản.
 *
 * ⚠️ Đây không phải chi tiết vặt có thể gộp lại. Meta tách hai nhịp vì với ảnh
 * và video, máy chủ của họ phải TỰ TẢI tệp về từ `image_url` — nhịp một chỉ đăng
 * ký, nhịp hai mới công bố khi tệp đã sẵn sàng.
 *
 * ⚠️ Vì thế KHÔNG tải được tệp từ máy lên. `image_url` phải là địa chỉ CÔNG KHAI
 * mà máy chủ Meta với tới được — ổ đĩa máy bạn thì không. Muốn đăng ảnh thì phải
 * có ảnh nằm sẵn trên một máy chủ nào đó.
 */
async function taoHopChua(token, { chu, kieu = 'TEXT', anhUrl = null, videoUrl = null, link = null, chuDe = null, traLoiId = null, choPhepTraLoi = null }) {
  const thamSo = { media_type: kieu, text: chu };
  if (kieu === 'IMAGE') thamSo.image_url = anhUrl;
  if (kieu === 'VIDEO') thamSo.video_url = videoUrl;
  // link_attachment CHỈ dùng được với bài dạng chữ — gắn vào bài ảnh là Meta báo lỗi tham số.
  if (link && kieu === 'TEXT') thamSo.link_attachment = link;
  if (chuDe) thamSo.topic_tag = chuDe;
  if (traLoiId) thamSo.reply_to_id = traLoiId;
  if (choPhepTraLoi) thamSo.reply_control = choPhepTraLoi;
  const ra = await goi('/me/threads', { token, phuongThuc: 'POST', thamSo });
  if (!ra.id) throw new LoiThreads('Meta không trả về mã hộp chứa.', { tho: JSON.stringify(ra) });
  return ra.id;
}

async function xuatBan(token, hopChuaId) {
  const ra = await goi('/me/threads_publish', { token, phuongThuc: 'POST', thamSo: { creation_id: hopChuaId } });
  if (!ra.id) throw new LoiThreads('Meta không trả về mã bài đăng.', { tho: JSON.stringify(ra) });
  return ra.id;
}

/**
 * Đăng trọn một bài: tạo hộp chứa → chờ → xuất bản.
 *
 * ⚠️ Phải CHỜ giữa hai nhịp với bài có ảnh/video. Meta khuyến nghị 30 giây; xuất
 * bản khi máy chủ chưa tải xong tệp thì trả lỗi mơ hồ kiểu "media not ready" mà
 * không nói phải đợi. Bài chữ thì không cần chờ.
 */
async function dangBai(token, bai, baoTienDo = () => {}) {
  /*
   * Gắn nhãn NHỊP cho lỗi. Đây không phải chi tiết trang trí: bộ hẹn giờ chỉ
   * được phép thử lại khi hỏng ở nhịp TẠO HỘP, vì lúc đó chắc chắn chưa có gì
   * lên Threads. Hỏng ở nhịp XUẤT BẢN thì không ai biết bài đã lên hay chưa —
   * thử lại là nguy cơ đăng hai lần cùng một nội dung.
   */
  baoTienDo('Đang tạo hộp chứa…');
  let hopId;
  try {
    hopId = await taoHopChua(token, bai);
  } catch (e) {
    e.giaiDoan = 'tao-hop';
    throw e;
  }

  if (bai.kieu !== 'TEXT') {
    baoTienDo('Máy chủ Meta đang tải tệp về, đợi 30 giây…');
    await new Promise((r) => setTimeout(r, 30_000));
  }

  baoTienDo('Đang xuất bản…');
  try {
    return await xuatBan(token, hopId);
  } catch (e) {
    e.giaiDoan = 'xuat-ban';
    throw e;
  }
}

async function xoaBai(token, baiId) {
  return goi(`/${baiId}`, { token, phuongThuc: 'DELETE' });
}

/* ═══════════════════ Thống kê ═══════════════════ */

/*
 * ⚠️ `shares` chỉ có ở tầng BÀI, không có ở tầng tài khoản; `followers_count`
 * thì ngược lại. Hỏi nhầm tầng là Meta trả lỗi cho CẢ cụm chứ không bỏ qua chỉ
 * số sai — nên hai danh sách này phải giữ tách nhau.
 */
const CHI_SO_BAI = 'views,likes,replies,reposts,quotes,shares';
const CHI_SO_TAI_KHOAN = 'views,likes,replies,reposts,quotes,followers_count';

/** Gộp mảng {name, values:[{value}]} của Meta thành object phẳng cho dễ dùng. */
function phang(duLieu) {
  const ra = {};
  for (const m of duLieu?.data ?? []) {
    ra[m.name] = m.total_value?.value ?? m.values?.[0]?.value ?? 0;
  }
  return ra;
}

async function thongKeBai(token, baiId) {
  try {
    return phang(await goi(`/${baiId}/insights`, { token, thamSo: { metric: CHI_SO_BAI } }));
  } catch (e) {
    // Bài quá mới hoặc quá cũ thì Meta không có số — trả rỗng chứ đừng làm hỏng cả trang.
    if (e.ma === 100) return {};
    throw e;
  }
}

async function thongKeTaiKhoan(token, { tu = null, den = null } = {}) {
  return phang(await goi('/me/threads_insights', { token, thamSo: { metric: CHI_SO_TAI_KHOAN, since: tu, until: den } }));
}

/**
 * Hạn mức còn lại trong 24 giờ. Đọc trước khi đăng hàng loạt — chạm trần thì
 * Meta chặn thẳng, mà thông điệp lỗi không nói rõ còn bao lâu mới được đăng tiếp.
 */
async function hanMuc(token) {
  const ra = await goi('/me/threads_publishing_limit', {
    token,
    thamSo: { fields: 'quota_usage,config,reply_quota_usage,reply_config,delete_quota_usage,delete_config' },
  });
  const d = ra.data?.[0] ?? {};
  return {
    daDang: d.quota_usage ?? 0,
    tranDang: d.config?.quota_total ?? 250,
    daTraLoi: d.reply_quota_usage ?? 0,
    tranTraLoi: d.reply_config?.quota_total ?? 1000,
    daXoa: d.delete_quota_usage ?? 0,
    tranXoa: d.delete_config?.quota_total ?? 100,
  };
}

/* ═══════════════════ Bình luận ═══════════════════ */

const TRUONG_BINH_LUAN =
  'id,text,username,permalink,timestamp,media_type,media_url,shortcode,has_replies,root_post,replied_to,is_reply,is_reply_owned_by_me,hide_status';

/**
 * Bình luận của MỘT bài.
 *
 * ⚠️ Hai đường khác nhau, đừng lẫn:
 *   `/replies`      — chỉ bình luận TẦNG ĐẦU, trả lời trực tiếp vào bài
 *   `/conversation` — TOÀN BỘ cây, kể cả trả lời lồng nhau
 * Dùng `/conversation` cho hộp bình luận, vì người ta hay trả lời vào bình luận
 * của người khác, mà những cái đó cũng cần được thấy.
 */
async function binhLuanCuaBai(token, baiId, { toanBo = true, sau = null } = {}) {
  return goi(`/${baiId}/${toanBo ? 'conversation' : 'replies'}`, {
    token,
    thamSo: { fields: TRUONG_BINH_LUAN, reverse: false, after: sau },
  });
}

/**
 * Trả lời một bình luận. Vẫn là hai nhịp như đăng bài, chỉ khác có `reply_to_id`.
 * Bài chữ nên không phải chờ 30 giây.
 */
async function traLoi(token, binhLuanId, chu) {
  const hopId = await taoHopChua(token, { chu, kieu: 'TEXT', traLoiId: binhLuanId });
  return xuatBan(token, hopId);
}

/**
 * Ẩn hoặc hiện lại một bình luận.
 * ⚠️ Chỉ ẩn được bình luận TẦNG ĐẦU dưới bài của mình. Gọi lên một trả lời lồng
 * nhau thì Meta trả lỗi quyền, nghe như thiếu scope trong khi thật ra là sai đối tượng.
 */
async function anBinhLuan(token, binhLuanId, an = true) {
  return goi(`/${binhLuanId}/manage_reply`, { token, phuongThuc: 'POST', thamSo: { hide: an } });
}

/* ═══════════════════ Tìm kiếm ═══════════════════ */

const TRUONG_TIM =
  'id,text,username,permalink,timestamp,media_type,media_url,has_replies,is_quote_post,is_reply,topic_tag';

/**
 * Tìm bài trên TOÀN Threads.
 *
 * ⚠️ Hạn mức riêng và rất chặt: **2.200 lượt tìm trong 24 giờ**, tính theo NGƯỜI
 * DÙNG chứ không theo app — nghĩa là dùng app khác cũng trừ vào cùng một quỹ.
 * Truy vấn không ra kết quả thì không bị trừ.
 *
 * `kieu`: 'TOP' (phổ biến nhất) hoặc 'RECENT' (mới nhất)
 * `che`:  'KEYWORD' (mặc định) hoặc 'TAG' (tìm theo chủ đề)
 *
 * ⚠️ Trường `owner` KHÔNG được trả về ở endpoint này, khác với các endpoint khác.
 * Đừng hỏi nó, hỏi là hỏng cả cụm chứ Meta không bỏ qua trường sai.
 */
async function timKiem(token, { tuKhoa, kieu = 'TOP', che = 'KEYWORD', soLuong = 25, tu = null, den = null, tacGia = null } = {}) {
  if (!String(tuKhoa ?? '').trim()) throw new LoiThreads('Chưa nhập từ khoá để tìm.');
  return goi('/keyword_search', {
    token,
    thamSo: {
      q: tuKhoa.trim(),
      search_type: kieu,
      search_mode: che,
      limit: Math.min(soLuong, 100),
      since: tu,
      until: den,
      author_username: tacGia,
      fields: TRUONG_TIM,
    },
  });
}

/**
 * Các bài có nhắc tới mình.
 *
 * ⚠️ CHƯA ĐƯỢC DUYỆT QUYỀN NÂNG CAO thì Meta CHỈ trả về lượt nhắc từ những
 * người dùng thử của chính app này. Người lạ nhắc tên bạn sẽ KHÔNG hiện ra, mà
 * endpoint vẫn trả 200 với danh sách rỗng — nhìn hệt như "không ai nhắc tới bạn".
 * Nơi gọi phải nói rõ điều đó với người dùng, đừng để họ tưởng app hỏng.
 */
async function nhacDen(token, { tu = null, den = null } = {}) {
  return goi('/me/mentions', { token, thamSo: { fields: TRUONG_TIM, since: tu, until: den } });
}

module.exports = {
  LoiThreads,
  timKiem,
  nhacDen,
  layHoSo,
  giaHanToken,
  layBaiDang,
  dangBai,
  taoHopChua,
  xuatBan,
  xoaBai,
  thongKeBai,
  thongKeTaiKhoan,
  hanMuc,
  binhLuanCuaBai,
  traLoi,
  anBinhLuan,
};
