# S.P.E.C.T.R.A.

### Spectral Pattern Evaluation & Classification Telemetry for Recorded Audio

S.P.E.C.T.R.A. is a futuristic AI voice detection web application that analyzes audio recordings to determine whether a voice is human or AI-generated using real-time spectral analysis and machine learning.

Built with React, FastAPI, WebSockets, Librosa, and NumPy.

---

## Features

* Real-time microphone audio streaming
* AI vs Human voice classification
* Live waveform & spectrogram visualization
* MFCC, pitch, spectral centroid & flatness analysis
* Drag-and-drop audio upload support
* Cyberpunk-inspired interactive dashboard
* WebSocket-based real-time diagnostics

---

## Tech Stack

### Frontend

* React
* Vite
* TailwindCSS
* Web Audio API

### Backend

* FastAPI
* Librosa
* NumPy
* Uvicorn

---

## Project Structure

```text
/neural-voice-detector
├── backend
│   ├── app.py
│   ├── audio_processor.py
│   ├── voice_detector.py
│   └── run.py
│
└── frontend
    ├── src
    ├── index.html
    └── package.json
```

---

## Backend Setup

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

python run.py
```

Backend runs on:

```text
http://localhost:8008
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## API Endpoints

### Health Check

```http
GET /health
```

### Analyze Audio

```http
POST /analyze
```

### WebSocket Stream

```text
ws://localhost:8008/ws/stream
```

---

## Example Response

```json
{
  "prediction": "Likely Human",
  "confidence_percentage": 94.62,
  "spectral_anomaly_score": 0.0
}
```

---

## Disclaimer

This project is experimental and intended for educational and research purposes only.

---

## Author

Praveen Joe
