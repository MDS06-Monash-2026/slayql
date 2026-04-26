'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

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

  return (
    <div className="bg-[#0a101d]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs font-mono text-cyan-400/80">Thinking...</span>
      </div>
      <div className="space-y-2">
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
  );
}
