# Kinetix — AI PT cá nhân trên nền openGym

Ngày: 2026-11-24 · Trạng thái: chờ duyệt

## 1. Mục đích và lý do

Kinetix là bản fork **dùng cá nhân, một người dùng** của [openGym](https://github.com/DuarteSantos8/openGym)
(AGPL-3.0, React 19 + Vite, server `node:http`, app iOS bằng Capacitor). Thêm vào đó một **AI PT cá nhân**:

1. Tự tối ưu **lịch tập** và **lịch ăn** theo chính người dùng.
2. **Phân tích chuyển động** từ video quay set tập.
3. Là **chatbot nói tiếng Anh live** qua tai nghe trong lúc tập, để người dùng luyện tiếng Anh luôn; nói chuyện bình thường (không chỉ về gym) cũng được.

Chạy được trên web và trên iPhone bằng file **IPA tự build, cài qua USB, không trả phí Apple**.
Không đăng App Store.

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**
- Giữ nguyên giao diện openGym; tính năng mới nằm trong cùng app.
- Bắt đầu: nhập cân nặng + mục tiêu + ảnh dáng người → AI phân tích dáng người → lộ trình tập + calo mục tiêu.
- Hằng ngày: cân buổi sáng + chụp ảnh bữa ăn (lưu theo ngày) → AI tính kcal/đạm/tinh bột/béo từng món.
- Hằng tuần: AI so cân nặng với mục tiêu → chỉnh calo, thực đơn và lịch tập.
- Trong lúc tập: nói tiếng Anh với PT qua tai nghe (đếm nghỉ, nhắc form, ghi set bằng giọng nói, chat tự do).
- Sau mỗi set có quay video: nhận xét form bằng giọng nói.
- File IPA cài được qua USB từ máy Linux.

**Không làm (non-goals)**
- App Store, TestFlight, tài khoản Apple Developer trả phí.
- Widget, Apple Watch, Watch widgets, Live Activity, tải gói animation.
- Nhiều người dùng, trainer, cộng đồng (giữ code cũ nhưng không phát triển hay kiểm thử).
- Cơ sở dữ liệu dinh dưỡng ở bản đầu (xem §6.1).
- Nhận xét form realtime bằng camera trực tiếp.
- Chấm điểm phát âm; buổi học tiếng Anh ngồi riêng.
- Gửi PR ngược lên openGym; viết lại bằng React Native / Java / Go / Python.
- Kiểm thử Android (không xoá, không đảm bảo).

**Phản mục tiêu (làm xong mà vẫn coi là thất bại nếu…)**
- Ghi chép ăn uống mỗi ngày tốn quá ~1 phút → người dùng bỏ.
- AI tự sửa lịch tập/lịch ăn mà không hỏi (openGym luôn bắt người dùng bấm áp dụng; giữ nguyên quy tắc này).
- Nói live bị trễ đến mức không nói chuyện được, hoặc ngắt giữa buổi tập.
- Mất dữ liệu tập cũ của openGym khi nâng cấp.

## 3. Ràng buộc

- Một người dùng, **chưa có dữ liệu openGym cũ** (không cần chuyển dữ liệu).
- **Máy chủ: laptop Windows MSI GF63 Thin**, 16 GB RAM, RTX 3050 4 GB VRAM. Chạy openGym bằng Docker Desktop (WSL2),
  Ollama bản Windows dùng GPU, Tailscale. Laptop phải bật (tắt chế độ ngủ) thì Coach và đồng bộ mới chạy;
  app vẫn ghi tập offline và đồng bộ sau (openGym vốn local-first).
- **Máy dev: máy Linux hiện tại** (không có Mac). Dev trỏ Coach tới Ollama trên laptop qua Tailscale.
- Miễn phí: không phí Apple; GitHub repo **public** `NeuroDev204/Kinetix` (fork của openGym) → phút macOS không giới hạn. Không bao giờ commit `.env`, ảnh, video hay `./data`.
- **Gemini free tier.** Người dùng chấp nhận việc Google có thể dùng dữ liệu gửi lên (ảnh, video, giọng nói) để cải thiện sản phẩm.
  Phải chịu giới hạn lượt gọi của free tier → nói live theo lượt, không mở micro liên tục (§6.2).
- Truy cập từ ngoài nhà qua **Tailscale**.
- AI hybrid: **Qwen 3.5 4B** chạy local qua Ollama (`qwen3.5:4b`, có vision + tools) và **Gemini API** cho live talk, ảnh, video.
- Apple ID miễn phí: app hết hạn sau 7 ngày, giới hạn số App ID và một số entitlement.

- **Dữ liệu bài tập lấy từ chính fork**, không gọi nguồn ngoài: `catalogue/` (6.554 bài: JSON + ảnh 180 px + clip mp4),
  `routines/`, `api/coach/core/starter-plans.js`. Giao diện đã có tiếng Việt (`frontend/src/locales/vi.js`);
  tên bài tập chưa có tiếng Việt (`catalogue/i18n` không có `vi.json`) → giữ tiếng Anh *(quyết định của Claude)*.
- **Giấy phép media bài tập (Gym visual, `NOTICE.md`)**: fork phi thương mại được giữ media 180 px nguyên vẹn kèm notice;
  **cấm đưa media vào bất kỳ hệ thống AI nào**. Kinetix chỉ gửi Gemini video/ảnh của người dùng, không bao giờ gửi
  `catalogue/media/*`. Có test T2 khẳng định payload gửi AI không chứa đường dẫn hay byte từ `catalogue/media`.
  Giữ nguyên `NOTICE.md`.

## 4. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết quả |
|---|---|---|
| Kinetix là service Python riêng cạnh openGym | Python mạnh về ML; nhưng 2 app, 2 giao diện | Loại: người dùng muốn một app giữ nguyên giao diện |
| **Fork openGym, viết thêm bằng JS** | Một app, Coach có sẵn, MediaPipe + Gemini Live chạy trong WebView; phải tự merge khi upstream cập nhật | **Chọn** |
| Viết lại bằng React Native / Go / Java / Python | ~420k dòng JS + shell native phải làm lại; RN không giúp tránh phí Apple | Loại |

iOS: chọn **Capacitor có sẵn → IPA chưa ký build trên GitHub Actions macOS → ký bằng Apple ID miễn phí khi cài qua USB**.
PWA bị bỏ qua vì người dùng muốn file IPA.

## 5. Kiến trúc tổng

```
iPhone (app Kinetix, Capacitor)  ──Tailscale──▶  Laptop Windows ở nhà
  • giao diện openGym + màn mới                  • docker compose: api + web (openGym fork)
  • MediaPipe Pose (WASM, local)                 • Ollama: qwen3.5:4b
  • Gemini Live (WebSocket, token tạm)           • ./data: db, state, ảnh, video
        │                                        • Gemini API key (chỉ nằm ở server)
        └──────────── Gemini API ◀───────────────┘
```

- iPhone **ghép đôi với server** (chế độ "Use my self-hosted openGym" có sẵn). Coach chạy trên server.
- **Định tuyến AI theo loại việc** (thay đổi chính ở `api/coach/`): hiện Coach chỉ dùng một provider.
  Kinetix chọn provider theo loại job:
  - Việc chữ (create, refine, review, adapt, ask, debrief, tổng kết tiếng Anh) → Qwen qua compatible endpoint (Ollama).
  - Việc ảnh/video (dáng người, bữa ăn, form) → Gemini. **Code mới**: mọi adapter hiện tại (`core/adapters/*`) chỉ gửi chữ;
    cần thêm đường gửi ảnh/video (inline data hoặc Files API) cho adapter Gemini.
  - Nói live → Gemini Live.
  - **Dự phòng** *(quyết định của Claude)*: job chữ mà Qwen trả về sai định dạng sau vòng repair có sẵn → chạy lại một lần bằng Gemini.
  - **Giới hạn ngữ cảnh** *(quyết định của Claude)*: 4 GB VRAM chỉ đủ Qwen 4B (Q4) với `num_ctx` khoảng 8k.
    Payload ước lượng vượt ngưỡng → gửi thẳng Gemini. Builder đo payload thật của `create`/`review` để chốt ngưỡng.
- **HTTPS qua `tailscale serve`** *(quyết định của Claude)*: Safari chỉ cho dùng micro/camera trên trang HTTPS,
  nên bản web thử trên iPhone phải có HTTPS. Tailscale cấp chứng chỉ thật cho tên `*.ts.net`, miễn phí.
- **Khóa Gemini chỉ nằm ở server.** Gemini Live chạy từ điện thoại bằng **token tạm (ephemeral token)** do server cấp *(quyết định của Claude)*.

## 6. Thiết kế từng phần

### 6.1 Lịch tập + lịch ăn (người dùng đã chọn: dựa vào cân nặng + chụp ảnh bữa ăn)

**Bắt đầu (mở rộng `views/CoachIntake.jsx`)**
- Thêm: cân nặng hiện tại, cân nặng mục tiêu (dùng trường có sẵn của openGym), ảnh dáng người.
- Thêm tuổi, chiều cao, giới tính nếu intake chưa có *(quyết định của Claude: cần để tính BMR/TDEE)*.
- Ảnh dáng người lưu vào **ảnh tiến độ có sẵn** (`lib/day-photos.js`, media-store theo hash, đồng bộ bằng media-sync).
- Job mới `physique` (Gemini vision): ảnh → `{ bodyFatRange, notes, focusAreas[] }`, lưu vào hồ sơ Coach và đưa vào prompt `create`.
- Calo mục tiêu ban đầu: Mifflin-St Jeor × hệ số vận động, cộng/trừ theo tốc độ tăng/giảm mỗi tuần có sẵn *(quyết định của Claude)*.

**Ghi bữa ăn (màn mới "Ăn uống")**
- Chụp ảnh → ảnh lưu theo ngày qua media-store có sẵn → job `meal` (Gemini vision) trả về các món:
  `{ name, grams, kcal, protein, carbs, fat }`.
- Người dùng sửa được số gram; macro **tỉ lệ thuận** theo gram (không gọi lại AI).
- Dữ liệu: `S.meals[YYYY-MM-DD] = [{ id, at, photo: <hash>, items[], edited }]`, có timestamp từng trường như mọi dữ liệu openGym
  để `lib/sync-merge.js` và `api/sync-stamps.js` gộp đúng (sửa cả hai phía, kèm test parity).
- Màn hình hiện: ảnh hôm nay, tổng so với mục tiêu, thực đơn tuần.
- **Không dùng cơ sở dữ liệu dinh dưỡng ở bản đầu** *(quyết định của Claude)*: chưa có bảng món Việt mở nào tải được;
  OpenNutrition (ODbL, ~300k thực phẩm) mạnh về nguyên liệu, yếu về món Việt. Gemini tự ước lượng.
  Nếu sai nhiều → thêm OpenNutrition để tra theo nguyên liệu (việc sau, không thuộc bản này).

**Hằng tuần (mở rộng review tự động có sẵn)**
- Lịch chạy giữ nguyên `api/coach/core/due.js` (chỉ quyết định *khi nào*). Dữ liệu thêm vào `core/payload.js` + `core/context.js`: xu hướng cân nặng 14 ngày (đã có 4 tuần weigh-in), tổng macro mỗi ngày từ `S.meals`.
- Review trả về, ngoài các thay đổi lịch tập có sẵn: calo/macro mục tiêu mới + thực đơn tuần (món Việt, dạng chữ).
- Đi qua validator + một vòng repair như mọi job; người dùng bấm áp dụng mới đổi.

### 6.2 Nói tiếng Anh live (người dùng đã chọn: trong lúc tập + chat tự do)

- Gemini Live API, WebSocket từ app, model native audio (builder chọn model id hiện hành).
- **Theo lượt, giống âm thông báo** (người dùng chọn: nghe nhạc bằng tai nghe Bluetooth; khi PT nói thì nhạc nhỏ lại,
  xong thì về âm lượng cũ):
  - Mỗi lượt: bật audio session `playAndRecord` + `duckOthers` → nói/nghe → tắt session với `notifyOthersOnDeactivation`
    → nhạc tự về âm lượng cũ. Ngoài lượt, giữ `.ambient` như openGym.
  - Bắt đầu lượt *(quyết định của Claude)*: nút lớn "Talk" ở màn đang tập; PT cũng tự mở lượt khi có việc
    (hết giờ nghỉ, có nhận xét video). Hết lượt khi im ~3 giây.
  - Micro **hybrid** (người dùng chọn): có tai nghe (Bluetooth hoặc có dây có mic) → dùng **micro tai nghe**;
    không có → **micro điện thoại**.
    - Session bật `allowBluetooth` + `allowBluetoothA2DP`; mỗi lượt chọn `setPreferredInput` theo cổng đang có
      (`bluetoothHFP` / `headsetMic` trước, `builtInMic` sau).
    - Nghe `AVAudioSession.routeChangeNotification`: rút/ngắt tai nghe giữa lượt → chuyển sang micro điện thoại, lượt không bị ngắt.
    - Chấp nhận: trong lượt nói, tai nghe Bluetooth chuyển sang HFP (âm thanh kém hơn); hết lượt về A2DP như cũ.
      Nhạc đã được hạ nhỏ trong lượt nên ảnh hưởng ít.
  - Cần plugin native nhỏ (mở rộng `RestAlertPlugin.swift`, nơi đang quản lý audio session) để chuyển session; WebView không tự làm được.
  - Giữa các lượt đóng WebSocket để tiết kiệm free tier; dùng session resumption để PT nhớ ngữ cảnh khi mở lại.
- Âm thanh: micro → PCM 16 kHz qua AudioWorklet; phát PCM 24 kHz trả về.
- Lời dặn hệ thống: PT nói tiếng Anh, thân thiện, cho phép chat mọi chủ đề, **sửa lỗi nhẹ** (nhắc lại câu đúng một lần rồi đi tiếp) *(quyết định của Claude)*.
  Biết buổi tập hôm nay: dùng cùng payload `today` mà job `adapt` đang gửi.
- Tool (function calling), nối vào action có sẵn của store: `log_set`, `start_rest`, `next_exercise`, `get_today`.
  Ghi set bằng giọng nói đi thẳng vào set đang mở (giống bấm tay, không phải thay đổi lịch).
- Bật chép lời hai chiều. Hết buổi: job chữ (Qwen, chia transcript thành đoạn vừa `num_ctx`) tổng kết → `S.english[YYYY-MM-DD] = { transcript, mistakes[{said, better}], newWords[] }`.
- Bật context window compression của Live API.

### 6.3 Phân tích video (người dùng đã chọn: sau mỗi set)

- Quay bằng tính năng quay video set có sẵn (`lib/set-videos.js`).
- Lưu xong → **MediaPipe Pose Landmarker** (`@mediapipe/tasks-vision`, WASM, chạy local trong WebView) đọc clip:
  đếm rep + góc khớp chính mỗi rep (gối, hông, khuỷu, độ nghiêng thân).
- Bảng ánh xạ khớp chính cho các bài lớn: squat, deadlift, bench press, overhead press, row, pull-up, lunge *(quyết định của Claude)*.
  Bài khác: bỏ bước đếm rep, chỉ gửi Gemini.
- Video thu nhỏ (`lib/video-shrink.js` có sẵn) + tóm tắt góc khớp + exercise id → Gemini →
  `{ summary, issues[{ rep, issue, cue }], score }`, lưu kèm set.
- Đọc nhận xét: nếu Live đang mở → đưa vào hội thoại Live để PT nói bằng cùng giọng và người dùng hỏi lại được;
  nếu không → giọng đọc iOS có sẵn (`lib/speech.js` → `lib/rest-alert.js` `speakNative` → AVSpeechSynthesizer
  trong `RestAlertPlugin.swift`), tiếng Anh. **Không cần TTS riêng.** (`lib/voice.js` là Siri/Shortcuts, không phải giọng đọc.)
- Lưu ý: openGym hiện cố ý không gửi video cho Coach. Kinetix đổi quy tắc này cho video form, chỉ khi người dùng bấm phân tích hoặc bật tự động.

### 6.4 Build iOS (người dùng đã chọn: IPA, cài qua USB)

- `App.xcodeproj` đã commit chỉ có target `App`; widget, đồng hồ, bộ tải animation, Garmin được CI thêm vào bằng
  `frontend/ios/ci/add-*.rb`. Kinetix **không chạy các script đó** (giữ `add-ui-tests.rb` nếu cần).
- Bỏ Live Activity biên dịch trong App (`WorkoutActivity.swift` và lời gọi từ `lib/live-activity.js`).
- Sửa `App/App.entitlements`: bỏ associated-domains, NFC, app-groups. HealthKit: thử ký; không được thì bỏ.
- Đổi bundle id riêng (ví dụ `com.<tên>.kinetix`) và tên hiển thị "Kinetix".
- Job GitHub Actions macOS mới, chỉ chạy tay (`workflow_dispatch`) để tiết kiệm phút:
  `npm run build:mobile` → `xcodebuild archive CODE_SIGNING_ALLOWED=NO` → đóng `Payload/App.app` thành `.ipa` → artifact.
- Cài: **Sideloader** trên Linux qua USB, Apple ID miễn phí; 7 ngày cài lại, dữ liệu giữ nguyên (cùng bundle id).
- Quyền: thêm mô tả micro/camera (`NSMicrophoneUsageDescription`, `NSCameraUsageDescription`) nếu chưa có.

### 6.5 Vòng phát triển hằng ngày

- `npm run dev` trên Linux; mở bản web trên Safari iPhone qua `tailscale serve` (HTTPS).
- IPA chỉ build ở các mốc lớn (người dùng chọn làm xong hết rồi mới cài qua USB).

## 7. Thứ tự làm *(quyết định của Claude)*

1. Fork (đã xong: `NeuroDev204/Kinetix`, public); dựng laptop Windows (Docker Desktop + openGym, Ollama `qwen3.5:4b`, Tailscale + `tailscale serve`); ghép đôi iPhone.
2. Định tuyến AI theo loại việc (Qwen / Gemini / dự phòng).
3. Phần 6.1 (dáng người, bữa ăn, review tuần).
4. Phần 6.2 (nói live).
5. Phần 6.3 (video).
6. Phần 6.4 (IPA).

## 8. Rủi ro đã biết

- **iOS có thể ngắt âm thanh WebView khi khóa màn hình** → PT live im giữa set. Chưa kiểm chứng.
  Giảm thiểu: giữ màn hình sáng khi đang tập; thử `UIBackgroundModes: audio`. Khuyến nghị thử trên máy thật sớm.
- **Audio session iOS**: openGym đặt `.ambient` (`RestAlertPlugin.swift:96`); Live cần `playAndRecord`.
  Đã xử lý bằng thiết kế theo lượt (§6.2), nhưng cần thử trên máy thật: nhạc có về đúng âm lượng không, micro điện thoại có nghe rõ khi để xa không.
- **Giới hạn Gemini free tier** (lượt/phút, lượt/ngày cho Live và vision) có thể chặn giữa buổi tập.
  Khi bị chặn: báo bằng giọng đọc iOS, chuyển sang chat chữ bằng Qwen.
- **Laptop Windows tắt/ngủ** → không có Coach, không đồng bộ; app vẫn ghi tập.
- **Qwen 4B có thể soạn lịch sai định dạng** → đã có repair + dự phòng Gemini.
- Apple ID miễn phí có thể không ký được entitlement nào đó → bỏ entitlement đó.
- Mỗi lần openGym upstream cập nhật, merge tay; tính năng mới nên nằm ở file mới để ít xung đột.

## 9. Để builder tự quyết

- Tên file, cấu trúc component, tên action trong store.
- Prompt cụ thể cho `physique`, `meal`, `form`, tổng kết tiếng Anh; schema JSON chi tiết.
- Model id Gemini cụ thể (vision và Live).
- Cách chia nhỏ commit, cách viết test (theo kiểu `*.test.js` cạnh file như repo đang làm).

## 10. Kiểm thử end-to-end và tiêu chí nghiệm thu

Người dùng yêu cầu spec bao gồm E2E. openGym hiện **không có công cụ E2E** (chỉ vitest + `node --test`,
và provider giả `api/coach/fixture-cli.mjs` cho mọi kết quả job của Coach). Kinetix thêm các tầng sau.

### 10.1 Các tầng test

| Tầng | Công cụ | Chạy ở đâu | Gọi AI thật? |
|---|---|---|---|
| T1 Unit | vitest (frontend), `node --test` (api) — file `*.test.js` cạnh code như repo đang làm | Linux dev, mỗi commit | Không |
| T2 Tích hợp API | `node --test` + **fixture provider mở rộng** cho job mới: `physique`, `meal`, `form`, `english-summary`, định tuyến Qwen/Gemini/dự phòng | Linux dev, mỗi commit | Không |
| T3 E2E web | **Playwright** (devDependency mới, lý do: người dùng yêu cầu E2E, repo chưa có) chạy app thật (`vite` + api) với fixture provider + **server Gemini Live giả** (WebSocket local phát PCM có sẵn, nhận tool call) | Linux dev, cuối mỗi task | Không |
| T4 Smoke AI thật | Một lệnh riêng, chỉ chạy khi bật `KINETIX_REAL_AI=1`: 1 lần gọi Qwen, 1 lần gọi Gemini vision, 1 lượt Gemini Live ngắn | Linux dev, cuối mỗi phase | Có (tiết kiệm free tier) |
| T5 iOS CI | GitHub Actions macOS, chỉ `workflow_dispatch`: build IPA chưa ký + chạy simulator + 1 XCUITest khởi động app (dùng `add-ui-tests.rb` có sẵn) | GitHub | Không |
| T6 Thủ công trên iPhone | Checklist §10.3 — không tự động được (micro thật, Bluetooth, khóa màn hình, ký Apple ID) | Người dùng | Có |

- Media giả cho T3: Chromium `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>
  --use-file-for-fake-video-capture=<y4m>`; ảnh bữa ăn/dáng người là file mẫu trong `e2e/fixtures/`.
- Test T3 chạy trên Chromium; WebKit của Playwright chạy các luồng không cần micro/camera (gần Safari nhất có thể trên Linux).
- Toàn bộ T1–T3 phải xanh trước khi sang task kế tiếp; các bộ kiểm tra CI có sẵn của openGym
  (`check-locales`, `check-source-strings --strict`, `build-coach-assets --check`, `build-api-docs --check`) cũng phải xanh.

### 10.2 Luồng E2E bắt buộc (T3)

1. **Bắt đầu**: đăng nhập → Coach intake (tuổi, chiều cao, giới tính, cân nặng, mục tiêu, ảnh dáng người)
   → job `physique` → plan card → bấm áp dụng → routine xuất hiện ở Plan; ảnh có ở ảnh tiến độ; calo mục tiêu hiện ở màn Ăn uống.
2. **Bữa ăn**: chụp/tải ảnh → job `meal` → danh sách món → sửa gram một món → macro đổi đúng tỉ lệ → tổng ngày đúng;
   tải lại trang → dữ liệu còn; thiết bị thứ hai (context Playwright khác) đồng bộ thấy cùng dữ liệu.
3. **Review tuần**: có 14 ngày cân nặng + bữa ăn mẫu → chạy review → card có calo mới + thực đơn tuần + thay đổi lịch tập
   → áp dụng → Undo trả lại như cũ.
4. **Định tuyến AI**: job chữ đi Qwen; Qwen trả sai định dạng 2 lần → chạy lại bằng Gemini; payload quá ngưỡng → đi thẳng Gemini;
   Gemini báo hết quota → giao diện báo rõ, chat chữ chuyển sang Qwen.
5. **PT live**: bắt đầu buổi tập → bấm Talk → server Live giả gọi tool `log_set` → set đang mở được ghi đúng số;
   `start_rest` chạy đồng hồ nghỉ; hết lượt khi im ~3 giây; hết buổi → `S.english[ngày]` có transcript, lỗi, từ mới.
6. **Video form**: ghi set có video (file mẫu squat) → MediaPipe đếm đúng số rep của video mẫu (±1)
   → job `form` → nhận xét lưu kèm set → được đưa vào Live nếu đang mở, nếu không thì gọi giọng đọc (kiểm tra lời gọi).
7. **Offline**: tắt mạng api → ghi tập vẫn được → bật lại → đồng bộ, không mất dữ liệu.

### 10.3 Checklist thủ công trên iPhone (T6)

- Cài IPA bằng Sideloader qua USB; app mở, ghép đôi với laptop qua Tailscale.
- Nghe nhạc bằng tai nghe Bluetooth → bấm Talk → nhạc nhỏ lại → PT trả lời → nhạc về âm lượng cũ.
- Micro hybrid: có tai nghe → nói qua micro tai nghe; tháo tai nghe giữa lượt → chuyển micro điện thoại, lượt không ngắt.
- Khóa màn hình giữa buổi → PT live còn hoạt động hay không (ghi lại kết quả; rủi ro §8).
- Quay video set → nhận xét nghe được trong tai nghe.
- 7 ngày sau cài lại → dữ liệu còn nguyên.

### 10.4 Tiêu chí nghiệm thu (xong là khi)

- Mọi luồng §10.2 xanh trên Linux dev; T4 chạy được với key thật một lần mỗi phase.
- IPA tải được từ artifact GitHub Actions và cài được qua USB.
- Checklist §10.3 được người dùng đánh dấu (ngoại lệ ghi rõ lý do).
- Ghi bữa ăn bằng ảnh mất dưới 1 phút (đo thủ công).

## 11. Chạy tự động ("treo máy")

Người dùng muốn spec và plan đủ lớn để Claude tự làm liên tục không cần hỏi.

**Chuẩn bị trước khi treo máy — đã xong 2026-11-24**
1. Repo public `NeuroDev204/Kinetix` (fork GitHub, remote `upstream` = openGym); `gh` đã đăng nhập.
2. `GEMINI_API_KEY` trong `/home/neuro/Documents/Kinetix/.env` (`.env` nằm trong `.gitignore` của openGym).
3. Ollama trên laptop Windows: người dùng báo đã bật. Không truy cập được → T4 phần Qwen bỏ qua, không chặn.

**Quy tắc khi chạy tự động** *(quyết định của Claude)*
- Mỗi task: viết test trước → code → T1–T3 xanh → commit (một task một commit) → task kế.
- Mỗi phase một nhánh; cuối phase chạy T4 nếu có key, rồi merge vào `main` của `NeuroDev204/Kinetix`.
- Kẹt: sửa 3 lần không xanh → ghi `docs/BLOCKERS.md` (lỗi, đã thử gì, nghi ngờ gì) → chuyển sang task độc lập kế tiếp.
- Không bao giờ: push lên openGym upstream, commit secret, xoá dữ liệu trong `./data`, chạy T4 trong vòng lặp.
- Free tier: T4 tối đa một lần mỗi phase; mọi test khác dùng fixture.
- Ghi tiến độ vào `docs/PROGRESS.md` sau mỗi task (task nào xong, test nào xanh, commit nào).

**Việc chỉ người dùng làm được (gom về cuối, ghi trong `docs/HUMAN_TODO.md`)**
- Dựng laptop Windows: Claude viết sẵn script PowerShell + hướng dẫn (Docker Desktop, Ollama, Tailscale, `tailscale serve`);
  người dùng chạy.
- Cài IPA bằng Sideloader + Apple ID; checklist §10.3.
