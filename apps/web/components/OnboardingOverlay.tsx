'use client';

import { useEffect, useState, useCallback } from 'react';
import { useShipWithAIStore } from '@/lib/store';
import { X, ChevronRight, HelpCircle } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target: string | null; // CSS selector, null for centered overlay
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ShipWith.AI',
    content: 'A team of 12 AI agents ready to build your Web3 frontend app. Let\'s take a quick tour.',
    target: null,
    position: 'center',
  },
  {
    id: 'agents',
    title: 'Meet the Agents',
    content: 'Each circle is a specialist. Inner ring: core team (PM, UX, Design). Outer rings: developers and support.',
    target: '.agent-circle-container',
    position: 'bottom',
  },
  {
    id: 'chat',
    title: 'Chat with Agents',
    content: 'Click the chat icon on any agent to ask questions for free. Click the briefcase icon for paid work.',
    target: '.agent-circle-container',
    position: 'bottom',
  },
  {
    id: 'session',
    title: 'Build Context',
    content: 'Start a session to chat with multiple agents and build context for your project.',
    target: '.session-panel',
    position: 'left',
  },
  {
    id: 'delivery',
    title: 'Request Delivery',
    content: 'When you\'re ready, request delivery from all agents. They\'ll start working on your project.',
    target: '.session-panel',
    position: 'left',
  },
  {
    id: 'wallet',
    title: 'Connect Your Wallet',
    content: 'Connect a wallet on Base to make USDC payments to agents for their work.',
    target: '.wallet-button',
    position: 'bottom',
  },
];

export function OnboardingOverlay() {
  const { onboardingStep, nextOnboardingStep, skipOnboarding, activeUseCase } = useShipWithAIStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = onboardingStep !== null ? STEPS[onboardingStep] : null;

  const updateTargetRect = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [updateTargetRect]);

  // Skip onboarding when user came through the use-case wizard
  if (activeUseCase) return null;
  if (onboardingStep === null || !currentStep) return null;

  const isCenter = currentStep.position === 'center' || !targetRect;

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (!isCenter && targetRect) {
    const pad = 16;
    switch (currentStep.position) {
      case 'bottom':
        tooltipStyle = {
          top: targetRect.bottom + pad,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      case 'top':
        tooltipStyle = {
          bottom: window.innerHeight - targetRect.top + pad,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      case 'left':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + pad,
          transform: 'translateY(-50%)',
        };
        break;
      case 'right':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + pad,
          transform: 'translateY(-50%)',
        };
        break;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={skipOnboarding} />

      {/* Spotlight cutout */}
      {targetRect && !isCenter && (
        <div
          className="absolute border-2 border-emerald-500/50 rounded-lg"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={`pointer-events-auto ${
          isCenter
            ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'absolute'
        }`}
        style={isCenter ? {} : tooltipStyle}
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-xs shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">{currentStep.title}</h4>
            <button
              onClick={skipOnboarding}
              className="p-0.5 hover:bg-zinc-800 rounded transition-colors -mt-0.5 -mr-0.5"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{currentStep.content}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              {onboardingStep + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={skipOnboarding}
                className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={nextOnboardingStep}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {onboardingStep === STEPS.length - 1 ? 'Done' : 'Next'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Help button to re-trigger onboarding
export function OnboardingHelpButton() {
  const { startOnboarding, onboardingStep } = useShipWithAIStore();

  if (onboardingStep !== null) return null;

  return (
    <button
      onClick={startOnboarding}
      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors group"
      title="Take a tour"
    >
      <HelpCircle className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
    </button>
  );
}
