'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, Check, X } from 'lucide-react';
import { type UseCaseConfig, type QuestionStep, GITHUB_STEP } from '@/lib/use-cases';
import { useAgentverseStore } from '@/lib/store';

interface Props {
  config: UseCaseConfig;
}

export function UseCaseWizard({ config }: Props) {
  const router = useRouter();
  const initializeFromUseCase = useAgentverseStore((s) => s.initializeFromUseCase);

  // Build steps: use-case questions + GitHub question
  const steps: QuestionStep[] = [...config.questions, GITHUB_STEP];
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | null>>({});
  const [direction, setDirection] = useState(1);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const value = answers[step.id] ?? (step.type === 'checkbox-group' ? [] : '');
  const canContinue = !step.required || (
    step.type === 'checkbox-group'
      ? (value as string[]).length > 0
      : typeof value === 'string' && value.trim().length > 0
  );

  const setAnswer = useCallback((val: string | string[] | null) => {
    setAnswers((prev) => ({ ...prev, [step.id]: val }));
  }, [step.id]);

  const next = () => {
    if (isLast) {
      // Complete — initialize and go to dashboard
      initializeFromUseCase(config.id, answers);
      router.push('/dashboard');
      return;
    }
    setDirection(1);
    setCurrentStep((s) => s + 1);
  };

  const back = () => {
    if (isFirst) {
      router.push('/');
      return;
    }
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  };

  const toggleCheckbox = (val: string) => {
    const current = (value as string[]) || [];
    if (current.includes(val)) {
      setAnswer(current.filter((v) => v !== val));
    } else {
      setAnswer([...current, val]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <button
          onClick={back}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isFirst ? 'Home' : 'Back'}</span>
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep
                ? 'w-8 bg-white'
                : i < currentStep
                ? 'w-1.5 bg-zinc-500'
                : 'w-1.5 bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {/* Question label */}
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                {config.label}
              </p>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
                {step.question}
              </h2>

              {/* Input */}
              {step.type === 'text' || step.type === 'url' ? (
                <input
                  type={step.type === 'url' ? 'url' : 'text'}
                  value={(value as string) || ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={step.placeholder}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && canContinue && next()}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-base placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              ) : step.type === 'textarea' ? (
                <textarea
                  value={(value as string) || ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={step.placeholder}
                  autoFocus
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-base placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              ) : step.type === 'file-upload' ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center gap-2 w-full h-32 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-600 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-500" />
                    <span className="text-sm text-zinc-500">
                      {value ? 'File selected' : 'Click to upload or drag & drop'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.fig,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setAnswer(file ? file.name : null);
                      }}
                    />
                  </label>
                  {!step.required && !value && (
                    <button
                      onClick={next}
                      className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                    >
                      Skip — design from scratch
                    </button>
                  )}
                </div>
              ) : step.type === 'checkbox-group' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {step.options?.map((opt) => {
                    const selected = (value as string[])?.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleCheckbox(opt.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-white/20 bg-white/5 text-white'
                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'border-white bg-white' : 'border-zinc-700'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : step.type === 'radio' ? (
                <div className="grid grid-cols-1 gap-2">
                  {step.options?.map((opt) => {
                    const selected = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAnswer(opt.value)}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-white/20 bg-white/5 text-white'
                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'border-white' : 'border-zinc-700'
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 md:px-6 py-4 pb-8">
        <div className="max-w-lg mx-auto">
          <button
            onClick={next}
            disabled={!canContinue}
            className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all ${
              canContinue
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLast ? "Let's go!" : 'Continue'}
            {!isLast && <ArrowRight className="w-4 h-4 inline ml-1.5" />}
          </button>
          {step.type === 'checkbox-group' && !step.required && (
            <button
              onClick={next}
              className="w-full mt-2 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
