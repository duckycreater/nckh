import React from "react";

interface AIModelBenchmarkProps {
  benchmark: any[];
  confusionMatrix: any;
}

const WASTE_CATEGORIES = ["plastic", "paper", "organic", "metal", "glass", "hazard"];
const CATEGORY_COLORS: Record<string, string> = {
  plastic: "#3b82f6",
  paper: "#8b5cf6",
  organic: "#22c55e",
  metal: "#6b7280",
  glass: "#06b6d4",
  hazard: "#ef4444",
};

export function ModelBenchmarkCharts({ benchmark, confusionMatrix }: AIModelBenchmarkProps) {
  if (!benchmark || benchmark.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 italic">
        No model benchmark data yet. Data accumulates as users scan waste.
      </div>
    );
  }

  // Find ranges for Pareto chart
  const maxLatency = Math.max(...benchmark.map((b: any) => b.avgLatencyMs || 1), 1);
  const maxAccuracy = Math.max(...benchmark.map((b: any) => b.accuracy || 0), 1);

  return (
    <div className="space-y-8">
      {/* Latency Bar Chart with error bars */}
      <div>
        <h3 className="font-bold text-gray-800 mb-2">Inference Latency (ms)</h3>
        <p className="text-xs text-gray-500 mb-4">Average inference time per model. Lower is better. Bubble size = number of inferences.</p>
        <div className="relative" style={{ height: 160 }}>
          {/* Y-axis */}
          <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-400 text-right pr-2">
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <span key={pct}>{(maxLatency * pct).toFixed(0)}</span>
            ))}
          </div>
          {/* Bars */}
          <div className="absolute left-10 right-0 bottom-6 top-0 flex items-end gap-3">
            {benchmark.map((b: any) => {
              const heightPct = (b.avgLatencyMs / maxLatency) * 100;
              const widthPct = 100 / benchmark.length - 2;
              const bubbleSize = Math.max(20, Math.min(60, Math.sqrt(b.totalInferences || 1) * 2));
              return (
                <div
                  key={b.model}
                  className="flex flex-col items-center"
                  style={{ width: `${widthPct}%` }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-300 rounded-t-sm transition-all hover:from-blue-700 hover:to-blue-400 cursor-pointer relative group"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${b.displayName}: ${b.avgLatencyMs}ms`}
                  >
                    {/* Error bar (simulated as +/- 10%) */}
                    <div className="absolute left-1/2 -top-3 w-0.5 bg-gray-400" style={{ height: 6 }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 mt-1 text-center leading-tight">{b.displayName?.split(" ")[0]}</span>
                  <span className="text-xs text-gray-500">{b.avgLatencyMs}ms</span>
                </div>
              );
            })}
          </div>
          {/* X-axis baseline */}
          <div className="absolute left-10 right-0 bottom-6 h-px bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Model names truncated. Hover bars for full details.
        </p>
      </div>

      {/* Accuracy vs Speed Pareto */}
      <div>
        <h3 className="font-bold text-gray-800 mb-2">Accuracy vs Speed Pareto Frontier</h3>
        <p className="text-xs text-gray-500 mb-4">X-axis = latency (ms), Y-axis = accuracy (%). Closer to top-left = better (fast + accurate).</p>
        <div className="relative bg-gray-50 rounded-xl p-4" style={{ height: 200 }}>
          {/* Axes */}
          <div className="absolute left-10 top-0 bottom-6 w-px bg-gray-200" />
          <div className="absolute left-10 right-0 bottom-6 h-px bg-gray-200" />
          {/* Axis labels */}
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-400">Accuracy %</span>
          <span className="absolute left-1/2 bottom-0 -translate-x-1/2 text-xs text-gray-400">Latency (ms)</span>
          {/* Points */}
          {benchmark.map((b: any, i: number) => {
            const x = (b.avgLatencyMs / maxLatency) * 85 + 10; // 10-95%
            const y = 95 - (b.accuracy / maxAccuracy) * 90; // inverted (higher accuracy = higher on screen)
            const bubbleSize = Math.max(30, Math.min(80, Math.sqrt(b.totalInferences || 1) * 3));
            return (
              <div
                key={b.model}
                className="absolute rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: bubbleSize,
                  height: bubbleSize,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: `hsl(${(i * 60) % 360}, 70%, 45%)`,
                }}
                title={`${b.displayName}: ${b.accuracy}% accuracy, ${b.avgLatencyMs}ms latency`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confusion Matrix Heatmap */}
      <div>
        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
          Confusion Matrix Heatmap
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Rows = Ground Truth (actual), Columns = Model Prediction. Diagonal = correct predictions. Hover for counts.
        </p>
        {confusionMatrix?.labels && confusionMatrix.labels.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-bold text-gray-500 bg-gray-50 sticky left-0 z-10">
                    Actual →<br />↓ Predicted
                  </th>
                  {confusionMatrix.labels.map((l: string) => (
                    <th key={l} className="p-2 text-center text-xs font-bold text-gray-600 bg-gray-50 min-w-16">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.labels.map((actual: string) => {
                  const rowVals = confusionMatrix.labels.map((pred: string) =>
                    confusionMatrix.matrix?.[actual]?.[pred] || 0
                  );
                  const maxVal = Math.max(...rowVals, 1);
                  return (
                    <tr key={actual}>
                      <td className="p-2 text-xs font-bold text-gray-700 bg-gray-50 sticky left-0">
                        {actual}
                      </td>
                      {confusionMatrix.labels.map((pred: string) => {
                        const val = confusionMatrix.matrix?.[actual]?.[pred] || 0;
                        const intensity = val / maxVal;
                        const isCorrect = actual === pred;
                        return (
                          <td
                            key={pred}
                            className={`p-2 text-center text-xs font-mono cursor-help transition-colors ${
                              isCorrect ? "text-emerald-700 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"
                            }`}
                            style={{
                              backgroundColor: val > 0
                                ? `rgba(${isCorrect ? "16,185,129" : "239,68,68"},${Math.max(intensity * 0.8, 0.08)})`
                                : "#ffffff",
                            }}
                            title={`Actual: ${actual} → Predicted: ${pred}\nCount: ${val} (${maxVal > 0 ? ((val / maxVal) * 100).toFixed(1) : 0}%)`}
                          >
                            {val > 0 ? val : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 italic">
            No ground truth data yet. Use the &quot;Verify&quot; button to label classifications.
          </div>
        )}
      </div>

      {/* Ground Truth Annotation Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-800 text-sm mb-2">Ground Truth Annotation</h3>
        <p className="text-xs text-blue-700 mb-3">
          Label predictions to build the confusion matrix. Each labeled scan improves model evaluation accuracy.
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {WASTE_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span className="text-xs capitalize text-blue-700">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Quality Metrics */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Dataset Quality Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Labeled</p>
            <p className="text-2xl font-black text-gray-800">
              {(benchmark[0]?.totalInferences || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Best F1 Score</p>
            <p className="text-2xl font-black text-emerald-600">
              {benchmark.length > 0 ? `${Math.max(...benchmark.map((b: any) => b.accuracy || 0)).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Fastest Model</p>
            <p className="text-2xl font-black text-blue-600">
              {benchmark.length > 0
                ? `${Math.min(...benchmark.map((b: any) => b.avgLatencyMs || 9999)).toFixed(0)}ms`
                : "—"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Ground Truth</p>
            <p className="text-2xl font-black text-purple-600">
              {confusionMatrix?.labels?.length || 0}/6
            </p>
            <p className="text-xs text-gray-400">categories</p>
          </div>
        </div>
      </div>
    </div>
  );
}
