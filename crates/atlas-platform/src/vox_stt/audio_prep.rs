//! Mic-PCM → whisper-input preparation.
//!
//! whisper.cpp expects 16 kHz mono f32 samples in [-1.0, 1.0]. cpal can hand
//! us anything (44.1 / 48 kHz, mono or stereo, native sample format), so we
//! downmix to mono and resample to 16 kHz before invoking the engine.
//!
//! Resampling here is **deliberately a simple linear interpolation** —
//! enough for push-to-talk dictation in a quiet room, honest about its
//! limits. A higher-quality resampler (e.g. `rubato` SincFixedIn) can drop
//! in later behind the same `to_whisper_input` function without touching
//! callers.
//!
//! Pure functions, no I/O, no unsafe. Trivial to unit-test.

/// Target sample rate for whisper.cpp.
pub const WHISPER_TARGET_SAMPLE_RATE: u32 = 16_000;

/// Converts a possibly-multichannel possibly-off-rate PCM buffer into the
/// 16 kHz mono buffer whisper.cpp expects. Returns the input untouched
/// when it already matches the target shape.
///
/// `channels` must be at least 1; treat zero as a single mono stream
/// (defensive — cpal will never hand us zero, but tests can).
pub fn to_whisper_input(samples: &[f32], sample_rate: u32, channels: u16) -> Vec<f32> {
    let mono = if channels <= 1 {
        samples.to_vec()
    } else {
        downmix_to_mono(samples, channels.max(1))
    };
    if sample_rate == WHISPER_TARGET_SAMPLE_RATE || mono.is_empty() {
        return mono;
    }
    linear_resample(&mono, sample_rate, WHISPER_TARGET_SAMPLE_RATE)
}

/// Channel-interleaved → mono by simple average across channels.
/// Interleave convention follows cpal: `[c0_t0, c1_t0, c0_t1, c1_t1, ...]`.
fn downmix_to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
    debug_assert!(channels > 1, "downmix_to_mono called with mono input");
    let ch = channels as usize;
    let frames = samples.len() / ch;
    let mut out = Vec::with_capacity(frames);
    for frame in 0..frames {
        let base = frame * ch;
        let mut acc = 0.0f32;
        for c in 0..ch {
            acc += samples[base + c];
        }
        out.push(acc / channels as f32);
    }
    out
}

/// Linear interpolation resampler. Produces `ceil(len * to / from)` samples
/// (approximately), bounded so the last input sample is included. Returns an
/// empty vector if either rate is zero or input is empty.
fn linear_resample(samples: &[f32], from_hz: u32, to_hz: u32) -> Vec<f32> {
    if from_hz == 0 || to_hz == 0 || samples.is_empty() {
        return Vec::new();
    }
    if from_hz == to_hz {
        return samples.to_vec();
    }
    let ratio = to_hz as f64 / from_hz as f64;
    let in_len = samples.len();
    // Output length = round(in_len * ratio). Saturate at 1 so a tiny input
    // still produces at least one sample.
    let out_len_f = (in_len as f64 * ratio).round();
    let out_len = if out_len_f < 1.0 { 1 } else { out_len_f as usize };
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        // Map output index back into input coordinates.
        let src = i as f64 / ratio;
        let i0 = src.floor() as usize;
        let i1 = (i0 + 1).min(in_len - 1);
        let frac = (src - i0 as f64) as f32;
        let s0 = samples[i0.min(in_len - 1)];
        let s1 = samples[i1];
        out.push(s0 + (s1 - s0) * frac);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passthrough_when_already_mono_16k() {
        let samples = vec![0.1f32, 0.2, 0.3, 0.4];
        let out = to_whisper_input(&samples, 16_000, 1);
        assert_eq!(out, samples);
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = to_whisper_input(&[], 44_100, 2);
        assert!(out.is_empty());
    }

    #[test]
    fn downmix_stereo_averages_each_frame() {
        // L,R,L,R → mean per frame
        let samples = vec![0.0f32, 1.0, -0.5, 0.5];
        let mono = downmix_to_mono(&samples, 2);
        assert_eq!(mono.len(), 2);
        assert!((mono[0] - 0.5).abs() < 1e-6);
        assert!((mono[1] - 0.0).abs() < 1e-6);
    }

    #[test]
    fn downmix_three_channels_averages_each_frame() {
        // 3 ch × 2 frames
        let samples = vec![0.0f32, 0.3, 0.6, 0.6, 0.6, 0.6];
        let mono = downmix_to_mono(&samples, 3);
        assert_eq!(mono.len(), 2);
        assert!((mono[0] - 0.3).abs() < 1e-6);
        assert!((mono[1] - 0.6).abs() < 1e-6);
    }

    #[test]
    fn linear_resample_doubles_length_when_target_is_2x() {
        // 4 samples @ 8kHz → 8 samples @ 16kHz (ratio 2).
        let samples = vec![0.0f32, 1.0, 0.0, -1.0];
        let out = linear_resample(&samples, 8_000, 16_000);
        // Output length is rounded; for ratio 2 we expect 8 samples.
        assert_eq!(out.len(), 8);
        // First sample matches; midpoints are interpolated.
        assert!((out[0] - 0.0).abs() < 1e-6);
        // Last sample should equal the last input sample (boundary).
        assert!((out[out.len() - 1] + 1.0).abs() < 1e-1);
    }

    #[test]
    fn linear_resample_halves_length_when_target_is_half() {
        let samples: Vec<f32> = (0..16).map(|i| i as f32 / 16.0).collect();
        let out = linear_resample(&samples, 16_000, 8_000);
        assert_eq!(out.len(), 8);
        assert!((out[0] - 0.0).abs() < 1e-6);
    }

    #[test]
    fn to_whisper_input_downmixes_and_resamples_44_1k_stereo_to_16k_mono() {
        // 4 frames stereo @ 44_100Hz → mono 16k. Expected length ≈
        // round(4 * 16000 / 44100) = 1 (rounded).
        let samples = vec![0.5f32, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
        let out = to_whisper_input(&samples, 44_100, 2);
        assert!(!out.is_empty());
        assert!(out.iter().all(|&s| (s - 0.5).abs() < 1e-6));
    }

    #[test]
    fn zero_sample_rate_returns_empty_without_panic() {
        let samples = vec![1.0f32, 2.0, 3.0];
        let out = linear_resample(&samples, 0, 16_000);
        assert!(out.is_empty());
    }
}
