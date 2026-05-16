import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthProvider';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface BalanceCache {
  balance: string;
  timestamp: number;
}

export function useUserBalance() {
  const { isAuthenticated } = useAuthContext();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchBalance = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setBalance('0');
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const now = Date.now();
      if (now - lastFetch < CACHE_DURATION) {
        return; // Use cached data
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use our internal API route instead of calling external API directly
      const response = await fetch('/api/tokens/balance', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch balance');
      }
      
      const newBalance = data.token_balance?.toString() || '0';
      
      setBalance(newBalance);
      setLastFetch(Date.now());
      
      // Cache in localStorage
      const cacheData: BalanceCache = {
        balance: newBalance,
        timestamp: Date.now(),
      };
      localStorage.setItem('user_balance_cache', JSON.stringify(cacheData));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, lastFetch]);

  // Load cached balance on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setBalance('0');
      setError(null);
      return;
    }

    try {
      const cached = localStorage.getItem('user_balance_cache');
      if (cached) {
        const cacheData: BalanceCache = JSON.parse(cached);
        const now = Date.now();
        
        if (now - cacheData.timestamp < CACHE_DURATION) {
          setBalance(cacheData.balance);
          setLastFetch(cacheData.timestamp);
          return; // Use cached data, don't fetch
        }
      }
    } catch (error) {
      console.error('Failed to load cached balance:', error);
    }

    // No valid cache, fetch fresh data
    fetchBalance();
  }, [isAuthenticated, fetchBalance]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance(true);
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refreshBalance,
  };
} 