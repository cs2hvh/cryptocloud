'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HostRow, Pool, TemplateRow } from './types';
import { InlineLoader } from '@/components/ui/loader';
import toast from 'react-hot-toast';

const LOCATION_OPTIONS = [
  { value: 'india', label: 'India' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'uk', label: 'UK' },
  { value: 'sydney', label: 'Sydney' },
  { value: 'germany', label: 'Germany' },
  { value: 'france', label: 'France' },
  { value: 'poland', label: 'Poland' },
  { value: 'us_east', label: 'US East' },
  { value: 'us_west', label: 'US West' },
  { value: 'canada', label: 'Canada' },
];

type HostFormState = {
  id?: string;
  name: string;
  hostUrl: string;
  allowInsecureTls: boolean;
  tokenId: string;
  tokenSecret: string;
  username: string;
  password: string;
  node: string;
  region: string;
  storage: string;
  bridge: string;
  gatewayIp: string;
  dnsPrimary: string;
  dnsSecondary: string;
  pools: Pool[];
  templates: TemplateRow[];
  isActive: boolean;
};

type HostsSectionProps = {
  isAdmin: boolean;
  getAccessToken: () => Promise<string | null>;
};

const emptyForm: HostFormState = {
  id: undefined,
  name: '',
  hostUrl: '',
  allowInsecureTls: false,
  tokenId: '',
  tokenSecret: '',
  username: '',
  password: '',
  node: '',
  region: 'us_east',
  storage: 'local',
  bridge: 'vmbr0',
  gatewayIp: '',
  dnsPrimary: '',
  dnsSecondary: '',
  pools: [],
  templates: [],
  isActive: true,
};

function mapPools(rawPools?: HostRow['public_ip_pools']): Pool[] {
  if (!Array.isArray(rawPools)) return [];
  return rawPools.map((pool) => ({
    mac: pool?.mac ?? '',
    label: pool?.label ?? undefined,
    ips: Array.isArray(pool?.public_ip_pool_ips)
      ? pool!.public_ip_pool_ips!.map((row) => ({ ip: row?.ip ?? '' }))
      : [{ ip: '' }],
  }));
}

function mapTemplates(rawTemplates?: HostRow['proxmox_templates']): TemplateRow[] {
  if (!Array.isArray(rawTemplates)) return [];
  return rawTemplates.map((tpl) => ({
    name: tpl?.name ?? '',
    vmid: tpl?.vmid != null ? String(tpl.vmid) : '',
    type: tpl?.type === 'lxc' ? 'lxc' : 'qemu',
  }));
}

export function HostsSection({ isAdmin, getAccessToken }: HostsSectionProps) {
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostMessage, setHostMessage] = useState<string | null>(null);
  const [form, setForm] = useState<HostFormState>(emptyForm);
  const [hostSaving, setHostSaving] = useState(false);
  const [hostFormError, setHostFormError] = useState<string | null>(null);

  const canSaveHost = useMemo(() => {
    if (!form.name || !form.hostUrl || !form.node) return false;
    if (!form.tokenId || !form.tokenSecret || !form.username || !form.password) return false;
    return true;
  }, [form]);

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
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load hosts');
      const rows = Array.isArray(json.hosts) ? (json.hosts as HostRow[]) : [];
      setHosts(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load hosts';
      setHostError(message);
    } finally {
      setHostLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  useEffect(() => {
    loadHosts();
  }, [loadHosts]);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setHostFormError(null);
    setHostMessage(null);
  }, []);

  const handleEditHost = useCallback((host: HostRow) => {
    setForm((prev) => ({
      ...prev,
      id: host.id,
      name: host.name ?? '',
      hostUrl: host.host_url ?? '',
      allowInsecureTls: Boolean(host.allow_insecure_tls),
      node: host.node ?? '',
      region: host.location ?? 'us_east',
      storage: host.storage ?? 'local',
      bridge: host.bridge ?? 'vmbr0',
      gatewayIp: host.gateway_ip ?? '',
      dnsPrimary: host.dns_primary ?? '',
      dnsSecondary: host.dns_secondary ?? '',
      pools: mapPools(host.public_ip_pools),
      templates: mapTemplates(host.proxmox_templates),
      isActive: host.is_active !== false,
      tokenId: '',
      tokenSecret: '',
      username: '',
      password: '',
    }));
    setHostFormError(null);
    setHostMessage(null);
  }, []);

  const updatePool = useCallback((index: number, pool: Pool) => {
    setForm((prev) => ({
      ...prev,
      pools: prev.pools.map((item, i) => (i === index ? pool : item)),
    }));
  }, []);

  const addPool = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      pools: [...prev.pools, { mac: '', ips: [{ ip: '' }] }],
    }));
  }, []);

  const removePool = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      pools: prev.pools.filter((_, i) => i !== index),
    }));
  }, []);

  const addPoolIp = useCallback((index: number) => {
    const pool = form.pools[index];
    if (!pool) return;
    updatePool(index, { ...pool, ips: [...pool.ips, { ip: '' }] });
  }, [form.pools, updatePool]);

  const removePoolIp = useCallback((poolIdx: number, ipIdx: number) => {
    const pool = form.pools[poolIdx];
    if (!pool) return;
    updatePool(poolIdx, {
      ...pool,
      ips: pool.ips.filter((_, i) => i !== ipIdx),
    });
  }, [form.pools, updatePool]);

  const changePoolIp = useCallback((poolIdx: number, ipIdx: number, value: string) => {
    const pool = form.pools[poolIdx];
    if (!pool) return;
    updatePool(poolIdx, {
      ...pool,
      ips: pool.ips.map((row, i) => (i === ipIdx ? { ...row, ip: value } : row)),
    });
  }, [form.pools, updatePool]);

  const changeTemplate = useCallback((idx: number, key: keyof TemplateRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      templates: prev.templates.map((tpl, i) => (i === idx ? { ...tpl, [key]: value } : tpl)),
    }));
  }, []);

  const addTemplate = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      templates: [...prev.templates, { name: '', vmid: '', type: 'qemu' }],
    }));
  }, []);

  const removeTemplate = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== idx),
    }));
  }, []);

  const submitForm = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveHost) return;

    setHostSaving(true);
    setHostFormError(null);
    setHostMessage(null);

    try {
      const token = await getAccessToken();
      const payload = {
        id: form.id,
        name: form.name,
        hostUrl: form.hostUrl,
        allowInsecureTls: form.allowInsecureTls,
        location: form.region,
        tokenId: form.tokenId,
        tokenSecret: form.tokenSecret,
        username: form.username,
        password: form.password,
        node: form.node,
        storage: form.storage,
        bridge: form.bridge,
        network: {
          gatewayIp: form.gatewayIp,
          dnsPrimary: form.dnsPrimary,
          dnsSecondary: form.dnsSecondary,
        },
        pools: form.pools
          .filter((pool) => pool.mac)
          .map((pool) => ({
            mac: pool.mac,
            ips: pool.ips.map((row) => row.ip).filter(Boolean),
            label: pool.label,
          })),
        templates: form.templates
          .filter((tpl) => tpl.name && tpl.vmid)
          .map((tpl) => ({
            name: tpl.name,
            vmid: Number(tpl.vmid),
            type: tpl.type || 'qemu',
          })),
        isActive: form.isActive,
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
      resetForm();
      setHostMessage('Host saved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setHostFormError(message);
    } finally {
      setHostSaving(false);
    }
  }, [canSaveHost, form, getAccessToken, loadHosts, resetForm]);

  return (
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
            <div className="flex justify-center py-8"><InlineLoader text="Loading hosts" /></div>
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
                  {hosts.map((host) => {
                    const pools = Array.isArray(host.public_ip_pools) ? host.public_ip_pools : [];
                    const ipCount = pools.reduce((sum, pool) => {
                      const ips = Array.isArray(pool?.public_ip_pool_ips) ? pool!.public_ip_pool_ips! : [];
                      return sum + ips.length;
                    }, 0);
                    return (
                      <tr key={host.id} className="border-b border-white/5">
                        <td className="py-2 pr-4 text-white">{host.name ?? ''}</td>
                        <td className="py-2 pr-4 text-white/80">{host.host_url ?? ''}</td>
                        <td className="py-2 pr-4 text-white/80">{host.node ?? ''}</td>
                        <td className="py-2 pr-4 text-white/80">{host.location ?? '-'}</td>
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
      </Card>

      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {form.id ? 'Update Host' : 'Add Host'}
          </CardTitle>
          <CardDescription className="text-white/60">
            Provide connection details and save to update the provisioning fleet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitForm} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-white">Name</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Proxmox Host URL</Label>
              <Input
                placeholder="https://pve.example.com:8006"
                className="bg-black text-white border-white/10"
                value={form.hostUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, hostUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Node</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.node}
                onChange={(e) => setForm((prev) => ({ ...prev, node: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Location</Label>
              <select
                className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                value={form.region}
                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              >
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-white">Storage</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.storage}
                onChange={(e) => setForm((prev) => ({ ...prev, storage: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Bridge</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.bridge}
                onChange={(e) => setForm((prev) => ({ ...prev, bridge: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={form.allowInsecureTls}
                    onChange={(e) => setForm((prev) => ({ ...prev, allowInsecureTls: e.target.checked }))}
                  />
                  Allow self-signed TLS
                </label>
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>
            <div>
              <Label className="text-white">Token ID</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.tokenId}
                onChange={(e) => setForm((prev) => ({ ...prev, tokenId: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Token Secret</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.tokenSecret}
                onChange={(e) => setForm((prev) => ({ ...prev, tokenSecret: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Username</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Password</Label>
              <Input
                type="password"
                className="bg-black text-white border-white/10"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">Gateway IP</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.gatewayIp}
                onChange={(e) => setForm((prev) => ({ ...prev, gatewayIp: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">DNS Primary</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.dnsPrimary}
                onChange={(e) => setForm((prev) => ({ ...prev, dnsPrimary: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white">DNS Secondary</Label>
              <Input
                className="bg-black text-white border-white/10"
                value={form.dnsSecondary}
                onChange={(e) => setForm((prev) => ({ ...prev, dnsSecondary: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Public IP Pools</Label>
                <Button
                  type="button"
                  className="bg-white/10 text-white border border-white/10"
                  onClick={addPool}
                >
                  Add Pool
                </Button>
              </div>
              <div className="mt-2 space-y-4">
                {form.pools.map((pool, poolIndex) => (
                  <div key={poolIndex} className="border border-white/10 bg-white/5 p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                      <Input
                        placeholder="Pool MAC"
                        className="bg-black text-white border-white/10"
                        value={pool.mac}
                        onChange={(e) => updatePool(poolIndex, { ...pool, mac: e.target.value })}
                      />
                      <div className="md:col-span-2 flex justify-end gap-2">
                        <Button
                          type="button"
                          className="bg-white/10 text-white border border-white/10"
                          onClick={() => addPoolIp(poolIndex)}
                        >
                          Add IP
                        </Button>
                        <Button
                          type="button"
                          className="bg-white/10 text-white border border-white/10"
                          onClick={() => removePool(poolIndex)}
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
                            onChange={(e) => changePoolIp(poolIndex, ipIndex, e.target.value)}
                          />
                          <div className="md:col-span-2">
                            <Button
                              type="button"
                              className="bg-white/10 text-white border border-white/10"
                              onClick={() => removePoolIp(poolIndex, ipIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {form.pools.length === 0 && (
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
                  onClick={addTemplate}
                >
                  Add Template
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {form.templates.map((tpl, idx) => (
                  <div key={idx} className="grid grid-cols-1 items-center gap-2 md:grid-cols-5">
                    <Input
                      placeholder="OS Name (e.g., Ubuntu 24.04 LTS)"
                      className="bg-black text-white border-white/10 md:col-span-2"
                      value={tpl.name}
                      onChange={(e) => changeTemplate(idx, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="VMID"
                      className="bg-black text-white border-white/10"
                      value={tpl.vmid}
                      onChange={(e) => changeTemplate(idx, 'vmid', e.target.value)}
                    />
                    <select
                      className="bg-black text-white border border-white/10 h-10 w-full rounded-md px-3"
                      value={tpl.type || 'qemu'}
                      onChange={(e) => changeTemplate(idx, 'type', e.target.value)}
                    >
                      <option value="qemu">QEMU (VM)</option>
                      <option value="lxc">LXC (Container)</option>
                    </select>
                    <Button
                      type="button"
                      className="bg-white/10 text-white border border-white/10"
                      onClick={() => removeTemplate(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {form.templates.length === 0 && (
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
                {hostSaving ? 'Saving...' : form.id ? 'Update Host' : 'Save Host'}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                className="bg-white/10 text-white border border-white/10"
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
