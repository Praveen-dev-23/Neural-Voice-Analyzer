import numpy as np
from voice_detector import SequentialModel, analyze_and_predict

# 1. Create a simulated human voice feature vector
# Standard human voice has high pitch variation, moderate centroid, and high MFCC variations.
human_metrics = {
    "rms_energy": 0.08,
    "pitch_average_hz": 150.0,
    "pitch_variance": 25.0, # Healthy variance
    "spectral_centroid_hz": 1600.0,
    "zero_crossing_rate": 0.04,
    "spectral_flatness": 0.002,
    "high_frequency_ratio": 0.05,
    "duration_seconds": 3.0,
    "sample_rate": 16000,
}

# Dummy MFCCs: mean and stddevs
mfcc_means = [-250.0, 120.0, -20.0, 15.0, -10.0, 5.0, -5.0, 2.0, -2.0, 1.0, -1.0, 0.5, -0.5]
mfcc_stds = [40.0, 25.0, 18.0, 15.0, 12.0, 10.0, 8.0, 8.0, 7.0, 7.0, 6.5, 6.0, 6.0]

fv = np.zeros(32)
fv[0:13] = mfcc_means
fv[13:26] = mfcc_stds
fv[26] = human_metrics["spectral_centroid_hz"]
fv[27] = human_metrics["zero_crossing_rate"]
fv[28] = human_metrics["pitch_average_hz"]
fv[29] = human_metrics["pitch_variance"]
fv[30] = human_metrics["spectral_flatness"]
fv[31] = human_metrics["high_frequency_ratio"]

features = {
    "metrics": human_metrics,
    "feature_vector": fv.tolist()
}

# Run prediction
model = SequentialModel()
probs = model.predict(fv)
result = analyze_and_predict(features)

print("SIMULATED HUMAN VOICE DIAGNOSTICS:")
print(f"Raw Model Probabilities: Human = {probs[0]:.4f}, AI = {probs[1]:.4f}")
print(f"Final Prediction: {result['prediction']}")
print(f"Confidence: {result['confidence_percentage']}%")
print(f"Spectral Anomaly Score: {result['spectral_anomaly_score']}")
print(f"Diagnostic Flags: {result['diagnostic_flags']}")
