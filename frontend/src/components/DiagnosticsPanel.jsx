import React from 'react';
import { Cpu, Zap, Radio, Volume2, TrendingUp, AlertTriangle } from 'lucide-react';

const DiagnosticsPanel = ({ metrics = null, flags = null }) => {
  // Safe extraction of metrics
  const rms = metrics?.rms_energy ?? 0;
  const pitch = metrics?.pitch_average_hz ?? 0;
  const pitchVar = metrics?.pitch_variance ?? 0;
  const centroid = metrics?.spectral_centroid_hz ?? 0;
  const zcr = metrics?.zero_crossing_rate ?? 0;
  const flatness = metrics?.spectral_flatness ?? 0;
  const highFreqRatio = metrics?.high_frequency_ratio ?? 0;
  const duration = metrics?.duration_seconds ?? 0;
  const sampleRate = metrics?.sample_rate ?? 16000;

  // Normalized percentages for custom UI progress bars
  const volumePercent = Math.min(100, rms * 400); // Scale for visual visibility
  const pitchPercent = pitch > 0 ? Math.min(100, ((pitch - 60) / 300) * 100) : 0;
  const zcrPercent = Math.min(100, zcr * 300);
  const centroidPercent = Math.min(100, (centroid / 5000) * 100);
  const flatnessPercent = Math.min(100, (flatness / 0.15) * 100);
  const highFreqPercent = Math.min(100, highFreqRatio * 100);

  return (
    <div className="cyber-panel p-5 rounded-lg border border-cyan-500/10 bg-slate-950/40 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-5 h-5 text-cyan-400" />
        <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
          SIGNAL DIAGNOSTICS & TELEMETRY
        </h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Gauges */}
        <div className="space-y-3.5">
          {/* Volume / RMS */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> RMS VOLUME
              </span>
              <span className="text-cyan-400 font-bold">{(rms * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-cyan-400 transition-all duration-200 shadow-[0_0_8px_#00f2fe]"
                style={{ width: `${volumePercent}%` }}
              ></div>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> PITCH FREQUENCY
              </span>
              <span className="text-yellow-400 font-bold">
                {pitch > 0 ? `${pitch.toFixed(1)} Hz` : 'UNVOICED'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-yellow-400 transition-all duration-200 shadow-[0_0_8px_#ffb703]"
                style={{ width: `${pitchPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Zero Crossing Rate */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400" /> ZERO CROSSING RATE
              </span>
              <span className="text-emerald-400 font-bold">{zcr.toFixed(4)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-emerald-400 transition-all duration-200 shadow-[0_0_8px_#00f5d4]"
                style={{ width: `${zcrPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Spectral Centroid */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> SPECTRAL CENTROID
              </span>
              <span className="text-purple-400 font-bold">{Math.round(centroid)} Hz</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-purple-500 transition-all duration-200 shadow-[0_0_8px_#9d4edd]"
                style={{ width: `${centroidPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical/Metadata & Flags */}
        <div className="flex flex-col justify-between space-y-3">
          {/* Metadata Block */}
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-[11px] font-mono space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">SAMPLE RATE:</span>
              <span className="text-slate-300">{sampleRate} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SAMPLE SIZE:</span>
              <span className="text-slate-300">32-BIT FLOAT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DURATION:</span>
              <span className="text-slate-300">{duration.toFixed(2)} SECONDS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PITCH VARIATION:</span>
              <span className="text-yellow-500">{pitchVar.toFixed(2)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SPECTRAL FLATNESS:</span>
              <span className="text-purple-400">{flatness.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">HIGH FREQ RATIO (&gt;4K):</span>
              <span className="text-pink-400">{(highFreqRatio * 100).toFixed(2)}%</span>
            </div>
          </div>

          {/* Diagnostic Indicators */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              AI SPECTRUM ANOMALY DETECTION FLAGS
            </h3>
            
            {flags ? (
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                {/* Flag 1: Flat pitch */}
                <div className={`p-1.5 rounded border ${flags.robotic_flat_pitch ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${flags.robotic_flat_pitch ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>FLAT PITCH (ROBOTIC)</span>
                  </div>
                </div>

                {/* Flag 2: Pitch jitter */}
                <div className={`p-1.5 rounded border ${flags.pitch_jitter_anomaly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${flags.pitch_jitter_anomaly ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>PITCH JITTER ERROR</span>
                  </div>
                </div>

                {/* Flag 3: High Flatness */}
                <div className={`p-1.5 rounded border ${flags.high_freq_flatness ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${flags.high_freq_flatness ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>SPECTRAL FLARE (BUZZ)</span>
                  </div>
                </div>

                {/* Flag 4: Oversmoothed envelope */}
                <div className={`p-1.5 rounded border ${flags.oversmoothed_mel_envelope ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${flags.oversmoothed_mel_envelope ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>SMOOTH MEL (TTS)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic bg-slate-900/40 p-2 rounded border border-slate-850 text-center font-mono">
                No active spectral flags. Awaiting telemetry...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
