# Threads Tool

Công cụ quản lý Threads chạy trên máy tính: đăng bài (kèm link tiếp thị liên kết),
thống kê, và duyệt trả lời bình luận.

Chạy hoàn toàn trên máy bạn. Không có máy chủ, không gửi gì đi đâu ngoài chính
API của Meta.

---

## Chạy

```bash
cd D:\threads-tool
npm install
npm start
```

⚠️ **Nếu chạy trong terminal tích hợp của VS Code** mà app không mở và báo
`Cannot read properties of undefined (reading 'whenReady')` — đó là do VS Code đặt
sẵn biến `ELECTRON_RUN_AS_NODE=1`. Chữa trong PowerShell:

```powershell
$env:ELECTRON_RUN_AS_NODE=""
npm start
```

Hoặc mở một cửa sổ PowerShell riêng, ngoài VS Code.

⚠️ **Trong Git Bash thì đặt rỗng KHÔNG đủ.** `ELECTRON_RUN_AS_NODE= npm start` vẫn
để biến tồn tại dưới dạng chuỗi rỗng, mà Electron chỉ kiểm sự tồn tại. Khi đó app
chết sâu hơn ở tầng C++ với thông điệp chẳng liên quan gì:

```
Assertion failed: (isolate_data->snapshot_data()) != nullptr
```

Bash phải gỡ hẳn biến:

```bash
env -u ELECTRON_RUN_AS_NODE npm start
```

PowerShell thì `$env:X=""` xoá biến luôn nên không dính chuyện này.

---

## Đóng gói để gửi cho người khác

### ⚠️ Không build bản macOS từ Windows được

Đóng gói `.dmg` cần công cụ của macOS, và máy Apple Silicon **từ chối chạy mã
arm64 chưa được ký** — mà ký thì phải gọi `codesign`, lệnh chỉ có trên macOS.
Build từ Windows ra thì file mở lên báo *"bị hỏng"*.

Ba đường, chọn theo tình huống:

**A. Build bằng GitHub Actions** *(không cần có Mac)*

Đẩy mã lên GitHub rồi vào tab **Actions** → **Đóng gói macOS** → **Run workflow**.
Khoảng 5 phút sau tải file `.dmg` ở mục Artifacts, gửi cho bạn bè.

⚠️ Máy chủ macOS tính **10 phút** cho mỗi phút chạy thật trên repo riêng tư. Gói
miễn phí còn khoảng 200 phút macOS mỗi tháng — dùng thỉnh thoảng thì thoải mái.
Vì vậy quy trình chỉ chạy khi bấm tay hoặc khi đẩy thẻ `v*`, không chạy mỗi push.

**B. Build ngay trên máy Mac**

```bash
npm install
npm run dist:mac      # ra dist/*.dmg
```

**C. Gửi thẳng mã nguồn** *(nhanh nhất, nếu người nhận biết gõ lệnh)*

Nén thư mục (bỏ `node_modules` và `dist`), hoặc cho họ `git clone`. Rồi:

```bash
npm install     # Electron tự tải bản macOS đúng chip
npm start
```

### ⚠️ macOS sẽ chặn app lần đầu mở

Bản `.dmg` chưa được công chứng (notarize) nên Gatekeeper chặn. Người nhận phải:

**Bấm chuột phải vào app → Mở → Mở** (không phải bấm đúp).

Nếu vẫn báo *"bị hỏng và không thể mở"*, chạy một lần trong Terminal:

```bash
xattr -cr "/Applications/Threads Tool.app"
```

Muốn bỏ hẳn bước này thì cần chứng chỉ **Developer ID Application** và công chứng
qua Apple — công ty đã có tài khoản Apple Developer trả phí nên đủ điều kiện làm,
nhưng đó là việc riêng, chưa dựng.

### ⚠️ Người nhận cần TOKEN RIÊNG của họ

App không kèm token, và **đừng đưa token của bạn cho ai** — nó đăng bài thay bạn được.

Để bạn bè dùng tài khoản Threads của chính họ, bạn phải:

1. Vào app Meta của bạn → **Vai trò trong ứng dụng** → **Thêm người**
   → **Người dùng thử Threads** → nhập username Threads của họ
2. Họ mở app Threads → ⚙️ → **Quyền trên trang web** → **Lời mời** → chấp nhận
3. Bạn vào **Công cụ tạo mã người dùng**, tạo mã cho tài khoản của họ, gửi họ chuỗi đó

Sức chứa: 50 người dùng thử cho mỗi app.

⚠️ Tài khoản Threads của họ cũng phải để **công khai**, nếu không sẽ không tạo được mã.

## Lấy token

App cần một token 60 ngày. Lấy ở `developers.facebook.com`:

1. App **Threads Tool** → **Vai trò trong ứng dụng** → **Vai trò** → **Thêm người**
   → chọn **Người dùng thử Threads** → nhập username Threads
2. Mở app Threads → ⚙️ → **Quyền trên trang web** → **Lời mời** → chấp nhận
3. Quay lại → **Trường hợp sử dụng** → **Truy cập vào API Threads** → tab **Cài đặt**
   → **Công cụ tạo mã người dùng** → **Tạo mã truy cập**

Dán chuỗi `THQ...` vào tab **Kết nối** của app.

⚠️ Tài khoản Threads phải để **công khai**, nếu không sẽ không tạo được mã.

⚠️ Token sống 60 ngày. App tự gia hạn khi đã dùng quá 45 ngày, nhưng **chỉ khi
app được mở**. Không mở suốt 60 ngày thì token chết và phải quay lại tạo mã mới.

### Số ID dễ nhầm

```
Meta App ID     1054123914199281   chỉ dùng trên developers.facebook.com
Threads App ID  1761855418151863   số thật của API
```

Cách lấy token bằng "Công cụ tạo mã người dùng" không cần tới số nào trong hai
số trên. Ghi lại phòng khi sau này chuyển sang OAuth.

---

## Bốn màn

**Soạn & đăng** — viết bài, gắn chủ đề, gắn link tiếp thị liên kết, đăng ngay
hoặc hẹn giờ. Hàng đợi nằm ở cột phải.

**Bài đăng** — số liệu tài khoản và từng bài, sắp xếp theo lượt xem/thích/bình
luận, xoá bài.

**Tương tác** — ba ô con:

| Ô | Làm gì |
|---|---|
| Bình luận | Quét bình luận dưới bài mình, máy soạn sẵn câu trả lời, bạn duyệt rồi gửi |
| Nhắc đến | Bài của người khác có nhắc tên bạn |
| Tìm kiếm | Tìm bài trên **toàn Threads** theo từ khoá hoặc chủ đề, rồi trả lời |

**Cài đặt** — dòng khai báo tiếp thị liên kết, mẫu trả lời, từ khoá theo dõi.

Tài khoản nằm ở nút dưới cùng thanh bên.

### Phím tắt

```
Ctrl + 1..4    đổi màn
Ctrl + Enter   đăng ngay (khi đang ở màn Soạn)
Esc            đóng hộp xác nhận
```

## Tìm kiếm trên toàn Threads

`threads_keyword_search` cho tìm bài của người lạ và **trả lời vào đó**. Hai chế độ:

- **Từ khoá** — tìm chữ trong nội dung bài
- **Chủ đề** — tìm theo topic tag (`search_mode=TAG`)

Và hai kiểu sắp xếp: **Phổ biến** (`TOP`) hoặc **Mới nhất** (`RECENT`).

⚠️ Hạn mức riêng và rất chặt: **2.200 lượt tìm trong 24 giờ**, tính theo **tài khoản
người dùng** chứ không theo app — dùng app khác cũng trừ vào cùng một quỹ. Truy vấn
không ra kết quả thì không bị trừ.

⚠️ Trả lời người lạ phải đúng chỗ và đúng việc. Rải cùng một câu quảng cáo vào hàng
loạt bài là cách nhanh nhất để bị báo cáo và mất tài khoản.

## Lượt nhắc — bị Meta giới hạn

⚠️ **Chưa được duyệt truy cập nâng cao thì `/me/mentions` CHỈ trả về lượt nhắc từ
người dùng thử của chính app này.** Người lạ nhắc tên bạn sẽ không hiện ra, mà
endpoint vẫn trả 200 với danh sách rỗng — nhìn hệt như "không ai nhắc tới bạn".

App có ghi rõ điều này ngay trên màn, nhưng ghi lại ở đây để không ai đi tìm lỗi
ở chỗ không có lỗi.

## Trending Topics — không dựng được

Quyền `threads_trending_topics` có trong bảng điều khiển của Meta nhưng **không có
tài liệu công khai** cho endpoint tương ứng. Không đoán, nên không dựng.

Thay thế: dùng **Tìm kiếm → chế độ Chủ đề** để tra một chủ đề cụ thể xem đang có
bao nhiêu người nói về nó.

---

## Những giới hạn có thật, biết trước cho đỡ mất công

**Không tải ảnh từ máy lên được.** Máy chủ Meta phải tự tải ảnh về từ một địa chỉ
công khai; ổ đĩa máy bạn thì họ không với tới. Muốn đăng ảnh thì ảnh phải nằm sẵn
trên một máy chủ nào đó rồi dán đường dẫn vào.

**Hẹn giờ chỉ chạy khi app đang mở.** Không có máy chủ nào chạy hộ. Hẹn 3 giờ sáng
rồi tắt máy đi ngủ là không có gì đăng.

**Threads hạ hiển thị bài có link ra ngoài**, giống Facebook và X. Vì thế app dựng
sẵn hai đường gắn link:

| Kiểu | Cách chạy | Đánh đổi |
|---|---|---|
| `binh-luan` *(mặc định)* | Đăng bài không link, rồi tự trả lời chính mình kèm link | Bài chính giữ tầm với, người xem bấm thêm một nhịp |
| `trong-bai` | Gắn thẳng `link_attachment` vào bài | Gọn hơn, nhưng bị hạ hiển thị |

Chưa ai đo được đường nào ăn hơn với tài khoản này. Chạy thử cả hai vài tuần rồi
xem tab Thống kê.

**Chủ đề — mỗi bài đúng một cái.** Threads gọi là *topic tag*, hiện cạnh tên dạng
`@uv.neyugn_ › skincare`. Nó KHÁC hashtag: chỉ một, nằm tách khỏi nội dung, và
Threads dùng nó để đưa bài tới người quan tâm chủ đề — kể cả người chưa theo dõi.
Với bài có link (vốn bị hạ hiển thị) thì đây là đường bù lại.

Luật của Meta: **1–50 ký tự, cấm dấu chấm `.` và dấu và `&`**. App kiểm trước khi
gửi, và tự cắt dấu `#` ở đầu nếu bạn gõ theo thói quen hashtag.

⚠️ Chủ đề chỉ gắn cho **bài chính**, không gắn cho bình luận chứa link — gắn cả hai
là đẩy cùng một nội dung vào luồng chủ đề hai lần.

⚠️ Đừng gắn chủ đề sai để ăn view. Bài bán hàng gắn chủ đề đang hot là kiểu lạm
dụng mà Threads phạt được và người dùng báo cáo được.

**Trả lời là bán tự động, cố ý.** Máy chỉ soạn sẵn theo mẫu từ khoá; người bấm gửi.
Điều khoản Meta cấm tương tác tự động mang tính spam, và trả lời máy móc dưới mỗi
bình luận là cách nhanh nhất khiến người ta bỏ theo dõi.

**Chỉ ẩn được bình luận tầng đầu** dưới bài của mình. Ẩn một trả lời lồng nhau thì
Meta trả lỗi quyền — nghe như thiếu scope, thật ra là sai đối tượng.

---

## Xoá bài

Nút **Xoá** ở cột cuối tab **Thống kê**. Có hộp xác nhận hiện lại nội dung bài
trước khi gật — Threads **không có thùng rác**, xoá rồi là mất hẳn cùng mọi bình
luận và lượt thích dưới bài.

⚠️ Cần quyền **`threads_delete`**, phải thêm ở
*Trường hợp sử dụng → Truy cập vào API Threads → Quyền và tính năng*.

⚠️ **Thêm quyền xong phải TẠO LẠI TOKEN.** Phạm vi quyền đóng cứng vào token lúc
sinh ra; token cũ không tự có thêm quyền mới. Triệu chứng nếu quên: nút Xoá báo
*"Thiếu quyền cho thao tác này"* trong khi trang cấu hình đã hiện `threads_delete`
là "Sẵn sàng thử nghiệm".

## Hạn mức Meta trong 24 giờ

```
250 bài đăng · 1.000 trả lời · 100 lượt xoá
số lệnh gọi = 4.800 × lượt hiển thị (tối thiểu 10)
```

Thanh bên trái hiện mức đã dùng. Chạm trần là Meta chặn thẳng và thông điệp lỗi
không nói còn bao lâu mới được đăng tiếp.

---

## Khai báo tiếp thị liên kết

Mọi bài **có gắn link** tự động được nối thêm dòng khai báo ở cuối. Sửa chữ được
trong tab Cài đặt, nhưng **không có công tắc tắt** — Meta bắt buộc công khai quan
hệ có trả tiền, và quên một bài là rủi ro khoá tài khoản.

Dòng khai báo luôn nằm trong **bài chính**, kể cả khi link để ở bình luận. Để nó
dưới bình luận thì người lướt qua bài không đọc được.

---

## Dữ liệu cất ở đâu

Trong thư mục `userData` của Electron (tab Kết nối hiện đường dẫn đầy đủ):

| Tệp | Chứa gì |
|---|---|
| `phien.json` | Token, mã hoá bằng DPAPI của Windows |
| `du-lieu.json` | Cài đặt, hàng đợi hẹn giờ, mẫu trả lời, id bình luận đã xử lý |

Tách hai tệp là chủ ý: token là thứ duy nhất mất đi thì thiệt hại thật, nên càng
ít đường ghi vào nó càng tốt.

⚠️ Nếu tab Kết nối báo **"Mã hoá: KHÔNG"** thì máy này không dùng được kho khoá
hệ điều hành và token đang nằm dạng chữ thường. App vẫn chạy, nhưng đừng chia sẻ
thư mục đó.

---

## Chưa có

- Đăng chuỗi bài (thread nhiều phần nối nhau)
- Đăng video (API có hỗ trợ, chưa dựng giao diện)
- Trả lời bằng AI thay vì mẫu từ khoá cố định
- Biểu đồ theo thời gian ở tab Thống kê — hiện chỉ có bảng
