/*
 * Cầu nối giữa tiến trình chính và giao diện.
 *
 * Chỉ mở ra ĐÚNG những hàm giao diện cần, không mở `ipcRenderer` trần. Mở trần
 * là giao diện gọi được mọi kênh nội bộ, và hàng rào `contextIsolation` mất tác
 * dụng — đúng lỗ hổng mà nó sinh ra để bịt.
 *
 * Tệp .cjs chứ không .mjs: preload dạng ESM chỉ chạy khi tắt sandbox, mà tắt
 * sandbox để tiện là bỏ một lớp bảo vệ nữa.
 */
const { contextBridge, ipcRenderer } = require('electron');

const goi = (kenh) => (thamSo) => ipcRenderer.invoke(kenh, thamSo);

contextBridge.exposeInMainWorld('tt', {
  phienHienTai: goi('phien-hien-tai'),
  ketNoi: goi('ket-noi'),
  ngatKetNoi: goi('ngat-ket-noi'),

  layBaiDang: goi('lay-bai-dang'),
  thongKeBai: goi('thong-ke-bai'),
  thongKeTaiKhoan: goi('thong-ke-tai-khoan'),
  hanMuc: goi('han-muc'),

  dangBai: goi('dang-bai'),
  xoaBai: goi('xoa-bai'),

  binhLuanCuaBai: goi('binh-luan-cua-bai'),
  traLoi: goi('tra-loi'),
  anBinhLuan: goi('an-binh-luan'),
  boQua: goi('bo-qua'),

  timKiem: goi('tim-kiem'),
  nhacDen: goi('nhac-den'),
  traLoiBai: goi('tra-loi-bai'),

  docDuLieu: goi('doc-du-lieu'),
  luuCaiDat: goi('luu-cai-dat'),
  luuMau: goi('luu-mau'),
  luuTuKhoa: goi('luu-tu-khoa'),
  luuNhap: goi('luu-nhap'),

  themHangDoi: goi('them-hang-doi'),
  xoaHangDoi: goi('xoa-hang-doi'),
  dangNgayHangDoi: goi('dang-ngay-hang-doi'),

  moNgoai: goi('mo-ngoai'),
  thuMucDuLieu: goi('thu-muc-du-lieu'),

  /*
   * Nhận sự kiện từ tiến trình chính. Bọc lại chứ KHÔNG đưa `ipcRenderer.on` ra
   * ngoài — đưa trần là giao diện nghe được mọi kênh nội bộ, hỏng luôn hàng rào
   * cách ly. Trả về hàm huỷ đăng ký để nơi gọi tự dọn.
   */
  nghe: (kenh, ham) => {
    const CHO_PHEP = ['tien-do-dang', 'hang-doi-doi'];
    if (!CHO_PHEP.includes(kenh)) throw new Error(`Kênh không được phép: ${kenh}`);
    const boc = (_e, du) => ham(du);
    ipcRenderer.on(kenh, boc);
    return () => ipcRenderer.off(kenh, boc);
  },
});
