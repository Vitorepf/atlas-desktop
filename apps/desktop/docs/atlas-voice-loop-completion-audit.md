# Atlas Voice Loop Completion Audit

Generated at: 2026-05-20T13:59:51Z

## Objective

Improve Atlas Voice so the operator can speak, Atlas sends automatically, Atlas replies by voice, then the system re-arms and the operator can speak again. The cycle must work for repeated turns without reopening the app or manually resetting the surface.

## Success Criteria

| Requirement | Evidence | Status |
| --- | --- | --- |
| Voice capture starts from the Atlas AI surface. | `apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx`; regression wall covers microphone toggle. | Automated pass |
| Speech is auto-sent after silence. | `VOICE_SILENCE_MS_TO_SEND = 350`; regression wall covers auto-send and busy-state guard. | Automated pass |
| Atlas replies by voice. | `crates/atlas-tauri/src/commands_vox_reply.rs`; installed binary contains ElevenLabs runtime. | Automated pass |
| Atlas never falls back to macOS low-quality voice. | `npm run vox:voice-loop-check --workspace=@atlas/desktop` scans installed binary for `/usr/bin/say`, `speechSynthesis`, `SpeechSynthesisUtterance`, `preferred_atlas_voice`. | Automated pass |
| Second and third turns re-arm automatically. | `apps/desktop/src/surfaces/atlas-ai/__tests__/atlasAiVoiceContinuity.test.ts`; `vox:regression-wall` includes two-turn and three-turn tests. | Automated pass |
| TTS completion cannot be lost by React effect cleanup. | `AtlasAiSurface.tsx` uses `voiceSpeechRunIdRef` / `isCurrentVoiceSpeechRun(speechRunId)` instead of cancelling `onEnd` through effect cleanup; `voxRegressionWall.test.ts` blocks the old pattern. | Automated pass |
| Voice response latency is reduced without lowering TTS quality. | Desktop sends `voice_response_contract`; backend injects concise spoken-response contract; `VoiceResponsePromptBuilderTest.php` covers backend behavior. | Automated pass |
| Installed app is the real signed app. | `/Applications/Atlas Code.app` verified with `codesign --verify --deep --strict --verbose=2`. | Automated pass |
| Local environment is ready. | `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop` returns `PASS · 11 ok · 0 aviso · 0 bloqueio`. | Automated pass |
| Physical 3-turn loop works with real microphone and real audio output. | Run `npm run vox:physical-loop-check --workspace=@atlas/desktop` after testing on the Mac: turn 1 voice reply, turn 2 voice reply without reopening, turn 3 voice reply without reopening. | Pending physical validation |

## Machine Evidence

- `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:release-check --workspace=@atlas/desktop`: `17 pass · 0 warn · 0 fail`
- `npm run vox:voice-loop-check --workspace=@atlas/desktop`: automated PASS; physical validation explicitly pending
- `npm run vox:regression-wall --workspace=@atlas/desktop`: PASS
- `npx tsc -b --pretty false`: PASS
- `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run tauri:build:vox --workspace=@atlas/desktop`: PASS; bundle reinstalled at `/Applications/Atlas Code.app`
- `codesign --verify --deep --strict --verbose=2 "/Applications/Atlas Code.app"`: PASS
- `cargo test -p atlas-platform vox_settings --features whisper-cpp`: `11 passed`
- `php artisan test tests/Unit/Ai/VoiceResponsePromptBuilderTest.php tests/Unit/Ai/Router/AtlasAiSpecialistFlowPromptBuilderTest.php`: `3 passed`
- `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop`: `PASS · 11 ok · 0 aviso · 0 bloqueio`
- `npm run vox:physical-loop-check --workspace=@atlas/desktop`: writes `test-results/vox-physical-loop-check/manifest.json`; completion requires `status=pass`

## Completion Decision

Do not mark the goal complete until the physical 3-turn voice loop is confirmed by Vitor on the actual Mac.
