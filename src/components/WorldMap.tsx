import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Globe, Lock, ChevronRight, X, Zap, Star,
  Trophy, Target, CheckCircle, RefreshCw, Camera,
  HelpCircle, ChevronDown, Info, Award, Flame
} from "lucide-react";
import {
  WORLD_REGIONS, WorldRegion, getRegionById, Location
} from "../data/worldLocations";
import { STORY_CHAPTERS, StoryChapter, getChapterById } from "../data/storyChapters";
import {
  GameProgressData, DEFAULT_GAME_PROGRESS, loadGameProgress,
  saveGameProgress, isRegionUnlocked, isChapterUnlocked,
  getRegionPollution, cleanLocation, getOverallCleanPercent
} from "../lib/gameProgress";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorldMapProps {
  userId: string;
  userLevel: number;
  cardPower: number;
  onEarnPoints: (pts: number) => void;
  onBossBattle: (bossCardIds: number[], regionName: string, rewardXP: number) => void;
  onStoryIntro: (chapterId: number) => void;
}

interface RegionDetailState {
  region: WorldRegion;
  view: "detail" | "explore" | "boss";
}

// ─── Isometric World Map SVG ─────────────────────────────────────────────────

function IsometricMapSVG({
  region,
  pollution,
  isUnlocked,
  isCompleted,
  onClick,
}: {
  region: WorldRegion;
  pollution: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const cleanPercent = Math.max(0, 100 - pollution);
  const r = parseInt(region.continentColor.slice(1, 3), 16);
  const g = parseInt(region.continentColor.slice(3, 5), 16);
  const b = parseInt(region.continentColor.slice(5, 7), 16);

  const pollutedR = Math.min(255, r + 60);
  const pollutedG = Math.max(0, g - 40);
  const pollutedB = Math.max(0, b - 20);

  const baseColor = isCompleted
    ? "#10b981"
    : isUnlocked
    ? `rgb(${Math.round(r + (pollutedR - r) * (pollution / 100))},${Math.round(g + (pollutedG - g) * (pollution / 100))},${Math.round(b + (pollutedB - b) * (pollution / 100))})`
    : "#1e293b";

  const textColor = isUnlocked ? "#ffffff" : "#64748b";
  const labelColor = isCompleted ? "#10b981" : isUnlocked ? "#f8fafc" : "#475569";

  return (
    <g
      onClick={isUnlocked ? onClick : undefined}
      style={{ cursor: isUnlocked ? "pointer" : "not-allowed" }}
    >
      {/* Region glow */}
      {isUnlocked && !isCompleted && (
        <ellipse
          cx={region.mapX * 5}
          cy={region.mapY * 4}
          rx={40}
          ry={25}
          fill={baseColor}
          opacity={0.15}
        />
      )}

      {/* Main region shape */}
      <ellipse
        cx={region.mapX * 5}
        cy={region.mapY * 4}
        rx={Math.max(28, 38 - pollution * 0.1)}
        ry={Math.max(18, 24 - pollution * 0.06)}
        fill={baseColor}
        opacity={isUnlocked ? 0.85 : 0.35}
        stroke={isCompleted ? "#10b981" : isUnlocked ? baseColor : "#334155"}
        strokeWidth={isCompleted ? 2.5 : 1.5}
      />

      {/* Isometric top face */}
      <ellipse
        cx={region.mapX * 5}
        cy={region.mapY * 4 - 5}
        rx={Math.max(18, 26 - pollution * 0.08)}
        ry={Math.max(12, 16 - pollution * 0.04)}
        fill={isUnlocked ? "#334155" : "#0f172a"}
        opacity={0.9}
      />

      {/* Region label */}
      <text
        x={region.mapX * 5}
        y={region.mapY * 4 - 2}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill={labelColor}
        fontFamily="Roboto, sans-serif"
      >
        {region.name}
      </text>

      {/* Pollution indicator dots */}
      {isUnlocked && !isCompleted && (
        <circle
          cx={region.mapX * 5 + 18}
          cy={region.mapY * 4 - 10}
          r={6}
          fill={pollution > 60 ? "#ef4444" : pollution > 30 ? "#f59e0b" : "#10b981"}
          opacity={0.9}
        />
      )}

      {/* Completed checkmark */}
      {isCompleted && (
        <g>
          <circle
            cx={region.mapX * 5 + 18}
            cy={region.mapY * 4 - 10}
            r={8}
            fill="#10b981"
          />
          <path
            d={`M${region.mapX * 5 + 14} ${region.mapY * 4 - 10} l3 3 l5 -5`}
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Lock icon */}
      {!isUnlocked && (
        <g>
          <rect
            x={region.mapX * 5 - 8}
            y={region.mapY * 4 - 6}
            width={16}
            height={12}
            rx={2}
            fill="#475569"
          />
          <path
            d={`M${region.mapX * 5 - 4} ${region.mapY * 4 - 6} v-5 a4 4 0 0 1 8 0 v5`}
            stroke="#64748b"
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
    </g>
  );
}

// ─── Mini Map Panel ───────────────────────────────────────────────────────────

function MiniMapPanel({
  progress,
  onOpenFull,
  playerLevel,
  cardPower,
}: {
  progress: GameProgressData;
  onOpenFull: () => void;
  playerLevel: number;
  cardPower: number;
}) {
  const cleanPercent = getOverallCleanPercent(progress);
  const completedCount = progress.completedRegions.length;
  const totalRegions = WORLD_REGIONS.length;
  const currentChapter = getChapterById(progress.activeChapter);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700/60"
        style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0ea5e9)" }}>
            <Globe size={15} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-white text-xs tracking-wider">THẾ GIỚI</h3>
            <p className="text-[10px] text-slate-400">
              {currentChapter?.title || "Chương 1"} — {cleanPercent}% sạch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-black text-emerald-400 tabular-nums">{completedCount}/{totalRegions}</span>
            <p className="text-[9px] text-slate-500">vùng sạch</p>
          </div>
          <button
            onClick={onOpenFull}
            className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            <Globe size={14} />
          </button>
        </div>
      </div>

      {/* Mini map preview */}
      <div className="p-2">
        <div className="relative rounded-xl overflow-hidden bg-[#0a1628] border border-slate-800"
          style={{ height: 100 }}>
          {/* Ocean gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#0f2744] to-[#0c1929]" />

          {/* SVG Map */}
          <svg viewBox="0 0 500 360" className="w-full h-full">
            {/* Grid lines */}
            <line x1="0" y1="90" x2="500" y2="90" stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1="0" y1="180" x2="500" y2="180" stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1="0" y1="270" x2="500" y2="270" stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1="125" y1="0" x2="125" y2="360" stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1="250" y1="0" x2="250" y2="360" stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1="375" y1="0" x2="375" y2="360" stroke="#1e3a5f" strokeWidth="0.5" />

            {/* Continents - simplified shapes */}
            {/* North America */}
            <ellipse cx={110} cy={150} rx={55} ry={60} fill="#1e3a5f" opacity={0.7} />
            {/* South America */}
            <ellipse cx={150} cy={240} rx={30} ry={45} fill="#1e3a5f" opacity={0.7} />
            {/* Europe */}
            <ellipse cx={250} cy={115} rx={40} ry={30} fill="#1e3a5f" opacity={0.7} />
            {/* Africa */}
            <ellipse cx={260} cy={185} rx={35} ry={50} fill="#1e3a5f" opacity={0.7} />
            {/* Asia */}
            <ellipse cx={410} cy={130} rx={70} ry={55} fill="#1e3a5f" opacity={0.7} />
            {/* Southeast Asia */}
            <ellipse cx={300} cy={200} rx={30} ry={25} fill="#1e3a5f" opacity={0.7} />
            {/* Oceania */}
            <ellipse cx={430} cy={290} rx={40} ry={30} fill="#1e3a5f" opacity={0.7} />

            {/* Region dots */}
            {WORLD_REGIONS.map((region) => {
              const unlocked = isRegionUnlocked(region.id, progress, playerLevel, cardPower);
              const completed = progress.completedRegions.includes(region.id);
              const pollution = getRegionPollution(region.id, progress);
              const dotColor = completed
                ? "#10b981"
                : !unlocked
                ? "#334155"
                : pollution > 60
                ? "#ef4444"
                : pollution > 30
                ? "#f59e0b"
                : "#06b6d4";

              return (
                <g key={region.id}>
                  <circle
                    cx={region.mapX * 5}
                    cy={region.mapY * 4}
                    r={8}
                    fill={dotColor}
                    opacity={unlocked ? 0.9 : 0.4}
                  />
                  {!unlocked && (
                    <circle
                      cx={region.mapX * 5}
                      cy={region.mapY * 4}
                      r={10}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                  )}
                  {completed && (
                    <circle
                      cx={region.mapX * 5}
                      cy={region.mapY * 4}
                      r={11}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent opacity-60" />
        </div>

        {/* Pollution bars for active regions */}
        <div className="mt-2 space-y-1">
          {WORLD_REGIONS.slice(0, 4).map((region) => {
            const unlocked = isRegionUnlocked(region.id, progress, playerLevel, cardPower);
            const completed = progress.completedRegions.includes(region.id);
            const pollution = getRegionPollution(region.id, progress);
            const barColor = completed
              ? "#10b981"
              : pollution > 60
              ? "#ef4444"
              : pollution > 30
              ? "#f59e0b"
              : "#06b6d4";

            return (
              <div key={region.id} className="flex items-center gap-2">
                <span className={`text-[8px] font-bold w-16 truncate ${unlocked ? "text-slate-300" : "text-slate-600"}`}>
                  {region.name}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completed ? 100 : pollution}%`,
                      background: barColor,
                    }}
                  />
                </div>
                {unlocked && !completed && (
                  <span className="text-[8px] font-bold text-slate-500 tabular-nums w-8 text-right">
                    {pollution}%
                  </span>
                )}
                {completed && <CheckCircle size={10} className="text-emerald-400" />}
              </div>
            );
          })}
        </div>

        {/* Open full map button */}
        <button
          onClick={onOpenFull}
          className="mt-2 w-full py-2 rounded-xl text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <Map size={12} />
          Bản đồ đầy đủ
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Full World Map ───────────────────────────────────────────────────────────

function FullWorldMap({
  progress,
  onSelectRegion,
  onClose,
  playerLevel,
  cardPower,
}: {
  progress: GameProgressData;
  onSelectRegion: (region: WorldRegion) => void;
  onClose: () => void;
  playerLevel: number;
  cardPower: number;
}) {
  const cleanPercent = getOverallCleanPercent(progress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#030712] flex flex-col"
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-800"
        style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
          <div>
            <h2 className="font-black text-white text-sm">BẢN ĐỒ THẾ GIỚI</h2>
            <p className="text-[10px] text-slate-400">{cleanPercent}% Trái Đất đã được giải cứu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <Flame size={12} className="text-emerald-400" />
            <span className="text-xs font-black text-emerald-400">{cleanPercent}%</span>
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030a14] via-[#0c1929] to-[#0a1628]" />

        {/* Animated stars background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 rounded-full bg-white"
              style={{
                left: `${Math.sin(i * 0.7) * 50 + 50}%`,
                top: `${Math.cos(i * 0.5) * 50 + 50}%`,
                opacity: 0.1 + (i % 5) * 0.05,
              }}
            />
          ))}
        </div>

        {/* Main SVG */}
        <svg viewBox="0 0 500 360" className="w-full h-full">
          {/* Ocean gradient bg */}
          <defs>
            <radialGradient id="oceanGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0f3d5c" />
              <stop offset="100%" stopColor="#030a14" />
            </radialGradient>
            <radialGradient id="aura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={500} height={360} fill="url(#oceanGrad)" />

          {/* Equator & tropics */}
          <line x1="0" y1="180" x2="500" y2="180" stroke="#1e4a6e" strokeWidth="0.5" strokeDasharray="4,4" opacity={0.5} />
          <line x1="0" y1="120" x2="500" y2="120" stroke="#1e4a6e" strokeWidth="0.3" strokeDasharray="3,5" opacity={0.3} />
          <line x1="0" y1="240" x2="500" y2="240" stroke="#1e4a6e" strokeWidth="0.3" strokeDasharray="3,5" opacity={0.3} />

          {/* Continent fills */}
          {/* North America */}
          <path d="M 60 80 Q 80 70 120 75 Q 160 80 170 100 Q 180 130 170 160 Q 160 190 140 210 Q 110 230 80 220 Q 50 200 45 170 Q 40 140 50 110 Q 55 90 60 80Z" fill="#0f2744" opacity={0.8} />
          {/* South America */}
          <path d="M 130 220 Q 150 210 170 220 Q 190 240 185 270 Q 180 300 165 320 Q 145 330 130 315 Q 115 290 120 265 Q 125 240 130 220Z" fill="#0f2744" opacity={0.8} />
          {/* Europe */}
          <path d="M 230 90 Q 255 80 280 90 Q 295 105 290 120 Q 275 135 255 130 Q 235 125 225 115 Q 218 105 230 90Z" fill="#0f2744" opacity={0.8} />
          {/* Africa */}
          <path d="M 235 135 Q 260 125 285 135 Q 300 155 295 180 Q 290 210 275 235 Q 255 250 240 235 Q 220 210 225 180 Q 228 150 235 135Z" fill="#0f2744" opacity={0.8} />
          {/* Asia */}
          <path d="M 290 75 Q 330 60 380 70 Q 430 80 450 110 Q 465 140 455 170 Q 435 195 400 195 Q 360 195 330 175 Q 300 155 290 130 Q 283 105 290 75Z" fill="#0f2744" opacity={0.8} />
          {/* Southeast Asia */}
          <path d="M 310 190 Q 330 185 350 195 Q 360 210 355 225 Q 340 235 320 230 Q 305 220 310 205Z" fill="#0f2744" opacity={0.8} />
          {/* Oceania */}
          <path d="M 380 265 Q 410 255 440 265 Q 460 280 455 300 Q 445 320 420 325 Q 395 325 380 310 Q 365 295 380 280Z" fill="#0f2744" opacity={0.8} />
          {/* Antarctica */}
          <path d="M 150 340 Q 250 330 350 340 Q 340 355 250 358 Q 160 355 150 340Z" fill="#0f2744" opacity={0.6} />

          {/* Aura around clean areas */}
          {progress.completedRegions.map((rid) => {
            const region = getRegionById(rid);
            if (!region) return null;
            return (
              <ellipse
                key={rid}
                cx={region.mapX * 5}
                cy={region.mapY * 4}
                rx={50}
                ry={35}
                fill="url(#aura)"
              />
            );
          })}

          {/* Region nodes */}
          {WORLD_REGIONS.map((region) => {
            const unlocked = isRegionUnlocked(region.id, progress, playerLevel, cardPower);
            const completed = progress.completedRegions.includes(region.id);
            const pollution = getRegionPollution(region.id, progress);

            return (
              <IsometricMapSVG
                key={region.id}
                region={region}
                pollution={pollution}
                isUnlocked={unlocked}
                isCompleted={completed}
                onClick={() => onSelectRegion(region)}
              />
            );
          })}

          {/* Player marker */}
          {(() => {
            const current = getRegionById(progress.currentRegion);
            if (!current) return null;
            return (
              <g>
                <circle
                  cx={current.mapX * 5}
                  cy={current.mapY * 4 - 18}
                  r={10}
                  fill="#06b6d4"
                  opacity={0.2}
                >
                  <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={current.mapX * 5}
                  cy={current.mapY * 4 - 18}
                  r={5}
                  fill="#06b6d4"
                  stroke="white"
                  strokeWidth={1.5}
                />
              </g>
            );
          })()}

          {/* Equator labels */}
          <text x={490} y={183} fill="#1e4a6e" fontSize="7" opacity={0.5}>0°</text>
          <text x={490} y={123} fill="#1e4a6e" fontSize="7" opacity={0.5}>30°N</text>
          <text x={490} y={243} fill="#1e4a6e" fontSize="7" opacity={0.5}>30°S</text>
        </svg>

        {/* Region legend */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[9px] text-slate-300 font-bold">Đang khám phá</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-slate-300 font-bold">Hoàn thành</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[9px] text-slate-300 font-bold">Ô nhiễm cao</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-[9px] text-slate-300 font-bold">Khóa</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Exploration Mini-game ───────────────────────────────────────────────────

function ExplorationGame({
  region,
  progress,
  onClean,
  onFail,
  onBossUnlock,
  onClose,
  onEarnPoints,
}: {
  region: WorldRegion;
  progress: GameProgressData;
  onClean: () => void;
  onFail: () => void;
  onBossUnlock: () => void;
  onClose: () => void;
  onEarnPoints: (pts: number) => void;
}) {
  const [step, setStep] = useState<"choice" | "camera" | "quiz" | "result">("choice");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [result, setResult] = useState<"success" | "fail" | null>(null);
  const [score, setScore] = useState(0);

  const quiz = generateQuiz(region);
  const location = selectedLocation || region.locations[0];

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) setQuizCorrect((c) => c + 1);
    if (quizIdx + 1 < quiz.length) {
      setQuizIdx((i) => i + 1);
    } else {
      const finalScore = quizCorrect + (correct ? 1 : 0);
      setScore(finalScore);
      const isSuccess = finalScore >= Math.ceil(quiz.length * 0.6);
      setResult(isSuccess ? "success" : "fail");
      setStep("result");
    }
  };

  const handleConfirm = () => {
    if (result === "success") {
      const bonus = Math.round(location.cleanBonus * (score / quiz.length) * 10);
      onEarnPoints(bonus);
      onClean();
    } else {
      onFail();
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[210] bg-black/90 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800"
          style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${region.continentColor}, ${region.continentColor}88)` }}>
              <Target size={14} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-xs">{region.name}</p>
              <p className="text-[9px] text-slate-400">Nhiệm vụ khám phá</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === "choice" && (
            <div className="space-y-3">
              <p className="text-slate-300 text-xs text-center mb-4">
                Chọn cách khám phá vùng đất này:
              </p>
              <button
                onClick={() => {
                  setSelectedLocation(region.locations[0]);
                  setStep("camera");
                }}
                className="w-full p-4 rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <Camera size={24} className="text-cyan-400" />
                  <div>
                    <p className="font-black text-cyan-400 text-sm">AR Camera</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Quét rác thật bằng camera để nhận thưởng cao nhất</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setSelectedLocation(region.locations[0]);
                  setStep("quiz");
                }}
                className="w-full p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={24} className="text-emerald-400" />
                  <div>
                    <p className="font-black text-emerald-400 text-sm">Quiz Phân loại</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Trả lời câu hỏi về rác thải tại đây</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  const unlocked = region.locations[0];
                  setSelectedLocation(unlocked);
                  const bonus = unlocked.cleanBonus;
                  onEarnPoints(bonus);
                  onClean();
                  onClose();
                }}
                className="w-full p-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <Award size={24} className="text-amber-400" />
                  <div>
                    <p className="font-black text-amber-400 text-sm">Khám phá nhanh</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Nhận thưởng cố định, ít rủi ro</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 rounded-2xl mx-auto bg-slate-800 flex items-center justify-center border-2 border-dashed border-cyan-500/50">
                <Camera size={32} className="text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-white">AR Camera</p>
              <p className="text-[11px] text-slate-400">
                Camera sẽ mở để bạn quét một món rác thật. Món rác sẽ được phân loại và bạn nhận thưởng.
              </p>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <p className="text-[10px] text-amber-400 font-bold">⚡ Thưởng: +{location.cleanBonus * 2} EXP nếu đúng!</p>
              </div>
              <button
                onClick={() => {
                  onEarnPoints(location.cleanBonus * 2);
                  onClean();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-sm shadow-lg"
              >
                Mô phỏng quét (Demo)
              </button>
              <button onClick={() => setStep("choice")} className="w-full py-2 text-slate-400 text-xs hover:text-white">
                ← Quay lại
              </button>
            </div>
          )}

          {step === "quiz" && quiz.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Câu {quizIdx + 1}/{quiz.length}
                </span>
                <div className="flex gap-1">
                  {quiz.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i <= quizIdx ? "bg-cyan-400" : "bg-slate-700"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <p className="text-sm font-bold text-white text-center">
                  {quiz[quizIdx].question}
                </p>
              </div>

              <div className="space-y-2">
                {quiz[quizIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(opt.correct)}
                    className="w-full p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-cyan-500/40 transition-all text-left"
                  >
                    <span className="text-[11px] font-bold text-slate-300">
                      {String.fromCharCode(65 + i)}. {opt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  result === "success" ? "bg-emerald-500/20 border-2 border-emerald-500" : "bg-red-500/20 border-2 border-red-500"
                }`}
              >
                {result === "success" ? (
                  <CheckCircle size={32} className="text-emerald-400" />
                ) : (
                  <X size={32} className="text-red-400" />
                )}
              </motion.div>
              <div>
                <p className="font-black text-white text-lg">
                  {result === "success" ? "Xuất sắc!" : "Chưa chính xác"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {result === "success"
                    ? `${score}/${quiz.length} câu đúng — vùng đất đã sạch hơn!`
                    : `${quizCorrect}/${quiz.length} câu đúng — thử lại lần sau nhé!`}
                </p>
              </div>
              {result === "success" && (
                <div className="p-3 bg-amber-500/15 rounded-xl border border-amber-500/30">
                  <p className="text-sm font-black text-amber-400">+{Math.round(location.cleanBonus * (score / quiz.length) * 10)} EXP</p>
                </div>
              )}
              <button
                onClick={handleConfirm}
                className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition-all ${
                  result === "success"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    : "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200"
                }`}
              >
                {result === "success" ? "Tiếp tục" : "Thử lại"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Region Detail Panel ─────────────────────────────────────────────────────

function RegionDetail({
  region,
  progress,
  playerLevel,
  cardPower,
  onExplore,
  onBossBattle,
  onClose,
}: RegionDetailState & {
  progress: GameProgressData;
  playerLevel: number;
  cardPower: number;
  onExplore: (region: WorldRegion) => void;
  onBossBattle: (region: WorldRegion) => void;
  onClose: () => void;
}) {
  const unlocked = isRegionUnlocked(region.id, progress, playerLevel, cardPower);
  const completed = progress.completedRegions.includes(region.id);
  const pollution = getRegionPollution(region.id, progress);
  const cleanPercent = Math.max(0, 100 - pollution);
  const chapter = getChapterById(region.chapter);

  const barColor = pollution > 60 ? "#ef4444" : pollution > 30 ? "#f59e0b" : "#10b981";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-xs z-[205] bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex-none px-5 py-4 border-b border-slate-800"
        style={{ background: `linear-gradient(180deg, ${region.continentColor}22, transparent)` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: region.continentColor }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Chương {region.chapter} — {chapter?.title}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <h2 className="font-black text-white text-lg">{region.name}</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">{region.locations.length} địa điểm</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Pollution meter */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mức ô nhiễm</span>
            <span className="text-sm font-black tabular-nums" style={{ color: barColor }}>
              {pollution}%
            </span>
          </div>
          <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pollution}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: barColor }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-red-400">Ô nhiễm nặng</span>
            <span className="text-[9px] text-emerald-400">Trong lành</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
            <Zap size={14} className="text-amber-400 mx-auto mb-1" />
            <p className="text-xs font-black text-amber-400">{region.rewardXP} EXP</p>
            <p className="text-[9px] text-slate-500">khi hoàn thành</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
            <Star size={14} className="text-cyan-400 mx-auto mb-1" />
            <p className="text-xs font-black text-cyan-400">{region.locations.length}</p>
            <p className="text-[9px] text-slate-500">địa điểm</p>
          </div>
        </div>

        {/* Locations */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Địa điểm</p>
          <div className="space-y-2">
            {region.locations.map((loc) => (
              <div key={loc.id} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-white">{loc.name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] text-emerald-400">-{loc.cleanBonus}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-relaxed">{loc.description}</p>
                <p className="text-[8px] text-cyan-400/70 mt-1 italic">"{loc.trivia}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Unlock requirements */}
        {!unlocked && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-[10px] font-bold text-red-400 mb-2 flex items-center gap-1">
              <Lock size={10} /> Yêu cầu mở khóa
            </p>
            {region.unlockRequirement.minLevel && (
              <p className="text-[10px] text-slate-400">
                • Cấp {region.unlockRequirement.minLevel} trở lên
              </p>
            )}
            {region.unlockRequirement.prevRegionId && (
              <p className="text-[10px] text-slate-400">
                • Hoàn thành vùng trước
              </p>
            )}
            {region.unlockRequirement.minPower && (
              <p className="text-[10px] text-slate-400">
                • Card Power tối thiểu: {region.unlockRequirement.minPower}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-none p-4 border-t border-slate-800 space-y-2">
        {unlocked && !completed && pollution > 0 && (
          <button
            onClick={() => onExplore(region)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
          >
            <Target size={16} />
            Khám phá vùng đất
          </button>
        )}
        {unlocked && !completed && pollution <= 0 && (
          <button
            onClick={() => onBossBattle(region)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 animate-pulse"
          >
            <Trophy size={16} />
            Chiến đấu với Boss!
          </button>
        )}
        {completed && (
          <div className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center">
            <CheckCircle size={16} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-sm font-black text-emerald-400">Hoàn thành!</p>
          </div>
        )}
        {!unlocked && (
          <button disabled className="w-full py-3 rounded-2xl bg-slate-800 text-slate-500 font-black text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <Lock size={14} />
            Chưa mở khóa
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Boss Victory Modal ──────────────────────────────────────────────────────

function BossVictoryModal({
  region,
  xpEarned,
  nextChapter,
  onContinue,
  onClose,
}: {
  region: WorldRegion;
  xpEarned: number;
  nextChapter: StoryChapter | null;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[220] bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-amber-400/30 overflow-hidden shadow-2xl"
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, x: Math.random() * 300 }}
              animate={{ y: 400, x: Math.random() * 300 }}
              transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#f59e0b", "#10b981", "#06b6d4", "#a855f7", "#ef4444"][i % 5],
              }}
            />
          ))}
        </div>

        <div className="relative p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            <Trophy size={40} className="text-white" />
          </motion.div>

          <h2 className="font-black text-white text-2xl mb-1">CHIẾN THẮNG!</h2>
          <p className="text-sm text-slate-400 mb-1">{region.name} đã được giải phóng!</p>
          <p className="text-[10px] text-slate-500 mb-4">Boss {region.bossCardIds.join(", ")} đã bị đánh bại</p>

          <div className="bg-amber-500/15 rounded-2xl p-4 mb-4 border border-amber-500/30">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Phần thưởng chiến thắng</p>
            <p className="text-3xl font-black text-amber-400">+{xpEarned} EXP</p>
          </div>

          {nextChapter && (
            <div className="bg-emerald-500/15 rounded-2xl p-3 mb-4 border border-emerald-500/30">
              <p className="text-[10px] text-emerald-400 font-bold">Chương {nextChapter.id}: {nextChapter.title}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">đã mở khóa!</p>
            </div>
          )}

          <button
            onClick={onContinue}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg"
          >
            Tiếp tục hành trình
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Quiz Generator ──────────────────────────────────────────────────────────

function generateQuiz(region: WorldRegion) {
  const allQuestions = [
    {
      question: "Loại rác nào phổ biến nhất tại " + region.locations[0]?.name + "?",
      options: [
        { text: "Nhựa (Plastic)", correct: true },
        { text: "Kim loại (Metal)", correct: false },
        { text: "Thủy tinh (Glass)", correct: false },
        { text: "Hữu cơ (Organic)", correct: false },
      ],
    },
    {
      question: "Rác nhựa mất bao lâu để phân hủy trong tự nhiên?",
      options: [
        { text: "100-500 năm", correct: true },
        { text: "1-5 năm", correct: false },
        { text: "10-20 năm", correct: false },
        { text: "500-1000 năm", correct: false },
      ],
    },
    {
      question: "Hành động nào giúp giảm rác thải nhựa hiệu quả nhất?",
      options: [
        { text: "Mang bình nước tái sử dụng", correct: true },
        { text: "Đốt rác", correct: false },
        { text: "Vứt rác ra sông", correct: false },
        { text: "Chôn rác", correct: false },
      ],
    },
    {
      question: region.locations[0]?.name + " thải ra khoảng bao nhiêu tấn rác mỗi ngày?",
      options: [
        { text: "~" + (region.locations[0]?.pollutionAdded || 8) * 1000 + " tấn/ngày", correct: true },
        { text: "~100 tấn/ngày", correct: false },
        { text: "~1 tấn/ngày", correct: false },
        { text: "~500 tấn/ngày", correct: false },
      ],
    },
  ];
  return allQuestions.slice(0, 4);
}

// ─── Main WorldMap Component ─────────────────────────────────────────────────

export function WorldMap({
  userId,
  userLevel,
  cardPower,
  onEarnPoints,
  onBossBattle,
  onStoryIntro,
}: WorldMapProps) {
  const [progress, setProgress] = useState<GameProgressData>(DEFAULT_GAME_PROGRESS);
  const [showFull, setShowFull] = useState(false);
  const [showDetail, setShowDetail] = useState<RegionDetailState | null>(null);
  const [showExplore, setShowExplore] = useState<WorldRegion | null>(null);
  const [showBossVictory, setShowBossVictory] = useState(false);
  const [victoryData, setVictoryData] = useState<{
    region: WorldRegion;
    xpEarned: number;
    nextChapter: StoryChapter | null;
  } | null>(null);

  // Load progress on mount
  useEffect(() => {
    const saved = loadGameProgress();
    setProgress(saved);
  }, []);

  // Sync with server
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/game-progress/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.gameProgress) {
            const merged = { ...DEFAULT_GAME_PROGRESS, ...data.gameProgress };
            setProgress(merged);
            saveGameProgress(merged);
          }
        }
      } catch {}
    };
    fetchProgress();
  }, [userId]);

  const handleClean = (region: WorldRegion) => {
    setProgress((prev) => {
      const updated = cleanLocation(prev, region.id, region.locations[0]?.cleanBonus || 10);
      saveGameProgress(updated);
      // Sync to server
      fetch("/api/game-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: userId,
          action: "clean",
          regionId: region.id,
          bonus: region.locations[0]?.cleanBonus || 10,
          progress: updated,
        }),
      }).catch(() => {});
      return updated;
    });
  };

  const handleFail = (region: WorldRegion) => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        pollutionLevels: {
          ...prev.pollutionLevels,
          [region.id]: Math.min(
            region.maxPollution,
            (prev.pollutionLevels[region.id] ?? 100) + (region.locations[0]?.pollutionAdded || 8)
          ),
        },
      };
      saveGameProgress(updated);
      return updated;
    });
  };

  const handleBossVictory = (region: WorldRegion, xp: number) => {
    const nextChapterId = region.chapter + 1;
    const nextChapter = nextChapterId <= 5 ? getChapterById(nextChapterId) ?? null : null;
    setVictoryData({ region, xpEarned: xp, nextChapter });
    setShowBossVictory(true);

    // If there's a next chapter, show story intro after victory
    if (nextChapter) {
      setTimeout(() => {
        onStoryIntro(nextChapterId);
      }, 100);
    }

    setProgress((prev) => {
      const updated = {
        ...prev,
        completedRegions: prev.completedRegions.includes(region.id)
          ? prev.completedRegions
          : [...prev.completedRegions, region.id],
        currentRegion: getRegionById(region.id)?.id || prev.currentRegion,
        activeChapter: Math.max(prev.activeChapter, region.chapter + 1),
      };
      saveGameProgress(updated);
      return updated;
    });
  };

  const handleExplore = (region: WorldRegion) => {
    setShowDetail(null);
    setShowExplore(region);
  };

  return (
    <>
      {/* Mini Map Panel */}
      <MiniMapPanel
        progress={progress}
        onOpenFull={() => setShowFull(true)}
        playerLevel={userLevel}
        cardPower={cardPower}
      />

      {/* Full World Map Overlay */}
      <AnimatePresence>
        {showFull && (
          <FullWorldMap
            progress={progress}
            onSelectRegion={(region) => {
              setShowDetail({ region, view: "detail" });
            }}
            onClose={() => setShowFull(false)}
            playerLevel={userLevel}
            cardPower={cardPower}
          />
        )}
      </AnimatePresence>

      {/* Region Detail Panel */}
      <AnimatePresence>
        {showDetail && (
          <RegionDetail
            {...showDetail}
            progress={progress}
            playerLevel={userLevel}
            cardPower={cardPower}
            onExplore={(region) => {
              setShowDetail(null);
              setShowExplore(region);
            }}
            onBossBattle={(region) => {
              onBossBattle(region.bossCardIds, region.name, region.rewardXP);
              // After boss battle returns, show victory modal
              handleBossVictory(region, region.rewardXP);
            }}
            onClose={() => setShowDetail(null)}
          />
        )}
      </AnimatePresence>

      {/* Exploration Mini-game */}
      <AnimatePresence>
        {showExplore && (
          <ExplorationGame
            region={showExplore}
            progress={progress}
            onClean={() => handleClean(showExplore)}
            onFail={() => handleFail(showExplore)}
            onBossUnlock={() => {
              setShowExplore(null);
            }}
            onClose={() => setShowExplore(null)}
            onEarnPoints={onEarnPoints}
          />
        )}
      </AnimatePresence>

      {/* Boss Victory Modal */}
      <AnimatePresence>
        {showBossVictory && victoryData && (
          <BossVictoryModal
            region={victoryData.region}
            xpEarned={victoryData.xpEarned}
            nextChapter={victoryData.nextChapter}
            onContinue={() => {
              setShowBossVictory(false);
              setVictoryData(null);
              setShowFull(true);
            }}
            onClose={() => {
              setShowBossVictory(false);
              setVictoryData(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
