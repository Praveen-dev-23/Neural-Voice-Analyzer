import React, { useRef, useEffect, useState } from 'react';
import { Activity, Disc, AlignLeft } from 'lucide-react';

const AudioVisualizer = ({ 
  mode = 'live', // 'live' or 'file'
  analyserNode = null, 
  spectrogramData = null, 
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onPlayheadSeek = null
}) => {
  const waveformCanvasRef = useRef(null);
  const freqCanvasRef = useRef(null);
  const circularCanvasRef = useRef(null);
  const spectrogramCanvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const spectrogramHistoryRef = useRef([]); // for rolling live spectrogram

  const [activeTab, setActiveTab] = useState('spectrogram');

  // Animation Loop for Live Audio (Web Audio API)
  useEffect(() => {
    if (mode !== 'live' || !analyserNode) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArrayTime = new Uint8Array(bufferLength);
    const dataArrayFreq = new Uint8Array(bufferLength);

    const draw = () => {
      // 1. Fine-Line Oscilloscope
      if (waveformCanvasRef.current && activeTab === 'waveform') {
        const canvas = waveformCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteTimeDomainData(dataArrayTime);

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        // Thin grids
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < W; x += 50) {
          ctx.moveTo(x, 0); ctx.lineTo(x, H);
        }
        for (let y = 0; y < H; y += 40) {
          ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        ctx.stroke();

        // Waveform
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();

        const sliceWidth = W / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArrayTime[i] / 128.0;
          const y = (v * H) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      }

      // 2. High-Contrast Frequency Equalizer
      if (freqCanvasRef.current && activeTab === 'equalizer') {
        const canvas = freqCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        const barWidth = (W / 60);
        let barHeight;
        let x = 0;

        for (let i = 0; i < 60; i++) {
          const binIndex = Math.floor((i / 60) * (bufferLength * 0.6));
          const val = dataArrayFreq[binIndex] || 0;
          barHeight = (val / 255) * H * 0.75;

          // Minimalist monochromatic bars
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(x, H - barHeight, barWidth - 3, barHeight);

          // Glowing peak markers
          if (barHeight > 5) {
            ctx.fillStyle = 'rgba(255, 93, 59, 0.9)'; // Soft orange accent
            ctx.fillRect(x, H - barHeight - 2, barWidth - 3, 1.5);
          }

          x += barWidth;
        }
      }

      // 3. Circular Telemetry Core
      if (circularCanvasRef.current && activeTab === 'circular') {
        const canvas = circularCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const centerX = W / 2;
        const centerY = H / 2;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        ctx.fillStyle = '#08080a';
        ctx.fillRect(0, 0, W, H);

        let sum = 0;
        for (let i = 0; i < 40; i++) {
          sum += dataArrayFreq[i];
        }
        const avgFreq = sum / 40;
        const baseRadius = 50 + (avgFreq / 255) * 12;

        // Circular background guides
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 10, 0, 2 * Math.PI);
        ctx.arc(centerX, centerY, baseRadius + 30, 0, 2 * Math.PI);
        ctx.stroke();

        // Radials
        const numLines = 120;
        ctx.lineWidth = 1;
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * 2 * Math.PI;
          const binIndex = Math.floor((i / numLines) * (bufferLength * 0.4));
          const val = dataArrayFreq[binIndex] || 0;
          const lineLength = (val / 255) * 45;

          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * (baseRadius + lineLength);
          const endY = centerY + Math.sin(angle) * (baseRadius + lineLength);

          // Interpolate stroke transparency based on intensity
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (val / 255) * 0.85})`;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Sleek core overlay
        ctx.fillStyle = 'rgba(10, 10, 12, 0.95)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CORE RADIAL', centerX, centerY - 5);
        ctx.fillStyle = 'rgba(255, 93, 59, 0.85)';
        ctx.fillText(`${Math.round(avgFreq)} db`, centerX, centerY + 8);
      }

      // 4. Scrolling Spectrogram (Live)
      if (spectrogramCanvasRef.current && activeTab === 'spectrogram') {
        const canvas = spectrogramCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        const binsToUse = 64;
        const frameData = [];
        for (let i = 0; i < binsToUse; i++) {
          frameData.push(dataArrayFreq[i]);
        }

        spectrogramHistoryRef.current.push(frameData);
        if (spectrogramHistoryRef.current.length > W) {
          spectrogramHistoryRef.current.shift();
        }

        ctx.fillStyle = '#08080a';
        ctx.fillRect(0, 0, W, H);

        const history = spectrogramHistoryRef.current;
        const barHeight = H / binsToUse;
        
        for (let xCoord = 0; xCoord < history.length; xCoord++) {
          const frame = history[xCoord];
          for (let yBin = 0; yBin < binsToUse; yBin++) {
            const val = frame[yBin];
            const normVal = val / 255;

            // Redesigned Copper-to-Orange-to-White Palette
            let color;
            if (normVal < 0.08) {
              color = `rgba(8, 8, 10, ${normVal * 12})`;
            } else if (normVal < 0.45) {
              const p = (normVal - 0.08) / 0.37;
              color = `rgb(${Math.floor(8 + p * 90)}, ${Math.floor(8 + p * 25)}, ${Math.floor(10 + p * 10)})`; // Copper red/brown
            } else if (normVal < 0.85) {
              const p = (normVal - 0.45) / 0.4;
              color = `rgb(${Math.floor(98 + p * 157)}, ${Math.floor(33 + p * 60)}, ${Math.floor(20 + p * 39)})`; // Neon orange-coral
            } else {
              const p = (normVal - 0.85) / 0.15;
              color = `rgb(255, ${Math.floor(93 + p * 162)}, ${Math.floor(59 + p * 196)})`; // Orange to white
            }

            ctx.fillStyle = color;
            ctx.fillRect(xCoord, H - (yBin + 1) * barHeight, 1, barHeight + 0.5);
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [mode, analyserNode, activeTab]);

  // Static File Spectrogram Rendering (from backend log-mel spectrogram)
  useEffect(() => {
    if (mode === 'file' && spectrogramData && spectrogramCanvasRef.current && activeTab === 'spectrogram') {
      const canvas = spectrogramCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      const numMels = spectrogramData.length;
      const numFrames = spectrogramData[0].length;
      const cellWidth = W / numFrames;
      const cellHeight = H / numMels;

      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, W, H);

      for (let y = 0; y < numMels; y++) {
        for (let x = 0; x < numFrames; x++) {
          const normVal = spectrogramData[y][x];

          let color;
          if (normVal < 0.08) {
            color = `rgba(8, 8, 10, ${normVal * 12})`;
          } else if (normVal < 0.45) {
            const p = (normVal - 0.08) / 0.37;
            color = `rgb(${Math.floor(8 + p * 90)}, ${Math.floor(8 + p * 25)}, ${Math.floor(10 + p * 10)})`;
          } else if (normVal < 0.85) {
            const p = (normVal - 0.45) / 0.4;
            color = `rgb(${Math.floor(98 + p * 157)}, ${Math.floor(33 + p * 60)}, ${Math.floor(20 + p * 39)})`;
          } else {
            const p = (normVal - 0.85) / 0.15;
            color = `rgb(255, ${Math.floor(93 + p * 162)}, ${Math.floor(59 + p * 196)})`;
          }

          ctx.fillStyle = color;
          ctx.fillRect(x * cellWidth, H - (y + 1) * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
        }
      }

      // Sweeping playhead hairline
      if (duration > 0) {
        const playheadX = (currentTime / duration) * W;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, H);
        ctx.stroke();
      }
    }
  }, [mode, spectrogramData, currentTime, duration, activeTab]);

  const handleCanvasClick = (e) => {
    if (mode === 'file' && duration > 0 && onPlayheadSeek && spectrogramCanvasRef.current) {
      const rect = spectrogramCanvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      onPlayheadSeek(percentage * duration);
    }
  };

  return (
    <div className="editorial-panel p-6 rounded border border-white/5 bg-black/25 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-5 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/60 animate-pulse" />
          <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">
            {mode === 'live' ? 'telemetry.spectral.feed' : 'spectral.log.map'}
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-black/80 p-0.5 rounded border border-white/5 z-10 text-[9px] font-mono">
          <button 
            onClick={() => setActiveTab('spectrogram')}
            className={`px-2.5 py-1 tracking-wider rounded transition-all uppercase ${activeTab === 'spectrogram' ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/80'}`}
          >
            spectrogram
          </button>
          
          {mode === 'live' && (
            <>
              <button 
                onClick={() => setActiveTab('circular')}
                className={`px-2.5 py-1 tracking-wider rounded transition-all uppercase ${activeTab === 'circular' ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/80'}`}
              >
                radial
              </button>
              <button 
                onClick={() => setActiveTab('waveform')}
                className={`px-2.5 py-1 tracking-wider rounded transition-all uppercase ${activeTab === 'waveform' ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/80'}`}
              >
                waveform
              </button>
              <button 
                onClick={() => setActiveTab('equalizer')}
                className={`px-2.5 py-1 tracking-wider rounded transition-all uppercase ${activeTab === 'equalizer' ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/80'}`}
              >
                eq
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center bg-black/60 rounded border border-white/5 p-1 relative overflow-hidden min-h-[220px]">
        {/* Canvas overlays/screens */}
        
        <canvas
          ref={spectrogramCanvasRef}
          onClick={handleCanvasClick}
          width={mode === 'live' ? 420 : 600}
          height={240}
          className={`w-full h-full max-h-[300px] object-stretch rounded cursor-pointer transition-all duration-300 canvas-glitch-blend ${activeTab === 'spectrogram' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
        />

        {mode === 'live' && (
          <canvas
            ref={circularCanvasRef}
            width={400}
            height={240}
            className={`w-full h-full max-h-[300px] object-contain rounded transition-all duration-300 ${activeTab === 'circular' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          />
        )}

        {mode === 'live' && (
          <canvas
            ref={waveformCanvasRef}
            width={400}
            height={240}
            className={`w-full h-full max-h-[300px] object-stretch rounded transition-all duration-300 ${activeTab === 'waveform' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          />
        )}

        {mode === 'live' && (
          <canvas
            ref={freqCanvasRef}
            width={400}
            height={240}
            className={`w-full h-full max-h-[300px] object-stretch rounded transition-all duration-300 ${activeTab === 'equalizer' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          />
        )}

        {/* Missing context hints */}
        {mode === 'live' && !analyserNode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/95 z-20">
            <AlignLeft className="w-8 h-8 text-white/20 animate-pulse mb-3" />
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              system.awaiting.input.feed
            </p>
            <p className="text-[9px] text-white/30 mt-1 max-w-[220px] uppercase font-mono">
              initialize stream node to begin wave mapping
            </p>
          </div>
        )}

        {mode === 'file' && !spectrogramData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/95 z-20">
            <AlignLeft className="w-8 h-8 text-white/20 animate-pulse mb-3" />
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              envelope.not.extracted
            </p>
            <p className="text-[9px] text-white/30 mt-1 max-w-[220px] uppercase font-mono">
              load target track to render mel envelope structures
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-white/40 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1 h-1 rounded-full ${mode === 'live' && analyserNode ? 'bg-white dot-pulse' : 'bg-white/10'}`}></span>
          <span>feed // {mode === 'live' && analyserNode ? 'streaming' : mode === 'file' ? 'archive' : 'standby'}</span>
        </div>
        {mode === 'file' && duration > 0 && (
          <div className="text-white/60">
            timeline // {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </div>
        )}
        {mode === 'live' && analyserNode && (
          <div className="text-white/60">
            rate // {analyserNode.context.sampleRate} hz
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
