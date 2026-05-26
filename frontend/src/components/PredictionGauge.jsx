import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Heart } from 'lucide-react';

const PredictionGauge = ({ result = null, isProcessing = false }) => {
  const prediction = result?.prediction ?? null;
  const confidence = result?.confidence_percentage ?? 0;
  const anomalyScore = result?.spectral_anomaly_score ?? 0;
  const probabilities = result?.probabilities ?? { human: 0.5, ai: 0.5 };

  // Calculate SVG circle properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  // Determine colors and icons based on prediction
  const isAI = prediction?.toLowerCase().includes('ai') ?? false;
  const hasPrediction = !!prediction;

  let accentColor = 'rgba(0, 242, 254, 0.8)'; // default cyan
  let shadowColor = 'rgba(0, 242, 254, 0.4)';
  let glowClass = 'text-glow-cyan';
  let borderGlowClass = 'border-slate-800';

  if (hasPrediction) {
    if (isAI) {
      accentColor = 'rgb(255, 0, 85)'; // Red-pink
      shadowColor = 'rgba(255, 0, 85, 0.4)';
      glowClass = 'text-glow-red text-red-500';
      borderGlowClass = 'border-glow-red border-red-500/30';
    } else {
      accentColor = 'rgb(0, 245, 212)'; // Mint Green
      shadowColor = 'rgba(0, 245, 212, 0.4)';
      glowClass = 'text-glow-green text-emerald-400';
      borderGlowClass = 'border-glow-green border-emerald-500/30';
    }
  }

  return (
    <div className={`cyber-panel p-5 rounded-lg border bg-slate-950/45 relative overflow-hidden flex flex-col h-full ${hasPrediction ? borderGlowClass : 'border-cyan-500/10'}`}>
      <div className="flex items-center gap-2 mb-4 z-10">
        <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
        <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
          AI CLASSIFICATION ANALYSIS
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] relative z-10">
        {isProcessing ? (
          /* Processing State */
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative w-24 h-24">
              {/* Spinning high-tech rings */}
              <div className="absolute inset-0 border-2 border-cyan-400/20 rounded-full"></div>
              <div className="absolute inset-0 border-t-2 border-b-2 border-cyan-400 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-l-2 border-r-2 border-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              <Cpu className="absolute inset-0 m-auto w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
                DECRYPTING AUDIO ENVELOPES...
              </p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase font-mono">
                Running Multi-Layer Perceptron Inference
              </p>
            </div>
          </div>
        ) : hasPrediction ? (
          /* Has Prediction Result */
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="stroke-slate-900 fill-transparent"
                  strokeWidth="8"
                />
                {/* Glowing gauge bar */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="fill-transparent transition-all duration-500 ease-out"
                  stroke={accentColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 6px ${shadowColor})`
                  }}
                />
              </svg>
              {/* Gauge text content */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  CONFIDENCE
                </span>
                <span className="text-2xl font-bold font-mono text-white text-shadow">
                  {confidence}%
                </span>
              </div>
            </div>

            {/* Prediction Output */}
            <div className="text-center w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 uppercase mb-1">
                {isAI ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span>SYNTHETIC DETECTED</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ORGANIC CONFIRMED</span>
                  </>
                )}
              </div>
              
              <h3 className={`text-xl font-bold font-mono uppercase tracking-wider ${glowClass}`}>
                {prediction}
              </h3>
            </div>

            {/* Split Metrics */}
            <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-500">HUMAN PROB:</span>
                <span className="text-emerald-400 font-bold text-right text-xs mt-0.5">
                  {(probabilities.human * 100).toFixed(2)}%
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-500">SYNTHETIC PROB:</span>
                <span className="text-red-400 font-bold text-right text-xs mt-0.5">
                  {(probabilities.ai * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Anomaly score indicator */}
            <div className="w-full border-t border-slate-900 pt-3">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500 uppercase">Spectral Anomaly Index</span>
                <span className={`font-bold ${anomalyScore > 0.4 ? 'text-red-400' : 'text-cyan-400'}`}>
                  {anomalyScore.toFixed(3)}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded overflow-hidden border border-slate-850">
                <div 
                  className={`h-full transition-all duration-300 ${anomalyScore > 0.4 ? 'bg-red-500 shadow-[0_0_8px_rgba(255,0,85,0.4)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.4)]'}`}
                  style={{ width: `${anomalyScore * 100}%` }}
                ></div>
              </div>
            </div>

          </div>
        ) : (
          /* Empty / Standby State */
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center mb-3 animate-pulse">
              <ShieldCheck className="w-7 h-7 text-cyan-500/30" />
            </div>
            <p className="text-xs font-mono text-cyan-500/60 uppercase tracking-widest">
              Awaiting Audio Ingest
            </p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Upload an audio sample or trigger the microphone streaming feed to run deep spectral analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionGauge;
