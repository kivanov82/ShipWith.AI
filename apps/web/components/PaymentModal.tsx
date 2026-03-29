'use client';

import { useState } from 'react';
import { X, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeliveryRequest } from '@/lib/store';

interface PaymentModalProps {
  deliveries: DeliveryRequest[];
  agentNames: Record<string, string>;
  isWalletConnected: boolean;
  usdcBalance?: number;
  onPay: (deliveryIds: string[]) => Promise<{ txHash?: string; error?: string }>;
  onClose: () => void;
}

type PaymentState = 'review' | 'signing' | 'pending' | 'confirmed' | 'error';

export function PaymentModal({
  deliveries,
  agentNames,
  isWalletConnected,
  usdcBalance,
  onPay,
  onClose,
}: PaymentModalProps) {
  const [state, setState] = useState<PaymentState>('review');
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();

  const totalCost = deliveries.reduce((sum, d) => {
    const cost = parseFloat(d.estimatedCost.replace('$', '')) || 0;
    return sum + cost;
  }, 0);

  const canPay = isWalletConnected && (usdcBalance ?? 0) >= totalCost;

  const handlePay = async () => {
    setState('signing');
    try {
      const result = await onPay(deliveries.map(d => d.id));
      if (result.error) {
        setError(result.error);
        setState('error');
      } else {
        setTxHash(result.txHash);
        setState('pending');
        // After a short delay, mark as confirmed (in production, wait for receipt)
        setTimeout(() => setState('confirmed'), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">
            {state === 'confirmed' ? 'Payment Confirmed' : 'Confirm Payment'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {state === 'confirmed' ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 mb-2">Payment successful! Agents are starting work.</p>
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  View on BaseScan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : state === 'error' ? (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-400 mb-2">{error || 'Payment failed'}</p>
              <button
                onClick={() => setState('review')}
                className="text-xs text-zinc-400 hover:text-zinc-300"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Cost breakdown */}
              <div className="space-y-2 mb-4">
                {deliveries.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{agentNames[d.agentId] || d.agentId}</span>
                    <span className="text-zinc-200 font-mono">{d.estimatedCost}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-800 pt-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-300 font-medium">Total</span>
                  <span className="text-white font-mono font-semibold">${totalCost.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Balance info */}
              {isWalletConnected && (
                <div className="text-[10px] text-zinc-500 mb-4">
                  Your balance: {usdcBalance?.toFixed(2) ?? '—'} USDC
                  {!canPay && usdcBalance !== undefined && (
                    <span className="text-red-400 ml-1">(insufficient)</span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {state === 'signing' || state === 'pending' ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {state === 'signing' ? 'Confirm in wallet...' : 'Waiting for confirmation...'}
                </div>
              ) : !isWalletConnected ? (
                <p className="text-xs text-center text-zinc-500 py-2">
                  Connect your wallet to make payments
                </p>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={!canPay}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Pay ${totalCost.toFixed(2)} USDC
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
