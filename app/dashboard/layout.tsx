'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaWallet,
  FaServer,
  FaCog,
  FaChartBar,
  FaSignOutAlt,
  FaUser,
  FaBars,
  FaTimes,
  FaUserShield,
} from 'react-icons/fa';

const sidebarItems = [
  { name: 'Wallet', href: '/dashboard/wallet', icon: FaWallet },
  { name: 'Servers', href: '/dashboard/servers', icon: FaServer },
  { name: 'Analytics', href: '/dashboard/analytics', icon: FaChartBar },
  { name: 'Settings', href: '/dashboard/settings', icon: FaCog },
  { name: 'Admin', href: '/dashboard/admin', icon: FaUserShield },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full pt-16">
          {/* Navigation */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group border border-transparent hover:border-white/10"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-normal">{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4 p-3 bg-white/5 border border-white/10">
              <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
                <FaUser className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-normal text-sm truncate">{user.email}</p>
                <p className="text-white/60 text-xs">Premium Account</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors w-full px-3 py-2 border border-white/10 hover:bg-white/5"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 bg-black border-b border-white/10 h-16">
          <div className="flex h-full items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:text-white/80 transition-colors"
            >
              {sidebarOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
            </button>
            <h2 className="text-xl font-medium text-white">Dashboard</h2>
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-white/60 text-sm">
                Welcome, <span className="text-white font-medium">{user.email?.split('@')[0]}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-4 p-4 lg:p-6 bg-black min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
