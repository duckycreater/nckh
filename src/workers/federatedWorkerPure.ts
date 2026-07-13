/**
 * Pure helpers for the federated worker — extracted so we can unit-test
 * them without spinning up a Worker context.
 */

/* Box-Muller for Gaussian noise — used by the DP layer. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Clip a vector by L2 norm and add Gaussian noise.
 *
 *   scale = min(1, clipNorm / ||grad||_2)
 *   result_i = scale * grad_i + N(0, σ)
 */
export function clipAndNoise(grad: number[], clipNorm: number, sigma: number): number[] {
  let norm = 0;
  for (const g of grad) norm += g * g;
  norm = Math.sqrt(norm);
  const scale = norm > clipNorm ? clipNorm / norm : 1;
  return grad.map((g) => scale * g + gaussian() * sigma);
}