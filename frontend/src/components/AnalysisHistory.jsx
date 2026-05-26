import React from 'react';
import { History, Trash2, ExternalLink, Download, FileText } from 'lucide-react';

const AnalysisHistory = ({ history = [], onLoadHistory = null, onDeleteHistory = null }) => {
  
  const exportReport = (item) => {
    // Generate diagnostic JSON file content
    const reportData = {
      report_id: `SPECTRA-RPT-${item.id.substring(0, 8).toUpperCase()}`,
      timestamp: new Date(item.timestamp).toISOString(),
      subject_source: item.filename,
      classification: item.prediction,
      confidence: `${item.confidence_percentage}%`,
      spectral_anomaly_score: item.spectral_anomaly_score,
      acoustic_telemetry: {
        rms_volume: item.metrics?.rms_energy,
        pitch_average_hz: item.metrics?.pitch_average_hz,
        pitch_variance: item.metrics?.pitch_variance,
        spectral_centroid_hz: item.metrics?.spectral_centroid_hz,
        zero_crossing_rate: item.metrics?.zero_crossing_rate,
        spectral_flatness: item.metrics?.spectral_flatness,
        high_frequency_ratio: item.metrics?.high_frequency_ratio,
        sample_rate_hz: item.metrics?.sample_rate,
        duration_seconds: item.metrics?.duration_seconds
      },
      diagnostic_flags: item.diagnostic_flags
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `spectra_diagnostic_report_${item.id.substring(0,6)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="cyber-panel p-5 rounded-lg border border-cyan-500/10 bg-slate-950/40 relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
            DIAGNOSTICS ARCHIVE & AUDIT LOG
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          RECORDS: {history.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] min-h-[140px] pr-1">
        {history.length > 0 ? (
          <div className="w-full border border-slate-850 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px] font-mono">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <th className="p-2 uppercase font-medium">Source / File</th>
                  <th className="p-2 uppercase font-medium">Classification</th>
                  <th className="p-2 uppercase font-medium">Conf</th>
                  <th className="p-2 uppercase font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {history.map((item) => {
                  const isAI = item.prediction?.toLowerCase().includes('ai');
                  const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors text-slate-300">
                      <td className="p-2 max-w-[130px] truncate">
                        <div className="font-bold truncate" title={item.filename}>{item.filename}</div>
                        <div className="text-[8px] text-slate-500">{dateStr}</div>
                      </td>
                      <td className="p-2">
                        <span className={`font-bold uppercase ${isAI ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isAI ? 'AI VOICE' : 'HUMAN'}
                        </span>
                      </td>
                      <td className="p-2 font-bold">{item.confidence_percentage}%</td>
                      <td className="p-2 text-right space-x-1.5 whitespace-nowrap">
                        {onLoadHistory && (
                          <button
                            onClick={() => onLoadHistory(item)}
                            title="Load Diagnostics"
                            className="p-1 hover:text-cyan-400 text-slate-400 hover:bg-slate-850 rounded transition-all inline-block"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => exportReport(item)}
                          title="Export Report"
                          className="p-1 hover:text-purple-400 text-slate-400 hover:bg-slate-850 rounded transition-all inline-block"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteHistory && (
                          <button
                            onClick={() => onDeleteHistory(item.id)}
                            title="Purge Record"
                            className="p-1 hover:text-red-500 text-slate-400 hover:bg-slate-850 rounded transition-all inline-block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 h-full bg-slate-950/20 border border-dashed border-slate-900 rounded">
            <FileText className="w-7 h-7 text-slate-650 mb-2" />
            <p className="text-xs text-slate-500 font-mono">
              Diagnostics database empty.
            </p>
            <p className="text-[8px] text-slate-600 mt-0.5 uppercase tracking-wider font-mono">
              Telemetry logs will register here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisHistory;
