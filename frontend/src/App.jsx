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

    // Hover detection for interactive targets
    const handleMouseOver = (e) => {
      const target = e.target;
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'LABEL' ||
        target.closest('.interactive-target') ||
        target.closest('input') ||
        target.closest('table tr');

      if (isInteractive) {
        cursor?.classList.add('cursor-hover-active');
      } else {
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
    <div className="min-h-screen bg-[#050505] text-[#f8fafc] select-none relative font-sans">
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
      <div ref={cursorRef} className="custom-cursor hidden md:block"></div>
      <div ref={cursorDotRef} className="custom-cursor-dot hidden md:block"></div>

      {/* Editorial Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#050505]/85 backdrop-blur-md px-6 py-4 flex items-center justify-between text-[11px] font-mono tracking-widest text-white/50 uppercase">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white dot-pulse"></span>
          <a href="#" className="font-bold text-white tracking-widest hover:text-white/80 transition-colors">spectra.studio</a>
        </div>
        
        <div className="hidden sm:flex items-center gap-8 text-[10px] lowercase">
          <button onClick={handleScrollToConsole} className="hover:text-white transition-colors cursor-none">/scan</button>
          <a href="#about-section" className="hover:text-white transition-colors cursor-none">/science</a>
          <a href="#tech-section" className="hover:text-white transition-colors cursor-none">/matrix</a>
        </div>

        <div>
          <button 
            onClick={handleReset} 
            ref={btnResetRef}
            onMouseMove={(e) => handleMagneticMove(e, btnResetRef)}
            onMouseLeave={() => handleMagneticLeave(btnResetRef)}
            className="text-white hover:text-white/80 transition-colors border border-white/10 hover:border-white/30 px-3 py-1 rounded cursor-none text-[9px] font-mono tracking-widest magnetic-target"
          >
            reset
          </button>
        </div>
      </nav>

      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-between pt-32 pb-16 px-6 md:px-12 overflow-hidden">
        {/* Floating background spectrum particles decoration */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20 hero-camera-effect">
          <div className="w-[85vw] h-[55vh] border border-white/5 rounded-full flex items-center justify-center p-8 animate-pulse" style={{ animationDuration: '8s' }}>
            <div className="w-[60vw] h-[40vh] border border-dashed border-white/5 rounded-full"></div>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-4">
            [ global.neural.voice.auditor ]
          </span>
          
          <div className="text-huge font-serif font-light text-white leading-none scroll-parallax-text tracking-tighter">
            <div className="text-mask block py-1">
              <span className="block opacity-90 hover:italic hover:text-glow-white hover:tracking-wide transition-all duration-300">synthetic.</span>
            </div>
            <div className="text-mask block py-1">
              <span className="block opacity-90 pl-[8vw] hover:italic hover:text-glow-white hover:tracking-wide transition-all duration-300">voice.</span>
            </div>
            <div className="text-mask block py-1">
              <span className="block opacity-90 pl-[4vw] hover:italic hover:text-glow-white hover:tracking-wide transition-all duration-300">diagnostics.</span>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 z-10">
          <div className="max-w-md font-mono text-[10px] text-white/40 leading-relaxed uppercase tracking-wider">
            S.P.E.C.T.R.A. is an immersive audio-forensics terminal that detects deepfakes, synthetic speech, and artificial soundscapes via high-fidelity Mel Spectrogram feature-mapping.
          </div>

          <button 
            ref={btnScrollRef}
            onMouseMove={(e) => handleMagneticMove(e, btnScrollRef)}
            onMouseLeave={() => handleMagneticLeave(btnScrollRef)}
            onClick={handleScrollToConsole}
            className="flex items-center gap-3 px-6 py-4 border border-white/10 rounded-full hover:border-white/50 hover:bg-white/5 text-white/90 hover:text-white transition-all cursor-none tracking-widest text-[10px] font-mono uppercase magnetic-target"
          >
            <span>engage visualizer</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mx-6 md:mx-12 bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded text-xs font-mono flex items-center gap-3 animate-shake">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          <span>SYSTEM ERROR: {errorMessage}</span>
        </div>
      )}

      {/* 2. THE CORE DIAGNOSTIC CONSOLE (SCAN TARGETS) */}
      <section id="spectra-console" className="py-24 px-6 md:px-12 border-t border-white/5 scroll-reveal-panel">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">[ module.01 ]</span>
              <h2 className="text-2xl font-serif italic text-white/90 mt-1">the.detector.console</h2>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-white/45">
              <span>status // <span className="text-emerald-400">active</span></span>
              <span>node // tokyo.dev</span>
            </div>
          </div>

          {/* Grid visualizer layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left: Input Control Deck (Cols 1-4) */}
            <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
              
              <div className="editorial-panel p-6 rounded border border-white/5 bg-black/25 flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-white/50" />
                  <h3 className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">
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
                        className="border border-white/10 hover:border-white/35 py-3.5 rounded text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:bg-emerald-400/5 transition-all cursor-none magnetic-target flex items-center justify-center gap-2"
                      >
                        <Mic className="w-3.5 h-3.5" /> start.rec
                      </button>
                    ) : (
                      <button
                        ref={btnStartRef}
                        onMouseMove={(e) => handleMagneticMove(e, btnStartRef)}
                        onMouseLeave={() => handleMagneticLeave(btnStartRef)}
                        onClick={stopMicStreaming}
                        className="border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 py-3.5 rounded text-[10px] font-mono uppercase tracking-widest text-red-500 transition-all cursor-none magnetic-target flex items-center justify-center gap-2"
                      >
                        <MicOff className="w-3.5 h-3.5 animate-pulse" /> stop.rec
                      </button>
                    )}

                    <label 
                      ref={btnUploadRef}
                      onMouseMove={(e) => handleMagneticMove(e, btnUploadRef)}
                      onMouseLeave={() => handleMagneticLeave(btnUploadRef)}
                      className="border border-white/10 hover:border-white/35 py-3.5 rounded text-[10px] font-mono uppercase tracking-widest text-white/80 hover:bg-white/5 transition-all cursor-none text-center block magnetic-target flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> upload.wav
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
                    className="border border-dashed border-white/10 rounded p-6 bg-black/40 hover:bg-white/2 hover:border-white/20 transition-all text-center group cursor-none"
                  >
                    <UploadCloud className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-all mx-auto mb-2.5" />
                    <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest">
                      drag.drop.scan.track
                    </p>
                    <p className="text-[8px] text-white/25 mt-1 font-mono uppercase">
                      wav / mp3 / flac (max 10mb)
                    </p>
                  </div>

                  {/* Selected File Details */}
                  {activeFileName && (
                    <div className="bg-black/80 p-3 rounded border border-white/5 flex items-center justify-between gap-3 text-[10px] font-mono">
                      <div className="truncate flex-1">
                        <span className="text-white/20 uppercase text-[8px] block">scan.target</span>
                        <span className="text-white/80 font-bold truncate block">{activeFileName}</span>
                      </div>
                      
                      {fileUrl && (
                        <button
                          onClick={handlePlayPause}
                          className={`p-2 rounded border ${isPlaying ? 'bg-white/10 border-white/20 text-white' : 'bg-black border-white/5 text-white/60'} hover:bg-white hover:text-black transition-all cursor-none`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
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
            <div className="lg:col-span-8">
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

      {/* 3. DIAGNOSTICS & TELEMETRY */}
      <section className="py-20 px-6 md:px-12 border-t border-white/5 bg-[#050505]/40 scroll-reveal-panel">
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

      {/* 4. STORYTELLING / ACOUSTIC SCIENCE */}
      <section id="about-section" className="py-32 px-6 md:px-12 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-12 z-10 relative">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block">[ module.02 // the.science ]</span>
          
          <h2 className="text-4xl md:text-5xl font-serif italic text-white/90 leading-tight">
            how.we.verify.organic.speech
          </h2>
          
          <div className="text-sm md:text-base font-mono text-white/50 space-y-8 leading-relaxed uppercase tracking-wide">
            <p>
              AI voice clones, synthesized by advanced text-to-speech vocoders, appear realistic to human ears. However, in the high-frequency spectrum, they leave irreversible digital signatures.
            </p>
            <p>
              S.P.E.C.T.R.A. evaluates pitch variance (F0) profiles. Humans naturally modulate pitch fluctuations over time. Synthesized models often show abnormally flattened variance or digital jitters.
            </p>
            <p>
              Furthermore, vocoders smooth mel-spectrogram grids to reduce computing bandwidth, stripping the voice of higher-order timbral resonance (measured through MFCC variance). S.P.E.C.T.R.A. exposes these micro-variations.
            </p>
          </div>
        </div>
      </section>

      {/* 5. TECHNOLOGY MATRIX */}
      <section id="tech-section" className="py-32 px-6 md:px-12 border-t border-white/5 bg-[#050505]/45 relative overflow-hidden tech-grid-trigger">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">[ module.03 // technology.matrix ]</span>
              <h2 className="text-2xl font-serif italic text-white/90 mt-1">the.stack.matrix</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Tech 1: React */}
            <div className="tech-card border border-white/5 bg-black/30 p-8 rounded flex flex-col justify-between hover:border-white/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">01 / frontend</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-glow-white transition-all">React.js</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Vite + Tailwind v4 Compiler</p>
              </div>
            </div>

            {/* Tech 2: FastAPI */}
            <div className="tech-card border border-white/5 bg-black/30 p-8 rounded flex flex-col justify-between hover:border-white/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">02 / backend</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-glow-white transition-all">FastAPI</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Async Python API Gateway</p>
              </div>
            </div>

            {/* Tech 3: GSAP */}
            <div className="tech-card border border-white/5 bg-black/30 p-8 rounded flex flex-col justify-between hover:border-white/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">03 / animation</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-glow-white transition-all">GSAP</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Scroll Trigger & Easing Physics</p>
              </div>
            </div>

            {/* Tech 4: Librosa */}
            <div className="tech-card border border-white/5 bg-black/30 p-8 rounded flex flex-col justify-between hover:border-white/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">04 / speech.dsp</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-glow-white transition-all">Librosa</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Spectral Feature Extraction</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. MINIMALIST EDITORIAL FOOTER */}
      <footer className="py-20 px-6 md:px-12 border-t border-white/5 text-white/40 text-[10px] font-mono uppercase tracking-widest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-1">
            <p className="text-white/60 font-bold tracking-widest">S.P.E.C.T.R.A. lab</p>
            <p className="text-[9px]">© 2026 all rights reserved // tokyo node</p>
          </div>
          
          <div className="flex gap-6 lowercase text-[9px]">
            <a href="#" className="hover:text-white transition-colors cursor-none">github</a>
            <a href="#" className="hover:text-white transition-colors cursor-none">documentation</a>
            <a href="#" className="hover:text-white transition-colors cursor-none">legal</a>
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
