'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FaWallet,
  FaPlus,
  FaBitcoin,
  FaEthereum,
  FaCoins,
  FaHistory,
  FaArrowUp,
  FaArrowDown,
  FaCopy,
  FaCheckCircle,
  FaDollarSign,
  FaBolt,
  FaServer
} from 'react-icons/fa';
import { Currency } from '@/lib/nowpayments';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'server_payment';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  description: string;
}

export default function Wallet() {
  const router = useRouter();
  const { balance, transactions, loading, addFunds, loadWallet } = useWallet();
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    loadCurrencies()
  }, [])

  const loadCurrencies = async () => {
    setLoadingCurrencies(true)
    try {
      const response = await fetch('/api/crypto/currencies')
      const data = await response.json()

      if (data.success) {
        setCurrencies(data.currencies)
      } else {
        console.error('Failed to load supported currencies')
      }
    } catch {
      console.error('Failed to load supported currencies')
    } finally {
      setLoadingCurrencies(false)
    }
  }

  // Featured currencies to display as buttons
  const featuredCurrencyCodes = ['btc', 'eth', 'usdttrc20', 'xmr'];
  const featuredCurrencies = currencies.filter(c =>
    featuredCurrencyCodes.includes(c.code.toLowerCase())
  );
  const otherCurrencies = currencies.filter(c =>
    !featuredCurrencyCodes.includes(c.code.toLowerCase())
  );

  const handleDeposit = async () => {
    if (!depositAmount || !selectedCurrency) return;

    setIsLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const numAmount = parseFloat(depositAmount);

      const response = await fetch('/api/crypto/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: selectedCurrency
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }
      setTimeout(() => {
        router.push(`/payments/${data.payment_id}`);
      }, 2000);

    } catch (error) {
      console.error('Deposit failed:', error);
      setShowSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-8"
    >
      {/* Wallet Overview */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-medium text-white mb-6">Billing & Payments</h1>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-medium text-white mb-4">Account Balance</h2>
                <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/60">Available Balance</span>
                    <span className="text-3xl font-medium text-white">${balance.toFixed(2)}</span>
                  </div>
                  <div className="text-white/50 text-sm">USD Equivalent</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 text-center rounded-xl">
                  <FaDollarSign className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-lg font-medium text-white">${balance.toFixed(2)}</p>
                  <p className="text-white/60 text-xs">Available</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 text-center rounded-xl">
                  <FaBolt className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-lg font-medium text-white">$0.00</p>
                  <p className="text-white/60 text-xs">Reserved</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 text-center rounded-xl">
                  <FaHistory className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-lg font-medium text-white">{transactions.length}</p>
                  <p className="text-white/60 text-xs">Transactions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deposit and History */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deposit Section */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-xl font-medium flex items-center space-x-3">
              <FaPlus className="h-5 w-5" />
              <span>Add Funds</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              Deposit cryptocurrency to your wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {loadingCurrencies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-white font-medium mb-3 block">Amount (USD)</Label>
                  <Input
                    type="number"
                    placeholder="100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="20"
                    step="0.01"
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white h-10"
                  />
                  <p className="text-xs text-white/60 mt-2">
                    Minimum: $20.00
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Select Cryptocurrency</Label>

                  {/* Featured Currency Buttons */}
                  {featuredCurrencies.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {featuredCurrencies.map((currency) => (
                        <Button
                          key={currency.id}
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-16 p-3 flex items-center gap-3 transition-all bg-white/5 border-white/10 text-white hover:bg-white/10",
                            selectedCurrency === currency.code.toLowerCase()
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "hover:border-primary/50"
                          )}
                          onClick={() => setSelectedCurrency(
                            selectedCurrency === currency.code.toLowerCase()
                              ? ''
                              : currency.code.toLowerCase()
                          )}
                          disabled={isLoading}
                        >
                          {currency.logo_url && (
                            <Image
                              src={`https://nowpayments.io${currency.logo_url}`}
                              alt={currency.name}
                              width={24}
                              height={24}
                              className="rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{currency.name}</div>
                            <div className="text-xs text-white/60">{currency.code}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Other Currencies Select */}
                  {otherCurrencies.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Other Currencies</Label>
                      <Select
                        value={featuredCurrencyCodes.includes(selectedCurrency) ? "" : selectedCurrency}
                        onValueChange={(value) => setSelectedCurrency(value)}
                      >
                        <SelectTrigger className={cn(
                          "bg-white/5 border-white/10 text-white",
                          selectedCurrency && !featuredCurrencyCodes.includes(selectedCurrency)
                            ? "border-primary ring-1 ring-primary"
                            : ""
                        )}>
                          <SelectValue placeholder="Select another cryptocurrency" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                          {otherCurrencies.map((currency) => (
                            <SelectItem
                              key={currency.id}
                              value={currency.code.toLowerCase()}
                              className="text-white hover:bg-white/10"
                            >
                              <div className="flex items-center gap-2">
                                {currency.logo_url && (
                                  <Image
                                    src={`https://nowpayments.io${currency.logo_url}`}
                                    alt={currency.name}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                )}
                                <span>{currency.name}</span>
                                <span className="text-white/60">
                                  ({currency.code})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={isLoading || !depositAmount || !selectedCurrency}
                  className="w-full bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#1E40AF] text-white font-medium h-12 rounded-xl"
                >
                  {isLoading ? 'Processing...' : 'Add Funds'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl font-normal flex items-center space-x-3">
              <FaHistory className="h-6 w-6 text-white" />
              <span>Recent Transactions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <FaHistory className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'deposit' ? 'bg-green-500/20' :
                        transaction.type === 'server_payment' ? 'bg-blue-500/20' : 'bg-red-500/20'
                        }`}>
                        {transaction.type === 'deposit' ?
                          <FaArrowDown className="h-5 w-5 text-green-400" /> :
                          transaction.type === 'server_payment' ?
                            <FaServer className="h-5 w-5 text-blue-400" /> :
                            <FaArrowUp className="h-5 w-5 text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-normal">{transaction.description}</p>
                        <p className="text-white/60 text-sm">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-normal ${transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                      </p>
                      <Badge variant="secondary" className={`${transaction.status === 'completed' ? 'bg-green-500/20 text-green-200' :
                        transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                          'bg-red-500/20 text-red-200'
                        }`}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Supported Currencies */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-2xl font-normal text-white mb-6">Supported Currencies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <FaBitcoin className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-normal text-white mb-2">Bitcoin</h3>
              <p className="text-gray-400">BTC - Most popular cryptocurrency</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <FaEthereum className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-normal text-white mb-2">Ethereum</h3>
              <p className="text-gray-400">ETH - Smart contract platform</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <FaCoins className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-normal text-white mb-2">Monero</h3>
              <p className="text-gray-400">XMR - Maximum privacy</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-6 right-6 z-50"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
            <FaCheckCircle className="h-5 w-5" />
            <span>Success!</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
