import React, { useRef, useEffect, useState } from 'react';
import { Activity, ShieldAlert, Disc, BarChart2 } from 'lucide-react';

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
      // Cancel active animation if not live
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArrayTime = new Uint8Array(bufferLength);
    const dataArrayFreq = new Uint8Array(bufferLength);

    const draw = () => {
      // 1. Waveform Oscilloscope Drawing
      if (waveformCanvasRef.current) {
        const canvas = waveformCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteTimeDomainData(dataArrayTime);

        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, W, H);

        // Draw grids
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < W; x += 40) {
          ctx.moveTo(x, 0); ctx.lineTo(x, H);
        }
        for (let y = 0; y < H; y += 30) {
          ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        ctx.stroke();

        // Draw waveform line
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00f5d4'; // Glowing mint green
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f5d4';
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
        ctx.shadowBlur = 0; // reset
      }

      // 2. Frequency Equalizer Drawing
      if (freqCanvasRef.current) {
        const canvas = freqCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, W, H);

        // Draw grids
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 0; y < H; y += 25) {
          ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        ctx.stroke();

        const barWidth = (W / 40);
        let barHeight;
        let x = 0;

        // Display 40 bars from low to high-mid frequencies
        for (let i = 0; i < 40; i++) {
          // Downsample bin mapping
          const binIndex = Math.floor((i / 40) * (bufferLength * 0.6));
          const val = dataArrayFreq[binIndex] || 0;
          barHeight = (val / 255) * H * 0.85;

          // Create color gradient
          const gradient = ctx.createLinearGradient(0, H, 0, H - barHeight);
          gradient.addColorStop(0, '#7209b7'); // Deep Purple
          gradient.addColorStop(0.5, '#4361ee'); // Blue
          gradient.addColorStop(1, '#00f2fe'); // Cyan

          ctx.fillStyle = gradient;
          ctx.fillRect(x, H - barHeight, barWidth - 2, barHeight);

          // Glowing peak dots
          if (barHeight > 5) {
            ctx.fillStyle = '#00f5d4';
            ctx.fillRect(x, H - barHeight - 3, barWidth - 2, 2);
          }

          x += barWidth;
        }
      }

      // 3. Circular Spectrum Drawing
      if (circularCanvasRef.current) {
        const canvas = circularCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const centerX = W / 2;
        const centerY = H / 2;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, W, H);

        // Calculate average volume (RMS energy proxy)
        let sum = 0;
        for (let i = 0; i < 40; i++) {
          sum += dataArrayFreq[i];
        }
        const avgFreq = sum / 40;
        const baseRadius = 55 + (avgFreq / 255) * 20; // Pulsing center

        // Draw tech circles in background
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 10, 0, 2 * Math.PI);
        ctx.arc(centerX, centerY, baseRadius + 30, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw radial frequency lines
        const numLines = 90;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#9d4edd';

        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * 2 * Math.PI;
          const binIndex = Math.floor((i / numLines) * (bufferLength * 0.5));
          const val = dataArrayFreq[binIndex] || 0;
          const lineLength = (val / 255) * 55;

          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * (baseRadius + lineLength);
          const endY = centerY + Math.sin(angle) * (baseRadius + lineLength);

          const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
          gradient.addColorStop(0, '#00f2fe'); // Inner Cyan
          gradient.addColorStop(1, '#9d4edd'); // Outer Purple

          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Draw center solid cyber core
        ctx.fillStyle = 'rgba(13, 20, 38, 0.8)';
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f2fe';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AUDIO CORE', centerX, centerY - 6);
        ctx.fillStyle = '#00f5d4';
        ctx.fillText(`${Math.round(avgFreq)} DB`, centerX, centerY + 8);
      }

      // 4. Live Spectrogram Heatmap (Scrolling)
      if (spectrogramCanvasRef.current) {
        const canvas = spectrogramCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        analyserNode.getByteFrequencyData(dataArrayFreq);

        // We slice the frequency bins (limit to lower 120 bins, where speech resides)
        const binsToUse = 64;
        const frameData = [];
        for (let i = 0; i < binsToUse; i++) {
          frameData.push(dataArrayFreq[i]);
        }

        // Store frame history
        spectrogramHistoryRef.current.push(frameData);
        if (spectrogramHistoryRef.current.length > W) {
          spectrogramHistoryRef.current.shift();
        }

        // Draw Spectrogram
        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, W, H);

        const history = spectrogramHistoryRef.current;
        const barHeight = H / binsToUse;
        
        for (let xCoord = 0; xCoord < history.length; xCoord++) {
          const frame = history[xCoord];
          for (let yBin = 0; yBin < binsToUse; yBin++) {
            const val = frame[yBin]; // 0 - 255
            const normVal = val / 255;

            // Neon heatmap gradient colors (dark -> purple -> blue -> cyan -> yellow/white)
            let color;
            if (normVal < 0.1) {
              color = `rgba(8, 12, 24, ${normVal * 10})`;
            } else if (normVal < 0.4) {
              const p = (normVal - 0.1) / 0.3;
              color = `rgb(${Math.floor(p * 114)}, ${Math.floor(p * 9)}, ${Math.floor(100 + p * 155)})`; // Purple-ish
            } else if (normVal < 0.7) {
              const p = (normVal - 0.4) / 0.3;
              color = `rgb(${Math.floor(114 - p * 114)}, ${Math.floor(9 + p * 230)}, 255)`; // Blue-Cyan
            } else {
              const p = (normVal - 0.7) / 0.3;
              color = `rgb(${Math.floor(p * 255)}, 255, ${Math.floor(255 - p * 255)})`; // Yellowish white
            }

            ctx.fillStyle = color;
            // Draw a 1px wide pixel block. Y-axis is inverted so low frequencies are at bottom
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
    if (mode === 'file' && spectrogramData && spectrogramCanvasRef.current) {
      const canvas = spectrogramCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      // spectrogramData is shape (64, 100) (n_mels, time_frames)
      const numMels = spectrogramData.length;
      const numFrames = spectrogramData[0].length;
      const cellWidth = W / numFrames;
      const cellHeight = H / numMels;

      // Draw Spectrogram background
      ctx.fillStyle = '#080c18';
      ctx.fillRect(0, 0, W, H);

      // Draw Spectrogram matrix
      for (let y = 0; y < numMels; y++) {
        for (let x = 0; x < numFrames; x++) {
          const normVal = spectrogramData[y][x]; // 0.0 to 1.0 normalized

          // Color ramp map
          let color;
          if (normVal < 0.1) {
            color = `rgba(8, 12, 24, ${normVal * 10})`;
          } else if (normVal < 0.4) {
            const p = (normVal - 0.1) / 0.3;
            color = `rgb(${Math.floor(p * 114)}, ${Math.floor(p * 9)}, ${Math.floor(100 + p * 155)})`; // Purple
          } else if (normVal < 0.7) {
            const p = (normVal - 0.4) / 0.3;
            color = `rgb(${Math.floor(114 - p * 114)}, ${Math.floor(9 + p * 233)}, 255)`; // Cyan
          } else {
            const p = (normVal - 0.7) / 0.3;
            color = `rgb(${Math.floor(p * 255)}, 255, ${Math.floor(255 - p * 200)})`; // Yellowish white
          }

          ctx.fillStyle = color;
          // Invert y so lower frequencies are at the bottom of the canvas
          ctx.fillRect(x * cellWidth, H - (y + 1) * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
        }
      }

      // Add a sweeping playhead bar if we are playing or have a currentTime
      if (duration > 0) {
        const playheadX = (currentTime / duration) * W;
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f2fe';
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, H);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    }
  }, [mode, spectrogramData, currentTime, duration, activeTab]);

  // Click handler to scrub / seek static playback
  const handleCanvasClick = (e) => {
    if (mode === 'file' && duration > 0 && onPlayheadSeek && spectrogramCanvasRef.current) {
      const rect = spectrogramCanvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      onPlayheadSeek(percentage * duration);
    }
  };

  return (
    <div className="cyber-panel p-5 rounded-lg border border-cyan-500/10 bg-slate-950/40 relative overflow-hidden flex flex-col h-full">
      {/* Laser header scanner decoration */}
      <div className="holo-scanner"></div>

      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
            {mode === 'live' ? 'LIVE SPECTRAL ANALYZER' : 'DIAGNOSTIC ARCHIVE GRAPH'}
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/80 p-0.5 rounded border border-slate-800 z-10">
          <button 
            onClick={() => setActiveTab('spectrogram')}
            className={`px-3 py-1 font-mono text-[10px] tracking-wider rounded transition-all uppercase ${activeTab === 'spectrogram' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Spectrogram
          </button>
          
          {mode === 'live' && (
            <>
              <button 
                onClick={() => setActiveTab('circular')}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider rounded transition-all uppercase ${activeTab === 'circular' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Core Rad
              </button>
              <button 
                onClick={() => setActiveTab('waveform')}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider rounded transition-all uppercase ${activeTab === 'waveform' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Waveform
              </button>
              <button 
                onClick={() => setActiveTab('equalizer')}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider rounded transition-all uppercase ${activeTab === 'equalizer' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Equalizer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center bg-slate-950/80 rounded border border-slate-800/80 p-1 relative overflow-hidden min-h-[220px]">
        {/* Canvas overlays/screens */}
        
        {/* Spectrogram (Active by default, supports file + live) */}
        <canvas
          ref={spectrogramCanvasRef}
          onClick={handleCanvasClick}
          width={mode === 'live' ? 420 : 600}
          height={240}
          className={`w-full h-full max-h-[300px] object-stretch rounded cursor-pointer transition-all duration-300 ${activeTab === 'spectrogram' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
        />

        {/* Circular core visualizer */}
        {mode === 'live' && (
          <canvas
            ref={circularCanvasRef}
            width={400}
            height={240}
            className={`w-full h-full max-h-[300px] object-contain rounded transition-all duration-300 ${activeTab === 'circular' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          />
        )}

        {/* Oscilloscope Waveform */}
        {mode === 'live' && (
          <canvas
            ref={waveformCanvasRef}
            width={400}
            height={240}
            className={`w-full h-full max-h-[300px] object-stretch rounded transition-all duration-300 ${activeTab === 'waveform' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          />
        )}

        {/* Equalizer Frequency Bars */}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-950/90 z-20">
            <div className="relative mb-2">
              <Disc className="w-10 h-10 text-cyan-500/40 animate-spin" style={{ animationDuration: '3s' }} />
              <Activity className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
            </div>
            <p className="text-xs font-mono text-cyan-500/80 uppercase tracking-wider">
              System Idle. Awaiting Audio Source...
            </p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">
              Activate the microphone or upload an audio file to initialize spectral diagnostics.
            </p>
          </div>
        )}

        {mode === 'file' && !spectrogramData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-950/95 z-20">
            <ShieldAlert className="w-8 h-8 text-amber-500/60 mb-2 animate-bounce" />
            <p className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              No Spectrogram Data
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[250px]">
              Process an uploaded audio file or record from microhpone to output structural spectral envelopes.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${mode === 'live' && analyserNode ? 'bg-emerald-500 dot-pulse text-emerald-500' : 'bg-slate-700'}`}></span>
          <span>SYSTEM STATE: {mode === 'live' && analyserNode ? 'STREAMING' : mode === 'file' ? 'STATIC ARCHIVE' : 'STANDBY'}</span>
        </div>
        {mode === 'file' && duration > 0 && (
          <div className="text-slate-400">
            SCAN: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </div>
        )}
        {mode === 'live' && analyserNode && (
          <div className="text-cyan-400/80">
            FFT RESOLUTION: 2048 BINS
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
