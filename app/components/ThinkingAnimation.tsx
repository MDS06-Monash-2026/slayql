'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface ThinkingStep {
  icon: string;
  text: string;
}

const steps: ThinkingStep[] = [
  { icon: '🔍', text: 'Analyzing request...' },
  { icon: '📋', text: 'Identifying relevant tables...' },
  { icon: '🔗', text: 'Checking relationships (joins)...' },
  { icon: '🧮', text: 'Determining aggregations...' },
  { icon: '⏳', text: 'Applying filters...' },
  { icon: '⚡', text: 'Optimizing query...' },
  { icon: '✅', text: 'Generating final SQL...' },
];

interface ThinkingAnimationProps {
  onComplete: () => void;
  speed?: number; // ms per step
}

export default function ThinkingAnimation({ onComplete, speed = 800 }: ThinkingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  // Default collapsed — user clicks the pill to peek inside if curious.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (!completed) {
      setCompleted(true);
      onComplete();
    }
  }, [currentStep, completed, onComplete, speed]);

  // Step label shown inside the collapsed pill — keeps the user aware of progress.
  const activeStepLabel =
    currentStep < steps.length ? steps[currentStep].text : 'Finalizing...';
  const displayedStep = Math.min(currentStep + 1, steps.length);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header pill — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/30 transition-all duration-200"
        title={expanded ? 'Hide thinking steps' : 'Show thinking steps'}
      >
        <span className="relative inline-flex items-center justify-center w-5 h-5">
          <Brain className="w-4.5 h-4.5 text-cyan-300/90 group-hover:text-cyan-300 transition-colors" />
          {!completed && (
            <span className="absolute -right-1 -bottom-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </span>

        <span className="text-sm font-semibold text-white/80 group-hover:text-white">
          Thinking
        </span>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/40 group-hover:text-white/70" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white/70" />
        )}
      </button>

      {/* Collapsible body — full step checklist */}
      <div
        className={`grid transition-all duration-400 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="bg-[#0a101d]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 space-y-1.5">
            {steps.map((step, i) => {
              const isActive = i === currentStep && !completed;
              const isDone = i < currentStep;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-cyan-500/10 border border-cyan-500/20'
                      : isDone
                      ? 'bg-emerald-500/5 border border-transparent'
                      : 'opacity-20'
                  }`}
                >
                  <span className="text-base">{isDone ? '✅' : isActive ? step.icon : '⬜'}</span>
                  <span
                    className={`text-xs font-mono ${
                      isDone
                        ? 'text-emerald-400/80 line-through'
                        : isActive
                        ? 'text-cyan-200'
                        : 'text-white/30'
                    }`}
                  >
                    {step.text}
                  </span>
                  {isActive && <Loader2 className="w-3 h-3 ml-auto text-cyan-400 animate-spin" />}
                  {isDone && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
