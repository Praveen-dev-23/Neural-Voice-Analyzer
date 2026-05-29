import React from 'react';
import { Cpu, Volume2, Zap, Radio, TrendingUp } from 'lucide-react';

const DiagnosticsPanel = ({ metrics = null, flags = null }) => {
  const rms = metrics?.rms_energy ?? 0;
  const pitch = metrics?.pitch_average_hz ?? 0;
  const pitchVar = metrics?.pitch_variance ?? 0;
  const centroid = metrics?.spectral_centroid_hz ?? 0;
  const zcr = metrics?.zero_crossing_rate ?? 0;
  const flatness = metrics?.spectral_flatness ?? 0;
  const highFreqRatio = metrics?.high_frequency_ratio ?? 0;
  const duration = metrics?.duration_seconds ?? 0;
  const sampleRate = metrics?.sample_rate ?? 16000;

  const volumePercent = Math.min(100, rms * 400);
  const pitchPercent = pitch > 0 ? Math.min(100, ((pitch - 60) / 300) * 100) : 0;
  const zcrPercent = Math.min(100, zcr * 300);
  const centroidPercent = Math.min(100, (centroid / 5000) * 100);

  return (
    <div className="editorial-panel p-6 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-5">
        <Cpu className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-mono font-bold text-[#0f172a] uppercase tracking-widest">
          telemetry.signal.readouts
        </h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Fine-line Telemetry Bars */}
        <div className="space-y-4">
          {/* RMS Volume */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> volume.rms
              </span>
              <span className="text-[#0f172a] font-bold font-mono">{(rms * 100).toFixed(1)}%</span>
            </div>
            <div className="h-[2px] w-full bg-slate-100 rounded overflow-hidden">
              <div 
                className="h-full bg-[#e11d48] transition-all duration-200"
                style={{ width: `${volumePercent}%` }}
              ></div>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> pitch.f0
              </span>
              <span className="text-[#0f172a] font-bold font-mono">
                {pitch > 0 ? `${pitch.toFixed(0)} hz` : 'unvoiced'}
              </span>
            </div>
            <div className="h-[2px] w-full bg-slate-100 rounded overflow-hidden">
              <div 
                className="h-full bg-[#e11d48] transition-all duration-200"
                style={{ width: `${pitchPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Zero Crossing Rate */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> crossings.zcr
              </span>
              <span className="text-[#0f172a] font-bold font-mono">{zcr.toFixed(4)}</span>
            </div>
            <div className="h-[2px] w-full bg-slate-100 rounded overflow-hidden">
              <div 
                className="h-full bg-[#e11d48] transition-all duration-200"
                style={{ width: `${zcrPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Spectral Centroid */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> centroid.brightness
              </span>
              <span className="text-[#0f172a] font-bold font-mono">{Math.round(centroid)} hz</span>
            </div>
            <div className="h-[2px] w-full bg-slate-100 rounded overflow-hidden">
              <div 
                className="h-full bg-[#e11d48] transition-all duration-200"
                style={{ width: `${centroidPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right: Technical Log columns */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="bg-slate-50/50 p-3.5 rounded border border-slate-100 text-xs font-mono space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">samplerate</span>
              <span className="text-slate-800 font-semibold">{sampleRate} hz</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">track.length</span>
              <span className="text-slate-800 font-semibold">{duration.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">pitch.deviation</span>
              <span className="text-slate-800 font-semibold">{pitchVar.toFixed(1)} hz</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">flatness.index</span>
              <span className="text-slate-800 font-semibold">{flatness.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">highfreq.ratio</span>
              <span className="text-slate-800 font-semibold">{(highFreqRatio * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Flags Bulletin */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              anomaly.status.bulletin
            </h3>
            
            {flags ? (
              <div className="space-y-1 font-mono text-xs">
                {flags.robotic_flat_pitch && (
                  <div className="text-[#e11d48]">• flat pitch envelope detected (robotic)</div>
                )}
                {flags.pitch_jitter_anomaly && (
                  <div className="text-[#e11d48]">• pitch jitter anomaly active (glitch)</div>
                )}
                {flags.high_freq_flatness && (
                  <div className="text-[#e11d48]">• spectral flare active (vocoder buzz)</div>
                )}
                {flags.oversmoothed_mel_envelope && (
                  <div className="text-[#e11d48]">• oversmoothed mel envelope (synthetic)</div>
                )}
                {flags.anomalous_centroid && (
                  <div className="text-slate-500">• anomalous centroid center</div>
                )}
                {!flags.robotic_flat_pitch && !flags.pitch_jitter_anomaly && !flags.high_freq_flatness && !flags.oversmoothed_mel_envelope && (
                  <div className="text-emerald-600">• all spectral features nominal (organic)</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100 text-center font-mono">
                awaiting active signal stream...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
