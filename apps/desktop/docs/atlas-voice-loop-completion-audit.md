# Atlas Voice Loop Completion Audit

Generated at: 2026-05-20T15:28:00Z

## Objective

Atlas Voice must behave as a continuous voice conversation: the operator speaks, Atlas waits for a real end of thought, sends the complete request to the current Atlas AI thread, executes the full intention, replies with ElevenLabs voice, then re-arms the microphone for the next turn without reopening the app or creating accidental new conversations.

The priority is quality before speed. A long request such as "analise toda a documentacao do Atlas" must be executed as a full task. Voice output only shapes the final response for listening; it must not reduce the work scope.

## Success Criteria

| Requirement | Evidence | Status |
| --- | --- | --- |
| Voice capture starts from the Atlas AI surface only when the operator enables voice. | `apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx`; regression wall covers microphone and voice controls. | Automated pass |
| The loop keeps the current conversation context and avoids accidental new threads. | `AtlasAiSurface.tsx` sends with `newThread: atlas.selectedThreadId === null`; regression wall covers active thread continuity. | Automated pass |
| Atlas waits for a real end of turn, not a small mid-sentence pause. | `VOICE_SHORT_UTTERANCE_SILENCE_MS = 3_200`, `VOICE_LONG_UTTERANCE_SILENCE_MS = 2_200`, `voiceConfirmedSpeechMsRef`, `atlasVoiceEndpointSilenceMs`, `atlasVoiceShouldFinishTurn`. | Automated pass |
| Noise and silence are not sent as user turns. | `VOICE_MIN_SPEECH_FRAMES = 8`, `VOICE_MIN_CONFIRMED_SPEECH_MS = 700`, `atlasVoiceShouldDropSilentTurn`. | Automated pass |
| Obviously incomplete transcripts are not sent to Atlas. | `atlasVoiceTranscriptLooksIncomplete`, `atlasVoiceDecideTranscriptDispatch`, and `voicePendingContinuationRef` keep phrases like "Atlas, me disseram que o" pending and join the next capture before dispatch. | Automated pass |
| Atlas replies by premium voice only. | Native ElevenLabs runtime is configured; regression wall blocks `speechSynthesis`, `/usr/bin/say`, and `preferred_atlas_voice`. | Automated pass |
| Second and third turns re-arm automatically. | `atlasAiVoiceContinuity.test.ts` and `atlasAiVoiceLoopSimulation.test.ts` cover multi-turn rearm, speaking/thinking guards, and stale transcript cleanup. | Automated pass |
| TTS completion cannot be lost by React effect cleanup. | `voiceSpeechRunIdRef` / `isCurrentVoiceSpeechRun` guard stale `onEnd` callbacks. | Automated pass |
| The voice answer is concise, but the task scope is complete. | Desktop sends `voice_response_contract.mode = spoken_result`; backend prompt builder says not to reduce scope because the response is spoken. | Automated pass |
| Installed app is the signed build, not only dev source. | `/Applications/Atlas Code.app` was replaced from the Tauri bundle and passed `codesign --verify --deep --strict --verbose=2`. | Automated pass |
| Physical 3+ turn loop works with real microphone, AirPods/output, natural pauses, and no premature send. | Must be confirmed by Vitor on the actual Mac. | Pending physical validation |

## Machine Evidence

- `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:release-check --workspace=@atlas/desktop`: `19 pass · 0 warn · 0 fail`
- `npm run vox:regression-wall --workspace=@atlas/desktop`: PASS, including continuous loop, premium TTS only, active thread continuity, adaptive endpointing, and incomplete transcript guard
- `npm run build --workspace=@atlas/desktop`: PASS
- `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run tauri:build:vox --workspace=@atlas/desktop`: PASS; signed `.app` and `.dmg` built
- `codesign --verify --deep --strict --verbose=2 "/Applications/Atlas Code.app"`: PASS
- `php artisan test tests/Unit/Ai/VoiceResponsePromptBuilderTest.php tests/Unit/Ai/Router/AtlasAiSpecialistFlowPromptBuilderTest.php`: `3 passed`
- `git diff --check` in `atlas-desktop`: PASS
- `git diff --check` in `atlas-server`: PASS

## Physical Validation Required

Run one real session:

1. Open Atlas Code from `/Applications/Atlas Code.app`.
2. Select one existing Atlas AI thread.
3. Enable Atlas Voice once.
4. Say a sentence with a natural pause in the middle, for example: "Atlas, me disseram que o fluxo de voz estava funcionando... mas eu preciso confirmar se voce espera eu terminar."
5. Confirm it does not send at the first pause.
6. Let Atlas answer by voice.
7. Do not click anything. Speak a second turn.
8. Let Atlas answer by voice again.
9. Do not click anything. Speak a third turn.

Completion requires: current thread preserved, no accidental new conversation, no macOS voice, no premature send, and automatic re-arm after each spoken answer.

## Completion Decision

Machine side is green. Do not mark the goal complete until Vitor confirms the physical 3+ turn loop on the actual Mac.
