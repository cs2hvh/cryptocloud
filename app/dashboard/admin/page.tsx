
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import AdminProtection from '@/components/AdminProtection';

type IpRow = { ip: string; mac?: string };
type Pool = { mac: string; ips: IpRow[]; label?: string };
type TemplateRow = { name: string; vmid: string; type?: 'qemu' | 'lxc' };
type ServerFormState = {
  id: string | null;
  name: string;
  ip: string;
  ownerId: string;
  ownerEmail: string;
  status: string;
  location: string;
  os: string;
  node: string;
  vmid: string;
  cpuCores: string;
  memoryMb: string;
  diskGb: string;
  details: string;
};
type TabKey = 'hosts' | 'servers' | 'users';
const emptyServerForm: ServerFormState = {
  id: null,
  name: '',
  ip: '',
  ownerId: '',
  ownerEmail: '',
  status: '',
  location: '',
  os: '',
  node: '',
  vmid: '',
  cpuCores: '',
  memoryMb: '',
  diskGb: '',
  details: '',
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'hosts', label: 'Hosts' },
  { key: 'servers', label: 'Servers' },
  { key: 'users', label: 'Users' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
export default function AdminPage() {
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading, isAdmin } = useAuth();
  const currentUserId = authUser?.id ?? null;
  const [activeTab, setActiveTab] = useState<TabKey>('hosts');
  const [hosts, setHosts] = useState<any[]>([]);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostSaving, setHostSaving] = useState(false);
  const [hostFormError, setHostFormError] = useState<string | null>(null);
  const [hostMessage, setHostMessage] = useState<string | null>(null);

  const [hostId, setHostId] = useState<string | undefined>(undefined);
  const [hostName, setHostName] = useState('');
  const [hostUrl, setHostUrl] = useState('');
  const [hostAllowInsecureTls, setHostAllowInsecureTls] = useState(false);
  const [hostTokenId, setHostTokenId] = useState('');
  const [hostTokenSecret, setHostTokenSecret] = useState('');
  const [hostUsername, setHostUsername] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [hostNode, setHostNode] = useState('');
  const [hostRegion, setHostRegion] = useState('us_east');
  const [hostStorage, setHostStorage] = useState('local');
  const [hostBridge, setHostBridge] = useState('vmbr0');
  const [hostGatewayIp, setHostGatewayIp] = useState('');
  const [hostDnsPrimary, setHostDnsPrimary] = useState('');
  const [hostDnsSecondary, setHostDnsSecondary] = useState('');
  const [hostPools, setHostPools] = useState<Pool[]>([]);
  const [hostTemplates, setHostTemplates] = useState<TemplateRow[]>([]);
  const [hostIsActive, setHostIsActive] = useState(true);

  const [servers, setServers] = useState<any[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serverForm, setServerForm] = useState<ServerFormState>(emptyServerForm);
  const [serverSaving, setServerSaving] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverDeletingId, setServerDeletingId] = useState<string | null>(null);
  // Provision VM state (real install like dashboard/servers)
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState<string | null>(null);
  const [provResult, setProvResult] = useState<any>(null);
  const [provOptions, setProvOptions] = useState<{ locations: Array<{ id: string; name?: string }>; os: Array<{ id: string; name?: string }>; ips: any[] } | null>(null);
  const [provOptionsLoading, setProvOptionsLoading] = useState(false);
  const [provLocation, setProvLocation] = useState<string | undefined>(undefined);
  const [provOs, setProvOs] = useState<string>('Ubuntu 24.04 LTS');
  const [provHostname, setProvHostname] = useState('');
  const [provCpuCores, setProvCpuCores] = useState<number>(2);
  const [provMemoryGB, setProvMemoryGB] = useState<number>(2);
  const [provDiskGB, setProvDiskGB] = useState<number>(20);
  const [provSshPassword, setProvSshPassword] = useState<string>('');
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [assignUserEmail, setAssignUserEmail] = useState<string>('');
  const serverView = searchParams.get('sv') || 'provision';

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userAdminUpdatingId, setUserAdminUpdatingId] = useState<string | null>(null);
  const [userAdminMessage, setUserAdminMessage] = useState<string | null>(null);
  const [userAdminError, setUserAdminError] = useState<string | null>(null);
  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  }, []);

  const loadHosts = useCallback(async () => {
    if (!isAdmin) {
      setHosts([]);
      setHostLoading(false);
      return;
    }
    setHostLoading(true);
    setHostError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/proxmox/hosts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 403) {
        setHostError('Not authorized. Ask admin to add your email to ADMIN_EMAILS.');
        setHosts([]);
      } else {
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Failed to load hosts');
        setHosts(json.hosts || []);
      }
    } catch (err: any) {
      setHostError(err?.message || 'Failed to load hosts');
    } finally {
      setHostLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  const loadServers = useCallback(async () => {
    if (!isAdmin) {
      setServers([]);
      setServersLoading(false);
      return;
    }
    setServersLoading(true);
    setServersError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/servers?limit=500', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 403) {
        setServersError('Not authorized to view servers.');
        setServers([]);
      } else {
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Failed to load servers');
        setServers(json.servers || []);
      }
    } catch (err: any) {
      setServersError(err?.message || 'Failed to load servers');
    } finally {
      setServersLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  const loadProvisionOptions = useCallback(async () => {
    if (!isAdmin) {
      setProvOptions(null);
      setProvOptionsLoading(false);
      return;
    }
    setProvOptionsLoading(true);
    setProvError(null);
    try {
      const res = await fetch('/api/infra/options', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load options');
      setProvOptions({ locations: json.locations || [], os: json.os || [], ips: json.ips || [] });
      setProvLocation((prev) => prev || json.locations?.[0]?.id);
      if (json.os?.length > 0) setProvOs(json.os[0].id || json.os[0].name || 'Ubuntu 24.04 LTS');
    } catch (err: any) {
      setProvError(err?.message || 'Failed to load options');
    } finally {
      setProvOptionsLoading(false);
    }
  }, [isAdmin]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    setUserAdminMessage(null);
    setUserAdminError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/users?perPage=200', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 403) {
        setUsersError('Not authorized to view users.');
        setUsers([]);
      } else {
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Failed to load users');
        setUsers(json.users || []);
      }
    } catch (err: any) {
      setUsersError(err?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  const updateUserAdmin = useCallback(
    async (targetUser: any, makeAdmin: boolean) => {
      if (!isAdmin || !targetUser?.id) return;
      if (!makeAdmin && currentUserId && targetUser.id === currentUserId) {
        setUserAdminError('You cannot remove your own admin access.');
        return;
      }

      setUserAdminUpdatingId(targetUser.id);
      setUserAdminError(null);
      setUserAdminMessage(null);

      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            id: targetUser.id,
            role: makeAdmin ? 'admin' : 'user',
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Failed to update user');
        }

        await loadUsers();
        const email = targetUser.email || 'User';
        setUserAdminMessage(makeAdmin ? `Granted admin access to ${email}.` : `Revoked admin access from ${email}.`);
      } catch (err: any) {
        setUserAdminError(err?.message || 'Failed to update user');
      } finally {
        setUserAdminUpdatingId(null);
      }
    },
    [currentUserId, getAccessToken, isAdmin, loadUsers]
  );

  useEffect(() => {
    // Sync active tab with URL query param `tab`
    const t = (searchParams.get('tab') as TabKey) || 'hosts';
    if (t !== activeTab) setActiveTab(t);
  }, [searchParams, activeTab]);
  useEffect(() => {
    if (activeTab === 'hosts') {
      loadHosts();
    }
  }, [activeTab, loadHosts]);

  useEffect(() => {
    if (activeTab === 'servers') {
      loadServers();
      loadProvisionOptions();
      loadUsers();
    }
  }, [activeTab, loadServers, loadProvisionOptions, loadUsers]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);  const canSaveHost = useMemo(() => {
    if (!hostName || !hostUrl || !hostNode) return false;
    if (!hostTokenId || !hostTokenSecret || !hostUsername || !hostPassword) return false;
    return true;
  }, [hostName, hostUrl, hostNode, hostTokenId, hostTokenSecret, hostUsername, hostPassword]);

  const addHostPool = () => setHostPools((prev) => [...prev, { mac: '', ips: [{ ip: '' }] }]);
  const removeHostPool = (index: number) => setHostPools((prev) => prev.filter((_, i) => i !== index));
  const changeHostPoolMac = (index: number, mac: string) =>
    setHostPools((prev) => prev.map((pool, i) => (i === index ? { ...pool, mac } : pool)));
  const addHostPoolIp = (index: number) =>
    setHostPools((prev) => prev.map((pool, i) => (i === index ? { ...pool, ips: [...pool.ips, { ip: '' }] } : pool)));
  const removeHostPoolIp = (pidx: number, idx: number) =>
    setHostPools((prev) =>
      prev.map((pool, i) =>
        i === pidx ? { ...pool, ips: pool.ips.filter((_, ipIdx) => ipIdx !== idx) } : pool
      )
    );
  const changeHostPoolIp = (pidx: number, idx: number, ip: string) =>
    setHostPools((prev) =>
      prev.map((pool, i) =>
        i === pidx
          ? { ...pool, ips: pool.ips.map((row, ipIdx) => (ipIdx === idx ? { ...row, ip } : row)) }
          : pool
      )
    );

  const addHostTemplate = () => setHostTemplates((prev) => [...prev, { name: '', vmid: '', type: 'qemu' }]);
  const removeHostTemplate = (index: number) => setHostTemplates((prev) => prev.filter((_, i) => i !== index));
  const changeHostTemplate = (index: number, key: keyof TemplateRow, value: string) =>
    setHostTemplates((prev) => prev.map((tpl, i) => (i === index ? { ...tpl, [key]: value } : tpl)));

  const resetHostForm = () => {
    setHostId(undefined);
    setHostName('');
    setHostUrl('');
    setHostAllowInsecureTls(false);
    setHostTokenId('');
    setHostTokenSecret('');
    setHostUsername('');
    setHostPassword('');
    setHostNode('');
    setHostRegion('us_east');
    setHostStorage('local');
    setHostBridge('vmbr0');
    setHostGatewayIp('');
    setHostDnsPrimary('');
    setHostDnsSecondary('');
    setHostPools([]);
    setHostTemplates([]);
    setHostIsActive(true);
    setHostFormError(null);
    setHostMessage(null);
  };  const handleEditHost = (host: any) => {
    setHostId(host.id);
    setHostName(host.name ?? '');
    setHostUrl(host.host_url ?? '');
    setHostAllowInsecureTls(Boolean(host.allow_insecure_tls));
    setHostNode(host.node ?? '');
    setHostRegion(host.location ?? 'us_east');
    setHostStorage(host.storage ?? 'local');
    setHostBridge(host.bridge ?? 'vmbr0');
    setHostGatewayIp(host.gateway_ip ?? '');
    setHostDnsPrimary(host.dns_primary ?? '');
    setHostDnsSecondary(host.dns_secondary ?? '');
    const mappedPools: Pool[] = (host.public_ip_pools || []).map((pool: any) => ({
      mac: pool.mac ?? '',
      ips: ((pool.public_ip_pool_ips || []) as Array<{ ip?: string }>).map((row) => ({ ip: row?.ip ?? '' })),
      label: pool.label,
    }));
    setHostPools(mappedPools);
    const mappedTemplates: TemplateRow[] = (host.proxmox_templates || []).map((tpl: any) => ({
      name: tpl.name ?? '',
      vmid: tpl.vmid != null ? String(tpl.vmid) : '',
      type: tpl.type || 'qemu',
    }));
    setHostTemplates(mappedTemplates);
    setHostIsActive(host.is_active !== false);
    setHostTokenId('');
    setHostTokenSecret('');
    setHostUsername('');
    setHostPassword('');
    setHostFormError(null);
    setHostMessage(null);
    setActiveTab('hosts');
  };  const submitHostForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSaveHost) return;
    setHostSaving(true);
    setHostFormError(null);
    setHostMessage(null);
    try {
      const token = await getAccessToken();
      const payload = {
        id: hostId,
        name: hostName,
        hostUrl: hostUrl,
        allowInsecureTls: hostAllowInsecureTls,
        location: hostRegion,
        tokenId: hostTokenId,
        tokenSecret: hostTokenSecret,
        username: hostUsername,
        password: hostPassword,
        node: hostNode,
        storage: hostStorage,
        bridge: hostBridge,
        network: {
          gatewayIp: hostGatewayIp,
          dnsPrimary: hostDnsPrimary,
          dnsSecondary: hostDnsSecondary,
        },
        pools: hostPools
          .filter((pool) => pool.mac)
          .map((pool) => ({
            mac: pool.mac,
            ips: pool.ips.map((row) => row.ip).filter(Boolean),
            label: pool.label,
          })),
        templates: hostTemplates
          .filter((tpl) => tpl.name && tpl.vmid)
          .map((tpl) => ({
            name: tpl.name,
            vmid: Number(tpl.vmid),
            type: tpl.type || 'qemu',
          })),
        isActive: hostIsActive,
      };
      const res = await fetch('/api/admin/proxmox/hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Save failed');
      await loadHosts();
      resetHostForm();
      setHostMessage('Host saved');
    } catch (err: any) {
      setHostFormError(err?.message || 'Save failed');
    } finally {
      setHostSaving(false);
    }
  };  const canSaveServer = useMemo(() => {
    return serverForm.name.trim().length > 0 && serverForm.ip.trim().length > 0;
  }, [serverForm.name, serverForm.ip]);

  const changeServerField = (field: keyof ServerFormState, value: string) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  const editServer = (server: any) => {
    setServerForm({
      id: server.id ?? null,
      name: server.name ?? '',
      ip: server.ip ?? '',
      ownerId: server.owner_id ?? '',
      ownerEmail: server.owner_email ?? '',
      status: server.status ?? '',
      location: server.location ?? '',
      os: server.os ?? '',
      node: server.node ?? '',
      vmid: server.vmid != null ? String(server.vmid) : '',
      cpuCores: server.cpu_cores != null ? String(server.cpu_cores) : '',
      memoryMb: server.memory_mb != null ? String(server.memory_mb) : '',
      diskGb: server.disk_gb != null ? String(server.disk_gb) : '',
      details: server.details ? JSON.stringify(server.details, null, 2) : '',
    });
    setServerMessage(null);
    setServerError(null);
    setActiveTab('servers');
  };

  const resetServerForm = () => {
    setServerForm(() => ({ ...emptyServerForm }));
    setServerMessage(null);
    setServerError(null);
  };

  const submitServerForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSaveServer) return;
    setServerSaving(true);
    setServerError(null);
    setServerMessage(null);
    try {
      let detailsPayload: any = null;
      if (serverForm.details.trim()) {
        try {
          detailsPayload = JSON.parse(serverForm.details);
        } catch {
          setServerError('Details must be valid JSON');
          setServerSaving(false);
          return;
        }
      }

      const parseNumber = (value: string, label: string) => {
        if (!value.trim()) return null;
        const num = Number(value);
        if (!Number.isFinite(num)) {
          throw new Error(`${label} must be a number`);
        }
        return num;
      };

      const payload: any = {
        name: serverForm.name.trim(),
        ip: serverForm.ip.trim(),
        owner_id: serverForm.ownerId.trim() || null,
        owner_email: serverForm.ownerEmail.trim() || null,
        status: serverForm.status.trim() || null,
        location: serverForm.location.trim() || null,
        os: serverForm.os.trim() || null,
        node: serverForm.node.trim() || null,
        vmid: parseNumber(serverForm.vmid, 'VMID'),
        cpu_cores: parseNumber(serverForm.cpuCores, 'CPU cores'),
        memory_mb: parseNumber(serverForm.memoryMb, 'Memory'),
        disk_gb: parseNumber(serverForm.diskGb, 'Disk'),
        details: detailsPayload ?? null,
      };

      const token = await getAccessToken();
      const updating = Boolean(serverForm.id);
      const res = await fetch('/api/admin/servers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...payload, id: serverForm.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Save failed');
      await loadServers();
      setServerMessage('Server updated');
    } catch (err: any) {
      setServerError(err?.message || 'Save failed');
    } finally {
      setServerSaving(false);
    }
  };

  const deleteServer = async (id: string) => {
    if (!window.confirm('Delete this server?')) return;
    setServerError(null);
    setServerMessage(null);
    setServerDeletingId(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/servers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Delete failed');
      await loadServers();
      if (serverForm.id === id) {
        setServerForm(() => ({ ...emptyServerForm }));
      }
      setServerMessage('Server deleted');
    } catch (err: any) {
      setServerError(err?.message || 'Delete failed');
    } finally {
      setServerDeletingId(null);
    }
  };

  return (
    <AdminProtection>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-white/10">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#60A5FA] text-white'
                    : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

      {activeTab === 'hosts' && (
        <>
          <Card className="bg-black/50 border-white/10">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-white">Proxmox Hosts</CardTitle>
                <CardDescription className="text-white/60">
                  Add or update Proxmox hosts, credentials, and IP pools.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={loadHosts}
                className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                disabled={hostLoading}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {hostLoading ? (
                <div className="text-white/60">Loading...</div>
              ) : hostError ? (
                <div className="text-red-400">{hostError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/60 border-b border-white/10">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">URL</th>
                        <th className="py-2 pr-4">Node</th>
                        <th className="py-2 pr-4">Region</th>
                        <th className="py-2 pr-4">Template</th>
                        <th className="py-2 pr-4">IPs</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(hosts || []).map((host: any) => {
                        const pools = (host.public_ip_pools || []) as Array<{ public_ip_pool_ips?: any[] }>;
                        const ipCount = pools.reduce(
                          (sum, pool) => sum + ((pool.public_ip_pool_ips || []).length),
                          0
                        );
                        return (
                          <tr key={host.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-white">{host.name}</td>
                            <td className="py-2 pr-4 text-white/80">{host.host_url}</td>
                            <td className="py-2 pr-4 text-white/80">{host.node}</td>
                            <td className="py-2 pr-4 text-white/80">{host.location || '-'}</td>
                            <td className="py-2 pr-4 text-white/80">{host.template_vmid ?? '-'}</td>
                            <td className="py-2 pr-4 text-white/80">{ipCount}</td>
                            <td className="py-2 pr-4">
                              <Button
                                type="button"
                                onClick={() => handleEditHost(host)}
                                className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {hosts.length === 0 && (
                        <tr>
                          <td className="py-4 text-center text-white/60" colSpan={7}>
                            No hosts configured yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>          <Card className="bg-black/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">
                {hostId ? 'Update Host' : 'Add Host'}
              </CardTitle>
              <CardDescription className="text-white/60">
                Provide connection details and save to update the provisioning fleet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitHostForm} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-white">Name</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Proxmox Host URL</Label>
                  <Input
                    placeholder="https://pve.example.com:8006"
                    className="bg-black text-white border-white/10"
                    value={hostUrl}
                    onChange={(e) => setHostUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Node</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostNode}
                    onChange={(e) => setHostNode(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Location</Label>
                  <select
                    className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                    value={hostRegion}
                    onChange={(e) => setHostRegion(e.target.value)}
                  >
                    <option value="india">India</option>
                    <option value="singapore">Singapore</option>
                    <option value="uk">UK</option>
                    <option value="sydney">Sydney</option>
                    <option value="germany">Germany</option>
                    <option value="france">France</option>
                    <option value="poland">Poland</option>
                    <option value="us_east">US East</option>
                    <option value="us_west">US West</option>
                    <option value="canada">Canada</option>
                  </select>
                </div>
                <div>
                  <Label className="text-white">Storage</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostStorage}
                    onChange={(e) => setHostStorage(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Bridge</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostBridge}
                    onChange={(e) => setHostBridge(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-white/80">
                      <input
                        type="checkbox"
                        checked={hostAllowInsecureTls}
                        onChange={(e) => setHostAllowInsecureTls(e.target.checked)}
                      />
                      Allow self-signed TLS
                    </label>
                    <label className="flex items-center gap-2 text-white/80">
                      <input
                        type="checkbox"
                        checked={hostIsActive}
                        onChange={(e) => setHostIsActive(e.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-white">Token ID</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostTokenId}
                    onChange={(e) => setHostTokenId(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Token Secret</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostTokenSecret}
                    onChange={(e) => setHostTokenSecret(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Username</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostUsername}
                    onChange={(e) => setHostUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Password</Label>
                  <Input
                    type="password"
                    className="bg-black text-white border-white/10"
                    value={hostPassword}
                    onChange={(e) => setHostPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">Gateway IP</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostGatewayIp}
                    onChange={(e) => setHostGatewayIp(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">DNS Primary</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostDnsPrimary}
                    onChange={(e) => setHostDnsPrimary(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-white">DNS Secondary</Label>
                  <Input
                    className="bg-black text-white border-white/10"
                    value={hostDnsSecondary}
                    onChange={(e) => setHostDnsSecondary(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Public IP Pools</Label>
                    <Button
                      type="button"
                      className="bg-white/10 text-white border border-white/10"
                      onClick={addHostPool}
                    >
                      Add Pool
                    </Button>
                  </div>
                  <div className="mt-2 space-y-4">
                    {hostPools.map((pool, poolIndex) => (
                      <div key={poolIndex} className="border border-white/10 bg-white/5 p-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                          <Input
                            placeholder="Pool MAC"
                            className="bg-black text-white border-white/10"
                            value={pool.mac}
                            onChange={(e) => changeHostPoolMac(poolIndex, e.target.value)}
                          />
                          <div className="md:col-span-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              className="bg-white/10 text-white border border-white/10"
                              onClick={() => addHostPoolIp(poolIndex)}
                            >
                              Add IP
                            </Button>
                            <Button
                              type="button"
                              className="bg-white/10 text-white border border-white/10"
                              onClick={() => removeHostPool(poolIndex)}
                            >
                              Remove Pool
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 space-y-2">
                          {pool.ips.map((row, ipIndex) => (
                            <div key={ipIndex} className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                              <Input
                                placeholder="IP"
                                className="bg-black text-white border-white/10"
                                value={row.ip}
                                onChange={(e) => changeHostPoolIp(poolIndex, ipIndex, e.target.value)}
                              />
                              <div className="md:col-span-2">
                                <Button
                                  type="button"
                                  className="bg-white/10 text-white border border-white/10"
                                  onClick={() => removeHostPoolIp(poolIndex, ipIndex)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {hostPools.length === 0 && (
                      <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-white/50">
                        No pools yet. Add a pool to manage MAC + IP reservations.
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="mt-4 flex items-center justify-between">
                    <Label className="text-white">Templates (OS Name + VMID)</Label>
                    <Button
                      type="button"
                      className="bg-white/10 text-white border border-white/10"
                      onClick={addHostTemplate}
                    >
                      Add Template
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {hostTemplates.map((tpl, idx) => (
                      <div key={idx} className="grid grid-cols-1 items-center gap-2 md:grid-cols-5">
                        <Input
                          placeholder="OS Name (e.g., Ubuntu 24.04 LTS)"
                          className="bg-black text-white border-white/10 md:col-span-2"
                          value={tpl.name}
                          onChange={(e) => changeHostTemplate(idx, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="VMID"
                          className="bg-black text-white border-white/10"
                          value={tpl.vmid}
                          onChange={(e) => changeHostTemplate(idx, 'vmid', e.target.value)}
                        />
                        <select
                          className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                          value={tpl.type || 'qemu'}
                          onChange={(e) => changeHostTemplate(idx, 'type', e.target.value)}
                        >
                          <option value="qemu">QEMU (VM)</option>
                          <option value="lxc">LXC (Container)</option>
                        </select>
                        <Button
                          type="button"
                          className="bg-white/10 text-white border border-white/10"
                          onClick={() => removeHostTemplate(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {hostTemplates.length === 0 && (
                      <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-white/50">
                        Add at least one template so provisioning can pick an image.
                      </div>
                    )}
                  </div>
                </div>

                {hostFormError && <div className="md:col-span-2 text-red-400">{hostFormError}</div>}
                {hostMessage && <div className="md:col-span-2 text-green-400">{hostMessage}</div>}

                <div className="md:col-span-2 flex gap-2">
                  <Button
                    type="submit"
                    disabled={!canSaveHost || hostSaving}
                    className="bg-white/10 text-white border border-white/10"
                  >
                    {hostSaving ? 'Saving...' : hostId ? 'Update Host' : 'Save Host'}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetHostForm}
                    className="bg-white/10 text-white border border-white/10"
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}      {activeTab === 'servers' && (
        <>
          {/* Provision new VM (real install) */}
          {serverView !== 'list' && (
          <Card className="bg-black/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Provision New VM</CardTitle>
              <CardDescription className="text-white/60">Create a VM on a Proxmox host and optionally assign it to a user.</CardDescription>
            </CardHeader>
            <CardContent>
              {provOptionsLoading ? (
                <div className="text-white/60">Loading options...</div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setProvLoading(true);
                    setProvError(null);
                    setProvResult(null);
                    try {
                      const token = await getAccessToken();
                      const payload: any = {
                        location: provLocation,
                        os: provOs,
                        hostname: provHostname,
                        cpuCores: provCpuCores,
                        memoryMB: provMemoryGB * 1024,
                        diskGB: provDiskGB,
                        sshPassword: provSshPassword,
                      };
                      if (assignUserId) payload.ownerId = assignUserId;
                      if (assignUserEmail) payload.ownerEmail = assignUserEmail;
                      const res = await fetch('/api/proxmox/vms/create', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(payload),
                      });
                      const json = await res.json();
                      if (res.status === 409) {
                        setProvError('No available IPs or gateway missing');
                        await loadProvisionOptions();
                        return;
                      }
                      if (!res.ok || !json.ok) throw new Error(json.error || 'Provisioning failed');
                      setProvResult(json);
                      await loadServers();
                      await loadProvisionOptions();
                    } catch (err: any) {
                      setProvError(err?.message || 'Provisioning failed');
                    } finally {
                      setProvLoading(false);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <Label className="text-white">Location (Host)</Label>
                    <select
                      className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                      value={provLocation || ''}
                      onChange={(e) => setProvLocation(e.target.value)}
                    >
                      {(provOptions?.locations || []).map((l) => (
                        <option key={l.id} value={l.id}>{l.name || l.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Operating System</Label>
                    <select
                      className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                      value={provOs}
                      onChange={(e) => setProvOs(e.target.value)}
                    >
                      {(provOptions?.os || []).map((o) => (
                        <option key={o.id} value={o.id}>{o.name || o.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Hostname</Label>
                    <Input value={provHostname} onChange={(e) => setProvHostname(e.target.value)} placeholder="e.g. vm-ubuntu-01" className="bg-black text-white border-white/10" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">vCPU Cores</Label>
                    <Input type="number" min={1} max={32} value={provCpuCores} onChange={(e) => setProvCpuCores(parseInt(e.target.value || '1', 10))} className="bg-black text-white border-white/10" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Memory (GB)</Label>
                    <Input type="number" min={1} max={128} value={provMemoryGB} onChange={(e) => setProvMemoryGB(parseInt(e.target.value || '1', 10))} className="bg-black text-white border-white/10" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Disk (GB)</Label>
                    <Input type="number" min={10} max={2000} value={provDiskGB} onChange={(e) => setProvDiskGB(parseInt(e.target.value || '10', 10))} className="bg-black text-white border-white/10" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-white">SSH Password</Label>
                    <Input type="password" value={provSshPassword} onChange={(e) => setProvSshPassword(e.target.value)} placeholder="Enter a strong password" className="bg-black text-white border-white/10" />
                  </div>

                  <div className="md:col-span-2 border-t border-white/10 pt-2">
                    <Label className="text-white">Assign to User (optional)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                      <select
                        className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                        value={assignUserId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setAssignUserId(id);
                          if (id && users?.length) {
                            const u = users.find((x: any) => x.id === id);
                            setAssignUserEmail(u?.email || '');
                          }
                        }}
                      >
                        <option value="">Select user...</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.email}</option>
                        ))}
                      </select>
                      <Input placeholder="Owner ID (override)" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="bg-black text-white border-white/10" />
                      <Input placeholder="Owner Email (override)" value={assignUserEmail} onChange={(e) => setAssignUserEmail(e.target.value)} className="bg-black text-white border-white/10" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <Button type="submit" disabled={provLoading || !provLocation || !provHostname || !provSshPassword} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                      {provLoading ? 'Provisioning...' : 'Create VM'}
                    </Button>
                    {provError && <span className="text-red-400 text-sm">{provError}</span>}
                  </div>
                </form>
              )}

              {provResult?.ok && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white/5 border border-white/10">
                    <div className="text-white/60">Region</div>
                    <div className="text-white">{(provOptions?.locations || []).find(l => l.id === provResult.location)?.name || provResult.location}</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10">
                    <div className="text-white/60">IP Address</div>
                    <div className="text-white">{provResult.ip}</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10">
                    <div className="text-white/60">Hostname</div>
                    <div className="text-white">{provResult.name}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {serverView === 'list' && (
          <Card className="bg-black/50 border-white/10">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-white">Servers</CardTitle>
                <CardDescription className="text-white/60">
                  Review every provisioned server with ownership and lifecycle controls.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={loadServers}
                className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                disabled={serversLoading}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {serversLoading ? (
                <div className="text-white/60">Loading...</div>
              ) : serversError ? (
                <div className="text-red-400">{serversError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/60 border-b border-white/10">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">IP</th>
                        <th className="py-2 pr-4">Owner</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Location</th>
                        <th className="py-2 pr-4">Created</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servers.map((server: any) => {
                        const owner = server.owner_email || server.owner_id || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
                        return (
                          <tr key={server.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-white">{server.name || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                            <td className="py-2 pr-4 text-white/80">{server.ip || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                            <td className="py-2 pr-4 text-white/80">{owner}</td>
                            <td className="py-2 pr-4 text-white/80">{server.status || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                            <td className="py-2 pr-4 text-white/80">{server.location || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                            <td className="py-2 pr-4 text-white/80">{formatDate(server.created_at)}</td>
                            <td className="py-2 pr-4 flex gap-2">
                              <Button
                                type="button"
                                onClick={() => deleteServer(server.id)}
                                className="bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30"
                                disabled={serverDeletingId === server.id}
                              >
                                {serverDeletingId === server.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {servers.length === 0 && (
                        <tr>
                          <td className="py-4 text-center text-white/60" colSpan={7}>
                            No servers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </>
      )}      {activeTab === 'users' && (
        <Card className="bg-black/50 border-white/10">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-white">User Management</CardTitle>
              <CardDescription className="text-white/60">
                Manage user roles and permissions. Only admins can modify user roles.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={loadUsers}
              className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
              disabled={usersLoading}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-white/60">Loading...</div>
            ) : usersError ? (
              <div className="text-red-400">{usersError}</div>
            ) : (
              <div className="space-y-4">
                {/* Role Management Notice */}
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">Role-Based Access Control</div>
                      <div className="text-white/70 text-sm mt-1">
                        Admin users have full access to this dashboard including user management, server provisioning, and system configuration.
                        Regular users can only access their own servers and basic dashboard features.
                      </div>
                    </div>
                  </div>
                </div>

                {userAdminMessage && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="text-emerald-400 text-sm">{userAdminMessage}</div>
                  </div>
                )}
                {userAdminError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <div className="text-red-400 text-sm">{userAdminError}</div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/60 border-b border-white/10">
                        <th className="py-3 pr-4 font-medium">Email</th>
                        <th className="py-3 pr-4 font-medium">Status</th>
                        <th className="py-3 pr-4 font-medium">Role</th>
                        <th className="py-3 pr-4 font-medium">Last Sign-In</th>
                        <th className="py-3 pr-4 font-medium">Created</th>
                        <th className="py-3 pr-4 font-medium">User ID</th>
                        <th className="py-3 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((account: any) => {
                        const status = account.banned
                          ? 'Banned'
                          : account.email_confirmed_at
                          ? 'Verified'
                          : 'Pending';
                        const admin = (account.role ?? 'user') === 'admin';
                        const isSelf = currentUserId != null && account.id === currentUserId;
                        const actionDisabled = userAdminUpdatingId === account.id || (admin && isSelf);
                        const buttonLabel = userAdminUpdatingId === account.id
                          ? 'Updating...'
                          : admin
                          ? isSelf
                            ? 'You (Admin)'
                            : 'Revoke Admin'
                          : 'Grant Admin';

                        return (
                          <tr key={account.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 pr-4 text-white font-medium">{account.email}</td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant="outline"
                                className={
                                  status === 'Verified'
                                    ? "text-emerald-300 border-emerald-400/40 bg-emerald-500/10"
                                    : status === 'Banned'
                                    ? "text-red-300 border-red-400/40 bg-red-500/10"
                                    : "text-yellow-300 border-yellow-400/40 bg-yellow-500/10"
                                }
                              >
                                {status}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4">
                              {admin ? (
                                <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/40 font-medium">
                                  Administrator
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-white/70 border-white/20">
                                  User
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-white/80">{formatDate(account.last_sign_in_at)}</td>
                            <td className="py-3 pr-4 text-white/80">{formatDate(account.created_at)}</td>
                            <td className="py-3 pr-4 text-white/40 font-mono text-xs">{account.id}</td>
                            <td className="py-3 pr-4">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => updateUserAdmin(account, !admin)}
                                  disabled={actionDisabled}
                                  className={
                                    (admin && !isSelf
                                      ? 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30'
                                      : isSelf
                                      ? 'bg-white/5 text-white/50 border border-white/10 cursor-not-allowed'
                                      : 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30') +
                                    ' disabled:opacity-50 disabled:cursor-not-allowed'
                                  }
                                  title={
                                    admin && isSelf
                                      ? 'You cannot modify your own admin access'
                                      : admin
                                      ? `Remove admin access for ${account.email}`
                                      : `Grant admin access to ${account.email}`
                                  }
                                >
                                  {buttonLabel}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td className="py-8 text-center text-white/60" colSpan={7}>
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="text-white/40">👥</span>
                              </div>
                              <div>No users found</div>
                              <div className="text-xs text-white/40">Users will appear here after they sign up</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </AdminProtection>
  );
}




