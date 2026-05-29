# S.P.E.C.T.R.A. // AI Voice Detection & Audio Diagnostics Lab

S.P.E.C.T.R.A. (Spectral Pattern Evaluation & Classification Telemetry for Recorded Audio) for fun is a modern full-stack web application designed to detect whether a voice recording is human (organic) or AI-generated (synthetic) using real-time spectral audio analysis. 

The application features a highly interactive holographic/cyberpunk dashboard with fluid canvas-based animations, real-time microphone WebSockets streaming, and multi-instrument diagnostics.

---

## Core Features

- **Real-Time Microphone Streaming:** Capture mic input, perform client-side sample rate negotiation, and stream raw Float32 binary PCM audio chunks over WebSockets.
- **Advanced 4-Channel Visualization:**
  - *Waveform Monitor:* Glowing neon-green oscilloscope detailing time-domain amplitudes.
  - *Circular Core Spectrum:* Radially projecting frequency bars pulsing to audio energy.
  - *Frequency Equalizer:* Standard frequency equalizer displaying active frequency bins.
  - *Real-Time Scrolling Spectrogram:* Scientific rolling heatmap detailing frequency intensities over time.
- **Acoustic Diagnostic Engine:** FastAPI server extracting:
  - *MFCCs (Mel-Frequency Cepstral Coefficients):* Speech timber characteristics.
  - *Spectral Centroid:* Audio center of mass (brightness).
  - *Zero Crossing Rate:* Waveform oscillations (high-frequency noise marker).
  - *Pitch Statistics:* F0 fundamental frequency tracking using Librosa YIN to spot artificial flattening.
  - *Spectral Flatness:* Vocoder-induced noise or smoothness.
- **ML Inference Model:** A 3-layer neural network implemented in NumPy (API-compatible with TensorFlow) tuned to spot synthetic vocoder signatures.
- **Drag-and-Drop Uploader:** Supports uploading standard `.wav`, `.mp3`, or `.ogg` audio files.
- **History & Reports:** Persistent local audit log with JSON report downloads.

---

## Project Structure

```text
/neural-voice-detector
├── /backend
│   ├── .venv/               # Python Virtual Environment
│   ├── app.py               # FastAPI application with REST & WebSockets
│   ├── audio_processor.py   # Librosa feature extraction & log-mel converter
│   ├── voice_detector.py    # NumPy-based Sequential neural net (TF fallback)
│   ├── requirements.txt     # Backend python dependencies
│   └── run.py               # Uvicorn launcher script
└── /frontend
    ├── src/
    │   ├── components/      # UI components (Visualizer, Gauges, History)
    │   ├── App.jsx          # Main application page & audio hooks
    │   ├── index.css        # Global CSS, cyberpunk layout & keyframes
    │   └── main.jsx         # React mount logic
    ├── index.html           # Main HTML entrypoint (SEO optimized)
    ├── vite.config.js       # Vite build & Tailwind compiler configurations
    └── package.json         # Frontend npm dependencies
```

---

## Setup & Running Instructions

### 1. Start the Backend
Open a terminal in the project directory:

```bash
# Navigate to backend
cd backend

# Create Virtual Environment (if not already created)
python3 -m venv .venv

# Activate Virtual Environment
source .venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Launch Backend Server
python run.py
```
The FastAPI server will boot on **`http://localhost:8008`**.
- OpenAPI documentation: `http://localhost:8008/docs`
- Health check endpoint: `http://localhost:8008/health`

### 2. Start the Frontend
Open a new terminal window in the project directory:

```bash
# Navigate to frontend
cd frontend

# Install Packages
npm install

# Launch Vite Development Server
npm run dev
```
The React frontend will spin up on **`http://localhost:5173`**. Open this address in your web browser.

---

## Technical Details: The Science of Voice Detection

AI-generated speech models (like ElevenLabs, Tortoise, or Bark) produce micro-anomalies that are invisible to the ear but clearly visible in the frequency spectrum:
1. **Robotic Flat Pitch:** Text-to-speech synthesizers often lack natural prosody. The pitch standard deviation of synthetic speech is frequently extremely narrow (flat-pitch) compared to human speech, which oscillates naturally between 10 Hz and 40 Hz.
2. **High-Frequency Buzz (Spectral Flatness):** Synthesizer vocoders leave digital footprints (artifacts) in high frequency bands (above 4000 Hz) that resemble white noise, causing a spike in Spectral Flatness.
3. **Oversmoothed Spectral Envelopes:** AI generators predict smoothed mel bins to save bandwidth, leading to lower-order variance in higher Mel-Frequency Cepstral Coefficients (MFCCs). S.P.E.C.T.R.A. maps these micro-variations to classify the sample.

---

## Sample API Requests

### 1. Health Status Check
Check the API server health:
```bash
curl -s http://localhost:8008/health
```
**Response:**
```json
{
  "status": "online",
  "classifier": "numpy-neural-network-v1",
  "audio_backend": "librosa + soundfile",
  "python_version": "3.14.0"
}
```

### 2. Audio File Diagnostics Upload
Upload a `.wav` file to perform spectral classification:
```bash
curl -F "file=@/path/to/voice_sample.wav" http://localhost:8008/analyze
```
**Response:**
```json
{
  "prediction": "Likely Human",
  "confidence_percentage": 94.62,
  "spectral_anomaly_score": 0.0,
  "probabilities": {
    "human": 0.9462,
    "ai": 0.0538
  },
  "diagnostic_flags": {
    "robotic_flat_pitch": false,
    "pitch_jitter_anomaly": false,
    "high_freq_flatness": false,
    "oversmoothed_mel_envelope": false,
    "anomalous_centroid": false
  },
  "metrics": {
    "duration_seconds": 2.45,
    "sample_rate": 44100,
    "rms_energy": 0.0841,
    "spectral_centroid_hz": 1821.5,
    "zero_crossing_rate": 0.0432,
    "pitch_average_hz": 128.4,
    "pitch_variance": 22.15,
    "spectral_flatness": 0.0034
  }
}
```

### 3. WebSocket Real-Time Audio PCM Stream
Open a WebSocket handshake connection to `ws://localhost:8008/ws/stream` and stream Float32Array PCM buffers from the browser microphone.
- Send configuration message first: `rate:44100` (negotiate sample rate).
- Stream raw PCM bytes.
- Receive live predictions:
```json
{
  "type": "analysis",
  "metrics": {
    "rms_energy": 0.0632,
    "pitch_average_hz": 134.1,
    "pitch_variance": 18.2,
    "spectral_centroid_hz": 1720.5,
    "zero_crossing_rate": 0.045
  },
  "prediction": "Likely Human",
  "confidence_percentage": 92.1,
  "spectral_anomaly_score": 0.0,
  "diagnostic_flags": { ... }
}
```
# Neural-Voice-Analyzer
