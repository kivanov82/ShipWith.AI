'use client';

import { type FC } from 'react';

interface Payment {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: string;
  timestamp: number;
}

interface PaymentLogProps {
  payments: Payment[];
}

export const PaymentLog: FC<PaymentLogProps> = ({ payments }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          💳 Payments
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            Base Sepolia
          </span>
        </h3>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {payments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-3xl mb-2">💸</div>
            <p className="text-sm">No payments yet</p>
            <p className="text-xs mt-1">x402 transactions will appear here</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {payments.map((payment) => (
              <li key={payment.id} className="p-4 hover:bg-gray-800/50 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{payment.from}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-400">{payment.to}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    payment.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : payment.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {payment.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-green-400">{payment.amount} USDC</span>
                  <span className="text-xs text-gray-500">
                    {new Date(payment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
