# Human TODO

Things only you can do. The run never waits on these.

- [ ] Laptop Windows: run scripts/kinetix/windows-setup.ps1 (Task 5.3)
- [ ] Optional: record a 5-rep squat video of yourself as frontend/e2e/fixtures/squat-5reps.mp4 (Task 4.5 skips that test when missing; the file is in .gitignore so your video is not published)
- [ ] Check real free-tier limits at https://aistudio.google.com/rate-limit for gemini-3.8-flash and gemini-3.8-live
- [ ] Install the IPA with Impactor and run the iPhone checklist (Task 5.4)
- [ ] Set GEMINI_API_KEY in /home/neuro/Documents/Kinetix/.env (needed for the real-AI smoke test in Task 1.5; .env is git-ignored)
- [ ] Translate the 14 Kinetix intake strings and the photo-category text in 23 locale packs (they are English for now; Vietnamese is done). Keys: "Your body", "A few facts for the estimate", "Body photo", "Photos you choose to have analysed" and the rest added in Task 2.5 (search for them in src/locales/vi.js).
- [ ] Translate the 17 Nutrition and review strings in the locale packs (English for now; Vietnamese is done). Search src/locales/vi.js for "Add meal photo" and "Calories and meals" to find them.
- [ ] Windows laptop, once: from the repo folder run `powershell -ExecutionPolicy Bypass -File scripts\kinetix\windows-setup.ps1` (Task 5.3; guide in docs/KINETIX_SETUP.md)
- [ ] Windows laptop: keep it awake while plugged in (Power settings, "Sleep when plugged in": Never)
- [ ] iPhone: install the unsigned IPA with Impactor over USB; re-sign every 7 days (guide in docs/KINETIX_SETUP.md, section 5)

## Checklist trên iPhone (spec §10.3)

- [ ] Cài IPA bằng Impactor qua USB; app mở, ghép đôi với laptop qua Tailscale.
- [ ] Nghe nhạc bằng tai nghe Bluetooth → bấm Talk → nhạc nhỏ lại → PT trả lời → nhạc về âm lượng cũ. (Lưu ý: phiên âm thanh native chưa làm, xem docs/BLOCKERS.md mục 3.5.)
- [ ] Micro hybrid: có tai nghe → nói qua micro tai nghe; tháo tai nghe giữa lượt → chuyển micro điện thoại, lượt không ngắt. (Cùng lý do ở trên.)
- [ ] Khóa màn hình giữa buổi → PT live còn hoạt động hay không (ghi lại kết quả; rủi ro §8).
- [ ] Quay video set → nhận xét nghe được trong tai nghe. (Phân tích video khi đang tập đang chờ quyết định, xem docs/BLOCKERS.md mục 4.5.)
- [ ] 7 ngày sau cài lại → dữ liệu còn nguyên.
