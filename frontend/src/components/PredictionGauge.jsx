import React from 'react';
import { Cpu } from 'lucide-react';

const PredictionGauge = ({ result = null, isProcessing = false }) => {
  const prediction = result?.prediction ?? null;
  const confidence = result?.confidence_percentage ?? 0;
  const anomalyScore = result?.spectral_anomaly_score ?? 0;
  const probabilities = result?.probabilities ?? { human: 0.5, ai: 0.5 };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  const isAI = prediction?.toLowerCase().includes('ai') ?? false;
  const hasPrediction = !!prediction;

  let accentColor = '#d3e9e8'; // pale teal
  let textClass = 'text-white';
  let indicatorGlow = 'rgba(211, 233, 232, 0.05)';

  if (hasPrediction) {
    if (isAI) {
      accentColor = '#ff5d3b'; // Orange Coral
      textClass = 'text-[#ff5d3b] text-glow-orange';
      indicatorGlow = 'rgba(255, 93, 59, 0.12)';
    } else {
      accentColor = '#d3e9e8'; // Pale slate teal
      textClass = 'text-[#d3e9e8] text-glow-white';
      indicatorGlow = 'rgba(211, 233, 232, 0.1)';
    }
  }

  return (
    <div className="editorial-panel p-6 rounded border border-white/5 bg-black/25 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <Cpu className="w-4 h-4 text-white/60 animate-pulse" />
        <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">
          ml.model.classification
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
        {isProcessing ? (
          /* Processing State */
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-t border-b border-white rounded-full animate-spin"></div>
            </div>
            <div>
              <p className="text-[10px] font-mono text-white/60 uppercase tracking-widest animate-pulse">
                decryption.matrix.running
              </p>
            </div>
          </div>
        ) : hasPrediction ? (
          /* Has Prediction Result */
          <div className="w-full flex flex-col items-center space-y-5">
            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-white/5 fill-transparent"
                  strokeWidth="2"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="fill-transparent transition-all duration-700 ease-out"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              {/* Circular gauge text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">
                  accuracy
                </span>
                <span className="text-xl font-bold font-mono text-white">
                  {confidence.toFixed(1)}%
                </span>
              </div>
              {/* Backdrop glow ring */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none transition-all duration-700"
                style={{ backgroundColor: indicatorGlow, filter: 'blur(30px)', opacity: 0.3 }}
              ></div>
            </div>

            {/* Verdict Callout */}
            <div className="text-center w-full">
              <span className="text-[8px] font-mono text-white/35 uppercase tracking-widest block mb-1">
                diagnosis.verdict
              </span>
              <h3 className={`text-xl font-serif italic font-bold leading-tight ${textClass}`}>
                {prediction}
              </h3>
            </div>

            {/* Split probabilities */}
            <div className="w-full grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-white/5 pt-3.5">
              <div className="flex flex-col justify-between">
                <span className="text-white/35">human.split</span>
                <span className="text-white font-bold mt-1">
                  {(probabilities.human * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col justify-between border-l border-white/5 pl-3">
                <span className="text-white/35">synthetic.split</span>
                <span className="text-white font-bold mt-1">
                  {(probabilities.ai * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Anomaly score indicator */}
            <div className="w-full">
              <div className="flex justify-between text-[9px] font-mono mb-1.5">
                <span className="text-white/35 uppercase">anomaly.index</span>
                <span className="text-white/70 font-mono">
                  {anomalyScore.toFixed(3)}
                </span>
              </div>
              <div className="h-[2px] w-full bg-white/10 rounded overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ width: `${anomalyScore * 100}%`, backgroundColor: accentColor }}
                ></div>
              </div>
            </div>

          </div>
        ) : (
          /* Standby State */
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full border border-dashed border-white/15 flex items-center justify-center mb-3 animate-pulse">
              <span className="text-white/20 text-xs font-mono">io</span>
            </div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              awaiting.signal.ingest
            </p>
            <p className="text-[9px] text-white/20 mt-1.5 max-w-[180px] uppercase font-mono">
              activate scan core to invoke neural processing
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionGauge;
