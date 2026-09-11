/** Browser-safe multiple-comparison corrections used by research charts. */
export function holmBonferroni(
  pvalues: number[],
  alpha = 0.05,
): { rejectedIdx: number[]; adjustedP: number[] } {
  const count = pvalues.length;
  if (count === 0) return { rejectedIdx: [], adjustedP: [] };

  const pairs = pvalues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
  const adjustedP = new Array<number>(count).fill(0);
  const rejectedIdx: number[] = [];
  let cumulativeMax = 0;

  for (let rank = 0; rank < count; rank++) {
    const adjusted = pairs[rank].p * (count - rank);
    cumulativeMax = Math.max(cumulativeMax, adjusted);
    adjustedP[pairs[rank].index] = Math.min(cumulativeMax, 1);
    if (adjusted <= alpha) rejectedIdx.push(pairs[rank].index);
  }

  return { rejectedIdx, adjustedP };
}

export function bonferroni(
  pvalues: number[],
  alpha = 0.05,
): { rejectedIdx: number[]; adjustedP: number[] } {
  const count = Math.max(1, pvalues.length);
  const adjustedP = pvalues.map((p) => Math.min(1, p * count));
  const rejectedIdx = adjustedP.flatMap((p, index) => (p <= alpha ? [index] : []));
  return { rejectedIdx, adjustedP };
}
