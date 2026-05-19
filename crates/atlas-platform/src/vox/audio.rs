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
