import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, UploadCloud, RefreshCw, Play, Pause, 
  Activity, ShieldAlert, ShieldCheck, Database, Info, FileAudio 
} from 'lucide-react';

import AudioVisualizer from './components/AudioVisualizer';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import PredictionGauge from './components/PredictionGauge';
import AnalysisHistory from './components/AnalysisHistory';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8008';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8008/ws/stream';

function App() {
  // App Mode & State
  const [visualizerMode, setVisualizerMode] = useState('live'); // 'live' or 'file'
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Audio Playback State (for uploaded files)
  const [fileUrl, setFileUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Diagnostic metrics & results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [spectrogramData, setSpectrogramData] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [liveFlags, setLiveFlags] = useState(null);
  const [activeFileName, setActiveFileName] = useState('');

  // History Log
  const [history, setHistory] = useState([]);

  // Web Audio refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const playerSourceNodeRef = useRef(null);

  // WebSocket refs
  const socketRef = useRef(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('spectra_analysis_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Sync history to localStorage
  const saveToHistory = (newRecord) => {
    const updated = [newRecord, ...history].slice(0, 50); // limit to 50 records
    setHistory(updated);
    localStorage.setItem('spectra_analysis_history', JSON.stringify(updated));
  };

  const deleteHistoryRecord = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('spectra_analysis_history', JSON.stringify(updated));
  };

  // Initialize Audio Context (lazily upon user action)
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Cleanup Web Audio API objects
  const cleanupAudioNode = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
  };

  // Close active WebSocket connection
  const closeWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  // 1. Microphone Live Recording & WebSocket Streaming Loop
  const startMicStreaming = async () => {
    setErrorMessage('');
    initAudio();
    
    try {
      // Request mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      setIsRecording(true);
      setVisualizerMode('live');
      
      // Stop file playback if active
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audioCtx = audioContextRef.current;
      const analyser = analyserRef.current;

      // Pipe mic into AnalyserNode
      sourceNodeRef.current = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current.connect(analyser);

      // Establish WebSocket connection
      const wsUrl = `${WS_URL}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log("WebSocket stream connected.");
        // Send actual sample rate to backend
        socketRef.current.send(`rate:${audioCtx.sampleRate}`);
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'analysis') {
          // Update live metrics & prediction outputs
          setLiveMetrics(data.metrics);
          setLiveFlags(data.diagnostic_flags);
          
          setAnalysisResult({
            prediction: data.prediction,
            confidence_percentage: data.confidence_percentage,
            spectral_anomaly_score: data.spectral_anomaly_score,
            probabilities: {
              human: 1.0 - (data.confidence_percentage / 100), // approximate splits
              ai: data.confidence_percentage / 100
            }
          });
        }
      };

      socketRef.current.onerror = (e) => {
        console.error("WebSocket error", e);
        setErrorMessage("Microphone stream pipeline connection failed.");
      };

      // Set up ScriptProcessor to intercept raw Float32 audio buffers
      // Buffer size: 4096, 1 input channel, 1 output channel
      scriptProcessorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0); // Float32Array
        // Transmit binary audio chunk over WebSocket
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(inputData.buffer);
        }
      };

      // Connect nodes: source -> scriptProcessor -> destination
      // We must connect scriptProcessor to destination otherwise it won't trigger onaudioprocess
      sourceNodeRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioCtx.destination);

      // Reset states
      setActiveFileName('Live Audio Stream');
      setSpectrogramData(null);
      setAnalysisResult(null);

    } catch (err) {
      console.error("Microphone access error", err);
      setErrorMessage("Microphone access denied or audio device unavailable.");
      setIsRecording(false);
      cleanupAudioNode();
    }
  };

  const stopMicStreaming = () => {
    setIsRecording(false);
    
    // Save current live prediction to history before closing, if any result is active
    if (analysisResult && activeFileName === 'Live Audio Stream') {
      const record = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        filename: `Live Scan (${new Date().toLocaleTimeString()})`,
        prediction: analysisResult.prediction,
        confidence_percentage: analysisResult.confidence_percentage,
        spectral_anomaly_score: analysisResult.spectral_anomaly_score,
        metrics: {
          rms_energy: liveMetrics?.rms_energy ?? 0.05,
          pitch_average_hz: liveMetrics?.pitch_average_hz ?? 0,
          pitch_variance: liveMetrics?.pitch_variance ?? 0,
          spectral_centroid_hz: liveMetrics?.spectral_centroid_hz ?? 0,
          zero_crossing_rate: liveMetrics?.zero_crossing_rate ?? 0,
          spectral_flatness: liveMetrics?.spectral_flatness ?? 0,
          high_frequency_ratio: 0.1,
          sample_rate: audioContextRef.current?.sampleRate ?? 16000,
          duration_seconds: 3.0 // estimate duration
        },
        diagnostic_flags: liveFlags
      };
      saveToHistory(record);
    }

    cleanupAudioNode();
    closeWebSocket();
  };

  // 2. File Upload & Processing
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Safety check for file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB maximum limit.");
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    stopMicStreaming();
    setVisualizerMode('file');
    setActiveFileName(file.name);

    // Create URL for HTML audio playback
    const localUrl = URL.createObjectURL(file);
    setFileUrl(localUrl);
    setIsPlaying(false);
    setCurrentTime(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorDetail = await response.json();
        throw new Error(errorDetail.detail || "Server failed to process audio.");
      }

      const result = await response.json();
      
      // Update states
      setAnalysisResult({
        prediction: result.prediction,
        confidence_percentage: result.confidence_percentage,
        spectral_anomaly_score: result.spectral_anomaly_score,
        probabilities: result.probabilities
      });
      setSpectrogramData(result.mel_spectrogram);
      setLiveMetrics(result.metrics);
      setLiveFlags(result.diagnostic_flags);

      // Save to localStorage history list
      const record = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        filename: file.name,
        prediction: result.prediction,
        confidence_percentage: result.confidence_percentage,
        spectral_anomaly_score: result.spectral_anomaly_score,
        metrics: result.metrics,
        diagnostic_flags: result.diagnostic_flags,
        mel_spectrogram: result.mel_spectrogram
      };
      saveToHistory(record);

    } catch (e) {
      console.error(e);
      setErrorMessage(e.message || "Failed to analyze uploaded audio.");
      setAnalysisResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFileUpload(file);
    } else {
      setErrorMessage("Please drop a valid audio file.");
    }
  };

  // 3. Playback Controls & Routing (Piping audio player into visualizer)
  const handlePlayPause = () => {
    initAudio();
    const player = audioPlayerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play()
        .then(() => {
          setIsPlaying(true);
          
          // Connect audio player to context analyser to animate the live equalizer during playback!
          const audioCtx = audioContextRef.current;
          const analyser = analyserRef.current;
          
          if (!playerSourceNodeRef.current) {
            playerSourceNodeRef.current = audioCtx.createMediaElementSource(player);
            playerSourceNodeRef.current.connect(analyser);
            // Also direct to sound output speakers so user can hear it!
            analyser.connect(audioCtx.destination);
          }
        })
        .catch(err => {
          console.error("Player start error", err);
          setErrorMessage("Failed to initialize audio player.");
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      setDuration(audioPlayerRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlayheadSeek = (newTime) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Reset Application State
  const handleReset = () => {
    stopMicStreaming();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setFileUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAnalysisResult(null);
    setSpectrogramData(null);
    setLiveMetrics(null);
    setLiveFlags(null);
    setActiveFileName('');
    setErrorMessage('');
  };

  // Reload history record into active dashboard slots
  const handleLoadHistory = (item) => {
    handleReset();
    setVisualizerMode('file');
    setActiveFileName(item.filename);
    setAnalysisResult({
      prediction: item.prediction,
      confidence_percentage: item.confidence_percentage,
      spectral_anomaly_score: item.spectral_anomaly_score,
      probabilities: {
        human: 1.0 - (item.confidence_percentage / 100),
        ai: item.confidence_percentage / 100
      }
    });
    setSpectrogramData(item.mel_spectrogram ?? null);
    setLiveMetrics(item.metrics);
    setLiveFlags(item.diagnostic_flags);
  };

  return (
    <div className="min-h-screen relative p-4 md:p-6 pb-12">
      {/* Cyber Grid Backgrounds */}
      <div className="cyber-grid"></div>
      <div className="cyber-glow-radial"></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Sleek Cybersecurity Header */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-cyan-500/20 pb-4 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.15)] animate-pulse">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-mono font-bold tracking-widest text-slate-100 flex items-center gap-2">
                S.P.E.C.T.R.A. <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 px-1.5 py-0.5 rounded font-normal font-mono">LAB V1.0</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-mono tracking-wider">
                DIAGNOSTIC AUDIO SPECTRUM VISUALIZER // SYNTHETIC VOICE DETECTOR
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-3">
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono">
              <span className="text-slate-500">API GATEWAY:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            
            <button 
              onClick={handleReset}
              className="btn-cyber btn-cyber-primary text-[10px] flex items-center gap-1.5"
              title="Clear active scans"
            >
              <RefreshCw className="w-3.5 h-3.5" /> RESET TERMINAL
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>CRITICAL ERROR: {errorMessage}</span>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT PANEL: Control Deck & Diagnostics (Cols 1-4) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* 1. Cyber Control Deck */}
            <div className="cyber-panel p-5 rounded-lg border border-cyan-500/10 bg-slate-950/45 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
                  AUDIO INPUT CONTROL DECK
                </h2>
              </div>

              {/* MIC STREAM BUTTONS */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startMicStreaming}
                      className="btn-cyber btn-cyber-success text-xs flex items-center justify-center gap-2 py-3"
                    >
                      <Mic className="w-4 h-4" /> START STREAM
                    </button>
                  ) : (
                    <button
                      onClick={stopMicStreaming}
                      className="btn-cyber btn-cyber-danger text-xs flex items-center justify-center gap-2 py-3 shadow-[0_0_15px_rgba(255,0,85,0.3)]"
                    >
                      <MicOff className="w-4 h-4 animate-pulse" /> STOP STREAM
                    </button>
                  )}
                  
                  {/* File Upload Trigger */}
                  <label className="btn-cyber btn-cyber-primary text-xs flex items-center justify-center gap-2 py-3 cursor-pointer text-center">
                    <UploadCloud className="w-4 h-4" /> UPLOAD SCAN
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border border-dashed border-cyan-500/20 rounded-lg p-5 bg-slate-950/60 hover:bg-slate-900/20 hover:border-cyan-500/40 transition-all text-center group cursor-pointer relative"
                >
                  <UploadCloud className="w-7 h-7 text-cyan-500/30 group-hover:text-cyan-400 group-hover:scale-110 transition-all mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    DRAG & DROP SCAN TARGET
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase font-mono">
                    WAV / MP3 / FLAC / OGG (MAX 10MB)
                  </p>
                </div>

                {/* Selected File Details */}
                {activeFileName && (
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex items-center gap-2 text-[10px] font-mono">
                    <FileAudio className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="truncate flex-1">
                      <div className="text-slate-500 uppercase text-[8px]">ACTIVE TARGET:</div>
                      <div className="text-slate-300 font-bold truncate">{activeFileName}</div>
                    </div>

                    {/* Audio playback controls for uploaded file */}
                    {fileUrl && (
                      <button
                        onClick={handlePlayPause}
                        className={`p-1.5 rounded border ${isPlaying ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-850 border-slate-750 text-slate-300'} hover:bg-cyan-500 hover:text-black transition-all`}
                        title={isPlaying ? "Pause target audio" : "Play target audio"}
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}
                
                {/* HTML5 audio element connected to player refs */}
                {fileUrl && (
                  <audio
                    ref={audioPlayerRef}
                    src={fileUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                )}

              </div>
            </div>

            {/* 2. Live Diagnostics Panel */}
            <div className="flex-1">
              <DiagnosticsPanel metrics={liveMetrics} flags={liveFlags} />
            </div>

          </div>

          {/* RIGHT PANEL: Visualizer Canvas & Outputs (Cols 5-12) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Visualizer and Classifier Ring Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Audio Visualizer (Cols 1-7) */}
              <div className="md:col-span-7 flex flex-col h-full">
                <AudioVisualizer 
                  mode={visualizerMode}
                  analyserNode={analyserRef.current}
                  spectrogramData={spectrogramData}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayheadSeek={handlePlayheadSeek}
                />
              </div>

              {/* Classifier Indicator Gauge (Cols 8-12) */}
              <div className="md:col-span-5 flex flex-col h-full">
                <PredictionGauge result={analysisResult} isProcessing={isProcessing} />
              </div>

            </div>

            {/* Past History Logger */}
            <div>
              <AnalysisHistory 
                history={history} 
                onLoadHistory={handleLoadHistory}
                onDeleteHistory={deleteHistoryRecord}
              />
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
