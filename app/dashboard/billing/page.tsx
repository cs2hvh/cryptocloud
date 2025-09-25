'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
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
  const { balance, transactions, loading, addFunds, loadWallet } = useWallet();
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const generateWalletAddress = (currency: string) => {
    const addresses = {
      btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      eth: '0x742d35Cc6634C0532925a3b8D4C2C4e4C4C4',
      xmr: '4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRJ5zQetzFS1jqhkTSMVa4QVVgRYQqQQDNuQhsmPWW',
      ltc: 'LTC1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
    };
    return addresses[currency as keyof typeof addresses] || '';
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;

    setIsLoading(true);

    const amount = parseFloat(depositAmount);
    const description = selectedCurrency ? `Deposit ${selectedCurrency.toUpperCase()}` : 'Manual deposit';

    const result = await addFunds(amount, description);

    if (result.success) {
      setDepositAmount('');
      setSelectedCurrency('');
      setWalletAddress('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Force reload wallet data to update balance in navbar
      setTimeout(() => {
        loadWallet();
      }, 500);
    } else {
      console.error('Deposit failed:', result.error);
    }

    setIsLoading(false);
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
            <div>
              <Label className="text-white font-medium mb-3 block">Currency</Label>
              <Select value={selectedCurrency} onValueChange={(value) => {
                setSelectedCurrency(value);
                setWalletAddress(generateWalletAddress(value));
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value="btc" className="text-white hover:bg-white/10">
                    <div className="flex items-center space-x-2">
                      <FaBitcoin className="h-4 w-4 text-orange-400" />
                      <span>Bitcoin (BTC)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="eth" className="text-white hover:bg-white/10">
                    <div className="flex items-center space-x-2">
                      <FaEthereum className="h-4 w-4 text-blue-400" />
                      <span>Ethereum (ETH)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="xmr" className="text-white hover:bg-white/10">
                    <div className="flex items-center space-x-2">
                      <FaCoins className="h-4 w-4 text-orange-500" />
                      <span>Monero (XMR)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white font-medium mb-3 block">Amount (USD)</Label>
              <Input
                type="number"
                placeholder="100.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-10"
              />
            </div>

            {walletAddress && (
              <div>
                <Label className="text-white font-normal text-lg mb-3 block">Deposit Address</Label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <code className="text-[#3B82F6] text-sm break-all flex-1 mr-2">{walletAddress}</code>
                    <button
                      onClick={() => copyToClipboard(walletAddress)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      <FaCopy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-white/60 text-sm mt-2">Send {selectedCurrency.toUpperCase()} to this address</p>
              </div>
            )}

            <Button
              onClick={handleDeposit}
              disabled={isLoading || !depositAmount}
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#1E40AF] text-white font-medium h-12 rounded-xl"
            >
              {isLoading ? 'Processing...' : 'Add Funds (Demo)'}
            </Button>
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'deposit' ? 'bg-green-500/20' :
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
                      <p className={`font-normal ${
                        transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                      </p>
                      <Badge variant="secondary" className={`${
                        transaction.status === 'completed' ? 'bg-green-500/20 text-green-200' :
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
