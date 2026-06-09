import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight, SkipForward, Globe, Star } from "lucide-react";
import { StoryChapter } from "../data/storyChapters";

interface StoryIntroProps {
  chapter: StoryChapter;
  onContinue: () => void;
  onSkip?: () => void;
  seenScenes?: Set<string>;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed((prev) => prev + text[indexRef.current]);
        indexRef.current++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

export function StoryIntro({ chapter, onContinue, onSkip, seenScenes }: StoryIntroProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const isReplay = seenScenes?.has(chapter.scene);
  const lines = [
    chapter.introText,
    chapter.pollutionBackground,
    chapter.cleanVision,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col"
      style={{
        background: "linear-gradient(180deg, #030712 0%, #0a1628 50%, #0f2744 100%)",
      }}
    >
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full bg-white"
            style={{
              left: `${((i * 17) % 100)}%`,
              top: `${((i * 23) % 100)}%`,
            }}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{
              duration: 2 + (i % 4),
              repeat: Infinity,
              delay: (i % 5) * 0.5,
            }}
          />
        ))}
      </div>

      {/* Chapter badge */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-none pt-12 pb-6 px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-1.5 mb-3">
          <Globe size={12} className="text-amber-400" />
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            Chương {chapter.id}
          </span>
        </div>
        <h1 className="font-black text-white text-3xl mb-1">{chapter.title}</h1>
        <p className="text-slate-400 text-sm font-medium">{chapter.subtitle}</p>
      </motion.div>

      {/* Story content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <motion.div
          key={lineIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md text-center"
        >
          {/* Location name */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              {chapter.locationName}
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          {/* Main text */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 mb-6 shadow-xl">
            <p className="text-white text-sm leading-relaxed font-medium">
              <TypewriterText key={`${chapter.id}-${lineIndex}`} text={lines[lineIndex] || ""} />
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {lines.map((_, i) => (
              <button
                key={i}
                onClick={() => setLineIndex(i)}
                className={`transition-all rounded-full ${
                  i === lineIndex
                    ? "w-6 h-2 bg-amber-400"
                    : i < lineIndex
                    ? "w-2 h-2 bg-cyan-400"
                    : "w-2 h-2 bg-slate-600"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex-none p-6 space-y-3">
        {/* Replay indicator */}
        {isReplay && (
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <SkipForward size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Đã xem — có thể bỏ qua
            </span>
          </div>
        )}

        {/* Next / Continue */}
        {lineIndex < lines.length - 1 ? (
          <button
            onClick={() => setLineIndex((i) => i + 1)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
          >
            Tiếp tục
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 animate-pulse"
          >
            <Star size={16} />
            Bắt đầu hành trình
          </button>
        )}

        {/* Skip */}
        {(isReplay || lineIndex > 0) && (
          <button
            onClick={onSkip || onContinue}
            className="w-full py-2 text-slate-500 text-xs hover:text-slate-300 transition-colors font-bold"
          >
            Bỏ qua cutscene
          </button>
        )}
      </div>
    </motion.div>
  );
}
