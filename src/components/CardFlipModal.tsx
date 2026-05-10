"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, X, PartyPopper } from "lucide-react";
import type { MaskedCard } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;

  const defaults = {
    spread: 80,
    ticks: 100,
    gravity: 0.8,
    decay: 0.92,
    startVelocity: 35,
    colors: ["#6366f1", "#818cf8", "#c7d2fe", "#22c55e", "#f59e0b"],
  };

  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
  }, 200);
}

const SHELL_WIDTH = "w-full max-w-5xl px-6";

interface CardFlipModalProps {
  cards: MaskedCard[];
  allFlipped: boolean;
  onCardClick: (cardIndex: number) => void;
  onClose: () => void;
}

export default function CardFlipModal({
  cards,
  allFlipped,
  onCardClick,
  onClose,
}: CardFlipModalProps) {
  const [entered, setEntered] = useState(false);
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => setEntered(true));
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (allFlipped && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const id = setTimeout(fireConfetti, 300);
      return () => clearTimeout(id);
    }
  }, [allFlipped]);

  const flippedCount = cards.filter((c) => c.isFlipped).length;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800/90 via-primary-700/85 to-primary-900/90 backdrop-blur-sm" />

      <div className={`relative z-10 ${SHELL_WIDTH} pt-6 pb-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <PartyPopper className="text-white/80" size={22} />
          <h2 className="text-lg font-bold text-white">청소 배정 결과</h2>
          <span className="text-sm text-white/60">
            {flippedCount}/{cards.length}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className={`relative z-10 flex-1 ${SHELL_WIDTH} pb-4 overflow-y-auto`}>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {cards.map((card, index) => (
            <div
              key={card.cardIndex}
              data-testid={`flip-card-${card.cardIndex}`}
              className={`flip-card aspect-[3/4] ${card.isFlipped ? "cursor-default" : "cursor-pointer transition-transform duration-100 active:scale-95"}`}
              onClick={card.isFlipped ? undefined : () => onCardClick(card.cardIndex)}
              style={{
                animation: `card-enter 0.4s var(--ease-out-expo) ${index * 0.06}s both`,
              }}
            >
              <div className={`flip-card-inner ${card.isFlipped ? "flipped" : ""}`}>
                <div className="flip-card-front bg-surface border border-white/20 shadow-card-hover flex flex-col items-center justify-center gap-2 p-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <CircleHelp size={20} className="text-primary-500" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-text-primary text-center leading-tight">
                    {card.employeeName}
                  </span>
                  <span className="text-[10px] text-text-tertiary">터치하여 공개</span>
                </div>

                <div
                  className={`flip-card-back flex flex-col items-center justify-center gap-2 p-3 border-2 ${
                    card.isFree
                      ? "bg-surface-tertiary border-border"
                      : "bg-primary-100 border-primary-400 shadow-card-hover"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold text-text-primary text-center leading-tight">
                    {card.employeeName}
                  </span>
                  {card.dutyItemName !== null && (
                    <span data-testid={`flip-card-${card.cardIndex}-item`}>
                      <Badge
                        variant={card.isFree ? "neutral" : "primary"}
                        className="text-xs sm:text-sm"
                      >
                        {card.dutyItemName}
                      </Badge>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`relative z-10 ${SHELL_WIDTH} py-4 flex justify-center gap-3`}>
        {allFlipped && (
          <Button variant="gradient-primary" size="lg" onClick={onClose}>
            확인
          </Button>
        )}
      </div>
    </div>
  );
}
