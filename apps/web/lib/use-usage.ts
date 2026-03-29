'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_TOKEN_KEY = 'shipwithai-session-token';

interface UsageState {
  chatCount: number;
  tier: 'anonymous' | 'connected' | 'funded';
  limit: number;
  remaining: number;
  isLimitReached: boolean;
}

function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function useUsage(walletAddress?: string, hasFunds?: boolean) {
  const [usage, setUsage] = useState<UsageState>({
    chatCount: 0,
    tier: 'anonymous',
    limit: 10,
    remaining: 10,
    isLimitReached: false,
  });

  const sessionToken = typeof window !== 'undefined' ? getSessionToken() : '';

  const fetchUsage = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const params = new URLSearchParams({ sessionToken });
      if (walletAddress) params.set('walletAddress', walletAddress);
      if (hasFunds) params.set('hasFunds', 'true');

      const res = await fetch(`/api/usage?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsage(data.usage);
      }
    } catch {}
  }, [sessionToken, walletAddress, hasFunds]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const incrementChat = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, walletAddress, hasFunds }),
      });
      const data = await res.json();
      if (data.success) {
        setUsage(data.usage);
      }
    } catch {}
  }, [sessionToken, walletAddress, hasFunds]);

  return { ...usage, incrementChat };
}
