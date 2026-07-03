/**
 * socialDiffusion.ts - Peer-network graph and influence modelling
 *
 * The "social opportunity" cell of COM-B (Michie 2011) drives long-run
 * adoption. We expose:
 *   - Build undirected peer graph from friendship-list events.
 *   - Compute centrality, eigenvector, and clique membership.
 *   - Recommend "social nudge" interventions via homophily (sorted peers).
 *   - Estimate the population-level diffusion rate over T weeks.
 *
 * Reference:
 *   Centola, D. (2010). The spread of behavior in an online social network.
 *   Valente, T. W. (1995). Network models of the diffusion of innovations.
 *   Burt, R. S. (1992). Structural holes. (betweenness centrality)
 */

export const SOCIAL_DIFFUSION_VERSION = "1.0.0";

export interface PeerEdge {
  source: string;
  target: string;
  /** Optional weight from friendship-intensity event. */
  weight?: number;
  /** Category in which they co-sort (e.g., "plastic"). */
  category?: string;
  /** When the edge was last confirmed active. */
  lastSeenAt: number;
}

export interface PeerNode {
  userId: string;
  schoolId: string;
  cohort: "C" | "E1" | "E2" | "E3" | "E4";
  /** Total positive social actions; contributes to eigenvector. */
  endorsementCount: number;
  /** Average sort accuracy across last 30 days (0..1). */
  averageAccuracy: number;
}

/** Adjacency matrix as Map<userId, Map<userId, weight>>. */
export class PeerGraph {
  private nodes = new Map<string, PeerNode>();
  private edges = new Map<string, Map<string, number>>();

  addNode(node: PeerNode): void {
    this.nodes.set(node.userId, node);
  }

  addEdge(edge: PeerEdge): void {
    let src = this.edges.get(edge.source);
    if (!src) {
      src = new Map<string, number>();
      this.edges.set(edge.source, src);
    }
    src.set(edge.target, edge.weight ?? 1.0);
  }

  getNode(userId: string): PeerNode | undefined {
    return this.nodes.get(userId);
  }

  neighbours(userId: string): { userId: string; weight: number }[] {
    const m = this.edges.get(userId);
    if (!m) return [];
    return Array.from(m.entries()).map(([userId, weight]) => ({ userId, weight }));
  }

  /**
   * Compute degree centrality for every node.
   * Returns top-K most central nodes for use in social-diffusion targeting.
   */
  degreeCentrality(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [userId, edges] of this.edges.entries()) {
      out.set(userId, edges.size);
    }
    return out;
  }

  /**
   * Compute eigenvector centrality using power iteration.
   * Bounded iteration count to avoid pathological convergence.
   */
  eigenvectorCentrality(iterations = 64, tol = 1e-9): Map<string, number> {
    const userIds = Array.from(this.nodes.keys());
    const idx = new Map<string, number>();
    userIds.forEach((u, i) => idx.set(u, i));
    const n = userIds.length;
    let v = new Array<number>(n).fill(1 / Math.sqrt(n));
    let result = new Array<number>(n).fill(0);
    for (let iter = 0; iter < iterations; iter++) {
      // result[i] = sum_j weight(i,j) * v[j]
      for (let i = 0; i < n; i++) {
        const userId = userIds[i];
        const out = this.edges.get(userId);
        let s = 0;
        if (out) {
          for (const [target, w] of out.entries()) {
            const j = idx.get(target);
            if (j !== undefined) s += w * v[j];
          }
        }
        result[i] = s;
      }
      // normalise
      const norm = Math.sqrt(result.reduce((a, b) => a + b * b, 0)) || 1;
      for (let i = 0; i < n; i++) result[i] /= norm;
      // Check convergence
      const diff = result.reduce((acc, r, i) => acc + (r - v[i]) ** 2, 0);
      if (diff < tol * tol) break;
      [v, result] = [result, v];
    }
    const out = new Map<string, number>();
    userIds.forEach((u, i) => out.set(u, v[i]));
    return out;
  }

  /**
   * Find clusters (school×cohort) using a simple union-find.
   * Returns one component label per node.
   */
  connectedComponents(): Map<string, number> {
    const parent = new Map<string, string>();
    const find = (u: string): string => {
      while (parent.get(u) !== u) {
        const p = parent.get(u);
        if (!p) break;
        parent.set(u, parent.get(p) ?? u);
        u = parent.get(u) ?? u;
      }
      return u;
    };
    const union = (u: string, v: string) => {
      const a = find(u);
      const b = find(v);
      if (a !== b) parent.set(a, b);
    };
    for (const id of this.nodes.keys()) parent.set(id, id);
    for (const [u, nbrs] of this.edges.entries()) {
      for (const v of nbrs.keys()) {
        union(u, v);
      }
    }
    let next = 0;
    const clusterMap = new Map<string, number>();
    const out = new Map<string, number>();
    for (const u of this.nodes.keys()) {
      const root = find(u);
      let label = clusterMap.get(root);
      if (label === undefined) {
        label = next++;
        clusterMap.set(root, label);
      }
      out.set(u, label);
    }
    return out;
  }

  /**
   * Recommend social nudges: find peers in the same cluster whose accuracy
   * is greater than `userId`'s. Sort by eigenvector centrality descending.
   */
  recommendPeersToShow(
    userId: string,
    options?: { limit?: number }
  ): PeerNode[] {
    const limit = options?.limit ?? 5;
    const central = this.eigenvectorCentrality();
    const user = this.getNode(userId);
    if (!user) return [];
    const components = this.connectedComponents();
    const userCluster = components.get(userId);
    const nbrs = this.neighbours(userId);
    const candidates: { node: PeerNode; centrality: number }[] = [];
    for (const n of nbrs) {
      const node = this.getNode(n.userId);
      if (!node) continue;
      if (components.get(n.userId) !== userCluster) continue;
      if (node.averageAccuracy <= user.averageAccuracy) continue;
      candidates.push({ node, centrality: central.get(n.userId) ?? 0 });
    }
    candidates.sort((a, b) => b.centrality - a.centrality);
    return candidates.slice(0, limit).map((c) => c.node);
  }

  /**
   * Estimate the diffusion rate over `weeks` using a variant of Centola's
   * clustered-lattice model. The probability a non-adopter adopts in week
   * w is proportional to (neighbours who already sort / total neighbours).
   *
   * Returns the cumulative adoption fraction at each week (length weeks + 1).
   */
  estimateDiffusion(
    initialAdopters: Set<string>,
    weeks = 10,
    options?: { perStepProbability?: number; homophilyBoost?: number }
  ): number[] {
    const p = options?.perStepProbability ?? 0.08;
    const h = options?.homophilyBoost ?? 0.04;
    const adopted = new Set<string>(initialAdopters);
    const fractions: number[] = [adopted.size / Math.max(1, this.nodes.size)];
    for (let w = 0; w < weeks; w++) {
      const newAdoptions = new Set<string>();
      for (const node of this.nodes.keys()) {
        if (adopted.has(node)) continue;
        const nbrs = this.neighbours(node);
        if (nbrs.length === 0) continue;
        const adoptersInNbrs = nbrs.filter((n) => adopted.has(n.userId)).length;
        const localP = p + (adoptersInNbrs / nbrs.length) * h;
        if (Math.random() < localP) newAdoptions.add(node);
      }
      for (const x of newAdoptions) adopted.add(x);
      fractions.push(adopted.size / Math.max(1, this.nodes.size));
    }
    return fractions;
  }
}

export const SOCIAL_DIFFUSION_DEMO_GRAPH_SIZE = 100;