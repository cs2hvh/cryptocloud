'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaWallet, FaServer, FaChartLine, FaRocket, FaDollarSign, FaBolt } from 'react-icons/fa';

export default function Dashboard() {
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
      {/* Welcome Section */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-medium text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">Manage your VPS infrastructure and account</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-white">$0.00</p>
              </div>
              <FaWallet className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-white">0</p>
                <p className="text-gray-400 text-sm">Active Servers</p>
              </div>
              <FaServer className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-white">$0.00</p>
                <p className="text-gray-400 text-sm">Monthly Spend</p>
              </div>
              <FaDollarSign className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-white">99.9%</p>
                <p className="text-gray-400 text-sm">Uptime</p>
              </div>
              <FaChartLine className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-medium text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/wallet">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-200 cursor-pointer">
              <CardContent className="p-6 text-center">
                <FaWallet className="h-12 w-12 text-[#60A5FA] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Manage Wallet</h3>
                <p className="text-gray-400 text-sm">Add funds and view transactions</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/servers">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-200 cursor-pointer">
              <CardContent className="p-6 text-center">
                <FaRocket className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Launch Server</h3>
                <p className="text-gray-400 text-sm">Deploy a new VPS instance</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/analytics">
            <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-200 cursor-pointer">
              <CardContent className="p-6 text-center">
                <FaChartLine className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">View Analytics</h3>
                <p className="text-gray-400 text-sm">Monitor server performance</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-medium text-white mb-4">Recent Activity</h2>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8">
            <div className="text-center py-8">
              <FaChartLine className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No activity yet</h3>
              <p className="text-gray-500">Your transactions and server activities will appear here</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}