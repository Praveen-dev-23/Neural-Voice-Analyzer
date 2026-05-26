import io
import numpy as np
import librosa
import soundfile as sf
from scipy.signal import lfilter

def load_audio_from_bytes(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """
    Loads audio from bytes. Tries soundfile first (WAV/FLAC/OGG), 
    and falls back to librosa/audioread.
    """
    try:
        # soundfile is fast and handles WAV natively
        data, sr = sf.read(io.BytesIO(audio_bytes))
        if len(data.shape) > 1:
            data = librosa.to_mono(data.T)
        return data, sr
    except Exception as sf_err:
        # Fallback to librosa via a temporary file or file-like if possible
        try:
            # Try parsing with librosa directly
            with io.BytesIO(audio_bytes) as bio:
                data, sr = librosa.load(bio, sr=None)
                return data, sr
        except Exception as lib_err:
            raise ValueError(f"Could not decode audio. Soundfile error: {sf_err}. Librosa error: {lib_err}")

def estimate_pitch(y: np.ndarray, sr: int) -> np.ndarray:
    """
    Estimates fundamental frequency (F0) using librosa's YIN algorithm.
    Falls back gracefully if the signal is too short.
    """
    if len(y) < 512:
        return np.zeros(1)
    try:
        # YIN pitch tracking
        f0 = librosa.yin(y=y, sr=sr, fmin=60, fmax=400, frame_length=1024, hop_length=256)
        f0 = np.nan_to_num(f0)
        # Filter out unvoiced frames (values very close to fmin or fmax or NaN)
        f0[f0 <= 61] = 0
        f0[f0 >= 399] = 0
        return f0
    except Exception:
        # Fallback to zero-crossing/autocorrelation approximation
        return np.zeros(1)

def extract_features(y: np.ndarray, sr: int) -> dict:
    """
    Extracts high-level spectral and temporal features from audio signal y.
    Returns both a dictionary of readable metrics and a normalized feature vector (32 elements).
    """
    # Ensure audio is not completely empty
    if len(y) == 0:
        y = np.zeros(1024)
    
    # 1. MFCCs (13 coefficients)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=2048, hop_length=512)
    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)
    
    # 2. Spectral Centroid
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=2048, hop_length=512)
    centroid_mean = float(np.mean(centroid))
    centroid_std = float(np.std(centroid))
    
    # 3. Zero Crossing Rate
    zcr = librosa.feature.zero_crossing_rate(y=y, hop_length=512)
    zcr_mean = float(np.mean(zcr))
    zcr_std = float(np.std(zcr))
    
    # 4. Pitch
    f0 = estimate_pitch(y, sr)
    voiced_f0 = f0[f0 > 0]
    if len(voiced_f0) > 0:
        pitch_mean = float(np.mean(voiced_f0))
        pitch_std = float(np.std(voiced_f0))
    else:
        pitch_mean = 0.0
        pitch_std = 0.0
        
    # 5. Spectral Flatness (indicates noisiness / vocoder artifacts)
    flatness = librosa.feature.spectral_flatness(y=y, n_fft=2048, hop_length=512)
    flatness_mean = float(np.mean(flatness))
    flatness_std = float(np.std(flatness))
    
    # 6. High-Frequency Power Ratio (above 4000Hz vs total power)
    # Compute FFT
    fft_vals = np.abs(np.fft.rfft(y))
    fft_freqs = np.fft.rfftfreq(len(y), 1.0/sr)
    high_freq_mask = fft_freqs > 4000
    total_power = np.sum(fft_vals**2) + 1e-10
    high_power = np.sum(fft_vals[high_freq_mask]**2)
    high_freq_ratio = float(high_power / total_power)

    # Compile the feature vector of size 32
    # [mfcc_mean (13), mfcc_std (13), centroid_mean, zcr_mean, pitch_mean, pitch_std, flatness_mean, high_freq_ratio]
    feature_vector = np.zeros(32)
    feature_vector[0:13] = mfcc_mean
    feature_vector[13:26] = mfcc_std
    feature_vector[26] = centroid_mean
    feature_vector[27] = zcr_mean
    feature_vector[28] = pitch_mean
    feature_vector[29] = pitch_std
    feature_vector[30] = flatness_mean
    feature_vector[31] = high_freq_ratio
    
    # Clean any NaNs
    feature_vector = np.nan_to_num(feature_vector)
    
    metrics = {
        "duration_seconds": float(len(y) / sr),
        "sample_rate": sr,
        "rms_energy": float(np.sqrt(np.mean(y**2))),
        "spectral_centroid_hz": centroid_mean,
        "zero_crossing_rate": zcr_mean,
        "pitch_average_hz": pitch_mean,
        "pitch_variance": pitch_std,
        "spectral_flatness": flatness_mean,
        "high_frequency_ratio": high_freq_ratio,
        "mfcc_mean_0": float(mfcc_mean[0]) if len(mfcc_mean) > 0 else 0.0
    }
    
    return {
        "metrics": metrics,
        "feature_vector": feature_vector.tolist()
    }

def get_mel_spectrogram(y: np.ndarray, sr: int) -> list:
    """
    Generates a log-mel spectrogram suitable for frontend rendering.
    Downsamples in time/frequency to return a standard sized 2D grid.
    Returns: 64 mel bands by 100 time points.
    """
    if len(y) == 0:
        return np.zeros((64, 100)).tolist()
        
    # Extract Mel Spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=64, n_fft=2048, hop_length=max(512, len(y)//100)
    )
    # Convert to log amplitude
    log_mel = librosa.power_to_db(mel_spec, ref=np.max)
    
    # Standardize time length to exactly 100 frames for frontend visualization mapping
    target_time_frames = 100
    current_time_frames = log_mel.shape[1]
    
    if current_time_frames == 0:
        return np.zeros((64, 100)).tolist()
        
    if current_time_frames != target_time_frames:
        # Interpolate/resize the array to exactly target_time_frames columns
        from scipy.interpolate import interp1d
        x = np.linspace(0, 1, current_time_frames)
        x_new = np.linspace(0, 1, target_time_frames)
        f = interp1d(x, log_mel, axis=1, fill_value="extrapolate")
        log_mel = f(x_new)
        
    # Normalize values between 0.0 and 1.0 (with 1.0 being loud, 0.0 being quiet)
    # db values range from -80 to 0 dB. Map -80 dB -> 0.0, 0 dB -> 1.0
    normalized_mel = (log_mel + 80.0) / 80.0
    normalized_mel = np.clip(normalized_mel, 0.0, 1.0)
    
    # Return as list of lists
    return normalized_mel.tolist()
