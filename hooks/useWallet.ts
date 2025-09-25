import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Wallet {
  id: number;
  balance: string;
  currency: string;
}

interface Transaction {
  id: number;
  type: 'deposit' | 'withdrawal' | 'server_payment' | 'refund';
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  created_at: string;
}

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Authentication error');
        setWallet(null);
        setTransactions([]);
        return;
      }

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setWallet(null);
        setTransactions([]);
        setError(null); // Not an error, just not authenticated
        return;
      }

      const res = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API response not ok:', res.status, errorText);
        setError(`API error: ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        console.log('Wallet loaded:', data.wallet, 'Balance:', data.wallet?.balance);
        setWallet(data.wallet);
        setTransactions(data.transactions);
        setError(null);
      } else {
        console.error('API returned error:', data.error);
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Load wallet error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFunds = useCallback(async (amount: number, description?: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error in addFunds:', sessionError);
        return { success: false, error: 'Authentication error' };
      }

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ amount, description }),
        cache: 'no-store'
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Add funds API error:', res.status, errorText);
        return { success: false, error: `API error: ${res.status}` };
      }

      const data = await res.json();
      if (data.ok) {
        console.log('Funds added successfully, new balance:', data.balance);
        await loadWallet(); // Reload wallet data
        return { success: true, balance: data.balance };
      } else {
        console.error('Add funds returned error:', data.error);
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      console.error('Add funds catch error:', err);
      return { success: false, error: err.message };
    }
  }, [loadWallet]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Listen for auth state changes to reload wallet
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadWallet();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadWallet]);

  const balance = wallet ? parseFloat(wallet.balance) : 0;

  return {
    wallet,
    balance,
    transactions,
    loading,
    error,
    loadWallet,
    addFunds
  };
}