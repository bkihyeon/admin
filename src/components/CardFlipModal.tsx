"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CircleHelp, X, Eye, PartyPopper } from "lucide-react";
import { CleaningDuty } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface EmployeeCard {
  employeeName: string;
  dutyItemName: string;
  isFree: boolean;
}

function buildEmployeeCards(duty: CleaningDuty): EmployeeCard[] {
  const cards: EmployeeCard[] = [];

  for (const assignment of duty.assignments) {
    for (const name of assignment.assignedEmployeeNames) {
      cards.push({
        employeeName: name,
        dutyItemName: assignment.dutyItemName,
        isFree: false,
      });
    }
  }

  const freeEntry = duty.freeEmployee;
  if (freeEntry) {
    for (const name of freeEntry.employeeNames) {
      cards.push({
        employeeName: name,
        dutyItemName: "프리",
        isFree: true,
      });
    }
  }

  return cards;
}

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

interface CardFlipModalProps {
  duty: CleaningDuty;
  onClose: () => void;
}

export default function CardFlipModal({ duty, onClose }: CardFlipModalProps) {
  const [cards] = useState(() => buildEmployeeCards(duty));
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [isRevealing, setIsRevealing] = useState(false);
  const [entered, setEntered] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => setEntered(true));
    return () => {
      document.body.style.overflow = prev;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const allFlipped = flipped.size === cards.length;

  const flipCard = useCallback(
    (index: number) => {
      if (isRevealing) return;

      setFlipped((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        if (next.size === cards.length) {
          const id = setTimeout(fireConfetti, 300);
          timersRef.current.push(id);
        }
        return next;
      });
    },
    [isRevealing, cards.length],
  );

  const revealAll = useCallback(() => {
    if (isRevealing || allFlipped) return;
    setIsRevealing(true);

    const unflippedIndices = cards
      .map((_, i) => i)
      .filter((i) => !flipped.has(i));

    unflippedIndices.forEach((cardIndex, seqIndex) => {
      const id = setTimeout(() => {
        setFlipped((prev) => {
          const next = new Set(prev);
          next.add(cardIndex);

          if (next.size === cards.length) {
            const confettiId = setTimeout(fireConfetti, 300);
            timersRef.current.push(confettiId);
            setIsRevealing(false);
          }
          return next;
        });
      }, seqIndex * 250);
      timersRef.current.push(id);
    });
  }, [isRevealing, allFlipped, cards, flipped]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800/90 via-primary-700/85 to-primary-900/90 backdrop-blur-sm" />

      {/* Header */}
      <div className="relative z-10 w-full max-w-3xl px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PartyPopper className="text-white/80" size={22} />
          <h2 className="text-lg font-bold text-white">청소 배정 결과</h2>
          <span className="text-sm text-white/60">
            {flipped.size}/{cards.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="relative z-10 flex-1 w-full max-w-3xl px-6 pb-4 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((card, index) => (
            <div
              key={index}
              className="flip-card aspect-[3/4] cursor-pointer"
              onClick={() => flipCard(index)}
              style={{
                animation: `card-enter 0.4s var(--ease-out-expo) ${index * 0.06}s both`,
              }}
            >
              <div className={`flip-card-inner ${flipped.has(index) ? "flipped" : ""}`}>
                {/* Front — 직원 이름 + ? */}
                <div className="flip-card-front bg-surface border border-white/20 shadow-card-hover flex flex-col items-center justify-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <CircleHelp size={22} className="text-primary-500" />
                  </div>
                  <span className="text-sm font-semibold text-text-primary text-center leading-tight">
                    {card.employeeName}
                  </span>
                  <span className="text-[11px] text-text-tertiary">터치하여 공개</span>
                </div>

                {/* Back — 배정 항목 */}
                <div
                  className={`flip-card-back flex flex-col items-center justify-center gap-3 p-4 border ${
                    card.isFree
                      ? "bg-surface-tertiary border-border"
                      : "bg-surface border-primary-200"
                  }`}
                >
                  <span className="text-sm font-semibold text-text-primary text-center">
                    {card.employeeName}
                  </span>
                  <Badge variant={card.isFree ? "neutral" : "primary"} className="text-sm">
                    {card.dutyItemName}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full max-w-3xl px-6 py-4 flex justify-center gap-3">
        {!allFlipped && (
          <Button
            variant="gradient-primary"
            size="lg"
            onClick={revealAll}
            disabled={isRevealing}
          >
            <Eye size={18} />
            {isRevealing ? "공개 중..." : "전체 공개"}
          </Button>
        )}
        {allFlipped && (
          <Button variant="gradient-primary" size="lg" onClick={onClose}>
            확인
          </Button>
        )}
      </div>
    </div>
  );
}
