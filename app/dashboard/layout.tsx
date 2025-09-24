'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
} from 'react-icons/fa';

const sidebarItems = [
  { name: 'Wallet', href: '/dashboard/wallet', icon: FaWallet },
  { name: 'Servers', href: '/dashboard/servers', icon: FaServer },
  { name: 'Analytics', href: '/dashboard/analytics', icon: FaChartBar },
  { name: 'Settings', href: '/dashboard/settings', icon: FaCog },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminOpen, setAdminOpen] = useState(true);
  const [adminServersOpen, setAdminServersOpen] = useState(true);

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
      <motion.aside
        initial={{ width: 256 }}
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`fixed inset-y-0 left-0 z-40 bg-black/40 backdrop-blur-md border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full pt-3">
          {/* Sidebar top brand + collapse */}
          <div className={`px-3 ${collapsed ? 'justify-center' : 'justify-between'} flex items-center h-11`}>
            <Link href="/" className={`flex items-center ${collapsed ? '' : 'gap-2'}`} title="Unserver">
              <div className="w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">U</span>
              </div>
              {!collapsed && <span className="text-white/90 text-sm font-semibold tracking-wide">Unserver</span>}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-white/80 hover:text-white transition-colors border border-white/10 hover:bg-white/10 rounded-md w-8 h-8 flex items-center justify-center"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <FaChevronRight className="h-4 w-4" /> : <FaChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          {/* Navigation */}
          <nav className="flex-1 p-3">
            <div className="space-y-2">
              {sidebarItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex ${collapsed ? 'justify-center gap-0' : 'items-center gap-3'} px-3 py-2 rounded-xl border transition-colors ${
                      active
                        ? 'text-white bg-white/10 border-white/15'
                        : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span className="font-normal">{item.name}</span>}
                  </Link>
                );
              })}

              {/* Admin section with nested items */}
              <div>
                <button
                  type="button"
                  onClick={() => setAdminOpen((v) => !v)}
                  className={`w-full flex ${collapsed ? 'justify-center gap-0' : 'items-center gap-3'} px-3 py-2 rounded-xl border transition-colors ${
                    pathname === '/dashboard/admin'
                      ? 'text-white bg-white/10 border-white/15'
                      : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                  }`}
                  title={collapsed ? 'Admin' : undefined}
                >
                  <FaUserShield className="h-5 w-5" />
                  {!collapsed && (
                    <>
                      <span className="font-normal flex-1 text-left">Admin</span>
                      <FaChevronDown className={`h-3.5 w-3.5 transition-transform ${adminOpen ? '' : '-rotate-90'}`} />
                    </>
                  )}
                </button>

                {!collapsed && adminOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    {/* Hosts */}
                    {(() => {
                      const active = pathname === '/dashboard/admin' && (searchParams.get('tab') || 'hosts') === 'hosts';
                      return (
                        <Link
                          href={'/dashboard/admin?tab=hosts'}
                          className={`block px-3 py-2 rounded-lg border text-sm ${
                            active ? 'text-white bg-white/10 border-white/15' : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          Hosts
                        </Link>
                      );
                    })()}

                    {/* Servers group */}
                    <button
                      type="button"
                      onClick={() => setAdminServersOpen((v) => !v)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                        pathname === '/dashboard/admin' && (searchParams.get('tab') || 'hosts') === 'servers'
                          ? 'text-white bg-white/10 border-white/15'
                          : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <span className="flex-1 text-left">Servers</span>
                      <FaChevronDown className={`h-3 w-3 transition-transform ${adminServersOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {adminServersOpen && (
                      <div className="ml-4 space-y-1">
                        {(() => {
                          const active = pathname === '/dashboard/admin' && (searchParams.get('tab') || 'hosts') === 'servers' && (searchParams.get('sv') || 'provision') === 'provision';
                          return (
                            <Link
                              href={'/dashboard/admin?tab=servers&sv=provision'}
                              className={`block px-3 py-2 rounded-lg border text-sm ${
                                active ? 'text-white bg-white/10 border-white/15' : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                              }`}
                            >
                              Provision VM
                            </Link>
                          );
                        })()}
                        {(() => {
                          const active = pathname === '/dashboard/admin' && (searchParams.get('tab') || 'hosts') === 'servers' && (searchParams.get('sv') || 'provision') === 'list';
                          return (
                            <Link
                              href={'/dashboard/admin?tab=servers&sv=list'}
                              className={`block px-3 py-2 rounded-lg border text-sm ${
                                active ? 'text-white bg-white/10 border-white/15' : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                              }`}
                            >
                              Servers
                            </Link>
                          );
                        })()}
                      </div>
                    )}

                    {/* Users */}
                    {(() => {
                      const active = pathname === '/dashboard/admin' && (searchParams.get('tab') || 'hosts') === 'users';
                      return (
                        <Link
                          href={'/dashboard/admin?tab=users'}
                          className={`block px-3 py-2 rounded-lg border text-sm ${
                            active ? 'text-white bg-white/10 border-white/15' : 'text-white/70 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          Users
                        </Link>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* User Info */}
          <div className="p-3 border-t border-white/10">
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3 mb-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-8 h-8 bg-white/10 border border-white/10 rounded-md flex items-center justify-center">
                    <FaUser className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-normal text-sm truncate">{user.email}</p>
                    <p className="text-white/60 text-xs">Signed in</p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors w-full px-3 py-2 border border-white/10 hover:bg-white/10 rounded-xl"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-white/10 border border-white/10 rounded-md flex items-center justify-center" title={user.email || ''}>
                  <FaUser className="h-4 w-4 text-white" />
                </div>
                <button
                  onClick={signOut}
                  className="w-8 h-8 text-white/80 hover:text-white transition-colors border border-white/10 hover:bg-white/10 rounded-md flex items-center justify-center"
                  title="Sign out"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`${collapsed ? 'lg:ml-20' : 'lg:ml-64'} transition-all duration-300 ease-out`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 h-14">
          <div className="flex h-full items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:text-white/80 transition-colors"
            >
              {sidebarOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
            </button>
            <h2 className="text-lg md:text-xl font-medium text-white">Dashboard</h2>
            <div className="hidden lg:flex items-center space-x-2" />
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
