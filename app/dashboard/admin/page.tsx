'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminProtection from '@/components/AdminProtection';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseAccessToken } from '@/hooks/useSupabaseAccessToken';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { HostsSection } from '@/components/admin/HostsSection';
import { ServersSection } from '@/components/admin/ServersSection';
import { UsersSection } from '@/components/admin/UsersSection';
import { TabKey } from '@/components/admin/types';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'hosts', label: 'Hosts' },
  { key: 'servers', label: 'Servers' },
  { key: 'users', label: 'Users' },
];

export default function AdminPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isAdmin } = useAuth();
  const currentUserId = authUser?.id ?? null;
  const { getAccessToken } = useSupabaseAccessToken();

  const [activeTab, setActiveTab] = useState<TabKey>('hosts');

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabKey | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [activeTab, searchParams]);

  const serverView = useMemo<'provision' | 'list'>(() => {
    const viewParam = (searchParams.get('sv') || '').toLowerCase();
    return viewParam === 'list' ? 'list' : 'provision';
  }, [searchParams]);

  return (
    <AdminProtection>
      <div className="space-y-6">
        <AdminTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'hosts' && (
          <HostsSection isAdmin={!!isAdmin} getAccessToken={getAccessToken} />
        )}

        {activeTab === 'servers' && (
          <ServersSection serverView={serverView} getAccessToken={getAccessToken} />
        )}

        {activeTab === 'users' && (
          <UsersSection
            isAdmin={!!isAdmin}
            currentUserId={currentUserId}
            getAccessToken={getAccessToken}
          />
        )}
      </div>
    </AdminProtection>
  );
}
