'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type IpRow = { ip: string; mac?: string };

export default function AdminPage() {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [hostUrl, setHostUrl] = useState('');
  const [allowInsecureTls, setAllowInsecureTls] = useState(false);

  // Both token and username/password are required now
  const [tokenId, setTokenId] = useState('');
  const [tokenSecret, setTokenSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [node, setNode] = useState('');
  const [region, setRegion] = useState('us_east');
  const [storage, setStorage] = useState('local');
  const [bridge, setBridge] = useState('vmbr0');
  // Template VMIDs and OS names are managed below in the Templates section

  const [gatewayIp, setGatewayIp] = useState('');
  const [dnsPrimary, setDnsPrimary] = useState('');
  const [dnsSecondary, setDnsSecondary] = useState('');

  type Pool = { mac: string; ips: IpRow[]; label?: string };
  type TemplateRow = { name: string; vmid: string; type?: 'qemu' | 'lxc' };
  const [pools, setPools] = useState<Pool[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [isActive, setIsActive] = useState(true);

  const canSave = useMemo(() => {
    if (!name || !hostUrl || !node) return false;
    if (!tokenId || !tokenSecret || !username || !password) return false;
    return true;
  }, [name, hostUrl, node, tokenId, tokenSecret, username, password]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/admin/proxmox/hosts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 403) {
        setError('Not authorized. Ask admin to add your email to ADMIN_EMAILS.');
        setHosts([]);
      } else {
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Failed to load');
        setHosts(json.hosts || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addPool = () => setPools((prev) => [...prev, { mac: '', ips: [{ ip: '' }] }]);
  const removePool = (pidx: number) => setPools((prev) => prev.filter((_, i) => i !== pidx));
  const changePoolMac = (pidx: number, mac: string) => setPools((prev) => prev.map((p, i) => (i === pidx ? { ...p, mac } : p)));
  const addPoolIp = (pidx: number) => setPools((prev) => prev.map((p, i) => (i === pidx ? { ...p, ips: [...p.ips, { ip: '' }] } : p)));
  const removePoolIp = (pidx: number, idx: number) => setPools((prev) => prev.map((p, i) => (i === pidx ? { ...p, ips: p.ips.filter((_, j) => j !== idx) } : p)));
  const changePoolIp = (pidx: number, idx: number, ip: string) => setPools((prev) => prev.map((p, i) => (i === pidx ? { ...p, ips: p.ips.map((r, j) => (j === idx ? { ...r, ip } : r)) } : p)));

  const addTemplate = () => setTemplates((prev) => [...prev, { name: '', vmid: '', type: 'qemu' }]);
  const removeTemplate = (idx: number) => setTemplates((prev) => prev.filter((_, i) => i !== idx));
  const changeTemplate = (idx: number, key: keyof TemplateRow, val: string) => setTemplates((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: val } : t)));

  const resetForm = () => {
    setId(undefined);
    setName(''); setHostUrl(''); setAllowInsecureTls(false);
    setTokenId(''); setTokenSecret(''); setUsername(''); setPassword('');
    setNode(''); setRegion('us_east'); setStorage('local'); setBridge('vmbr0');
    setGatewayIp(''); setDnsPrimary(''); setDnsSecondary('');
    setPools([]); setTemplates([]); setIsActive(true);
    setMessage(null); setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const payload = {
        id,
        name,
        hostUrl,
        allowInsecureTls,
        location: region,
        tokenId,
        tokenSecret,
        username,
        password,
        node,
        storage,
        bridge,
        // Templates are provided via the templates array below
        network: { gatewayIp, dnsPrimary, dnsSecondary },
        pools: pools
          .filter(p => p.mac)
          .map(p => ({ mac: p.mac, ips: p.ips.map(i => i.ip).filter(Boolean) })),
        templates: templates
          .filter(t => t.name && t.vmid)
          .map(t => ({ name: t.name, vmid: Number(t.vmid), type: t.type || 'qemu' })),
        isActive,
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
      setMessage('Saved');
      resetForm();
      load();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Proxmox Hosts</CardTitle>
          <CardDescription className="text-white/60">
            Add or update Proxmox hosts, credentials, and IP pools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-white/60">Loading…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
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
                  </tr>
                </thead>
                <tbody>
                  {(hosts || []).map((h: any) => {
                    const pools = (h.public_ip_pools || []) as Array<{ public_ip_pool_ips?: any[] }>;
                    const ipCount = pools.reduce((sum, p) => sum + ((p.public_ip_pool_ips || []).length), 0);
                    return (
                      <tr key={h.id} className="border-b border-white/5">
                        <td className="py-2 pr-4 text-white">{h.name}</td>
                        <td className="py-2 pr-4 text-white/80">{h.host_url}</td>
                        <td className="py-2 pr-4 text-white/80">{h.node}</td>
                        <td className="py-2 pr-4 text-white/80">{h.location || '-'}</td>
                        <td className="py-2 pr-4 text-white/80">{h.template_vmid ?? '-'}</td>
                        <td className="py-2 pr-4 text-white/80">{ipCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Add / Update Host</CardTitle>
          <CardDescription className="text-white/60">Fill details and save</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Name</Label>
              <Input className="bg-black text-white border-white/10" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Proxmox Host URL</Label>
              <Input placeholder="https://pve.example.com:8006" className="bg-black text-white border-white/10" value={hostUrl} onChange={e => setHostUrl(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Node</Label>
              <Input className="bg-black text-white border-white/10" value={node} onChange={e => setNode(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Location</Label>
              <select className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                value={region}
                onChange={e => setRegion(e.target.value)}
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
            {/* Template VMID and OS moved to Templates section below */}
            <div>
              <Label className="text-white">Storage</Label>
              <Input className="bg-black text-white border-white/10" value={storage} onChange={e => setStorage(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Bridge</Label>
              <Input className="bg-black text-white border-white/10" value={bridge} onChange={e => setBridge(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <div className="flex gap-4 mt-2 flex-wrap">
                <label className="text-white/80 flex items-center gap-2">
                  <input type="checkbox" checked={allowInsecureTls} onChange={e => setAllowInsecureTls(e.target.checked)} />
                  Allow self‑signed TLS
                </label>
                <label className="text-white/80 flex items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Active
                </label>
              </div>
            </div>

            <div>
              <Label className="text-white">Token ID</Label>
              <Input className="bg-black text-white border-white/10" value={tokenId} onChange={e => setTokenId(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Token Secret</Label>
              <Input className="bg-black text-white border-white/10" value={tokenSecret} onChange={e => setTokenSecret(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Username</Label>
              <Input className="bg-black text-white border-white/10" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">Password</Label>
              <Input type="password" className="bg-black text-white border-white/10" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div>
              <Label className="text-white">Gateway IP</Label>
              <Input className="bg-black text-white border-white/10" value={gatewayIp} onChange={e => setGatewayIp(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">DNS Primary</Label>
              <Input className="bg-black text-white border-white/10" value={dnsPrimary} onChange={e => setDnsPrimary(e.target.value)} />
            </div>
            <div>
              <Label className="text-white">DNS Secondary</Label>
              <Input className="bg-black text-white border-white/10" value={dnsSecondary} onChange={e => setDnsSecondary(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Public IP Pools</Label>
                <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={addPool}>Add Pool</Button>
              </div>
              <div className="mt-2 space-y-4">
                {pools.map((pool, pidx) => (
                  <div key={pidx} className="p-3 border border-white/10 bg-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <Input placeholder="Pool MAC" className="bg-black text-white border-white/10" value={pool.mac} onChange={e => changePoolMac(pidx, e.target.value)} />
                      <div className="md:col-span-2 flex justify-end gap-2">
                        <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={() => addPoolIp(pidx)}>Add IP</Button>
                        <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={() => removePool(pidx)}>Remove Pool</Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {pool.ips.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                          <Input placeholder="IP" className="bg-black text-white border-white/10" value={row.ip} onChange={e => changePoolIp(pidx, idx, e.target.value)} />
                          <div className="md:col-span-2">
                            <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={() => removePoolIp(pidx, idx)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mt-4">
                <Label className="text-white">Templates (OS Name + VMID)</Label>
                <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={addTemplate}>Add Template</Button>
              </div>
              <div className="mt-2 space-y-2">
                {templates.map((t, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                    <Input placeholder="OS Name (e.g., Ubuntu 24.04 LTS)" className="bg-black text-white border-white/10 md:col-span-2" value={t.name} onChange={e => changeTemplate(idx, 'name', e.target.value)} />
                    <Input placeholder="VMID" className="bg-black text-white border-white/10" value={t.vmid} onChange={e => changeTemplate(idx, 'vmid', e.target.value)} />
                    <select className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3" value={t.type || 'qemu'} onChange={e => changeTemplate(idx, 'type', e.target.value)}>
                      <option value="qemu">QEMU (VM)</option>
                      <option value="lxc">LXC (Container)</option>
                    </select>
                    <Button type="button" className="bg-white/10 text-white border border-white/10" onClick={() => removeTemplate(idx)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="md:col-span-2 text-red-400">{error}</div>}
            {message && <div className="md:col-span-2 text-green-400">{message}</div>}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={!canSave || saving} className="bg-white/10 text-white border border-white/10">
                {saving ? 'Saving…' : 'Save Host'}
              </Button>
              <Button type="button" onClick={resetForm} className="bg-white/10 text-white border border-white/10">Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
