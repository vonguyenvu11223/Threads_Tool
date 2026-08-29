/*
 * Tiến trình chính: dựng cửa sổ, giữ token, điều phối mọi lệnh gọi API.
 */
const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');

/*
 * ⚠️ BẪY: biến môi trường ELECTRON_RUN_AS_NODE
 *
 * VS Code đặt sẵn `ELECTRON_RUN_AS_NODE=1` trong terminal tích hợp. Biến đó bắt
 * binary Electron chạy như Node THUẦN: không tiến trình chính, không cửa sổ,
 * `require('electron')` trả về một CHUỖI đường dẫn thay vì module thật, nên
 * `app` là undefined.
 *
 * Lỗi hiện ra là "Cannot read properties of undefined (reading 'whenReady')" —
 * nghe hệt như code sai. Đã mất một buổi đi sửa nhầm sang chuyện ESM/CJS ở dự
 * án locket-pc. Dấu hiệu nhận biết đúng: `electron --version` in ra v24 (Node)
 * thay vì v43.
 *
 * ⚠️ ĐẶT RỖNG LÀ CHƯA ĐỦ TRONG BASH. `ELECTRON_RUN_AS_NODE= electron .` vẫn để
 * biến TỒN TẠI dưới dạng chuỗi rỗng, mà Electron chỉ kiểm sự tồn tại chứ không
 * kiểm giá trị. Khi đó nó không rơi vào hàng rào bên dưới mà chết sâu hơn, ở
 * tầng C++, với thông điệp chẳng liên quan gì:
 *
 *     Assertion failed: (isolate_data->snapshot_data()) != nullptr
 *
 * Bash phải gỡ hẳn:   env -u ELECTRON_RUN_AS_NODE electron .
 * PowerShell thì đặt rỗng LÀ gỡ hẳn — `$env:X=""` xoá biến luôn, nên câu lệnh
 * trong thông điệp dưới đây đúng cho PowerShell.
 */
if (!app || typeof app.whenReady !== 'function') {
  console.error(
    '\n❌ Electron đang chạy ở chế độ Node, không phải chế độ ứng dụng.\n' +
      '   Nguyên nhân: biến môi trường ELECTRON_RUN_AS_NODE đang bật\n' +
      '   (terminal tích hợp của VS Code hay đặt sẵn biến này).\n\n' +
      '   Cách sửa — chạy trong PowerShell:\n' +
      '     $env:ELECTRON_RUN_AS_NODE=""\n' +
      '     npm start\n' +
      '   Hoặc mở một cửa sổ PowerShell/CMD riêng, ngoài VS Code.\n'
  );
  process.exit(1);
}

const path = require('node:path');
const T = require('./threads.cjs');
const kho = require('./kho.cjs');

/*
 * Ép ngôn ngữ tiếng Việt cho Chromium.
 *
 * Mặc định là en-US, nên lịch của hệ thống hiện tên tháng tiếng Anh và tuần bắt
 * đầu từ Chủ nhật. Phải đặt TRƯỚC `app.whenReady()` — đặt sau thì Chromium đã
 * khởi tạo xong và câu lệnh bị bỏ qua im lặng.
 *
 * ⚠️ Chỉ đổi được lịch bật lên, KHÔNG đổi được cách ô `datetime-local` hiện chữ
 * trên Windows — cái đó bám theo ngôn ngữ hệ điều hành. Vì vậy ô hẹn giờ ở màn
 * Soạn là ô CHỮ tự viết, không phải `datetime-local` trần.
 */
app.commandLine.appendSwitch('lang', 'vi-VN');

let cuaSo = null;

function taoCuaSo() {
  cuaSo = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#0d0d0f',
    title: 'Threads Tool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  cuaSo.setMenuBarVisibility(false);
  cuaSo.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  /*
   * Đổ log của tầng hiển thị ra cửa sổ dòng lệnh.
   *
   * Không có dòng này thì một lỗi JavaScript ở giao diện BIẾN MẤT hoàn toàn:
   * không cửa sổ đỏ, không thông báo, nút bấm chỉ đơn giản là không phản hồi.
   * Đã mất công truy đúng kiểu đó một lần. Mở DevTools tay thì thấy, nhưng người
   * dùng thường không mở, và bản đóng gói sau này cũng không có DevTools.
   */
  cuaSo.webContents.on('console-message', (...doiSo) => {
    /*
     * ⚠️ Chữ ký sự kiện này ĐÃ ĐỔI. Electron cũ truyền rời
     * `(event, level, message, line, sourceId)`; Electron 36+ gói lại thành
     * `(event, details)`. Đỡ cả hai — bắt sai một dạng là log ra "undefined"
     * và mình lại tưởng không có lỗi nào, đúng cái bẫy vừa mất công truy.
     */
    const [, hai, ba, bon, nam] = doiSo;
    const d = hai && typeof hai === 'object' ? hai : { level: hai, message: ba, lineNumber: bon, sourceId: nam };
    const nhan = typeof d.level === 'number' ? (['debug', 'log', 'CẢNH BÁO', 'LỖI'][d.level] ?? d.level) : d.level;
    const tep = String(d.sourceId ?? '').split(/[\\/]/).pop();
    console.log(`[giao diện ${nhan}] ${d.message}${tep ? `  (${tep}:${d.lineNumber})` : ''}`);
  });

  // Link ra ngoài mở bằng trình duyệt hệ thống, không mở trong cửa sổ app —
  // mở trong app là biến nó thành trình duyệt mini không có thanh địa chỉ,
  // người dùng không biết mình đang ở trang nào.
  cuaSo.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/* ═══════════════════ Token ═══════════════════ */

function layToken() {
  const p = kho.docToken();
  if (!p) throw new T.LoiThreads('Chưa kết nối tài khoản. Vào tab Kết nối để dán token.');
  return p.token;
}

const NGAY = 86_400_000;

/**
 * Tự gia hạn token khi cần.
 *
 * ⚠️ Meta chỉ cho gia hạn khi token đã sống QUÁ 24 GIỜ. Gọi sớm hơn là trả lỗi
 * chứ không trả token mới — nên phải tự canh, đừng gọi mỗi lần mở app.
 *
 * Gia hạn khi token đã dùng quá 45 ngày (hạn 60): còn 15 ngày đệm, đủ để người
 * dùng đi nghỉ một tuần mà về vẫn còn cứu được.
 */
async function tuGiaHan() {
  const p = kho.docToken();
  if (!p) return null;
  const tuoi = Date.now() - p.taoLuc;
  const tuLanGiaHan = Date.now() - p.giaHanLuc;
  if (tuoi < NGAY || tuLanGiaHan < 45 * NGAY) return null;
  try {
    const ra = await T.giaHanToken(p.token);
    if (ra.access_token) {
      kho.capNhatToken(ra.access_token);
      return { daGiaHan: true };
    }
  } catch (e) {
    // Gia hạn hỏng không nên chặn app khởi động — token cũ vẫn còn dùng được
    // tới khi hết hạn thật. Ghi log để còn truy khi cần.
    console.error('[gia hạn token]', e.message);
  }
  return null;
}

/* ═══════════════════ Đăng bài ═══════════════════ */

/**
 * Đăng một bài kèm link tiếp thị liên kết.
 *
 * Hai đường gắn link, khác nhau về hiệu quả chứ không chỉ về hình thức:
 *
 *   'trong-bai'  — dùng `link_attachment`. Gọn, nhưng Threads HẠ HIỂN THỊ bài có
 *                  link ra ngoài, giống Facebook và X.
 *   'binh-luan'  — đăng bài không link, rồi tự trả lời chính mình kèm link. Bài
 *                  chính giữ nguyên tầm với, đổi lại người xem phải bấm thêm một
 *                  nhịp.
 *
 * Chưa ai đo được đường nào ăn hơn cho tài khoản này, nên dựng cả hai để so.
 */
async function dangKemLink(token, { chu, kieu, anhUrl, videoUrl, link, chuDe, khaiBao, kieuGanLink }, baoTienDo) {
  // Khai báo tiếp thị liên kết luôn nằm trong BÀI CHÍNH, kể cả khi link để ở
  // bình luận. Để dưới bình luận là người lướt qua bài không đọc được nó.
  const noiDung = link && khaiBao ? chu + khaiBao : chu;

  const trongBai = kieuGanLink === 'trong-bai';
  const baiId = await T.dangBai(
    token,
    {
      chu: noiDung,
      kieu,
      anhUrl,
      videoUrl,
      link: trongBai ? link : null,
      // Chủ đề chỉ gắn cho BÀI CHÍNH. Bình luận chứa link là phần phụ của bài,
      // gắn thêm chủ đề vào đó là đẩy cùng một nội dung vào luồng chủ đề hai lần.
      chuDe,
    },
    baoTienDo
  );

  let binhLuanId = null;
  if (link && !trongBai) {
    baoTienDo('Đang đăng link ở bình luận đầu…');
    try {
      binhLuanId = await T.traLoi(token, baiId, `🔗 Link sản phẩm: ${link}`);
    } catch (e) {
      // Bài chính ĐÃ lên rồi. Báo rõ để người dùng tự vào dán link, chứ đừng
      // ném lỗi làm họ tưởng cả bài thất bại rồi đăng lại thành hai bài.
      return { baiId, binhLuanId: null, canhBao: `Bài đã đăng nhưng chưa gắn được link ở bình luận: ${e.message}` };
    }
  }
  return { baiId, binhLuanId, canhBao: null };
}

/* ═══════════════════ Bộ hẹn giờ ═══════════════════ */

let dongHo = null;

/**
 * Kiểm hàng đợi mỗi 30 giây.
 *
 * ⚠️ CHỈ chạy khi app đang mở. Máy tắt hoặc app đóng thì không có gì đăng cả —
 * đây là ràng buộc user đã chấp nhận từ đầu (không dựng máy chủ). Giao diện phải
 * nói rõ điều này, đừng để người dùng hẹn giờ 3 giờ sáng rồi tắt máy đi ngủ.
 */
/**
 * Dọn mục kẹt ở trạng thái "đang đăng" từ lần chạy trước.
 *
 * Tắt app (hoặc mất điện) đúng lúc một bài đang đăng thì mục đó nằm mãi ở
 * `dang-dang` — bộ hẹn giờ chỉ nhặt mục `cho` nên nó KHÔNG BAO GIỜ chạy lại và
 * cũng không báo lỗi. Người dùng thấy "Đang đăng" đứng yên vĩnh viễn.
 *
 * ⚠️ CỐ Ý không tự đăng lại. Không có cách nào biết bài đã lên hay chưa, nên
 * đẩy quyết định về phía người dùng kèm lời nhắc kiểm tra — thà bắt họ nhìn một
 * lần còn hơn lẳng lặng đăng trùng lên trang của họ.
 */
function donMucKet() {
  const d = kho.doc();
  if (!d.hangDoi.some((x) => x.trangThai === 'dang-dang')) return;
  kho.sua((cu) => ({
    ...cu,
    hangDoi: cu.hangDoi.map((x) =>
      x.trangThai === 'dang-dang'
        ? { ...x, trangThai: 'loi', loi: 'App bị đóng giữa lúc đang đăng. Mở Threads kiểm xem bài đã lên chưa rồi hãy đăng lại.' }
        : x
    ),
  }));
}

/**
 * Bao lâu sau giờ hẹn thì vẫn coi là đăng đúng hẹn.
 *
 * ⚠️ Có cửa sổ này là BẮT BUỘC, không phải tinh chỉnh cho đẹp. Trước đây bộ lọc
 * chỉ có `luc <= Date.now()` mà không có giới hạn trên — nghĩa là bài hẹn 8 giờ
 * sáng, người dùng tắt máy đi ngủ, 3 giờ chiều mở lên thì nó ĐĂNG NGAY LÚC ĐÓ,
 * không hỏi gì. Bài "Chào buổi sáng" lên lúc 3 giờ chiều là sai hoàn toàn, mà
 * người dùng không biết cho tới khi nó đã lên.
 *
 * 30 phút: đủ rộng để máy ngủ một lát hoặc mạng chớp vài nhịp, đủ hẹp để không
 * đăng nhầm sang một khung giờ khác hẳn.
 */
const CUA_SO_TRE = 30 * 60_000;

/** Đăng một mục trong hàng đợi. Dùng chung cho bộ hẹn giờ và nút "Đăng bây giờ". */
async function dangMotMuc(muc) {
  kho.sua((cu) => ({
    ...cu,
    hangDoi: cu.hangDoi.map((x) => (x.id === muc.id ? { ...x, trangThai: 'dang-dang' } : x)),
  }));
  guiGiaoDien('hang-doi-doi');

  try {
    const kq = await dangKemLink(layToken(), muc.bai, () => {});
    kho.sua((cu) => ({
      ...cu,
      hangDoi: cu.hangDoi.map((x) =>
        x.id === muc.id ? { ...x, trangThai: 'xong', baiId: kq.baiId, canhBao: kq.canhBao, loi: null, tho: null, xongLuc: Date.now() } : x
      ),
    }));
  } catch (e) {
    /*
     * Thử lại — nhưng CHỈ khi chắc chắn chưa có gì lên Threads.
     *
     * Điều kiện: hỏng ở tầng kết nối (`mang`) VÀ hỏng ở nhịp tạo hộp chứa.
     * Mạng chớp một nhịp đã làm hỏng một bài hẹn giờ thật (27/08/2026), mà
     * lần thử lại bằng tay thì chạy ngon ngay — đúng loại lỗi đáng thử lại.
     *
     * ⚠️ Đừng nới điều kiện này. Hỏng ở nhịp xuất bản thì không ai biết bài
     * đã lên hay chưa; thử lại là đăng hai lần cùng một nội dung lên trang
     * của người dùng, mà bài đã lên rồi thì gỡ xuống cũng có người đã thấy.
     */
    const daThu = muc.soLanThu ?? 0;
    const thuLaiDuoc = e.mang && e.giaiDoan === 'tao-hop' && daThu < 2;

    kho.sua((cu) => ({
      ...cu,
      hangDoi: cu.hangDoi.map((x) =>
        x.id !== muc.id
          ? x
          : thuLaiDuoc
            ? { ...x, trangThai: 'cho', soLanThu: daThu + 1, luc: Date.now() + 60_000, loi: `${e.message} — sẽ tự thử lại (lần ${daThu + 2}/3)` }
            : { ...x, trangThai: 'loi', loi: e.message, tho: e.tho ?? null, giaiDoan: e.giaiDoan ?? null }
      ),
    }));
  }
  guiGiaoDien('hang-doi-doi');
}

/**
 * Một nhịp kiểm hàng đợi.
 *
 * Tách khỏi `setInterval` để gọi được ngay lúc khởi động — không thì bài đến giờ
 * phải chờ thêm 30 giây nữa mới đi, mà 30 giây đó rơi đúng vào lúc người dùng
 * vừa mở app và đang nhìn màn hình.
 */
async function nhipHangDoi() {
  const bayGio = Date.now();
  let d = kho.doc();

  /* Bước 1 — đánh dấu bài đã lỡ giờ quá lâu. KHÔNG tự đăng, để người dùng quyết. */
  const loGio = d.hangDoi.filter((x) => x.trangThai === 'cho' && bayGio - x.luc > CUA_SO_TRE);
  if (loGio.length) {
    const ids = new Set(loGio.map((x) => x.id));
    kho.sua((cu) => ({
      ...cu,
      hangDoi: cu.hangDoi.map((x) => (ids.has(x.id) ? { ...x, trangThai: 'lo-gio' } : x)),
    }));
    guiGiaoDien('hang-doi-doi');
    d = kho.doc(); // đọc lại: bản cũ đã lạc hậu sau khi ghi
  }

  /* Bước 2 — đăng những bài đến giờ và còn trong cửa sổ cho phép. */
  for (const muc of d.hangDoi.filter((x) => x.trangThai === 'cho' && x.luc <= bayGio)) {
    await dangMotMuc(muc);
  }
}

function batDongHo() {
  if (dongHo) return;
  dongHo = setInterval(nhipHangDoi, 30_000);
}

function guiGiaoDien(kenh, du = null) {
  if (cuaSo && !cuaSo.isDestroyed()) cuaSo.webContents.send(kenh, du);
}

/* ═══════════════════ IPC ═══════════════════ */

/**
 * Bọc mọi handler để lỗi về giao diện dưới dạng dữ liệu, không phải ngoại lệ.
 * Ném thẳng qua IPC thì Electron gói lại thành chuỗi kèm stack — giao diện nhận
 * được một cục chữ không đọc nổi, mất cả mã lỗi lẫn cờ hết hạn.
 */
function dangKy(kenh, ham) {
  ipcMain.handle(kenh, async (_e, thamSo) => {
    try {
      return { ok: true, du: await ham(thamSo ?? {}) };
    } catch (e) {
      return { ok: false, loi: e.message, ma: e.ma ?? null, hetHan: !!e.hetHan, tho: e.tho ?? null };
    }
  });
}

dangKy('phien-hien-tai', async () => {
  const p = kho.docToken();
  if (!p) return { daKetNoi: false };
  const hoSo = await T.layHoSo(p.token);
  return {
    daKetNoi: true,
    hoSo,
    maHoa: p.maHoa,
    taoLuc: p.taoLuc,
    // Token sống 60 ngày kể từ lần gia hạn gần nhất, không phải từ lúc tạo.
    hetHanLuc: p.giaHanLuc + 60 * NGAY,
  };
});

dangKy('ket-noi', async ({ token }) => {
  const sach = String(token ?? '').trim();
  if (!sach) throw new T.LoiThreads('Chưa dán token.');
  // Thử gọi thật trước khi lưu — lưu rồi mới biết sai thì người dùng phải tự đi
  // xoá, mà họ không biết tệp nằm ở đâu.
  const hoSo = await T.layHoSo(sach);
  const maHoa = kho.luuToken(sach);
  return { hoSo, maHoa };
});

dangKy('ngat-ket-noi', async () => {
  kho.xoaToken();
  return true;
});

dangKy('lay-bai-dang', async ({ limit, sau } = {}) => T.layBaiDang(layToken(), { limit: limit ?? 25, sau }));

dangKy('thong-ke-bai', async ({ baiId }) => T.thongKeBai(layToken(), baiId));

dangKy('thong-ke-tai-khoan', async () => T.thongKeTaiKhoan(layToken()));

dangKy('han-muc', async () => T.hanMuc(layToken()));

dangKy('dang-bai', async ({ bai }) => {
  const d = kho.doc();
  return dangKemLink(
    layToken(),
    {
      ...bai,
      khaiBao: bai.khaiBao ?? d.caiDat.khaiBaoAffiliate,
      kieuGanLink: bai.kieuGanLink ?? d.caiDat.kieuGanLink,
    },
    (chu) => guiGiaoDien('tien-do-dang', chu)
  );
});

dangKy('xoa-bai', async ({ baiId }) => T.xoaBai(layToken(), baiId));

dangKy('binh-luan-cua-bai', async ({ baiId }) => T.binhLuanCuaBai(layToken(), baiId));

dangKy('tra-loi', async ({ binhLuanId, chu }) => {
  const id = await T.traLoi(layToken(), binhLuanId, chu);
  kho.danhDauDaXuLy([binhLuanId]);
  return id;
});

dangKy('an-binh-luan', async ({ binhLuanId, an }) => T.anBinhLuan(layToken(), binhLuanId, an));

dangKy('tim-kiem', async (ts) => T.timKiem(layToken(), ts));

dangKy('nhac-den', async () => T.nhacDen(layToken()));

/**
 * Trả lời một bài BẤT KỲ trên Threads (không phải bình luận dưới bài mình).
 * Cùng cơ chế với `traLoi`, tách riêng để không ghi nhầm vào danh sách "đã xử
 * lý bình luận" — hai luồng đó đếm những thứ khác nhau.
 */
dangKy('tra-loi-bai', async ({ baiId, chu }) => T.traLoi(layToken(), baiId, chu));

dangKy('doc-du-lieu', async () => kho.doc());

dangKy('luu-cai-dat', async ({ caiDat }) => kho.sua((d) => ({ ...d, caiDat: { ...d.caiDat, ...caiDat } })).caiDat);

dangKy('luu-mau', async ({ mauTraLoi }) => kho.sua((d) => ({ ...d, mauTraLoi })).mauTraLoi);

dangKy('luu-tu-khoa', async ({ tuKhoaLuu }) => kho.sua((d) => ({ ...d, tuKhoaLuu })).tuKhoaLuu);

dangKy('bo-qua', async ({ ids }) => kho.danhDauDaXuLy(ids).daXuLy.length);

dangKy('them-hang-doi', async ({ bai, luc }) =>
  kho.sua((d) => ({
    ...d,
    hangDoi: [...d.hangDoi, { id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, bai, luc, trangThai: 'cho' }],
  })).hangDoi
);

dangKy('xoa-hang-doi', async ({ id }) => kho.sua((d) => ({ ...d, hangDoi: d.hangDoi.filter((x) => x.id !== id) })).hangDoi);

/** Đăng bù một mục đã lỡ giờ hoặc đã lỗi — người dùng bấm tay, bỏ qua mọi kiểm giờ. */
dangKy('dang-ngay-hang-doi', async ({ id }) => {
  const m = kho.doc().hangDoi.find((x) => x.id === id);
  if (!m) throw new T.LoiThreads('Không tìm thấy mục này trong hàng đợi.');
  if (m.trangThai === 'dang-dang') throw new T.LoiThreads('Mục này đang được đăng, đợi một chút.');
  if (m.trangThai === 'xong') throw new T.LoiThreads('Mục này đã đăng rồi.');
  // Xoá dấu vết lần trước để lịch sử lỗi cũ không dính vào lần chạy mới.
  kho.sua((cu) => ({
    ...cu,
    hangDoi: cu.hangDoi.map((x) => (x.id === id ? { ...x, loi: null, tho: null, soLanThu: 0 } : x)),
  }));
  await dangMotMuc({ ...m, soLanThu: 0 });
  return kho.doc().hangDoi.find((x) => x.id === id)?.trangThai ?? null;
});

dangKy('luu-nhap', async ({ nhap }) => kho.sua((d) => ({ ...d, nhap })).nhap);

dangKy('mo-ngoai', async ({ url }) => {
  // Chỉ mở http/https. Không lọc thì một chuỗi `file://` hay `javascript:` lọt
  // từ dữ liệu Meta trả về sẽ chạy trên máy người dùng.
  if (!/^https?:\/\//i.test(url ?? '')) throw new T.LoiThreads('Địa chỉ không hợp lệ.');
  await shell.openExternal(url);
  return true;
});

dangKy('thu-muc-du-lieu', async () => kho.THU_MUC);

/* ═══════════════════ Vòng đời ═══════════════════ */

app.whenReady().then(async () => {
  taoCuaSo();
  donMucKet();
  batDongHo();
  // Chạy một nhịp ngay: bài đến giờ không phải chờ thêm 30 giây, và bài đã lỡ
  // giờ được đánh dấu trước khi người dùng kịp nhìn vào hàng đợi.
  nhipHangDoi();
  await tuGiaHan();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) taoCuaSo();
  });
});

app.on('window-all-closed', () => {
  if (dongHo) clearInterval(dongHo);
  if (process.platform !== 'darwin') app.quit();
});
