'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthToken } from '@/hooks/useAuthToken';
import { useWallet } from '@/hooks/useWallet';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Loader } from '@/components/ui/loader';
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
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: FaServer,
    description: 'Overview and quick actions',
    exact: true
  },
  {
    name: 'Servers',
    href: '/dashboard/servers',
    icon: FaServer,
    description: 'Manage your VPS instances'
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: FaWallet,
    description: 'Payments and usage'
  },
];

const bottomNavItems = [
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: FaCog,
    description: 'Account preferences'
  },
];

function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut, isAdmin } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  useAuthToken(); // Manage auth token in cookies for middleware
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminOpen, setAdminOpen] = useState(true);
  const [adminServersOpen, setAdminServersOpen] = useState(true);
  const [serversOpen, setServersOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !isAdmin && pathname?.startsWith('/dashboard/admin')) {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, pathname, router]);

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
        className={`fixed inset-y-0 left-0 z-40 bg-neutral-950 border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar top brand + collapse */}
          <div className={`px-3 ${collapsed ? 'justify-center' : 'justify-between'} flex items-center h-11 flex-shrink-0 pt-3`}>
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

          {/* Unified scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 sidebar-scroll-isolation">
            {/* Navigation */}
            <nav className="p-3">
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                    Main
                  </div>
                )}
                {sidebarItems.filter(item => item.name !== 'Servers').map((item) => {
                  const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex ${collapsed ? 'justify-center' : 'items-center gap-3'} px-3 py-3 rounded-xl transition-all duration-200 ${
                        active
                          ? 'text-white bg-gradient-to-r from-[#60A5FA]/25 to-[#3B82F6]/15 shadow-lg shadow-[#60A5FA]/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <div className={`p-1 rounded-lg ${active ? 'bg-[#60A5FA]/30' : 'group-hover:bg-white/10'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {!collapsed && (
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-white/50">{item.description}</div>
                        </div>
                      )}
                    </Link>
                  );
                })}

                {/* Servers section with nested items */}
                <div>
                  <button
                    type="button"
                    onClick={() => setServersOpen((v) => !v)}
                    className={`group flex ${collapsed ? 'justify-center' : 'items-center gap-3'} px-3 py-3 rounded-xl transition-all duration-200 ${
                      pathname?.startsWith('/dashboard/servers')
                        ? 'text-white bg-gradient-to-r from-[#60A5FA]/25 to-[#3B82F6]/15 shadow-lg shadow-[#60A5FA]/10'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    title={collapsed ? 'Servers' : undefined}
                  >
                    <div className={`p-1 rounded-lg ${pathname?.startsWith('/dashboard/servers') ? 'bg-[#60A5FA]/30' : 'group-hover:bg-white/10'}`}>
                      <FaServer className="h-5 w-5" />
                    </div>
                    {!collapsed && (
                      <>
                        <span className="font-medium flex-1 text-left">Servers</span>
                        <FaChevronDown className={`h-3.5 w-3.5 transition-transform ${serversOpen ? '' : '-rotate-90'}`} />
                      </>
                    )}
                  </button>
                  {!collapsed && serversOpen && (
                    <div className="mt-1 ml-8 space-y-1">
                      {(() => {
                        const active = pathname === '/dashboard/servers' && (searchParams.get('view') || 'deploy') === 'deploy';
                        return (
                          <Link
                            href={'/dashboard/servers?view=deploy'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            Deploy Instance
                          </Link>
                        );
                      })()}
                      {(() => {
                        const active = pathname === '/dashboard/servers' && (searchParams.get('view') || 'deploy') === 'list';
                        return (
                          <Link
                            href={'/dashboard/servers?view=list'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            My Servers
                          </Link>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Admin section with nested items */}
                {isAdmin && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setAdminOpen((v) => !v)}
                      className={`group flex ${collapsed ? 'justify-center' : 'items-center gap-3'} px-3 py-3 rounded-xl transition-all duration-200 ${
                        pathname === '/dashboard/admin'
                          ? 'text-white bg-gradient-to-r from-[#60A5FA]/25 to-[#3B82F6]/15 shadow-lg shadow-[#60A5FA]/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                      title={collapsed ? 'Admin' : undefined}
                    >
                      <div className={`p-1 rounded-lg ${pathname === '/dashboard/admin' ? 'bg-[#60A5FA]/30' : 'group-hover:bg-white/10'}`}>
                        <FaUserShield className="h-5 w-5" />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="font-medium flex-1 text-left">Admin</span>
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
                              className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                                active
                                  ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                  : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
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
                                  className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                                    active
                                      ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                      : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
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
                                  className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                                    active
                                      ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                      : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
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
                              className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                                active
                                  ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                  : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                              }`}
                            >
                              Users
                            </Link>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* Account Section */}
            <div className="p-3 pt-0">
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                    Account
                  </div>
                )}
                {/* Settings section with nested items */}
                <div>
                  {collapsed ? (
                    <Link
                      href="/dashboard/settings/profile"
                      className={`group flex justify-center px-3 py-3 rounded-xl transition-all duration-200 ${
                        pathname?.startsWith('/dashboard/settings')
                          ? 'text-white bg-gradient-to-r from-[#60A5FA]/25 to-[#3B82F6]/15 shadow-lg shadow-[#60A5FA]/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                      title="Settings"
                    >
                      <div className={`p-1 rounded-lg ${pathname?.startsWith('/dashboard/settings') ? 'bg-[#60A5FA]/30' : 'group-hover:bg-white/10'}`}>
                        <FaCog className="h-5 w-5" />
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen((v) => !v)}
                      className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        pathname?.startsWith('/dashboard/settings')
                          ? 'text-white bg-gradient-to-r from-[#60A5FA]/25 to-[#3B82F6]/15 shadow-lg shadow-[#60A5FA]/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-1 rounded-lg ${pathname?.startsWith('/dashboard/settings') ? 'bg-[#60A5FA]/30' : 'group-hover:bg-white/10'}`}>
                        <FaCog className="h-5 w-5" />
                      </div>
                      <span className="font-medium flex-1 text-left">Settings</span>
                      <FaChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? '' : '-rotate-90'}`} />
                    </button>
                  )}
                  {!collapsed && settingsOpen && (
                    <div className="mt-1 ml-8 space-y-1">
                      {(() => {
                        const active = pathname === '/dashboard/settings/profile';
                        return (
                          <Link
                            href={'/dashboard/settings/profile'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            Profile
                          </Link>
                        );
                      })()}
                      {(() => {
                        const active = pathname === '/dashboard/settings/notifications';
                        return (
                          <Link
                            href={'/dashboard/settings/notifications'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            Notifications
                          </Link>
                        );
                      })()}
                      {(() => {
                        const active = pathname === '/dashboard/settings/preferences';
                        return (
                          <Link
                            href={'/dashboard/settings/preferences'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            Preferences
                          </Link>
                        );
                      })()}
                      {(() => {
                        const active = pathname === '/dashboard/settings/security';
                        return (
                          <Link
                            href={'/dashboard/settings/security'}
                            className={`group relative block py-2 pr-3 pl-4 text-sm border-l-2 transition-all ${
                              active
                                ? 'text-[#60A5FA] border-l-[#60A5FA] bg-[#60A5FA]/10'
                                : 'text-white/70 border-l-transparent hover:text-white hover:border-l-[#60A5FA]/60 hover:bg-[#60A5FA]/5 hover:pl-5'
                            }`}
                          >
                            Security
                          </Link>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
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
            <div className="flex items-center space-x-4">
              {/* Wallet Balance */}
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                <FaWallet className="h-4 w-4 text-[#60A5FA]" />
                <span className="text-white text-sm font-medium" key={`balance-${balance}`}>
                  {walletLoading ? <Loader size="sm" color="white" /> : `$${balance.toFixed(2)}`}
                </span>
              </div>
              <div className="hidden lg:flex items-center space-x-2" />
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin"></div>
      </div>
    }>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}
