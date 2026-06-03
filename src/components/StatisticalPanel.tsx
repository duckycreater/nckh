import React from "react";

interface StatisticalPanelProps {
  experimentResults: any;
  experimentName: string;
}

export function StatisticalPanel({ experimentResults, experimentName }: StatisticalPanelProps) {
  if (!experimentResults) {
    return (
      <div className="text-center py-8 text-gray-400 italic">
        No experiment data available yet.
      </div>
    );
  }

  const { pairwiseComparisons, anova, groupCounts, retentionRate, analysis } = experimentResults;
  const nComparisons = pairwiseComparisons?.length || 0;

  return (
    <div className="space-y-8">
      {/* Hypotheses Header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-bold text-emerald-800 text-sm mb-2">Research Hypotheses - {experimentName}</h3>
        <div className="grid md:grid-cols-2 gap-2 text-xs text-emerald-700">
          <p><span className="font-bold">H1:</span> Adaptive rewards increase 7-day retention by &gt;20% (vs control)</p>
          <p><span className="font-bold">H2:</span> Mentor chatbot mode produces higher engagement than Playful</p>
          <p><span className="font-bold">H3:</span> Novelty decay detection reduces dropout by &gt;30%</p>
          <p><span className="font-bold">H4:</span> Social interactions increase retention by &gt;15%</p>
        </div>
      </div>

      {/* Power Analysis Banner */}
      {analysis?.minimumDetectableEffect && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-blue-800 text-sm">Power Analysis</h4>
              <p className="text-xs text-blue-700 mt-1">
                Minimum detectable effect at 80% power: <span className="font-bold">{analysis.minimumDetectableEffect}</span>
                {analysis.powerAnalysis?.requiredSampleSize && (
                  <> (requires n = {analysis.powerAnalysis.requiredSampleSize} per group)</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* One-Way ANOVA */}
      {anova && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">One-Way ANOVA</h3>
          <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-2 text-left font-bold text-gray-600">Source</th>
                  <th className="p-2 text-right font-bold text-gray-600">SS</th>
                  <th className="p-2 text-right font-bold text-gray-600">df</th>
                  <th className="p-2 text-right font-bold text-gray-600">MS</th>
                  <th className="p-2 text-right font-bold text-gray-600">F</th>
                  <th className="p-2 text-right font-bold text-gray-600">p-value</th>
                  <th className="p-2 text-right font-bold text-gray-600">η²</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-2 font-medium">Between Groups</td>
                  <td className="p-2 text-right">{anova.dfBetween > 0 ? "—" : "—"}</td>
                  <td className="p-2 text-right">{anova.dfBetween}</td>
                  <td className="p-2 text-right">—</td>
                  <td className="p-2 text-right font-bold">{anova.F}</td>
                  <td className={`p-2 text-right font-bold ${anova.pValue < 0.05 ? "text-emerald-600" : "text-gray-600"}`}>
                    {anova.pValue < 0.001 ? "< 0.001" : anova.pValue.toFixed(4)}
                  </td>
                  <td className="p-2 text-right">{anova.etaSquared}</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium text-gray-500">Within Groups</td>
                  <td className="p-2 text-right text-gray-500">—</td>
                  <td className="p-2 text-right">{anova.dfWithin}</td>
                  <td className="p-2 text-right">—</td>
                  <td className="p-2 text-right">—</td>
                  <td className="p-2 text-right">—</td>
                  <td className="p-2 text-right">—</td>
                </tr>
              </tbody>
            </table>
            {anova.pValue < 0.05 && (
              <p className="text-xs text-emerald-600 font-bold mt-2">
                SIGNIFICANT: There are statistically significant differences between group means (p &lt; 0.05).
                Effect size (η²): {anova.etaSquared < 0.01 ? "negligible" : anova.etaSquared < 0.06 ? "small" : anova.etaSquared < 0.14 ? "medium" : "large"}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pairwise Comparisons */}
      {pairwiseComparisons && pairwiseComparisons.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">
            Pairwise Comparisons (Welch&apos;s t-test, Bonferroni-corrected)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left font-bold text-gray-600">Comparison</th>
                  <th className="p-3 text-right font-bold text-gray-600">Mean A</th>
                  <th className="p-3 text-right font-bold text-gray-600">Mean B</th>
                  <th className="p-3 text-right font-bold text-gray-600">t</th>
                  <th className="p-3 text-right font-bold text-gray-600">df</th>
                  <th className="p-3 text-right font-bold text-gray-600">p-value</th>
                  <th className="p-3 text-right font-bold text-gray-600">Cohen&apos;s d</th>
                  <th className="p-3 text-right font-bold text-gray-600">Effect</th>
                  <th className="p-3 text-right font-bold text-gray-600">Power</th>
                  <th className="p-3 text-right font-bold text-gray-600">95% CI</th>
                  <th className="p-3 text-center font-bold text-gray-600">Significant</th>
                </tr>
              </thead>
              <tbody>
                {pairwiseComparisons.map((c: any, i: number) => (
                  <tr key={i} className={`border-b border-gray-50 ${c.significant ? "bg-emerald-50/30" : ""}`}>
                    <td className="p-3 font-medium text-sm">{c.comparison}</td>
                    <td className="p-3 text-right font-mono">{c.meanA?.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono">{c.meanB?.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono">{c.tStatistic?.toFixed(3)}</td>
                    <td className="p-3 text-right font-mono">{c.degreesOfFreedom}</td>
                    <td className={`p-3 text-right font-bold ${
                      c.pValue < 0.001 ? "text-emerald-700" :
                      c.pValue < 0.01 ? "text-emerald-600" :
                      c.pValue < 0.05 ? "text-amber-600" : "text-gray-500"
                    }`}>
                      {c.pValue < 0.001 ? "< 0.001" : c.pValue.toFixed(4)}
                      {c.bonferroniCorrected && <span className="block text-xs text-gray-400 font-normal">(Bonf.)</span>}
                    </td>
                    <td className={`p-3 text-right font-mono ${
                      c.cohensD < 0.2 ? "text-gray-400" :
                      c.cohensD < 0.5 ? "text-amber-600" :
                      c.cohensD < 0.8 ? "text-orange-600" : "text-red-600"
                    }`}>
                      {c.cohensD?.toFixed(3)}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.effectSizeLabel === "large" ? "bg-red-100 text-red-700" :
                        c.effectSizeLabel === "medium" ? "bg-orange-100 text-orange-700" :
                        c.effectSizeLabel === "small" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {c.effectSizeLabel}
                      </span>
                    </td>
                    <td className={`p-3 text-right ${
                      (c.power || 0) >= 0.8 ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      {(c.power || 0).toFixed(3)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      [{c.ciLower?.toFixed(3)}, {c.ciUpper?.toFixed(3)}]
                    </td>
                    <td className="p-3 text-center">
                      {c.significant ? (
                        <span className="text-emerald-600 font-bold text-lg">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 text-lg">&#10005;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Normality indicators */}
          {pairwiseComparisons.some((c: any) => !c.normalA || !c.normalB) && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-bold mb-1">Warning: Normality Assumption</p>
              <p>Some groups may not follow a normal distribution (Shapiro-Wilk p &lt; 0.05). Consider using Mann-Whitney U test as a non-parametric alternative.</p>
            </div>
          )}
        </div>
      )}

      {/* Retention Rates with Wilson CI */}
      {retentionRate && retentionRate.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Retention Rates by Group (with 95% Wilson CI)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left font-bold text-gray-600">Group</th>
                  <th className="p-3 text-right font-bold text-gray-600">n</th>
                  <th className="p-3 text-right font-bold text-gray-600">Retention Rate</th>
                  <th className="p-3 text-center font-bold text-gray-600">95% CI</th>
                </tr>
              </thead>
              <tbody>
                {retentionRate.map((r: any, i: number) => {
                  const rate = r.rate || 0;
                  const n = r.sampleSize || 1;
                  const se = Math.sqrt(rate * (1 - rate) / n);
                  const ciLower = Math.max(0, rate - 1.96 * se);
                  const ciUpper = Math.min(1, rate + 1.96 * se);
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="p-3 font-medium capitalize">{r.group}</td>
                      <td className="p-3 text-right font-mono">{n}</td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${
                          rate >= 0.7 ? "text-emerald-600" : rate >= 0.4 ? "text-amber-600" : "text-red-500"
                        }`}>
                          {(rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-xs">
                        [{(ciLower * 100).toFixed(1)}%, {(ciUpper * 100).toFixed(1)}%]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
