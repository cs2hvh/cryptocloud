'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaWallet, FaServer, FaChartLine, FaRocket } from 'react-icons/fa';

export default function Dashboard() {
  const { user } = useAuth();

  const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="space-y-8">
      {/* Greeting Banner */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="p-6 md:p-8 relative">
            <div className="h-px w-24 bg-gradient-to-r from-fuchsia-500/70 to-emerald-400/70 mb-4" />
            <h1 className="text-2xl md:text-3xl font-semibold text-white">
              Welcome {user?.email ? user.email.split('@')[0] : 'back'}
            </h1>
            <p className="text-white/70 mt-2">
              Manage infrastructure, monitor resources, and launch servers with ease.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Key Stats */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: 'Balance', value: '$0.00' }, { label: 'Active Servers', value: '0' }, { label: 'Monthly Spend', value: '$0.00' }, { label: 'Uptime', value: '99.9%' }].map((s, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-medium text-white">{s.value}</p>
                  <p className="text-white/60 text-sm mt-1">{s.label}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-medium text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/wallet">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <FaWallet className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Manage Wallet</h3>
                <p className="text-white/60 text-sm">Add funds and view transactions</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/servers">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <FaRocket className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Launch Server</h3>
                <p className="text-white/60 text-sm">Deploy a new VPS instance</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/analytics">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <FaChartLine className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">View Analytics</h3>
                <p className="text-white/60 text-sm">Monitor server performance</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-medium text-white mb-4">Recent Activity</h2>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8">
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                <FaChartLine className="h-6 w-6 text-white/80" />
              </div>
              <h3 className="text-lg font-medium text-white/80 mb-2">No activity yet</h3>
              <p className="text-white/60">Your transactions and server activities will appear here</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
