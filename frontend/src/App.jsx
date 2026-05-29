import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, UploadCloud, RefreshCw, Play, Pause, 
  Activity, ArrowDown, ChevronRight, Layers, HelpCircle, HardDrive
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import AudioVisualizer from './components/AudioVisualizer';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import PredictionGauge from './components/PredictionGauge';
import AnalysisHistory from './components/AnalysisHistory';

gsap.registerPlugin(ScrollTrigger);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8008';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8008/ws/stream';

function App() {
  // App Mode & State
  const [visualizerMode, setVisualizerMode] = useState('live'); // 'live' or 'file'
  const [cursorText, setCursorText] = useState('');
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

  // Interactive Cursor & Backlight Refs
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);
  const backlightRef = useRef(null);
  
  // Magnetic Button Refs
  const btnStartRef = useRef(null);
  const btnUploadRef = useRef(null);
  const btnResetRef = useRef(null);
  const btnScrollRef = useRef(null);

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

  // 1. Mouse Follower & Custom Cursor Engine
  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = cursorDotRef.current;
    const backlight = backlightRef.current;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (dot) {
        dot.style.left = `${mouseX}px`;
        dot.style.top = `${mouseY}px`;
      }
      if (backlight) {
        backlight.style.left = `${mouseX}px`;
        backlight.style.top = `${mouseY}px`;
      }
    };

    const render = () => {
      // Smooth linear interpolation for the outer ring lag effect
      const lerpFactor = 0.16;
      cursorX += (mouseX - cursorX) * lerpFactor;
      cursorY += (mouseY - cursorY) * lerpFactor;

      if (cursor) {
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
      }

      requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMouseMove);
    const animId = requestAnimationFrame(render);

    // Hover detection for interactive targets with dynamic elegant text labels
    const handleMouseOver = (e) => {
      const target = e.target;
      const cursorTarget = target.closest('[data-cursor]');
      const hasCursorText = cursorTarget?.getAttribute('data-cursor');
      
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'LABEL' ||
        target.closest('.interactive-target') ||
        target.closest('input') ||
        target.closest('table tr');

      if (hasCursorText) {
        setCursorText(hasCursorText);
        cursor?.classList.add('cursor-hover-active');
      } else if (isInteractive) {
        setCursorText('go');
        cursor?.classList.add('cursor-hover-active');
      } else {
        setCursorText('');
        cursor?.classList.remove('cursor-hover-active');
      }
    };

    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 2. Magnetic Button Physics Handler
  const handleMagneticMove = (e, ref) => {
    const el = ref.current;
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const elX = rect.left + rect.width / 2;
    const elY = rect.top + rect.height / 2;
    
    const disX = e.clientX - elX;
    const disY = e.clientY - elY;
    
    // Magnetic pull coefficient
    const pullX = disX * 0.32;
    const pullY = disY * 0.32;
    
    el.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.05)`;
  };
  
  const handleMagneticLeave = (ref) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0px, 0px) scale(1)';
  };

  // 3. GSAP Scroll Trigger Animations
  useEffect(() => {
    // Parallax scrolling on huge letters
    gsap.utils.toArray('.parallax-header').forEach((header) => {
      gsap.to(header, {
        yPercent: -15,
        ease: 'none',
        scrollTrigger: {
          trigger: header,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
      });
    });

    // Fade reveal panels on scroll
    gsap.utils.toArray('.scroll-reveal-panel').forEach((panel) => {
      gsap.fromTo(panel, 
        { opacity: 0, y: 60, filter: 'blur(5px)' },
        { 
          opacity: 1, 
          y: 0, 
          filter: 'blur(0px)',
          duration: 1.4,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: panel,
            start: 'top 85%',
            toggleActions: 'play none none none',
          }
        }
      );
    });

    // Horizontal scroll reveal cards
    gsap.fromTo('.tech-card', 
      { opacity: 0, y: 40 },
      { 
        opacity: 1, 
        y: 0, 
        stagger: 0.15, 
        duration: 1.0, 
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.tech-grid-trigger',
          start: 'top 80%',
        }
      }
    );
  }, []);

  // 4. LocalStorage History Sync
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

  const saveToHistory = (newRecord) => {
    const updated = [newRecord, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('spectra_analysis_history', JSON.stringify(updated));
  };

  const deleteHistoryRecord = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('spectra_analysis_history', JSON.stringify(updated));
  };

  // 5. Web Audio API Core Controls
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

  const closeWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  // 6. Microphone Streaming & Real-time WebSocket Prediction
  const startMicStreaming = async () => {
    setErrorMessage('');
    initAudio();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      setIsRecording(true);
      setVisualizerMode('live');
      
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audioCtx = audioContextRef.current;
      const analyser = analyserRef.current;

      sourceNodeRef.current = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current.connect(analyser);

      const wsUrl = `${WS_URL}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        socketRef.current.send(`rate:${audioCtx.sampleRate}`);
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'analysis') {
          setLiveMetrics(data.metrics);
          setLiveFlags(data.diagnostic_flags);
          
          setAnalysisResult({
            prediction: data.prediction,
            confidence_percentage: data.confidence_percentage,
            spectral_anomaly_score: data.spectral_anomaly_score,
            probabilities: {
              human: 1.0 - (data.confidence_percentage / 100),
              ai: data.confidence_percentage / 100
            }
          });
        }
      };

      socketRef.current.onerror = (e) => {
        setErrorMessage("Microphone stream pipeline connection failed.");
      };

      scriptProcessorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(inputData.buffer);
        }
      };

      sourceNodeRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioCtx.destination);

      setActiveFileName('Live Audio Input');
      setSpectrogramData(null);
      setAnalysisResult(null);

    } catch (err) {
      setErrorMessage("Microphone access denied or audio device unavailable.");
      setIsRecording(false);
      cleanupAudioNode();
    }
  };

  const stopMicStreaming = () => {
    setIsRecording(false);
    
    if (analysisResult && activeFileName === 'Live Audio Input') {
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
          duration_seconds: 3.0
        },
        diagnostic_flags: liveFlags
      };
      saveToHistory(record);
    }

    cleanupAudioNode();
    closeWebSocket();
  };

  // 7. File Upload & Processing
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit.");
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    stopMicStreaming();
    setVisualizerMode('file');
    setActiveFileName(file.name);

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
      
      setAnalysisResult({
        prediction: result.prediction,
        confidence_percentage: result.confidence_percentage,
        spectral_anomaly_score: result.spectral_anomaly_score,
        probabilities: result.probabilities
      });
      setSpectrogramData(result.mel_spectrogram);
      setLiveMetrics(result.metrics);
      setLiveFlags(result.diagnostic_flags);

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
      setErrorMessage(e.message || "Failed to analyze uploaded audio.");
      setAnalysisResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFileUpload(file);
    } else {
      setErrorMessage("Please drop a valid audio file.");
    }
  };

  // 8. Static Playback Control Hooks
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
          const audioCtx = audioContextRef.current;
          const analyser = analyserRef.current;
          
          if (!playerSourceNodeRef.current) {
            playerSourceNodeRef.current = audioCtx.createMediaElementSource(player);
            playerSourceNodeRef.current.connect(analyser);
            analyser.connect(audioCtx.destination);
          }
        })
        .catch(() => {
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

  // Smooth scroll trigger via GSAP
  const handleScrollToConsole = () => {
    gsap.to(window, {
      duration: 1.2,
      scrollTo: '#spectra-console',
      ease: 'power3.inOut'
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-[#0f172a] select-none relative font-sans">
      {/* Cinematic Awwwards Filters */}
      <div className="bg-grain"></div>
      <div ref={backlightRef} className="bg-backlight"></div>
      <div className="grid-lines">
        <div className="grid-line-col"></div>
        <div className="grid-line-col"></div>
        <div className="grid-line-col"></div>
        <div className="grid-line-col"></div>
      </div>

      {/* Lagging Cursor */}
      <div ref={cursorRef} className="custom-cursor hidden md:flex items-center justify-center">
        {cursorText && (
          <span className="text-[8px] font-mono tracking-widest text-[#0f172a] uppercase text-center select-none pointer-events-none animate-pulse">
            {cursorText}
          </span>
        )}
      </div>
      <div ref={cursorDotRef} className={`custom-cursor-dot hidden md:block ${cursorText ? 'opacity-0 scale-50' : 'opacity-100'}`}></div>

      {/* Editorial Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-black/5 bg-[#f8f8fa]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between text-xs md:text-sm font-mono tracking-widest text-[#0f172a]/70 uppercase">
        <div className="flex items-center gap-2">
          <div className="bg-black/5 border border-black/10 px-4 py-1.5 rounded-full flex items-center gap-2 font-bold text-black text-xs tracking-widest lowercase">
            <span className="text-[#e11d48] text-xs">✶</span> spectra.network
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-8 text-xs md:text-sm lowercase font-sans font-medium tracking-normal text-black/75">
          <button onClick={handleScrollToConsole} data-cursor="scan" className="hover:text-black transition-colors cursor-none font-bold">scanner</button>
          <a href="#" className="hover:text-black transition-colors cursor-none">documentation</a>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs text-[#0f172a]/50 uppercase tracking-widest font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button 
            onClick={handleReset} 
            ref={btnResetRef}
            onMouseMove={(e) => handleMagneticMove(e, btnResetRef)}
            onMouseLeave={() => handleMagneticLeave(btnResetRef)}
            data-cursor="clear"
            className="text-black hover:text-white hover:bg-black transition-all border border-black/15 px-4 py-1.5 rounded-full cursor-none text-xs font-sans font-semibold tracking-wide magnetic-target"
          >
            reset console →
          </button>
        </div>
      </nav>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mx-6 md:mx-12 mt-28 bg-red-50 border border-red-200 text-red-600 p-5 rounded text-sm font-mono flex items-center gap-3 animate-shake">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>SYSTEM ERROR: {errorMessage}</span>
        </div>
      )}

      {/* 3. THE CORE DIAGNOSTIC CONSOLE (SCAN TARGETS) (SECTION 02) */}
      <section id="spectra-console" className={"pb-24 px-6 md:px-12 scroll-reveal-panel " + (errorMessage ? "pt-6" : "pt-32")}>
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 pb-6">
            <div>
              <span className="text-xs font-mono text-black/50 uppercase tracking-widest">[ module.02 // scanner.console ]</span>
              <h2 className="text-3xl font-serif italic text-black/95 mt-1">spectra.neural.decoder</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-black/65">
              <span>status // <span className="text-[#e11d48] animate-pulse">active.ingest</span></span>
              <span>node // tokyo.dev</span>
            </div>
          </div>

          {/* Grid visualizer layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left: Input Control Deck (Cols 1-4) */}
            <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
              
              <div className="editorial-panel p-6 rounded border border-black/5 bg-white flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-black/50" />
                  <h3 className="text-sm font-mono font-bold text-black/85 uppercase tracking-widest">
                    input.matrix.source
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {!isRecording ? (
                      <button
                        ref={btnStartRef}
                        onMouseMove={(e) => handleMagneticMove(e, btnStartRef)}
                        onMouseLeave={() => handleMagneticLeave(btnStartRef)}
                        onClick={startMicStreaming}
                        data-cursor="record"
                        className="border border-black/10 hover:border-black/30 py-4 rounded text-xs font-mono uppercase tracking-widest text-[#e11d48] hover:bg-[#e11d48]/5 transition-all cursor-none magnetic-target flex items-center justify-center gap-2 font-bold"
                      >
                        <Mic className="w-4 h-4" /> start.rec
                      </button>
                    ) : (
                      <button
                        ref={btnStartRef}
                        onMouseMove={(e) => handleMagneticMove(e, btnStartRef)}
                        onMouseLeave={() => handleMagneticLeave(btnStartRef)}
                        onClick={stopMicStreaming}
                        data-cursor="stop"
                        className="border border-[#e11d48]/30 bg-[#e11d48]/5 hover:bg-[#e11d48]/10 py-4 rounded text-xs font-mono uppercase tracking-widest text-[#e11d48] transition-all cursor-none magnetic-target flex items-center justify-center gap-2 font-bold"
                      >
                        <MicOff className="w-4 h-4 animate-pulse" /> stop.rec
                      </button>
                    )}

                    <label 
                      ref={btnUploadRef}
                      onMouseMove={(e) => handleMagneticMove(e, btnUploadRef)}
                      onMouseLeave={() => handleMagneticLeave(btnUploadRef)}
                      data-cursor="upload"
                      className="border border-black/10 hover:border-black/30 py-4 rounded text-xs font-mono uppercase tracking-widest text-black/80 hover:bg-black/5 transition-all cursor-none text-center block magnetic-target flex items-center justify-center gap-2 font-bold"
                    >
                      <UploadCloud className="w-4 h-4" /> upload.wav
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={(e) => handleFileUpload(e.target.files[0])}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* Drag Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-cursor="drop file"
                    className="border border-dashed border-black/10 rounded p-6 bg-black/5 hover:bg-black/10 hover:border-[#e11d48]/35 transition-all text-center group cursor-none"
                  >
                    <UploadCloud className="w-8 h-8 text-black/20 group-hover:text-[#e11d48] transition-all mx-auto mb-2.5" />
                    <p className="text-xs font-mono text-[#0f172a]/70 uppercase tracking-widest font-bold">
                      drag.drop.scan.track
                    </p>
                    <p className="text-[10px] text-[#0f172a]/50 mt-1 font-mono uppercase">
                      wav / mp3 / flac (max 10mb)
                    </p>
                  </div>

                  {/* Selected File Details */}
                  {activeFileName && (
                    <div className="bg-black/5 p-3 rounded border border-black/5 flex items-center justify-between gap-3 text-xs font-mono">
                      <div className="truncate flex-1">
                        <span className="text-black/40 uppercase text-[9px] block">scan.target</span>
                        <span className="text-[#0f172a] font-bold truncate block">{activeFileName}</span>
                      </div>
                      
                      {fileUrl && (
                        <button
                          onClick={handlePlayPause}
                          className={"p-2 rounded border " + (isPlaying ? "bg-black/10 border-black/15 text-black" : "bg-white border-black/10 text-black/60") + " hover:bg-black hover:text-white transition-all cursor-none"}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}

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

              {/* Predict Display Gauge */}
              <div className="flex-1 mt-6 lg:mt-0">
                <PredictionGauge result={analysisResult} isProcessing={isProcessing} />
              </div>

            </div>

            {/* Right: Spectral Visualizer Visuals (Cols 5-12) */}
            <div className="lg:col-span-8" data-cursor="visualize">
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

          </div>

        </div>
      </section>

      {/* 4. DIAGNOSTICS & TELEMETRY */}
      <section className="py-20 px-6 md:px-12 border-t border-black/5 bg-[#f8f8fa]/60 scroll-reveal-panel">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Diagnostics details */}
            <div className="lg:col-span-8">
              <DiagnosticsPanel metrics={liveMetrics} flags={liveFlags} />
            </div>
            
            {/* Inline History List */}
            <div className="lg:col-span-4">
              <AnalysisHistory 
                history={history} 
                onLoadHistory={handleLoadHistory}
                onDeleteHistory={deleteHistoryRecord}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sections 03 and 04 (Investors & Tech Stack) removed to optimize focus on Neural Voice Analyzer */}

      {/* 7. MINIMALIST EDITORIAL FOOTER */}
      <footer className="py-20 px-6 md:px-12 border-t border-black/5 text-[#0f172a]/50 text-xs font-mono uppercase tracking-widest bg-[#f8f8fa]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-1">
            <p className="text-[#0f172a]/70 font-bold tracking-widest">S.P.E.C.T.R.A. lab</p>
            <p className="text-[10px]">© 2026 all rights reserved // tokyo node</p>
          </div>
          
          <div className="flex gap-6 lowercase text-xs">
            <a href="#" className="hover:text-[#e11d48] transition-colors cursor-none">github</a>
            <a href="#" className="hover:text-[#e11d48] transition-colors cursor-none">documentation</a>
            <a href="#" className="hover:text-[#e11d48] transition-colors cursor-none">legal</a>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-pulse"></span>
            <span>node.status: nominal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
