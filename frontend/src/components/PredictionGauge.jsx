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

  let accentColor = '#64748b'; // slate grey standby
  let textClass = 'text-[#0f172a]';
  let indicatorGlow = 'rgba(100, 116, 139, 0.03)';

  if (hasPrediction) {
    if (isAI) {
      accentColor = '#e11d48'; // Cyber Red
      textClass = 'text-[#e11d48] text-glow-red font-bold';
      indicatorGlow = 'rgba(225, 29, 72, 0.06)';
    } else {
      accentColor = '#0f766e'; // Teal/emerald organic accent
      textClass = 'text-[#0f766e] font-bold';
      indicatorGlow = 'rgba(15, 118, 110, 0.05)';
    }
  }

  return (
    <div className="editorial-panel p-6 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-5">
        <Cpu className="w-4 h-4 text-slate-500 animate-pulse" />
        <h2 className="text-sm font-mono font-bold text-[#0f172a] uppercase tracking-widest">
          ml.model.classification
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
        {isProcessing ? (
          /* Processing State */
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-t border-b border-[#e11d48] rounded-full animate-spin"></div>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest animate-pulse">
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
                  className="stroke-slate-100 fill-transparent"
                  strokeWidth="2.5"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="fill-transparent transition-all duration-700 ease-out"
                  stroke={accentColor}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              {/* Circular gauge text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  accuracy
                </span>
                <span className="text-2xl font-bold font-mono text-[#0f172a]">
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
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                diagnosis.verdict
              </span>
              <h3 className={`text-2xl font-serif italic font-bold leading-tight ${textClass}`}>
                {prediction}
              </h3>
            </div>

            {/* Split probabilities */}
            <div className="w-full grid grid-cols-2 gap-3 text-xs font-mono border-t border-slate-100 pt-3.5">
              <div className="flex flex-col justify-between">
                <span className="text-slate-500">human.split</span>
                <span className="text-[#0f172a] font-bold mt-1 text-sm">
                  {(probabilities.human * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col justify-between border-l border-slate-100 pl-3">
                <span className="text-slate-500">synthetic.split</span>
                <span className="text-[#0f172a] font-bold mt-1 text-sm">
                  {(probabilities.ai * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Anomaly score indicator */}
            <div className="w-full">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-500 uppercase">anomaly.index</span>
                <span className="text-slate-700 font-mono font-bold">
                  {anomalyScore.toFixed(3)}
                </span>
              </div>
              <div className="h-[2px] w-full bg-slate-100 rounded overflow-hidden">
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
            <div className="w-12 h-12 rounded-full border border-dashed border-slate-200 flex items-center justify-center mb-3 animate-pulse">
              <span className="text-slate-400 text-xs font-mono">io</span>
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">
              awaiting.signal.ingest
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] uppercase font-mono">
              activate scan core to invoke neural processing
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionGauge;
