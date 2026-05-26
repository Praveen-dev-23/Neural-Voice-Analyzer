import os
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

from audio_processor import load_audio_from_bytes, extract_features, get_mel_spectrogram
from voice_detector import analyze_and_predict

app = FastAPI(
    title="Diagnostic Audio Spectrum Visualizer Backend",
    description="FastAPI + Librosa server for AI Voice Detection using Spectral Analysis",
    version="1.0.0"
)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    feature_vector: list[float]
    metrics: dict

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "classifier": "numpy-neural-network-v1",
        "audio_backend": "librosa + soundfile",
        "python_version": "3.14.0"
    }

@app.post("/predict")
def predict_from_features(request: PredictionRequest):
    """
    Directly run the voice detector classifier on a pre-extracted feature vector.
    """
    if len(request.feature_vector) != 32:
        raise HTTPException(status_code=400, detail="Feature vector must have exactly 32 dimensions.")
    try:
        result = analyze_and_predict({
            "feature_vector": request.feature_vector,
            "metrics": request.metrics
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    """
    Upload an audio file (WAV, MP3, etc.) to perform complete feature extraction,
    mel spectrogram computation, and voice detection classification.
    """
    try:
        contents = await file.read()
        
        # 1. Load audio signal
        y, sr = load_audio_from_bytes(contents)
        
        # 2. Extract features
        features = extract_features(y, sr)
        
        # 3. Classify voice
        result = analyze_and_predict(features)
        
        # 4. Generate mel spectrogram for visualizer dashboard
        mel_spectrogram = get_mel_spectrogram(y, sr)
        
        # Add visualizer data and metadata to output
        result["metrics"] = features["metrics"]
        result["mel_spectrogram"] = mel_spectrogram
        result["filename"] = file.filename
        
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error during analysis: {str(e)}")

@app.post("/record")
async def analyze_recording(file: UploadFile = File(...)):
    """
    Wrapper endpoint for uploaded audio captured by the microphone.
    Behaves identically to /analyze but logically structured for recorded tracks.
    """
    return await analyze_file(file)

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time microphone audio streaming.
    Receives Float32 binary buffers (raw PCM), maintains a sliding buffer,
    and returns real-time analysis predictions and metrics frame-by-frame.
    """
    await websocket.accept()
    print("WebSocket connection established.")
    
    # Initialize variables for connection scope
    audio_buffer = []
    sample_rate = 16000  # Default, client can negotiate
    
    try:
        while True:
            # Wait for data from client
            message = await websocket.receive()
            
            if "bytes" in message:
                # 1. Parse raw Float32 samples from binary frame
                raw_bytes = message["bytes"]
                chunk = np.frombuffer(raw_bytes, dtype=np.float32)
                
                # Append to rolling stream buffer
                audio_buffer.extend(chunk.tolist())
                
                # 2. Perform periodic analysis (e.g. when we have at least 0.5s of audio)
                # Keep sliding analysis window (last 3 seconds) for rolling predictions
                min_samples_to_analyze = int(sample_rate * 0.5)
                max_window_samples = int(sample_rate * 3.0)
                
                if len(audio_buffer) >= min_samples_to_analyze:
                    # Get recent window of audio
                    active_audio = np.array(audio_buffer[-max_window_samples:])
                    
                    # Extract features
                    features = extract_features(active_audio, sample_rate)
                    
                    # Run voice classifier
                    prediction = analyze_and_predict(features)
                    
                    # Send results
                    await websocket.send_json({
                        "type": "analysis",
                        "metrics": {
                            "rms_energy": features["metrics"]["rms_energy"],
                            "pitch_average_hz": features["metrics"]["pitch_average_hz"],
                            "pitch_variance": features["metrics"]["pitch_variance"],
                            "spectral_centroid_hz": features["metrics"]["spectral_centroid_hz"],
                            "zero_crossing_rate": features["metrics"]["zero_crossing_rate"],
                            "spectral_flatness": features["metrics"]["spectral_flatness"]
                        },
                        "prediction": prediction["prediction"],
                        "confidence_percentage": prediction["confidence_percentage"],
                        "spectral_anomaly_score": prediction["spectral_anomaly_score"],
                        "diagnostic_flags": prediction["diagnostic_flags"]
                    })
                    
            elif "text" in message:
                text_cmd = message["text"]
                if text_cmd == "clear":
                    audio_buffer = []
                    await websocket.send_json({"type": "status", "message": "Stream buffer reset."})
                elif text_cmd.startswith("rate:"):
                    try:
                        sample_rate = int(text_cmd.split(":")[1])
                        print(f"Negotiated sample rate: {sample_rate} Hz")
                        await websocket.send_json({"type": "status", "message": f"Sample rate set to {sample_rate}Hz"})
                    except ValueError:
                        pass
                        
    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except Exception as e:
        print(f"Error in WebSocket streaming: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
