import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getCardById, CARD_DEFINITIONS, ELEMENTS, getAvatarEmoji } from '../lib/cards';

interface CollectionRevealProps {
  cardIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onCardCollected?: (cardId: number) => void;
}

const ELEMENT_FALLBACK_ICON = '🃏';

export default function CollectionReveal({ cardIds, isOpen, onClose, onCardCollected }: CollectionRevealProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealPhase, setRevealPhase] = useState<'anticipation' | 'flip' | 'rarity' | 'stats' | 'done'>('anticipation');
  const [showDuplicate, setShowDuplicate] = useState(false);

  const validCardIds = useMemo(() => (cardIds ?? []).filter((id) => Number.isFinite(id)), [cardIds]);
  const currentCardId = validCardIds[currentIndex];
  const card = currentCardId !== undefined ? getCardById(currentCardId) ?? CARD_DEFINITIONS.find(c => c.id === currentCardId) : null;
  const rarityId = card?.rarityId ?? 'common';

  const element = useMemo(
    () => (card?.elementId ? ELEMENTS.find(e => e.id === card.elementId) : undefined),
    [card]
  );
  const elementIcon = card?.elementId ? getAvatarEmoji(card.elementId) : ELEMENT_FALLBACK_ICON;

  const handleCollected = useCallback(
    (id: number) => onCardCollected?.(id),
    [onCardCollected]
  );

  useEffect(() => {
    if (!isOpen || !validCardIds.length) return;
    setCurrentIndex(0);
    setRevealPhase('anticipation');
    setShowDuplicate(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setRevealPhase('flip');
    }, 800));

    timers.push(setTimeout(() => {
      setRevealPhase('rarity');
    }, 1700));

    timers.push(setTimeout(() => {
      setRevealPhase('stats');
    }, 3000));

    timers.push(setTimeout(() => {
      if (currentIndex < validCardIds.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRevealPhase('anticipation');
      } else {
        setRevealPhase('done');
      }
    }, 4000));

    return () => timers.forEach(clearTimeout);
  }, [isOpen, validCardIds, currentIndex]);

  useEffect(() => {
    if (revealPhase === 'done' && currentCardId !== undefined) {
      handleCollected(currentCardId);
    }
  }, [revealPhase, currentCardId, handleCollected]);

  // Refined palette — one accent per rarity, muted tones, no rainbow/glitch.
  // Each rarity signals rarity through a single restrained accent color, a
  // subtle 1px foil border, and a soft inner shadow. No screen-wide flashes,
  // no hue-rotation, no rainbow gradients.
  const rarityConfig: Record<string, {
    accent: string;
    accentSoft: string;
    particles: number;
    bgFrom: string;
    bgTo: string;
    borderGlow: string;
  }> = {
    common: {
      accent: '#94a3b8', accentSoft: 'rgba(148,163,184,0.18)',
      particles: 4,
      bgFrom: '#fafaf9', bgTo: '#f1f5f9',
      borderGlow: 'rgba(148,163,184,0.25)',
    },
    uncommon: {
      accent: '#10b981', accentSoft: 'rgba(16,185,129,0.16)',
      particles: 6,
      bgFrom: '#fafaf9', bgTo: '#ecfdf5',
      borderGlow: 'rgba(16,185,129,0.28)',
    },
    rare: {
      accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.16)',
      particles: 8,
      bgFrom: '#fafaf9', bgTo: '#eff6ff',
      borderGlow: 'rgba(59,130,246,0.3)',
    },
    epic: {
      accent: '#7c3aed', accentSoft: 'rgba(124,58,237,0.18)',
      particles: 10,
      bgFrom: '#fafaf9', bgTo: '#f5f3ff',
      borderGlow: 'rgba(124,58,237,0.32)',
    },
    legendary: {
      accent: '#b45309', accentSoft: 'rgba(180,83,9,0.20)',
      particles: 12,
      bgFrom: '#fbf7ee', bgTo: '#fef3c7',
      borderGlow: 'rgba(180,83,9,0.35)',
    },
    mythical: {
      accent: '#be123c', accentSoft: 'rgba(190,18,60,0.18)',
      particles: 14,
      bgFrom: '#fafaf9', bgTo: '#fff1f2',
      borderGlow: 'rgba(190,18,60,0.35)',
    },
    event: {
      accent: '#0f766e', accentSoft: 'rgba(15,118,110,0.18)',
      particles: 14,
      bgFrom: '#fafaf9', bgTo: '#f0fdfa',
      borderGlow: 'rgba(15,118,110,0.35)',
    },
  };

  const config = rarityConfig[rarityId] ?? rarityConfig.common;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Soft ambient particles — small, slow, single color per rarity */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
            {Array.from({ length: config.particles }).map((_, i) => (
              <motion.div
                key={`particle-${currentIndex}-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ background: config.accent, left: '50%', top: '50%', opacity: 0.5 }}
                initial={{ x: 0, y: 0, opacity: 0.5, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 320,
                  y: (Math.random() - 0.5) * 320,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Card reveal */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 180, delay: 0.15 }}
          >
            {/* Card */}
            <motion.div
              className="relative w-64 h-96 rounded-2xl overflow-hidden ring-1 ring-black/5"
              style={{
                background: config.bgFrom && config.bgTo
                  ? 'linear-gradient(160deg, ' + config.bgFrom + ' 0%, ' + config.bgTo + ' 100%)'
                  : undefined,
                boxShadow: config.borderGlow
                  ? '0 1px 2px rgba(15,23,42,0.06), 0 12px 32px -8px ' + config.borderGlow + ', inset 0 1px 0 rgba(255,255,255,0.6)'
                  : '0 1px 2px rgba(15,23,42,0.06)',
              }}
            >
              {/* Element accent strip — subtle vertical line on the left edge */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: 'linear-gradient(180deg, transparent, ' + config.accent + ' 20%, ' + config.accent + ' 80%, transparent)' }}
              />

              {/* Card content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-5 text-slate-900">
                {/* Rarity badge */}
                <motion.div
                  className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: config.accent, background: config.accentSoft }}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {t(rarityId)}
                </motion.div>

                {/* Element icon — small, slight desaturation */}
                <motion.div
                  className="text-4xl mt-6 mb-2"
                  style={{ filter: 'grayscale(0.15)' }}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 180, damping: 18 }}
                >
                  {elementIcon}
                </motion.div>

                {/* Card name */}
                <motion.h3
                  className="text-lg font-bold text-center leading-tight tracking-tight text-slate-900"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  {card?.name ?? t("cards.unknown")}
                </motion.h3>

                {/* Element name flanked by accent dots */}
                <motion.div
                  className="mt-1 mb-3 flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: config.accent }} />
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">
                    {element?.nameShort ?? card?.elementId ?? ''}
                  </p>
                  <span className="w-1 h-1 rounded-full" style={{ background: config.accent }} />
                </motion.div>

                {/* Card subtitle */}
                {card?.subtitle ? (
                  <motion.p
                    className="text-xs text-slate-500 text-center px-2 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    {card.subtitle}
                  </motion.p>
                ) : null}

                {/* Stats — clean row, accent color on numbers */}
                <motion.div
                  className="mt-auto grid grid-cols-3 gap-2 w-full pt-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                >
                  {[
                    { label: 'ATK', value: card?.atk ?? 0 },
                    { label: 'HP', value: card?.hp ?? 0 },
                    { label: 'DEF', value: card?.def ?? 0 },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-lg py-1.5 text-center bg-white/60 backdrop-blur-sm"
                      style={{ boxShadow: 'inset 0 0 0 1px ' + config.accentSoft }}
                    >
                      <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">{stat.label}</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: config.accent }}>{stat.value}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Subtle foil highlight — only for rare+, slow sweep with soft-light blend */}
              {(rarityId === 'rare' || rarityId === 'epic' || rarityId === 'legendary' || rarityId === 'mythical' || rarityId === 'event') && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(115deg, transparent 40%, ' + config.accentSoft + ' 50%, transparent 60%)',
                    backgroundSize: '220% 220%',
                    animation: 'card-shimmer 4s linear infinite',
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}
            </motion.div>

            {/* NEW CARD badge — minimal, monochrome */}
            {revealPhase === 'flip' && (
              <motion.div
                className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-wider shadow-md ring-1 ring-black/5"
                style={{ color: config.accent }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.3 }}
              >
                {t('collection.newCard')}
              </motion.div>
            )}
          </motion.div>

          {/* Progress indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {validCardIds.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: i < currentIndex ? config.accent : i === currentIndex ? config.accent : 'rgba(148,163,184,0.3)',
                  transform: i === currentIndex ? 'scale(1.6)' : 'scale(1)',
                  opacity: i <= currentIndex ? 1 : 0.35,
                }}
              />
            ))}
          </div>

          {/* Done state */}
          {revealPhase === 'done' && (
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <button
                onClick={onClose}
                className="px-7 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-md hover:bg-slate-800 transition-colors"
              >
                {t('collection.viewCollection')}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
