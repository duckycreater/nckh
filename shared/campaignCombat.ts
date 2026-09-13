import type { CardElementId } from "./cardGame";

export type CampaignLane = "front" | "mid" | "back";
export type CampaignRole = "vanguard" | "striker" | "controller" | "support" | "specialist";
export type CampaignIntent = "impact" | "spill" | "jam";
export type CampaignRunStatus = "active" | "victory" | "defeat";

export interface CampaignTeamCard {
  id: number;
  elementId: CardElementId;
  role: CampaignRole;
  name?: string;
  maxHp?: number;
}

export interface CampaignTargetCard {
  id: number;
  elementId: CardElementId;
  lane: CampaignLane;
  name?: string;
  intent: CampaignIntent;
}

export interface CampaignOperatorState extends CampaignTeamCard {
  lane: CampaignLane;
  hp: number;
  maxHp: number;
  guard: number;
  jammed: number;
}

export interface CampaignTargetState extends CampaignTargetCard {
  resolved: boolean;
  integrity: number;
  maxIntegrity: number;
  alerted: boolean;
}

export type CampaignCommand =
  | {
      type: "salvage";
      targetId: number;
      operatorId: number;
      claimedElementId: CardElementId;
    }
  | {
      type: "sync";
      targetId: number;
      firstOperatorId: number;
      secondOperatorId: number;
      claimedElementId: CardElementId;
    }
  | { type: "brace"; lane: CampaignLane }
  | { type: "shift"; operatorId: number; lane: CampaignLane }
  | { type: "commit" };

export interface CampaignCommandEvent {
  command: CampaignCommand;
  turn: number;
  result: "clean" | "contaminated" | "guarded" | "shifted" | "invalid";
  combo: number;
}

export interface CampaignCombatState {
  runId: string;
  turn: number;
  ap: number;
  maxAp: number;
  integrity: number;
  maxIntegrity: number;
  contamination: number;
  combo: number;
  bestCombo: number;
  status: CampaignRunStatus;
  operators: CampaignOperatorState[];
  targets: CampaignTargetState[];
  activeTargetId: number | null;
  lastEnemyAction: string;
  lastCommand: CampaignCommandEvent | null;
  log: string[];
}

export const CAMPAIGN_LANES: readonly CampaignLane[] = ["front", "mid", "back"];
export const CAMPAIGN_MAX_AP = 2;
export const CAMPAIGN_MAX_INTEGRITY = 100;

const SYNERGY_PAIRS: ReadonlySet<string> = new Set([
  "energy+metal",
  "glass+water",
  "organic+paper",
  "hazard+tech",
  "metal+plastic",
  "paper+plastic",
]);

const laneLabels: Record<CampaignLane, string> = {
  front: "FRONT",
  mid: "MID",
  back: "BACK",
};

function pairKey(first: CardElementId, second: CardElementId): string {
  return [first, second].sort().join("+");
}

export function isMaterialSynergy(first: CardElementId, second: CardElementId): boolean {
  return first !== second && SYNERGY_PAIRS.has(pairKey(first, second));
}

export function getLaneLabel(lane: CampaignLane): string {
  return laneLabels[lane];
}

export function getTargetLane(cardId: number, index: number): CampaignLane {
  return CAMPAIGN_LANES[(Math.abs(cardId) + index * 2) % CAMPAIGN_LANES.length];
}

export function getTargetIntent(
  cardId: number,
  index: number,
  elementId?: CardElementId,
): CampaignIntent {
  if (elementId && ["metal", "glass", "energy"].includes(elementId)) return "impact";
  if (elementId && ["organic", "hazard", "water"].includes(elementId)) return "spill";
  if (elementId && ["plastic", "paper", "tech"].includes(elementId)) return "jam";
  const intents: CampaignIntent[] = ["impact", "spill", "jam"];
  return intents[(Math.abs(cardId) + index * 3) % intents.length];
}

function roleMaxHp(role: CampaignRole): number {
  if (role === "vanguard") return 120;
  if (role === "support") return 94;
  if (role === "controller") return 90;
  if (role === "specialist") return 88;
  return 100;
}

export function createCampaignRun(
  runId: string,
  team: readonly CampaignTeamCard[],
  targetCards: readonly Pick<CampaignTargetCard, "id" | "elementId" | "name">[],
): CampaignCombatState {
  const operators = team.slice(0, 3).map((card, index) => {
    const lane = CAMPAIGN_LANES[index] ?? "back";
    const maxHp = card.maxHp ?? roleMaxHp(card.role);
    return { ...card, lane, hp: maxHp, maxHp, guard: 0, jammed: 0 };
  });
  const targets = targetCards.map((card, index) => ({
    ...card,
    lane: getTargetLane(card.id, index),
    intent: getTargetIntent(card.id, index, card.elementId),
    resolved: false,
    integrity: 100,
    maxIntegrity: 100,
    alerted: false,
  }));
  return {
    runId,
    turn: 1,
    ap: CAMPAIGN_MAX_AP,
    maxAp: CAMPAIGN_MAX_AP,
    integrity: CAMPAIGN_MAX_INTEGRITY,
    maxIntegrity: CAMPAIGN_MAX_INTEGRITY,
    contamination: 0,
    combo: 0,
    bestCombo: 0,
    status: "active",
    operators,
    targets,
    activeTargetId: targets.find((target) => !target.resolved)?.id ?? null,
    lastEnemyAction: "No signal yet",
    lastCommand: null,
    log: ["RUN START · 3 operators online · 2 AP available"],
  };
}

function nextTarget(state: CampaignCombatState): CampaignTargetState | undefined {
  return state.targets.find((target) => !target.resolved);
}

function appendLog(state: CampaignCombatState, message: string): void {
  state.log = [...state.log.slice(-7), message];
}

function endRunIfNeeded(state: CampaignCombatState): void {
  if (state.targets.every((target) => target.resolved)) {
    state.status = "victory";
    state.activeTargetId = null;
    appendLog(state, "ALL NODES SECURED · SALVAGE COMPLETE");
  } else if (state.integrity <= 0 || state.operators.every((operator) => operator.hp <= 0)) {
    state.status = "defeat";
    appendLog(state, "RECOVERY NETWORK COLLAPSED · RUN FAILED");
  }
}

function damageOperator(
  state: CampaignCombatState,
  operator: CampaignOperatorState,
  amount: number,
): number {
  const blocked = Math.min(operator.guard, amount);
  operator.guard = Math.max(0, operator.guard - amount);
  const damage = Math.max(0, amount - blocked);
  operator.hp = Math.max(0, operator.hp - damage);
  return damage;
}

function applyOperatorMaterialBonus(
  state: CampaignCombatState,
  operator: CampaignOperatorState,
  target: CampaignTargetState,
): void {
  if (operator.elementId === "plastic") {
    operator.guard = Math.min(30, operator.guard + 8);
    appendLog(state, `◉ RECONFIGURE · ${operator.name || `#${operator.id}`} gains 8 guard`);
  } else if (operator.elementId === "paper") {
    state.combo += 1;
    appendLog(state, "▱ PRINT TEMPO · clean chain advances");
  } else if (operator.elementId === "glass" && operator.lane === target.lane) {
    state.combo += 1;
    appendLog(state, "◇ REFRACTION · aligned lane grants precision chain");
  } else if (operator.elementId === "metal") {
    operator.guard = Math.min(30, operator.guard + 15);
    appendLog(state, "⬢ TEMPER · reclaimed plate absorbs the next impact");
  } else if (operator.elementId === "organic") {
    for (const ally of state.operators) ally.hp = Math.min(ally.maxHp, ally.hp + 6);
    appendLog(state, "⌁ REGROWTH · squad hull restored");
  } else if (operator.elementId === "hazard") {
    state.contamination = Math.max(0, state.contamination - 2);
    appendLog(state, "△ CONTAINMENT · contamination purged");
  } else if (operator.elementId === "energy") {
    state.ap = Math.min(state.maxAp, state.ap + 1);
    state.contamination += 1;
    appendLog(state, "ϟ OVERCHARGE · +1 AP, +1 contamination");
  } else if (operator.elementId === "water") {
    state.integrity = Math.min(state.maxIntegrity, state.integrity + 5);
    appendLog(state, "≋ PRESSURE · recovery line stabilised");
  } else if (operator.elementId === "tech") {
    for (const ally of state.operators) ally.jammed = 0;
    appendLog(state, "⌘ NETWORK · squad signal locks cleared");
  }
}

function enemyPhase(state: CampaignCombatState): void {
  const target = nextTarget(state);
  if (!target) return;
  const laneOperators = state.operators.filter(
    (operator) => operator.lane === target.lane && operator.hp > 0,
  );
  const operator = laneOperators[0];
  target.alerted = true;

  // A jam lasts through the next planning phase. Existing jams decay before
  // the new telegraphed signal is applied, so the freshly jammed operator is
  // never cleared in the same enemy phase.
  for (const candidate of state.operators) {
    candidate.jammed = Math.max(0, candidate.jammed - 1);
  }

  if (target.intent === "impact" && operator) {
    const raw = operator.role === "vanguard" && operator.lane === "front" ? 9 : 15;
    const damage = damageOperator(state, operator, raw);
    state.integrity = Math.max(0, state.integrity - Math.max(0, damage - 4));
    state.lastEnemyAction = `IMPACT · ${getLaneLabel(target.lane)} · ${damage} hull damage`;
    appendLog(state, `⚠ IMPACT hits ${operator.name || `#${operator.id}`} for ${damage}`);
  } else if (target.intent === "impact") {
    state.integrity = Math.max(0, state.integrity - 8);
    state.lastEnemyAction = `IMPACT · ${getLaneLabel(target.lane)} · empty lane, system -8`;
    appendLog(state, `⚠ IMPACT breaches empty ${getLaneLabel(target.lane)} lane`);
  } else if (target.intent === "spill") {
    const guarded = laneOperators.some((candidate) => candidate.guard > 0);
    const contamination = guarded ? 1 : 2;
    state.contamination += contamination;
    state.integrity = Math.max(0, state.integrity - (guarded ? 4 : 9));
    state.lastEnemyAction = `SPILL · ${getLaneLabel(target.lane)} · contamination +${contamination}`;
    appendLog(
      state,
      `☣ SPILL spreads through ${getLaneLabel(target.lane)} (+${contamination} contamination)`,
    );
  } else if (target.intent === "jam" && operator) {
    operator.jammed = Math.min(2, operator.jammed + 1);
    state.lastEnemyAction = `JAM · ${operator.name || `#${operator.id}`} disabled for 1 command`;
    appendLog(state, `⛓ JAM locks ${operator.name || `#${operator.id}`}`);
  } else {
    state.lastEnemyAction = "NO TARGET · signal dissipates";
  }

  for (const candidate of state.operators) {
    candidate.guard = Math.max(0, candidate.guard - 1);
  }
  state.turn += 1;
  state.ap = state.maxAp;
  state.activeTargetId = nextTarget(state)?.id ?? null;
  endRunIfNeeded(state);
}

export function applyCampaignCommand(
  previous: CampaignCombatState,
  command: CampaignCommand,
): { state: CampaignCombatState; event: CampaignCommandEvent } {
  const state: CampaignCombatState = {
    ...previous,
    operators: previous.operators.map((operator) => ({ ...operator })),
    targets: previous.targets.map((target) => ({ ...target })),
    log: [...previous.log],
  };
  const event: CampaignCommandEvent = {
    command,
    turn: state.turn,
    result: "invalid",
    combo: state.combo,
  };
  if (state.status !== "active" || state.ap <= 0) {
    state.lastCommand = event;
    return { state, event };
  }

  const spend = (cost: number): boolean => {
    if (state.ap < cost) return false;
    state.ap -= cost;
    return true;
  };

  if (command.type === "salvage") {
    const target = state.targets.find((candidate) => candidate.id === command.targetId);
    const operator = state.operators.find((candidate) => candidate.id === command.operatorId);
    if (
      !target ||
      target.resolved ||
      !operator ||
      operator.hp <= 0 ||
      operator.jammed > 0 ||
      !spend(1)
    ) {
      state.lastCommand = event;
      return { state, event };
    }
    target.alerted = true;
    if (command.claimedElementId === target.elementId) {
      target.resolved = true;
      target.integrity = 0;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      if (operator.role === "support")
        state.integrity = Math.min(state.maxIntegrity, state.integrity + 3);
      if (operator.role === "striker") state.contamination = Math.max(0, state.contamination - 1);
      applyOperatorMaterialBonus(state, operator, target);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      event.result = "clean";
      appendLog(
        state,
        `✓ CLEAN SALVAGE · ${operator.name || `#${operator.id}`} secured ${target.name || `#${target.id}`}`,
      );
    } else {
      target.integrity = Math.max(35, target.integrity - 25);
      state.combo = 0;
      state.contamination += 1;
      state.integrity = Math.max(0, state.integrity - 5);
      event.result = "contaminated";
      appendLog(state, `! MIS-SORT · ${target.name || `#${target.id}`} destabilized`);
    }
  } else if (command.type === "sync") {
    const target = state.targets.find((candidate) => candidate.id === command.targetId);
    const first = state.operators.find((candidate) => candidate.id === command.firstOperatorId);
    const second = state.operators.find((candidate) => candidate.id === command.secondOperatorId);
    const canSync =
      target &&
      !target.resolved &&
      first &&
      second &&
      first.id !== second.id &&
      first.hp > 0 &&
      second.hp > 0 &&
      first.jammed === 0 &&
      second.jammed === 0 &&
      isMaterialSynergy(first.elementId, second.elementId) &&
      command.claimedElementId === target.elementId &&
      spend(2);
    if (!canSync || !target || !first || !second) {
      state.lastCommand = event;
      return { state, event };
    }
    target.resolved = true;
    target.integrity = 0;
    state.combo += 2;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.contamination = Math.max(0, state.contamination - 2);
    state.integrity = Math.min(
      state.maxIntegrity,
      state.integrity + (first.role === "support" || second.role === "support" ? 5 : 0),
    );
    applyOperatorMaterialBonus(state, first, target);
    applyOperatorMaterialBonus(state, second, target);
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    event.result = "clean";
    appendLog(
      state,
      `◆ SYNC BURST · ${first.name || `#${first.id}`} + ${second.name || `#${second.id}`}`,
    );
  } else if (command.type === "brace") {
    if (!CAMPAIGN_LANES.includes(command.lane) || !spend(1)) {
      state.lastCommand = event;
      return { state, event };
    }
    const laneOperators = state.operators.filter(
      (operator) => operator.lane === command.lane && operator.hp > 0,
    );
    laneOperators.forEach((operator) => {
      operator.guard = Math.min(30, operator.guard + (operator.role === "vanguard" ? 20 : 13));
    });
    state.combo = Math.max(0, state.combo - 1);
    event.result = "guarded";
    appendLog(state, `▣ BRACE · ${getLaneLabel(command.lane)} sealed for the next signal`);
  } else if (command.type === "shift") {
    const operator = state.operators.find((candidate) => candidate.id === command.operatorId);
    if (
      !operator ||
      operator.hp <= 0 ||
      operator.jammed > 0 ||
      !CAMPAIGN_LANES.includes(command.lane) ||
      !spend(1)
    ) {
      state.lastCommand = event;
      return { state, event };
    }
    operator.lane = command.lane;
    event.result = "shifted";
    appendLog(
      state,
      `↯ SHIFT · ${operator.name || `#${operator.id}`} → ${getLaneLabel(command.lane)}`,
    );
  } else if (command.type === "commit") {
    // Giving up unused AP is a deliberate tempo choice that immediately
    // releases the currently telegraphed hazard.
    state.ap = 0;
    event.result = "guarded";
    appendLog(state, "◈ LANE LOCKED · incoming signal released");
  }

  event.combo = state.combo;
  state.lastCommand = event;
  state.activeTargetId = nextTarget(state)?.id ?? null;
  endRunIfNeeded(state);
  if (state.status === "active" && state.ap === 0) enemyPhase(state);
  return { state, event };
}

export function countResolvedTargets(state: CampaignCombatState): number {
  return state.targets.filter((target) => target.resolved).length;
}

export function getCampaignRunScore(state: CampaignCombatState): number {
  const cleared = countResolvedTargets(state);
  const cleanRate = state.targets.length ? cleared / state.targets.length : 0;
  const riskPenalty =
    state.contamination * 3 + Math.max(0, state.maxIntegrity - state.integrity) / 4;
  return Math.max(0, Math.round(cleanRate * 700 + state.bestCombo * 45 - riskPenalty));
}
