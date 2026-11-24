# Kinetix trên laptop Windows (máy chủ ở nhà)

Hướng dẫn này dành cho người dùng: dựng máy chủ trên laptop Windows, ghép iPhone, và cài ứng dụng.
Làm theo thứ tự. Mỗi bước có một lệnh hoặc một thao tác.

## 1. Cài ba phần mềm

1. Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Ollama: https://ollama.com/download
3. Tailscale: https://tailscale.com/download/windows (đăng nhập bằng cùng tài khoản trên iPhone)

## 2. Chạy script dựng máy chủ

Mở PowerShell trong thư mục repo, rồi chạy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\kinetix\windows-setup.ps1
```

Script làm lần lượt: kiểm tra ba phần mềm; đặt biến môi trường cho Ollama; tải mô hình `qwen3.5:4b`;
hỏi khóa Gemini (gõ vào, không hiện ra màn hình); dựng máy chủ bằng Docker; ghi cấu hình vào thư mục dữ liệu;
bật Tailscale và in địa chỉ `https://...ts.net`. Chạy lại được nhiều lần mà không hỏng gì.

Khi script yêu cầu, thoát Ollama từ khay hệ thống rồi mở lại, sau đó nhấn Enter.

## 3. Điện nguồn

Đặt laptop **không ngủ khi cắm sạc**: Settings, System, Power, chọn "Never" cho "Sleep when plugged in".
Nếu laptop ngủ, điện thoại không gửi được yêu cầu và Kinetix báo "sẽ phân tích khi có mạng".

## 4. Ghép iPhone với máy chủ

1. Trên iPhone, mở Kinetix. Vào Settings, Account, "Pair the mobile app".
2. Điền địa chỉ máy chủ là đường dẫn `https://...ts.net` mà script đã in.
3. Đăng nhập bằng passkey của bạn (lần đầu sẽ tạo hồ sơ).

## 5. Cài ứng dụng lên iPhone (IPA không ký)

Ứng dụng được gửi dưới dạng file `Kinetix-unsigned.ipa`. Dùng Impactor để ký bằng Apple ID của bạn và cài qua USB:

1. Cài Impactor từ Flathub (Linux) hoặc tải bản Windows từ trang dự án của Impactor.
2. Cắm iPhone bằng cáp USB, tin cậy máy tính.
3. Kéo file IPA vào Impactor, nhập Apple ID, chọn iPhone, bấm Start.
4. Trên iPhone: Settings, General, VPN & Device Management, tin cậy nhà phát triển của bạn.

**Lưu ý:** chữ ký của Apple ID miễn phí hết hạn sau 7 ngày. Khi đó cài lại bằng Impactor (dữ liệu không mất).

## 6. Dữ liệu

Toàn bộ dữ liệu nằm trong thư mục `data\` ở repo trên laptop. Sao lưu bằng cách sao chép cả thư mục đó
sang ổ khác khi máy chủ đang tắt (`docker compose down` trước). Không chia sẻ thư mục `data\`: nó chứa tài khoản và lịch sử tập.
