# Blockers

Format: `## <task id>`, then the error, what was tried (3 attempts), and the suspected cause.

## 2.8 (resolved)

All four flows now pass (flows 1 and 3 added: intake to target, review apply and undo). Full run: npm run e2e in frontend/ with PW_CHROMIUM set, 5 specs pass.

## 3.5 (Swift part blocked; JavaScript part done)

The voice session needs native begin and end calls (`beginVoice` / `endVoice`) in RestAlertPlugin.swift. The existing session ledger test (frontend/src/lib/rest-alert.native.test.js) requires that nothing deactivates the audio session outside the ledger's own `letGo`, and that setCategory calls stay at two. A voice turn that ends by deactivating the session breaks that rule, and this box has no Swift toolchain to test an alternative.

Decision needed: (a) let the voice turn go through CueAudioLedger as a new shape, which changes CueAudioCore and the test, or (b) relax the rule for the voice turn and say why. Until then the session runs without the native calls: beginVoiceTurn falls back to { input: 'builtin' } and the speaker and mic use the default session.
