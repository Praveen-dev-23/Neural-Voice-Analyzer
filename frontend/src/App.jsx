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
    <div className="min-h-screen bg-[#08080a] text-[#f8fafc] select-none relative font-sans">
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
          <span className="text-[8px] font-mono tracking-widest text-white uppercase text-center select-none pointer-events-none animate-pulse">
            {cursorText}
          </span>
        )}
      </div>
      <div ref={cursorDotRef} className={`custom-cursor-dot hidden md:block ${cursorText ? 'opacity-0 scale-50' : 'opacity-100'}`}></div>

      {/* Editorial Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#08080a]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between text-[11px] font-mono tracking-widest text-white/50 uppercase">
        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2 font-bold text-white text-[10px] tracking-widest lowercase">
            <span className="text-[#ff5d3b] text-xs">✶</span> spectra.network
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-8 text-[10px] lowercase font-sans font-medium tracking-normal text-white/60">
          <a href="#about-section" data-cursor="science" className="hover:text-white transition-colors cursor-none">about</a>
          <button onClick={handleScrollToConsole} data-cursor="scan" className="hover:text-white transition-colors cursor-none">scanner</button>
          <a href="#tech-section" data-cursor="matrix" className="hover:text-white transition-colors cursor-none">technology</a>
          <a href="#" className="hover:text-white transition-colors cursor-none">documentation</a>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[9px] text-white/30 uppercase tracking-widest font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button 
            onClick={handleReset} 
            ref={btnResetRef}
            onMouseMove={(e) => handleMagneticMove(e, btnResetRef)}
            onMouseLeave={() => handleMagneticLeave(btnResetRef)}
            data-cursor="clear"
            className="text-white hover:text-black hover:bg-white transition-all border border-white/15 px-3 py-1 rounded-full cursor-none text-[10px] font-sans font-medium tracking-wide magnetic-target"
          >
            reset console →
          </button>
        </div>
      </nav>

      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-between pt-36 pb-12 px-6 md:px-12 overflow-hidden">
        
        {/* Concentric Radar Layout Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none hero-camera-effect">
          <div className="radar-bg-container">
            {/* Concentric rings */}
            <div className="radar-ring" style={{ width: '180px', height: '180px' }}></div>
            <div className="radar-ring" style={{ width: '320px', height: '320px' }}></div>
            <div className="radar-ring" style={{ width: '480px', height: '480px' }}></div>
            <div className="radar-ring-dashed" style={{ width: '640px', height: '640px' }}></div>
            <div className="radar-ring" style={{ width: '800px', height: '800px' }}></div>

            {/* Sweep arm */}
            <div className="radar-sweep-arm"></div>
            
            {/* Glowing active core sphere */}
            <div className="radar-glow-sphere"></div>
            
            {/* Central node text block */}
            <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[240px] text-center z-10 flex flex-col items-center justify-center p-4">
              <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mb-1.5">
                [ ingestion.state.core ]
              </span>
              <p className="text-[10px] font-sans text-white/70 leading-relaxed max-w-[200px]">
                {isRecording ? 'Listening to stream signals in real time...' : isProcessing ? 'Extracting log-mel feature maps...' : 'AI-powered neural models classify speech signatures.'}
              </p>
              
              {/* Dynamic waveform pulse */}
              <div className="flex gap-1 items-center justify-center mt-3 h-4">
                {[...Array(8)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-[1.5px] rounded bg-[#ff5d3b] transition-all`}
                    style={{ 
                      height: isRecording ? `${Math.floor(Math.random() * 16) + 4}px` : isProcessing ? '8px' : '3px',
                      animation: isRecording || isProcessing ? `scanning 1.5s ease-in-out infinite alternate` : 'none',
                      animationDelay: `${i * 0.08}s`
                    }}
                  ></span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hero headline overlapping the radar circles */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center max-w-5xl mx-auto w-full">
          <div className="space-y-6">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">
              [ global.neural.voice.auditor ]
            </span>
            
            <h1 className="text-huge font-sans font-medium text-white tracking-tight max-w-4xl mx-auto">
              Next level of <span className="text-[#ff5d3b] italic font-serif">⚡️ voice analysis</span> <br className="hidden md:block"/> and <span className="text-[#ff5d3b] italic font-serif">✶ deepfake</span> detection
            </h1>
          </div>
        </div>

        {/* Stats and metadata overlay (absolute layout flanking left and right) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-12 z-10 hidden lg:flex flex-col gap-12 font-sans select-none pointer-events-none text-left">
          <div className="space-y-1">
            <div className="text-2xl font-medium text-white tracking-tight">99.4%</div>
            <div className="text-[9px] font-mono uppercase text-white/45 tracking-wider">Classifier Accuracy</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-medium text-white tracking-tight">0.01s</div>
            <div className="text-[9px] font-mono uppercase text-white/45 tracking-wider">Ingestion Latency</div>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 z-10 hidden lg:flex flex-col gap-12 font-sans select-none pointer-events-none text-right">
          <div className="space-y-1">
            <div className="text-2xl font-medium text-white tracking-tight">10k+</div>
            <div className="text-[9px] font-mono uppercase text-white/45 tracking-wider">Voices Analyzed</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-medium text-white tracking-tight">50+</div>
            <div className="text-[9px] font-mono uppercase text-white/45 tracking-wider">Formats Supported</div>
          </div>
        </div>

        {/* Hero Footer: Carousel pills from reference */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 w-full mt-auto">
          {/* Badge 1 */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 rounded-full px-4 py-2 text-[10px] font-sans">
            <span className="w-4 h-4 rounded-full bg-[#ff5d3b] text-white flex items-center justify-center text-[8px] font-bold">1</span>
            <span className="w-2 h-2 rounded-full border border-white/20"></span>
            <span className="w-2 h-2 rounded-full border border-white/20"></span>
          </div>

          {/* Badge 2 (Wide Orange Pill) */}
          <div className="flex-1 max-w-xl bg-[#ff5d3b] rounded-full px-5 py-2.5 flex items-center justify-between gap-4 text-white hover:opacity-95 transition-opacity">
            <div className="flex items-center gap-1.5 text-[9px] font-bold">
              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center">1</span>
              <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center">2</span>
              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center">3</span>
            </div>
            <p className="text-[10px] font-sans font-medium truncate flex-1 pl-2 text-center md:text-left">
              Real-time log-mel feature extraction isolates digital vocoder signatures automatically!
            </p>
            <span className="text-xs">↗</span>
          </div>

          {/* Badge 3 */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-full px-4 py-2">
            <div className="flex items-center gap-1.5 text-[9px] font-sans text-white/55">
              <span className="w-2.5 h-2.5 rounded-full border border-white/20"></span>
              <span className="w-2.5 h-2.5 rounded-full border border-white/20"></span>
              <span className="w-4 h-4 rounded-full bg-[#ff5d3b] text-white flex items-center justify-center font-bold text-[8px]">3</span>
            </div>
            {/* User Avatars */}
            <div className="flex -space-x-1.5 items-center">
              <div className="w-4 h-4 rounded-full bg-[#e2f1f0] border border-black text-[7px] text-black font-bold flex items-center justify-center">A</div>
              <div className="w-4 h-4 rounded-full bg-[#ff5d3b] border border-black text-[7px] text-white font-bold flex items-center justify-center">B</div>
              <div className="w-4 h-4 rounded-full bg-zinc-700 border border-black text-[7px] text-white font-bold flex items-center justify-center">C</div>
            </div>
            <span className="text-white/60 text-[9px]">↗</span>
          </div>
        </div>

      </section>

      {/* 2. STORYTELLING / ACOUSTIC SCIENCE (SECTION 01) */}
      <section id="about-section" className="py-28 px-6 md:px-12 border-t border-white/5 relative overflow-hidden scroll-reveal-panel">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">01 /</span>
            <span className="badge-pill-teal">About ✶ Spectra</span>
          </div>

          <div className="text-2xl md:text-4xl font-sans font-normal text-white leading-relaxed max-w-5xl">
            Our analyzer <span className="badge-pill-orange"><span className="text-[8px] leading-none">+</span></span> has been exposing 
            <span className="badge-pill-dark">⚡️ vocoder buzz</span> and artificial voice models for 
            <span className="badge-pill-orange">✶ Spectra</span> 5 years. A database of 
            <span className="badge-pill-dark">10,000+</span> voice profiles.
          </div>

          {/* Three Feature Cards Grid matching the mock style exactly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Card 1: Constant monitoring */}
            <div className="feature-card-editorial">
              <div className="space-y-4">
                {/* Illustration panel */}
                <div className="h-[200px] bg-black/5 border border-black/5 rounded-[20px] flex items-center justify-center p-6 relative overflow-hidden">
                  {/* SVG graphic of radar scanning */}
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1.5" fill="none" />
                    <circle cx="100" cy="100" r="50" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1.5" fill="none" />
                    <circle cx="100" cy="100" r="20" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1.5" fill="none" />
                    {/* Scanning sweep */}
                    <path d="M100 100 L170 60 A80 80 0 0 0 100 20 Z" fill="rgba(255, 93, 59, 0.1)" />
                    <line x1="100" y1="100" x2="170" y2="60" stroke="#ff5d3b" strokeWidth="1.5" />
                    <circle cx="170" cy="60" r="3" fill="#ff5d3b" />
                    {/* Pill capsules inside svg */}
                    <g transform="translate(15, 130)">
                      <rect width="60" height="18" rx="4" fill="#ff5d3b" />
                      <text x="30" y="12" fill="white" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">domain</text>
                    </g>
                    <g transform="translate(85, 130)">
                      <rect width="60" height="18" rx="4" fill="#ff5d3b" />
                      <text x="30" y="12" fill="white" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Website</text>
                    </g>
                    <g transform="translate(155, 130)">
                      <rect width="30" height="18" rx="4" fill="rgba(15,23,42,0.06)" stroke="rgba(0,0,0,0.1)" />
                      <text x="15" y="12" fill="black" fontSize="8" fontFamily="sans-serif" textAnchor="middle">app</text>
                    </g>
                  </svg>
                </div>
                
                <h3 className="text-lg font-bold font-sans tracking-tight">Constant monitoring</h3>
              </div>
              <p className="text-[11px] font-sans text-slate-600 mt-6 leading-relaxed">
                Monitor domains, websites, app stores, and other digital streams in real time.
              </p>
            </div>

            {/* Card 2: AI-based detection */}
            <div className="feature-card-editorial relative">
              {/* Float share-it orange pill */}
              <div className="absolute top-6 right-6 bg-[#ff5d3b] text-white text-[9px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                SHARE IT <span className="text-[10px]">↗</span>
              </div>

              <div className="space-y-4">
                {/* Illustration panel */}
                <div className="h-[200px] bg-black/5 border border-black/5 rounded-[20px] flex items-center justify-center p-6 relative overflow-hidden">
                  {/* SVG graphic of detective fedora and asterisk */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <svg className="w-16 h-12 text-slate-800" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Hat crown */}
                      <path d="M30 42 C30 20 40 18 50 18 C60 18 70 20 70 42 Z" fill="rgba(15, 23, 42, 0.2)" stroke="currentColor" strokeWidth="1.2" />
                      {/* Hat band */}
                      <path d="M30 38 H70 V42 H30 Z" fill="#ff5d3b" />
                      {/* Hat brim */}
                      <path d="M15 45 C35 41 65 41 85 45 C80 49 20 49 15 45 Z" fill="rgba(15, 23, 42, 0.3)" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    {/* Asterisk */}
                    <span className="text-[#ff5d3b] text-2xl font-bold select-none leading-none">✶</span>
                    {/* Verdict pill */}
                    <div className="border border-red-200 bg-red-50 text-red-500 font-bold text-[8px] px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Scam detected!
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold font-sans tracking-tight">AI-based detection</h3>
              </div>
              <p className="text-[11px] font-sans text-slate-655 mt-6 leading-relaxed">
                Out of the box detection for phishing, brand infringement, scams, and typosquat attacks.
              </p>
            </div>

            {/* Card 3: Automatic triage */}
            <div className="feature-card-editorial">
              <div className="space-y-4">
                {/* Illustration panel */}
                <div className="h-[200px] bg-black/5 border border-black/5 rounded-[20px] flex items-center justify-center p-6 relative overflow-hidden">
                  {/* SVG graphic of rotating stamp and threat capsules */}
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    {/* Rotating stamp circle in background */}
                    <g transform="translate(100, 70)" className="animate-spin-slow origin-center">
                      <circle cx="0" cy="0" r="40" stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="3,3" strokeWidth="1.5" fill="none" />
                      <text x="0" y="-45" fill="rgba(15,23,42,0.3)" fontSize="5.5" fontFamily="monospace" textAnchor="middle">✶ THREAT NEUTRALIZER ✶</text>
                      <text x="0" y="48" fill="rgba(15,23,42,0.3)" fontSize="5.5" fontFamily="monospace" textAnchor="middle">✶ THREAT NEUTRALIZER ✶</text>
                    </g>
                    {/* Star inside circle */}
                    <circle cx="100" cy="70" r="16" fill="rgba(255, 93, 59, 0.05)" />
                    <text x="100" y="76" fill="#ff5d3b" fontSize="20" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">✶</text>

                    {/* Piled threat pills */}
                    <g transform="translate(30, 135) rotate(-10)">
                      <rect width="45" height="16" rx="8" fill="rgba(15, 23, 42, 0.12)" />
                      <text x="22.5" y="11" fill="black" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Threat</text>
                    </g>
                    <g transform="translate(85, 140) rotate(5)">
                      <rect width="45" height="16" rx="8" fill="rgba(15, 23, 42, 0.12)" />
                      <text x="22.5" y="11" fill="black" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Threat</text>
                    </g>
                    <g transform="translate(138, 132) rotate(-5)">
                      <rect width="45" height="16" rx="8" fill="rgba(15, 23, 42, 0.12)" />
                      <text x="22.5" y="11" fill="black" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Threat</text>
                    </g>
                  </svg>
                </div>
                
                <h3 className="text-lg font-bold font-sans tracking-tight">Automatic triage</h3>
              </div>
              <p className="text-[11px] font-sans text-slate-655 mt-6 leading-relaxed">
                Neutralize threats without human intervention using automated spectral filtering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mx-6 md:mx-12 bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded text-xs font-mono flex items-center gap-3 animate-shake">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          <span>SYSTEM ERROR: {errorMessage}</span>
        </div>
      )}

      {/* 3. THE CORE DIAGNOSTIC CONSOLE (SCAN TARGETS) (SECTION 02) */}
      <section id="spectra-console" className="py-24 px-6 md:px-12 border-t border-white/5 scroll-reveal-panel">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">[ module.02 // scanner.console ]</span>
              <h2 className="text-2xl font-serif italic text-white/90 mt-1">spectra.neural.decoder</h2>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-white/45">
              <span>status // <span className="text-[#ff5d3b] animate-pulse">active.ingest</span></span>
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
                        data-cursor="record"
                        className="border border-white/10 hover:border-white/35 py-3.5 rounded text-[10px] font-mono uppercase tracking-widest text-[#ff5d3b] hover:bg-[#ff5d3b]/5 transition-all cursor-none magnetic-target flex items-center justify-center gap-2"
                      >
                        <Mic className="w-3.5 h-3.5" /> start.rec
                      </button>
                    ) : (
                      <button
                        ref={btnStartRef}
                        onMouseMove={(e) => handleMagneticMove(e, btnStartRef)}
                        onMouseLeave={() => handleMagneticLeave(btnStartRef)}
                        onClick={stopMicStreaming}
                        data-cursor="stop"
                        className="border border-[#ff5d3b]/30 bg-[#ff5d3b]/5 hover:bg-[#ff5d3b]/10 py-3.5 rounded text-[10px] font-mono uppercase tracking-widest text-[#ff5d3b] transition-all cursor-none magnetic-target flex items-center justify-center gap-2"
                      >
                        <MicOff className="w-3.5 h-3.5 animate-pulse" /> stop.rec
                      </button>
                    )}

                    <label 
                      ref={btnUploadRef}
                      onMouseMove={(e) => handleMagneticMove(e, btnUploadRef)}
                      onMouseLeave={() => handleMagneticLeave(btnUploadRef)}
                      data-cursor="upload"
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
                    data-cursor="drop file"
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
      <section className="py-20 px-6 md:px-12 border-t border-white/5 bg-[#08080a]/40 scroll-reveal-panel">
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

      {/* 5. NETWORKS / INTEGRATIONS CIRCLES (SECTION 03) */}
      <section id="networks-section" className="py-28 px-6 md:px-12 border-t border-white/5 relative overflow-hidden scroll-reveal-panel">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">03 /</span>
            <span className="badge-pill-teal">Investors of ✶ Network</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-sans font-normal text-white">
            Our investors of <span className="text-[#ff5d3b]">✶ Network project</span>
          </h2>

          <div className="flex flex-wrap items-center justify-center md:justify-between gap-6 pt-6">
            {/* OpenSea boat icon outline */}
            <div className="partner-circle" title="OpenSea Network">
              <svg className="w-10 h-10 opacity-75" viewBox="0 0 40 40" fill="currentColor">
                <path d="M20 5C11.7 5 5 11.7 5 20s6.7 15 15 15 15-6.7 15-15S28.3 5 20 5zm5 11.7l-4.5 4.5-1.5-1.5L25 15.7l1 1zm-8.8 8.1l-1.5-1.5L18 20l1.5 1.5-3.3 3.3z" />
              </svg>
            </div>

            {/* Binance Diamond Outline */}
            <div className="partner-circle" title="Binance Matrix">
              <svg className="w-8 h-8 opacity-75" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 10l8 8 8-8-8-8zm0 3.6L16.4 10 12 14.4 7.6 10 12 5.6z M12 17.6l-5.6-5.6-1.4 1.4L12 20.4l7-7-1.4-1.4-5.6 5.6z" />
              </svg>
            </div>

            {/* Eagle Outline */}
            <div className="partner-circle" title="Falcon Security">
              <svg className="w-8 h-8 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3L4 6v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V6l-8-3z M12 6l5 5h-4v6h-2v-6H7l5-5z" />
              </svg>
            </div>

            {/* Solid Orange Circle styled with SLICE text */}
            <div className="partner-circle-orange relative" title="Slice API Platform">
              <div className="flex flex-col items-center">
                <span className="font-sans font-extrabold tracking-tighter text-black text-sm italic select-none">SLICE</span>
                <span className="absolute bottom-3 right-3 text-[9px] text-black">↗</span>
              </div>
            </div>

            {/* Petal text circle */}
            <div className="partner-circle font-sans font-semibold tracking-tight text-sm select-none" title="Petal Labs">
              Petal
            </div>
          </div>
        </div>
      </section>

      {/* 6. TECHNOLOGY MATRIX (SECTION 04) */}
      <section id="tech-section" className="py-28 px-6 md:px-12 border-t border-white/5 bg-[#08080a]/45 relative overflow-hidden tech-grid-trigger">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">[ module.04 // technology.matrix ]</span>
              <h2 className="text-2xl font-serif italic text-white/90 mt-1">the.stack.matrix</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Tech 1: React */}
            <div className="tech-card border border-white/5 bg-black/35 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#ff5d3b]/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">01 / frontend</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-[#ff5d3b] transition-all">React.js</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Vite + Tailwind v4 Compiler</p>
              </div>
            </div>

            {/* Tech 2: FastAPI */}
            <div className="tech-card border border-white/5 bg-black/35 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#ff5d3b]/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">02 / backend</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-[#ff5d3b] transition-all">FastAPI</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Async Python API Gateway</p>
              </div>
            </div>

            {/* Tech 3: GSAP */}
            <div className="tech-card border border-white/5 bg-black/35 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#ff5d3b]/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">03 / animation</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-[#ff5d3b] transition-all">GSAP</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Scroll Trigger & Easing Physics</p>
              </div>
            </div>

            {/* Tech 4: Librosa */}
            <div className="tech-card border border-white/5 bg-black/35 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#ff5d3b]/20 hover:bg-white/2 transition-all group cursor-none">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">04 / speech.dsp</span>
              <div className="mt-8">
                <h3 className="text-xl font-serif text-white group-hover:text-[#ff5d3b] transition-all">Librosa</h3>
                <p className="text-[9px] font-mono text-white/40 mt-1 uppercase">Spectral Feature Extraction</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. MINIMALIST EDITORIAL FOOTER */}
      <footer className="py-20 px-6 md:px-12 border-t border-white/5 text-white/40 text-[10px] font-mono uppercase tracking-widest bg-[#08080a]">
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
