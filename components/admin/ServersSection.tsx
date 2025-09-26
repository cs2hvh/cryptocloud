'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/datetime';
import { ServerRow, UserRow } from './types';
import { Loader, InlineLoader } from '@/components/ui/loader';
import { useConfirmation } from '@/components/ui/confirmation-dialog';
import toast from 'react-hot-toast';

const DEFAULT_OS = 'Ubuntu 24.04 LTS';

type ServersSectionProps = {
  serverView: 'provision' | 'list';
  getAccessToken: () => Promise<string | null>;
};

type ProvisionOption = {
  id: string;
  name?: string;
  host?: string;
};

type ProvisionOptions = {
  locations: ProvisionOption[];
  os: ProvisionOption[];
};

export function ServersSection({ serverView, getAccessToken }: ServersSectionProps) {
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serverDeletingId, setServerDeletingId] = useState<string | null>(null);
  const { confirm, ConfirmationDialog } = useConfirmation();

  const [provOptions, setProvOptions] = useState<ProvisionOptions | null>(null);
  const [provOptionsLoading, setProvOptionsLoading] = useState(false);
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState<string | null>(null);
  const [provResult, setProvResult] = useState<Record<string, unknown> | null>(null);

  const [provLocation, setProvLocation] = useState<string | undefined>(undefined);
  const [provOs, setProvOs] = useState<string>(DEFAULT_OS);
  const [provHostname, setProvHostname] = useState('');
  const [provCpuCores, setProvCpuCores] = useState(2);
  const [provMemoryGB, setProvMemoryGB] = useState(2);
  const [provDiskGB, setProvDiskGB] = useState(20);
  const [provSshPassword, setProvSshPassword] = useState('');

  const [assignUserId, setAssignUserId] = useState('');
  const [assignUserEmail, setAssignUserEmail] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadServers = useCallback(async () => {
    setServersLoading(true);
    setServersError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/servers?limit=500', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load servers');
      const rows = Array.isArray(json.servers) ? (json.servers as ServerRow[]) : [];
      setServers(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load servers';
      setServersError(message);
      toast.error(message);
    } finally {
      setServersLoading(false);
    }
  }, [getAccessToken]);

  const loadProvisionOptions = useCallback(async () => {
    setProvOptionsLoading(true);
    setProvError(null);
    try {
      const res = await fetch('/api/infra/options', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load options');
      const locations = Array.isArray(json.locations) ? (json.locations as ProvisionOption[]) : [];
      const os = Array.isArray(json.os) ? (json.os as ProvisionOption[]) : [];
      setProvOptions({ locations, os });
      setProvLocation((prev) => prev || locations[0]?.id);
      if (os.length > 0) {
        setProvOs(os[0].id || os[0].name || DEFAULT_OS);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load options';
      setProvError(message);
      toast.error(message);
    } finally {
      setProvOptionsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/users?perPage=200', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok && json.ok && Array.isArray(json.users)) {
        setUsers(json.users as UserRow[]);
      }
    } catch (err) {
      console.warn('Failed to load users for provisioning', err);
    } finally {
      setUsersLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadServers();
    loadProvisionOptions();
    loadUsers();
  }, [loadProvisionOptions, loadServers, loadUsers]);

  const userOptions = useMemo(
    () => users.map((user) => ({ id: user.id, email: user.email ?? '' })),
    [users]
  );

  const handleProvision = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provLocation || !provHostname || !provSshPassword) {
      setProvError('Location, hostname, and SSH password are required');
      return;
    }

    setProvLoading(true);
    setProvError(null);
    setProvResult(null);

    try {
      const token = await getAccessToken();
      const payload: Record<string, unknown> = {
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
      setProvResult(json as Record<string, unknown>);
      toast.success('VM provisioned successfully!');
      await loadServers();
      await loadProvisionOptions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Provisioning failed';
      setProvError(message);
      toast.error(message);
    } finally {
      setProvLoading(false);
    }
  }, [assignUserEmail, assignUserId, getAccessToken, loadProvisionOptions, loadServers, provCpuCores, provDiskGB, provHostname, provLocation, provMemoryGB, provOs, provSshPassword]);

  const deleteServer = useCallback(async (id: string) => {
    confirm({
      title: 'Delete Server',
      message: 'Are you sure you want to delete this server? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => performDelete(id)
    });
  }, [confirm]);

  const performDelete = useCallback(async (id: string) => {
    setServerDeletingId(id);
    setServersError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/servers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Delete failed');
      toast.success('Server deleted successfully');
      await loadServers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setServersError(message);
      toast.error(message);
    } finally {
      setServerDeletingId(null);
    }
  }, [getAccessToken, loadServers]);

  const disableProvisionSubmit = !provLocation || !provHostname || !provSshPassword || provLoading;

  const provisionLocationId = typeof provResult?.location === 'string' ? provResult.location : '';
  const provisionLocationLabel = useMemo(() => {
    if (!provisionLocationId) return '';
    const match = (provOptions?.locations || []).find((item) => item.id === provisionLocationId);
    return match?.name || provisionLocationId;
  }, [provOptions, provisionLocationId]);
  const provisionIp = typeof provResult?.ip === 'string' ? provResult.ip : '';
  const provisionName = typeof provResult?.name === 'string' ? provResult.name : '';

  return (
    <>
      {serverView !== 'list' && (
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Provision New VM</CardTitle>
            <CardDescription className="text-white/60">
              Create a VM on a Proxmox host and optionally assign it to a user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {provOptionsLoading ? (
              <div className="flex justify-center py-4"><InlineLoader text="Loading options" /></div>
            ) : (
              <form onSubmit={handleProvision} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Location (Host)</Label>
                  <select
                    className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                    value={provLocation || ''}
                    onChange={(e) => setProvLocation(e.target.value)}
                  >
                    {(provOptions?.locations || []).map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name || location.id}
                      </option>
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
                    {(provOptions?.os || []).map((os) => (
                      <option key={os.id} value={os.id}>
                        {os.name || os.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Hostname</Label>
                  <Input
                    value={provHostname}
                    onChange={(e) => setProvHostname(e.target.value)}
                    placeholder="e.g. vm-ubuntu-01"
                    className="bg-black text-white border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">vCPU Cores</Label>
                  <Input
                    type="number"
                    min={1}
                    max={32}
                    value={provCpuCores}
                    onChange={(e) => setProvCpuCores(parseInt(e.target.value || '1', 10))}
                    className="bg-black text-white border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Memory (GB)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={128}
                    value={provMemoryGB}
                    onChange={(e) => setProvMemoryGB(parseInt(e.target.value || '1', 10))}
                    className="bg-black text-white border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Disk (GB)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={2000}
                    value={provDiskGB}
                    onChange={(e) => setProvDiskGB(parseInt(e.target.value || '10', 10))}
                    className="bg-black text-white border-white/10"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white">SSH Password</Label>
                  <Input
                    type="password"
                    value={provSshPassword}
                    onChange={(e) => setProvSshPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="bg-black text-white border-white/10"
                  />
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
                        if (id) {
                          const selected = userOptions.find((user) => user.id === id);
                          setAssignUserEmail(selected?.email || '');
                        }
                      }}
                    >
                      <option value="">Select user...</option>
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Owner ID (override)"
                      value={assignUserId}
                      disabled={usersLoading}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      className="bg-black text-white border-white/10"
                    />
                    <Input
                      placeholder="Owner Email (override)"
                      value={assignUserEmail}
                      onChange={(e) => setAssignUserEmail(e.target.value)}
                      className="bg-black text-white border-white/10"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={disableProvisionSubmit}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    {provLoading ? <InlineLoader text="Provisioning" /> : 'Create VM'}
                  </Button>
                  {provError && <span className="text-red-400 text-sm">{provError}</span>}
                </div>
              </form>
            )}

            {provResult && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white/5 border border-white/10">
                  <div className="text-white/60">Region</div>
                  <div className="text-white">{provisionLocationLabel}</div>
                </div>
                <div className="p-3 bg-white/5 border border-white/10">
                  <div className="text-white/60">IP Address</div>
                  <div className="text-white">{provisionIp}</div>
                </div>
                <div className="p-3 bg-white/5 border border-white/10">
                  <div className="text-white/60">Hostname</div>
                  <div className="text-white">{provisionName}</div>
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
              <div className="flex justify-center py-4"><InlineLoader text="Loading servers" /></div>
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
                    {servers.map((server) => {
                      const owner = server.owner_email || server.owner_id || '--';
                      return (
                        <tr key={server.id} className="border-b border-white/5">
                          <td className="py-2 pr-4 text-white">{server.name || '--'}</td>
                          <td className="py-2 pr-4 text-white/80">{server.ip || '--'}</td>
                          <td className="py-2 pr-4 text-white/80">{owner}</td>
                          <td className="py-2 pr-4 text-white/80">{server.status || '--'}</td>
                          <td className="py-2 pr-4 text-white/80">{server.location || '--'}</td>
                          <td className="py-2 pr-4 text-white/80">{formatDateTime(server.created_at)}</td>
                          <td className="py-2 pr-4 flex gap-2">
                            <Button
                              type="button"
                              onClick={() => deleteServer(server.id)}
                              className="bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30"
                              disabled={serverDeletingId === server.id}
                            >
                              {serverDeletingId === server.id ? <InlineLoader text="Deleting" /> : 'Delete'}
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
      <ConfirmationDialog />
    </>
  );
}
