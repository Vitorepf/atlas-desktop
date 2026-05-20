//! Real CPAL-backed audio capture for Atlas Vox Mac Edge.
//!
//! cpal's `Stream` is `!Send` on macOS (CoreAudio), so we own the stream on
//! a dedicated thread and drive it via a `std::sync::mpsc` stop channel.
//! The captured PCM lives behind an `Arc<parking_lot::Mutex<Vec<f32>>>`
//! shared with the audio callback — never on disk, never on the network.
//!
//! Honest-failure contract: if no default input device exists, or the
//! device refuses a stream config, we surface the exact error to the
//! caller. We never fabricate silence to pretend recording worked.

use std::sync::mpsc as smpsc;
use std::sync::Arc;
use std::thread;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use parking_lot::Mutex;

#[derive(Debug, thiserror::Error)]
pub enum AudioCaptureError {
    #[error("no default input device available")]
    NoDevice,
    #[error("device config error: {0}")]
    Config(String),
    #[error("stream build error: {0}")]
    Build(String),
    #[error("stream play error: {0}")]
    Play(String),
    #[error("recorder thread init error: {0}")]
    ThreadInit(String),
    #[error("unsupported sample format: {0}")]
    UnsupportedFormat(String),
}

/// Live, threaded audio capture handle. PCM samples are appended to an
/// internal buffer until the caller invokes `stop_and_take` or `discard`.
pub struct RealRecorder {
    samples: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    channels: u16,
    stop_tx: smpsc::Sender<()>,
    join_handle: Option<thread::JoinHandle<()>>,
}

impl RealRecorder {
    /// Spawns the capture thread, builds the stream, waits for confirmation
    /// that capture started, and returns a handle. On any failure the
    /// thread exits cleanly and the error is propagated back here.
    pub fn start() -> Result<Self, AudioCaptureError> {
        let samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let samples_thread = Arc::clone(&samples);
        let (init_tx, init_rx) = smpsc::channel::<Result<(u32, u16), AudioCaptureError>>();
        let (stop_tx, stop_rx) = smpsc::channel::<()>();

        let join_handle = thread::Builder::new()
            .name("vox-audio".to_string())
            .spawn(move || {
                run_capture_loop(samples_thread, init_tx, stop_rx);
            })
            .map_err(|e| AudioCaptureError::ThreadInit(e.to_string()))?;

        let (sample_rate, channels) = init_rx
            .recv()
            .map_err(|e| AudioCaptureError::ThreadInit(e.to_string()))??;

        Ok(RealRecorder {
            samples,
            sample_rate,
            channels,
            stop_tx,
            join_handle: Some(join_handle),
        })
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u16 {
        self.channels
    }

    /// Non-consuming level probe for live VAD. Reads only the tail of the
    /// in-memory PCM buffer; never persists or exposes raw samples.
    pub fn recent_level(&self, max_samples: usize) -> AudioLevelSnapshot {
        let buf = self.samples.lock();
        if buf.is_empty() || max_samples == 0 {
            return AudioLevelSnapshot {
                sample_count: buf.len(),
                recent_sample_count: 0,
                rms: 0.0,
                peak: 0.0,
            };
        }
        let start = buf.len().saturating_sub(max_samples);
        let recent = &buf[start..];
        let mut sum_sq = 0.0f64;
        let mut peak = 0.0f32;
        for s in recent {
            let amp = s.abs();
            peak = peak.max(amp);
            sum_sq += (amp as f64) * (amp as f64);
        }
        let rms = (sum_sq / recent.len() as f64).sqrt() as f32;
        AudioLevelSnapshot {
            sample_count: buf.len(),
            recent_sample_count: recent.len(),
            rms,
            peak,
        }
    }

    /// Signal the capture thread to stop, wait for it, then return the
    /// captured PCM. The internal buffer is consumed.
    pub fn stop_and_take(mut self) -> Vec<f32> {
        let _ = self.stop_tx.send(());
        if let Some(jh) = self.join_handle.take() {
            let _ = jh.join();
        }
        let mut buf = self.samples.lock();
        std::mem::take(&mut *buf)
    }

    /// Signal stop and drop the captured PCM. Used for cancellation /
    /// eclipse — the buffer must not survive.
    pub fn discard(mut self) {
        let _ = self.stop_tx.send(());
        if let Some(jh) = self.join_handle.take() {
            let _ = jh.join();
        }
        let mut buf = self.samples.lock();
        buf.clear();
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AudioLevelSnapshot {
    pub sample_count: usize,
    pub recent_sample_count: usize,
    pub rms: f32,
    pub peak: f32,
}

fn run_capture_loop(
    samples_thread: Arc<Mutex<Vec<f32>>>,
    init_tx: smpsc::Sender<Result<(u32, u16), AudioCaptureError>>,
    stop_rx: smpsc::Receiver<()>,
) {
    let host = cpal::default_host();
    let device = match host.default_input_device() {
        Some(d) => d,
        None => {
            let _ = init_tx.send(Err(AudioCaptureError::NoDevice));
            return;
        }
    };
    let config = match device.default_input_config() {
        Ok(c) => c,
        Err(e) => {
            let _ = init_tx.send(Err(AudioCaptureError::Config(e.to_string())));
            return;
        }
    };
    let sample_rate = config.sample_rate().0;
    let channels = config.channels();
    let sample_format = config.sample_format();
    let stream_config: cpal::StreamConfig = config.into();

    let err_cb = |err: cpal::StreamError| {
        tracing::error!(target: "vox-audio", "cpal stream error: {}", err);
    };

    let stream_result: Result<cpal::Stream, String> = match sample_format {
        SampleFormat::F32 => {
            let samples_for_cb = Arc::clone(&samples_thread);
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        let mut buf = samples_for_cb.lock();
                        buf.extend_from_slice(data);
                    },
                    err_cb,
                    None,
                )
                .map_err(|e| e.to_string())
        }
        SampleFormat::I16 => {
            let samples_for_cb = Arc::clone(&samples_thread);
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        let mut buf = samples_for_cb.lock();
                        buf.reserve(data.len());
                        for s in data {
                            buf.push(*s as f32 / i16::MAX as f32);
                        }
                    },
                    err_cb,
                    None,
                )
                .map_err(|e| e.to_string())
        }
        SampleFormat::U16 => {
            let samples_for_cb = Arc::clone(&samples_thread);
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[u16], _: &cpal::InputCallbackInfo| {
                        let mut buf = samples_for_cb.lock();
                        buf.reserve(data.len());
                        for s in data {
                            buf.push((*s as f32 - 32_768.0) / 32_768.0);
                        }
                    },
                    err_cb,
                    None,
                )
                .map_err(|e| e.to_string())
        }
        other => {
            let _ = init_tx.send(Err(AudioCaptureError::UnsupportedFormat(format!(
                "{:?}",
                other
            ))));
            return;
        }
    };

    let stream = match stream_result {
        Ok(s) => s,
        Err(e) => {
            let _ = init_tx.send(Err(AudioCaptureError::Build(e)));
            return;
        }
    };
    if let Err(e) = stream.play() {
        let _ = init_tx.send(Err(AudioCaptureError::Play(e.to_string())));
        return;
    }
    let _ = init_tx.send(Ok((sample_rate, channels)));

    // Block until the owner asks us to stop. Dropping the stream stops
    // CoreAudio cleanly.
    let _ = stop_rx.recv();
    drop(stream);
}

/// Cheap availability probe. Returns `true` if cpal can enumerate a
/// default input device. Does NOT trigger the macOS microphone permission
/// prompt — that happens only when we actually build + play a stream.
pub fn capture_available() -> bool {
    cpal::default_host().default_input_device().is_some()
}

/// Snapshot of the system's currently-selected audio input. Read-only —
/// `describe_default_input` never opens a CoreAudio stream and never
/// triggers the macOS microphone TCC prompt. Used by the doctor / setup
/// assistant to tell the operator "your AirPods are the active mic" or
/// "built-in MacBook microphone is active" without surprising them with
/// a permission dialog every time the UI mounts.
#[derive(Debug, Clone)]
pub struct AudioInputSnapshot {
    pub device_name: Option<String>,
    pub sample_rate_hz: Option<u32>,
    pub channels: Option<u16>,
}

/// Read-only inspection of the macOS default input device. Returns `None`
/// fields when cpal cannot enumerate (no permission, no device, headless
/// CI). NEVER builds a stream — safe to call from doctor / read-only UI.
pub fn describe_default_input() -> AudioInputSnapshot {
    let host = cpal::default_host();
    let Some(device) = host.default_input_device() else {
        return AudioInputSnapshot {
            device_name: None,
            sample_rate_hz: None,
            channels: None,
        };
    };
    let device_name = device.name().ok();
    let (sample_rate_hz, channels) = match device.default_input_config() {
        Ok(c) => (Some(c.sample_rate().0), Some(c.channels())),
        Err(_) => (None, None),
    };
    AudioInputSnapshot {
        device_name,
        sample_rate_hz,
        channels,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describe_default_input_never_panics() {
        // Pode rodar em CI sem áudio. O contrato é "não panica e devolve
        // Option vazio quando não há device" — não a presença do device.
        let snapshot = describe_default_input();
        // Coerência: se temos sample_rate, temos channels (vêm do mesmo
        // `default_input_config()`).
        match (&snapshot.sample_rate_hz, &snapshot.channels) {
            (Some(sr), Some(ch)) => {
                assert!(*sr >= 8_000, "sample_rate sanity: {sr}");
                assert!(*ch >= 1 && *ch <= 8, "channels sanity: {ch}");
            }
            (None, None) => {}
            other => panic!(
                "sample_rate e channels devem ser ambos Some ou ambos None, got {:?}",
                other
            ),
        }
    }

    #[test]
    fn capture_available_does_not_panic() {
        let _ = capture_available();
    }
}
