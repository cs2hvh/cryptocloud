'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaServer, FaSync, FaCopy } from 'react-icons/fa';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

type Option = { id: string; name?: string; host?: string; ip?: string; mac?: string | null };

export default function ServersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ locations: Option[]; os: Option[]; ips: Option[] } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [myServers, setMyServers] = useState<any[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const [location, setLocation] = useState<string | undefined>(undefined);
  const [os, setOs] = useState<string>('ubuntu-24');
  const [hostname, setHostname] = useState('');
  const [cpuCores, setCpuCores] = useState(2);
  const [memoryGB, setMemoryGB] = useState(2);
  const [diskGB, setDiskGB] = useState(20);
  // IP will be auto-assigned server-side; no selection here
  const [sshPassword, setSshPassword] = useState('');

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/options', { cache: 'no-store' });
      const json = await res.json();
      setOptions({ locations: json.locations || [], os: json.os || [], ips: json.ips || [] });
      setLocation((prev) => prev ?? json.locations?.[0]?.id);
      // nothing to do for IPs here; kept for future display
    } catch (e: any) {
      setError(e?.message || 'Failed to load options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Load user's servers from Supabase
  const loadMyServers = async () => {
    if (!user?.id) return;
    setMyLoading(true);
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyServers(data || []);
    } catch {
      // ignore for now
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    loadMyServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submitDisabled = useMemo(() => {
    return submitLoading || !location || !sshPassword || !hostname;
  }, [submitLoading, location, sshPassword, hostname]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      // IP auto-assigned on server; no client-side selection
      const payload = {
        location,
        os,
        hostname,
        cpuCores,
        memoryMB: memoryGB * 1024,
        diskGB,
        // ip and mac assigned on server
        sshPassword,
        ownerId: user?.id,
        ownerEmail: user?.email,
      };
      const res = await fetch('/api/proxmox/vms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409) {
        setError('No available IPs at the moment. Try again later.');
        await loadOptions();
        return;
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Provisioning failed');
      }
      setResult(json);
      loadMyServers();
      await loadOptions();
    } catch (e: any) {
      setError(e?.message || 'Provisioning failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Servers</h1>
          <p className="text-white/60 mt-1">Create and manage your VPS</p>
        </div>
      </div>

      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <FaServer className="h-5 w-5" />
            <span>Launch New Server</span>
          </CardTitle>
          <CardDescription className="text-white/60">
            Choose location, specs, and SSH password. IP will be auto-assigned.
            We’ll clone an Ubuntu 24 template and configure networking automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-white/60">Loading options…</div>
          ) : (
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-black text-white border-white/10">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white border-white/10">
                    {options?.locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name || l.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Operating System</Label>
                <Select value={os} onValueChange={setOs}>
                  <SelectTrigger className="bg-black text-white border-white/10">
                    <SelectValue placeholder="Select OS" />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white border-white/10">
                    {options?.os.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name || o.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Hostname</Label>
                <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="e.g. dev-ubuntu-01" className="bg-black text-white border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">IP Assignment</Label>
                <div className="text-white/70 text-sm">An available IP will be auto-assigned.</div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">vCPU Cores</Label>
                <Input type="number" min={1} max={16} value={cpuCores} onChange={(e) => setCpuCores(parseInt(e.target.value || '1', 10))} className="bg-black text-white border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Memory (GB)</Label>
                <Input type="number" min={1} max={64} value={memoryGB} onChange={(e) => setMemoryGB(parseInt(e.target.value || '1', 10))} className="bg-black text-white border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Disk (GB)</Label>
                <Input type="number" min={10} max={500} value={diskGB} onChange={(e) => setDiskGB(parseInt(e.target.value || '10', 10))} className="bg-black text-white border-white/10" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white">SSH Password</Label>
                <Input type="password" value={sshPassword} onChange={(e) => setSshPassword(e.target.value)} placeholder="Enter a strong password" className="bg-black text-white border-white/10" />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={submitDisabled} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  {submitLoading ? 'Provisioning…' : 'Create VPS'}
                </Button>
                {error && <span className="text-red-400 text-sm">{error}</span>}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {result?.ok && (
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Server Details</CardTitle>
            <CardDescription className="text-white/60">Your server is being started. Below are its details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">Region</div>
                <div className="text-white">{options?.locations.find(l => l.id === result.location)?.name || result.location || 'N/A'}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">IP Address</div>
                <div className="text-white">{result.ip}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">Hostname</div>
                <div className="text-white">{result.name}</div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">VM ID</div>
                <div className="text-white">{result.vmid}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">Node</div>
                <div className="text-white">{result.node}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">OS</div>
                <div className="text-white">{result.os}</div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">vCPU</div>
                <div className="text-white">{result.specs?.cpuCores}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">Memory</div>
                <div className="text-white">{result.specs?.memoryMB} MB</div>
              </div>
              {typeof result.specs?.diskGB === 'number' && (
                <div className="p-3 bg-white/5 border border-white/10">
                  <div className="text-white/60">Disk</div>
                  <div className="text-white">{result.specs?.diskGB} GB</div>
                </div>
              )}

              <div className="p-3 bg-white/5 border border-white/10 md:col-span-3">
                <div className="text-white/60">Status</div>
                <div className="text-white">{result.status}</div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">SSH Username</div>
                <div className="text-white">ubuntu</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10">
                <div className="text-white/60">SSH Port</div>
                <div className="text-white">22</div>
              </div>
              {result.db && !result.db.saved && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 md:col-span-3">
                  <div className="text-red-300">Warning: Failed to save in database</div>
                  <div className="text-red-400 text-xs break-all">{result.db.error || 'Unknown error'}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">My Servers</CardTitle>
              <CardDescription className="text-white/60">Provisioned servers associated with your account</CardDescription>
            </div>
            <Button onClick={loadMyServers} className="bg-white/10 hover:bg-white/20 text-white border border-white/10" disabled={myLoading}>
              <FaSync className={`h-4 w-4 mr-2 ${myLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myLoading ? (
            <div className="text-white/60">Loading…</div>
          ) : myServers.length === 0 ? (
            <div className="text-white/60">No servers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-white/60 border-b border-white/10">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Region</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2 pr-4">Specs</th>
                    <th className="py-2 pr-4">OS</th>
                    <th className="py-2 pr-4">VMID</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myServers.map((s) => {
                    const regionName = options?.locations?.find((l) => l.id === s.location)?.name || s.location || '—';
                    const specs = `${s.cpu_cores || '?'} vCPU • ${s.memory_mb || 0} MB${s.disk_gb ? ` • ${s.disk_gb} GB` : ''}`;
                    const sshCmd = `ssh ubuntu@${s.ip}`;
                    return (
                      <tr key={s.id} className="border-b border-white/5">
                        <td className="py-2 pr-4 text-white">{s.name}</td>
                        <td className="py-2 pr-4 text-white/80">{regionName}</td>
                        <td className="py-2 pr-4 text-white/80">{s.ip}</td>
                        <td className="py-2 pr-4 text-white/80">{specs}</td>
                        <td className="py-2 pr-4 text-white/80">{s.os}</td>
                        <td className="py-2 pr-4 text-white/80">{s.vmid}</td>
                        <td className="py-2 pr-4 text-white/80">{s.status || '—'}</td>
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(sshCmd)}
                            className="text-white/80 hover:text-white inline-flex items-center"
                            title="Copy SSH command"
                          >
                            <FaCopy className="h-4 w-4 mr-2" /> Copy SSH
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

