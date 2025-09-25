"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaServer, FaSync, FaCopy, FaPowerOff, FaPlay, FaRedo, FaCheck, FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaMicrochip, FaHdd, FaMemory, FaInfoCircle, FaCheckCircle, FaExternalLinkAlt, FaThumbsUp, FaWallet, FaExclamationTriangle } from "react-icons/fa";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Sparkline from "@/components/ui/sparkline";
import { calculateHourlyCost, calculateMonthlyCost, formatCurrency, canAffordServer, getEstimatedRuntime, type ServerSpecs } from "@/lib/pricing";

type Option = { id: string; name?: string; host?: string; ip?: string; mac?: string | null; location?: string };

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function ServersPage() {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const searchParams = useSearchParams();

  // Options + view
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ locations: Option[]; os: Option[]; ips: Option[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");

  // Create form
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [os, setOs] = useState<string>("Ubuntu 24.04 LTS");
  const [cpuCores, setCpuCores] = useState(2);
  const [memoryGB, setMemoryGB] = useState(2);
  const [diskGB, setDiskGB] = useState(20);
  const [sshPassword, setSshPassword] = useState("");
  const [sshPasswordConfirm, setSshPasswordConfirm] = useState("");
  const [step, setStep] = useState(0);

  // My Servers
  const [myServers, setMyServers] = useState<any[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [openMonitorId, setOpenMonitorId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { t: number; cpu: number | null; memUsed: number | null; netIn: number | null; netOut: number | null }[]>>({});
  const [confirm, setConfirm] = useState<{ id: string; name?: string; action: 'reboot'|'stop' } | null>(null);

  // View selection from sidebar
  useEffect(() => {
    const v = (searchParams.get("view") || "deploy").toLowerCase();
    setActiveTab(v === "list" ? "list" : "create");
  }, [searchParams]);

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/infra/options", { cache: "no-store" });
      const json = await res.json();
      setOptions({ locations: json.locations || [], os: json.os || [], ips: json.ips || [] });
      setLocation((prev) => prev ?? json.locations?.[0]?.id);
      if (json.os?.length > 0) setOs(json.os[0].id || json.os[0].name || os);
    } catch (e: any) {
      setError(e?.message || "Failed to load options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const loadMyServers = async () => {
    if (!user?.id) return;
    setMyLoading(true);
    try {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyServers(data || []);
    } catch {}
    finally { setMyLoading(false); }
  };

  useEffect(() => { loadMyServers(); }, [user?.id]);

  const stepsValid = [
    hostname.trim().length > 0,
    !!location,
    !!os,
    cpuCores >= 1 && memoryGB >= 1 && diskGB >= 10,
    sshPassword.length >= 6 && sshPassword === sshPasswordConfirm,
  ];

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const payload = {
        location,
        os,
        hostname,
        cpuCores,
        memoryMB: memoryGB * 1024,
        diskGB,
        sshPassword,
        ownerId: user?.id,
        ownerEmail: user?.email,
      };
      const res = await fetch("/api/proxmox/vms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409) {
        setError("No available IPs. Try again later."); await loadOptions(); return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || "Provisioning failed");
      setResult(json);
    } catch (err: any) { setError(err?.message || "Provisioning failed"); }
    finally { setSubmitLoading(false); }
  };

  const deployNow = async () => {
    const firstInvalid = stepsValid.findIndex((v) => !v);
    if (firstInvalid >= 0) { setStep(firstInvalid); return; }
    await onSubmit();
  };

  const powerAction = async (serverId: string, action: "start" | "stop" | "reboot") => {
    setActingId(serverId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/proxmox/vms/power", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ serverId, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Action failed");
      await loadMyServers();
    } finally { setActingId(null); }
  };

  const confirmAndPower = (server: any, action: "reboot" | "stop") => {
    setConfirm({ id: server.id, name: server.name, action });
  };

  const copyIp = async (ip?: string) => {
    if (!ip) return; try { await navigator.clipboard.writeText(ip); setCopiedIp(ip); setTimeout(()=>setCopiedIp(null), 1200); } catch {}
  };

  const loadMetrics = async (serverId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch(`/api/proxmox/vms/metrics?serverId=${encodeURIComponent(serverId)}&range=hour`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load metrics");
      setMetrics((m) => ({ ...m, [serverId]: json.series || [] }));
    } catch {}
  };

  const serverSpecs: ServerSpecs = useMemo(() => ({
    cpuCores,
    memoryGB,
    diskGB,
    location
  }), [cpuCores, memoryGB, diskGB, location]);

  const pricing = useMemo(() => {
    const hourly = calculateHourlyCost(serverSpecs);
    const monthly = calculateMonthlyCost(serverSpecs);
    return {
      hourly,
      monthly,
      formatted: `${formatCurrency(hourly)}/hr • ${formatCurrency(monthly)}/mo`
    };
  }, [serverSpecs]);

  const canAfford = useMemo(() => {
    return canAffordServer(balance, serverSpecs, 1);
  }, [balance, serverSpecs]);

  const estimatedRuntime = useMemo(() => {
    return getEstimatedRuntime(balance, serverSpecs);
  }, [balance, serverSpecs]);

  const passwordStrength = useMemo(() => {
    let score = 0; if (sshPassword.length >= 6) score += 30; if (/[A-Z]/.test(sshPassword)) score += 20; if (/[a-z]/.test(sshPassword)) score += 20; if (/[0-9]/.test(sshPassword)) score += 15; if (/[^A-Za-z0-9]/.test(sshPassword)) score += 15; return Math.min(score, 100);
  }, [sshPassword]);

  const submitDisabled = useMemo(() => {
    return submitLoading || stepsValid.includes(false) || !canAfford;
  }, [submitLoading, stepsValid, canAfford]);

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Servers</h1>
          <p className="text-white/60 mt-1">Create and manage your VPS</p>
        </div>
      </div>

      {activeTab === "create" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main column */}
          <div className="md:col-span-9 space-y-4">
            {/* Horizontal breadcrumb */}
            {(() => {
              const steps = [
                { label: "Name", valid: stepsValid[0] },
                { label: "Location", valid: stepsValid[1] },
                { label: "Operating System", valid: stepsValid[2] },
                { label: "Configuration", valid: stepsValid[3] },
                { label: "Password", valid: stepsValid[4] },
              ];
              const canAccess = (i: number) => steps.slice(0, i).every((s) => s.valid);
              return (
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    {steps.map((s, idx) => {
                      const active = step === idx; const done = step > idx && steps[idx].valid; const accessible = idx === 0 || canAccess(idx);
                      return (
                        <div key={idx} className="flex-1 flex items-center">
                          <button type="button" onClick={() => accessible && setStep(idx)} disabled={!accessible} className={`flex items-center gap-2 ${accessible ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${done ? "border-green-400 bg-green-500/20 text-green-300" : active ? "border-blue-400 bg-blue-500/20 text-blue-300" : "border-white/20 bg-white/10 text-white/70"}`}>{done ? <FaCheck /> : idx + 1}</div>
                            <span className={`text-xs md:text-sm ${active ? "text-white" : "text-white/70"}`}>{s.label}</span>
                          </button>
                          {idx < steps.length - 1 && (<div className={`mx-2 h-0.5 flex-1 rounded ${canAccess(idx + 1) ? "bg-white/40" : "bg-white/10"}`} />)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">{["Name","Location","Operating System","Configuration","Password"][step]}</CardTitle>
                <CardDescription className="text-white/60">Step {step + 1} of 5</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step === 0 && (
                  <div className="space-y-3">
                    <Label className="text-white">Hostname</Label>
                    <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="e.g. prod-ubuntu-01" className="bg-black text-white border-white/10" />
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-3">
                    <Label className="text-white">Location</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(options?.locations || []).map((l) => {
                        const slug = String((l as any).location || '').toLowerCase();
                        const name = String(l.name || l.id);
                        const id = String(l.id);
                        const isIndia = /india/i.test(slug) || /india/i.test(name);
                        return (
                          <button key={id} type="button" onClick={() => setLocation(id)} className={`w-full text-left rounded-xl border px-3 py-3 transition ${location === id ? 'bg-[#60A5FA]/10 border-[#60A5FA] text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}>
                            <div className="flex items-center gap-3">
                              {isIndia ? (
                                <Image src="/india.png" alt="India" width={20} height={20} className="h-5 w-5 rounded-sm object-cover" />
                              ) : (
                                <span className="text-sm text-white/80"><FaMapMarkerAlt className="inline mr-1" />Region</span>
                              )}
                              <div className="min-w-0">
                                <div className="truncate text-sm text-white">{name}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <Label className="text-white">Operating System</Label>
                    <Select value={os} onValueChange={setOs}>
                      <SelectTrigger className="bg-black text-white border-white/10"><SelectValue placeholder="Select OS" /></SelectTrigger>
                      <SelectContent className="bg-black text-white border-white/10 max-h-64 overflow-auto">
                        {(options?.os || []).map((o) => (<SelectItem key={String(o.id)} value={String(o.id)}>{o.name || String(o.id)}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><Label className="text-white">vCPU Cores</Label><Input type="number" min={1} max={32} value={cpuCores} onChange={(e) => setCpuCores(parseInt(e.target.value || '1', 10))} className="mt-2 bg-black text-white border-white/10" /></div>
                    <div><Label className="text-white">Memory (GB)</Label><Input type="number" min={1} max={128} value={memoryGB} onChange={(e) => setMemoryGB(parseInt(e.target.value || '1', 10))} className="mt-2 bg-black text-white border-white/10" /></div>
                    <div><Label className="text-white">Storage (GB)</Label><Input type="number" min={10} max={2000} value={diskGB} onChange={(e) => setDiskGB(parseInt(e.target.value || '10', 10))} className="mt-2 bg-black text-white border-white/10" /></div>
                  </div>
                )}

                {step === 4 && (
                  <div className="grid grid-cols-1 gap-3">
                    <div><Label className="text-white">SSH Password</Label><Input type="password" value={sshPassword} onChange={(e) => setSshPassword(e.target.value)} placeholder="Enter a strong password" className="mt-2 bg-black text-white border-white/10" /></div>
                    <div><Label className="text-white">Confirm Password</Label><Input type="password" value={sshPasswordConfirm} onChange={(e) => setSshPasswordConfirm(e.target.value)} placeholder="Re-enter password" className="mt-2 bg-black text-white border-white/10" /></div>
                    {sshPasswordConfirm && sshPasswordConfirm !== sshPassword && (<div className="text-red-400 text-xs">Passwords do not match</div>)}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="bg-white/10 hover:bg-white/20 text-white border border-white/10"><FaChevronLeft className="mr-2" /> Back</Button>
                  {step < 4 ? (
                    <Button type="button" onClick={() => stepsValid[step] && setStep((s) => Math.min(4, s + 1))} disabled={!stepsValid[step]} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-50">Next <FaChevronRight className="ml-2" /></Button>
                  ) : (
                    <Button type="button" onClick={deployNow} disabled={submitDisabled} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-50">{submitLoading ? "Provisioning..." : "Deploy Instance"}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="md:col-span-3">
            <Card className="bg-black/50 border-white/10 sticky top-16">
              <CardHeader>
                <CardTitle className="text-white text-base">Summary</CardTitle>
                <CardDescription className="text-white/60">Review your configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-white/10"><div className="text-white/60">Hostname</div><div className="text-white break-all ml-4 max-w-[60%] text-right">{hostname || "—"}</div></div>
                <div className="flex items-center justify-between py-2 border-b border-white/10"><div className="text-white/60 flex items-center gap-2"><FaMapMarkerAlt /> Location</div><div className="text-white ml-4 max-w-[60%] text-right">{options?.locations.find((l) => l.id === location)?.name || location || "—"}</div></div>
                <div className="flex items-center justify-between py-2 border-b border-white/10"><div className="text-white/60">Operating System</div><div className="text-white ml-4 max-w-[60%] text-right">{os || "—"}</div></div>
                <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white/10 border border-white/10 text-white/90"><FaMicrochip /> {cpuCores} vCPU</span><span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white/10 border border-white/10 text-white/90"><FaMemory /> {memoryGB} GB</span><span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white/10 border border-white/10 text-white/90"><FaHdd /> {diskGB} GB</span></div>

                {/* Wallet Balance */}
                <div className="rounded-lg p-3 bg-gradient-to-r from-white/5 to-white/10 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white/60 flex items-center gap-2">
                      <FaWallet /> Wallet Balance
                    </div>
                    <div className="text-white text-sm">
                      {walletLoading ? '...' : formatCurrency(balance)}
                    </div>
                  </div>
                  {!canAfford && (
                    <div className="flex items-center gap-2 text-orange-400 text-xs">
                      <FaExclamationTriangle />
                      <span>Insufficient balance (requires {formatCurrency(pricing.hourly)} minimum)</span>
                    </div>
                  )}
                  {canAfford && estimatedRuntime > 0 && (
                    <div className="text-white/50 text-xs">
                      Estimated runtime: ~{estimatedRuntime}h
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="rounded-lg p-3 bg-gradient-to-r from-white/5 to-white/10 border border-white/10">
                  <div className="text-white/60">Server Cost</div>
                  <div className="text-white text-sm mt-1">{pricing.formatted}</div>
                  <div className="text-white/40 text-[11px] mt-1">Initial charge: {formatCurrency(pricing.hourly)} (1 hour minimum)</div>
                </div>
                {step === 4 && (<div className="space-y-2"><div className="flex items-center justify-between text-white/70"><span className="flex items-center gap-2"><FaInfoCircle /> Password Strength</span><span>{passwordStrength}%</span></div><div className="h-1.5 w-full bg-white/10 rounded"><div className="h-1.5 rounded bg-gradient-to-r from-emerald-400 to-green-300" style={{ width: `${passwordStrength}%` }} /></div></div>)}
                <div><Button onClick={deployNow} disabled={submitDisabled} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-50">{submitLoading ? "Provisioning..." : "Deploy Instance"}</Button></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "create" && result?.ok && (
        <Card className="bg-black/50 border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center"><FaCheckCircle className="h-6 w-6 text-emerald-400" /></div>
            <CardTitle className="text-white mt-3">Instance Created Successfully</CardTitle>
            <CardDescription className="text-white/70">Your server is being started. You can manage it from My Servers.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-3">
            <Button onClick={() => { setActiveTab("list"); loadMyServers(); }} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">Go to My Servers</Button>
            <Button onClick={() => { setStep(0); setResult(null); setHostname(""); setSshPassword(""); setSshPasswordConfirm(""); }} className="bg-white/5 hover:bg-white/10 text-white border border-white/10" variant="outline">Deploy Another</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "list" && (
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">My Servers</CardTitle>
                <CardDescription className="text-white/60">Provisioned servers associated with your account</CardDescription>
              </div>
              <Button onClick={loadMyServers} className="bg-white/10 hover:bg-white/20 text-white border border-white/10" disabled={myLoading}><FaSync className={`h-4 w-4 mr-2 ${myLoading ? 'animate-spin' : ''}`} />Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            {myLoading ? (<div className="text-white/60">Loading...</div>) : myServers.length === 0 ? (<div className="text-white/60">No servers yet.</div>) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/60 border-b border-white/10">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Region</th>
                      <th className="py-2 pr-4">IP</th>
                      <th className="py-2 pr-4">Configuration</th>
                      <th className="py-2 pr-4">OS</th>
                      <th className="py-2 pr-4">VMID</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myServers.map((s) => {
                      const regionName = options?.locations?.find((l) => l.id === s.location)?.name || s.location || 'N/A';
                      const specs = `${s.cpu_cores || '?' } vCPU • ${s.memory_mb || 0} MB${s.disk_gb ? ` • ${s.disk_gb} GB` : ''}`;
                      const sshCmd = `ssh ubuntu@${s.ip}`;
                      const stopped = String(s.status || '').toLowerCase() === 'stopped';
                      const specStr = `${s.cpu_cores || '?' } vCPU` + ` • ${s.memory_mb || 0} MB` + (s.disk_gb ? ` • ${s.disk_gb} GB` : '');
                      return (
                          <tr key={s.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-white">{s.name}</td>
                            <td className="py-2 pr-4 text-white/80">{regionName}</td>
                            <td className="py-2 pr-4 text-white/80">
                              <div className="inline-flex items-center gap-2">
                                <span>{s.ip}</span>
                                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-white/70 hover:text-white" title="Copy IP" onClick={() => copyIp(s.ip)}><FaCopy className="h-3.5 w-3.5" /></Button>
                                {copiedIp === s.ip && <span className="text-xs text-white/50">Copied</span>}
                              </div>
                            </td>
                            <td className="py-2 pr-4 text-white/80">{specStr}</td>
                            <td className="py-2 pr-4 text-white/80">{s.os}</td>
                            <td className="py-2 pr-4 text-white/80">{s.vmid}</td>
                            <td className="py-2 pr-4 text-white/80">{s.status || 'N/A'}</td>
                            <td className="py-2 pr-4 space-x-2 whitespace-nowrap">
                              <Button type="button" size="sm" variant="ghost" className="text-white/80 hover:text-white" title="Copy SSH command" onClick={() => navigator.clipboard.writeText(sshCmd)}><FaCopy className="h-3.5 w-3.5 mr-2" /> SSH</Button>
                              {stopped ? (
                                <Button type="button" size="sm" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40" onClick={() => powerAction(s.id, 'start')} disabled={actingId === s.id} title="Start VM"><FaPlay className="h-3.5 w-3.5 mr-2" /> Start</Button>
                              ) : (
                                <>
                                  <Button type="button" size="sm" className="group bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40 cursor-pointer" onClick={() => confirmAndPower(s, 'reboot')} disabled={actingId === s.id} title="Reboot VM">
                                    <span className="relative w-3.5 h-3.5 mr-2 inline-block align-middle">
                                      <FaRedo className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                                      <FaThumbsUp className="absolute inset-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100" />
                                    </span>
                                    Reboot
                                  </Button>
                                  <Button type="button" size="sm" className="group bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 cursor-pointer" onClick={() => confirmAndPower(s, 'stop')} disabled={actingId === s.id} title="Power Off VM">
                                    <span className="relative w-3.5 h-3.5 mr-2 inline-block align-middle">
                                      <FaPowerOff className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                                      <FaThumbsUp className="absolute inset-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100" />
                                    </span>
                                    Power Off
                                  </Button>
                                </>
                              )}
                              <Link href={`/dashboard/servers/${encodeURIComponent(s.id)}`} className="inline-block" title="View details">
                                <Button type="button" size="sm" className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                                  <FaExternalLinkAlt className="h-3.5 w-3.5 mr-2" /> View
                                </Button>
                              </Link>
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
      )}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900 p-5 text-white shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirm {confirm.action === 'reboot' ? 'Reboot' : 'Power Off'}</h3>
            <p className="text-white/70 mb-4">Are you sure you want to {confirm.action === 'reboot' ? 'reboot' : 'power off'} <span className="font-medium">{confirm.name || 'this VM'}</span>? This may cause temporary downtime.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirm(null)} variant="ghost" className="text-white/80 hover:text-white">Cancel</Button>
              <Button onClick={async()=>{ const c=confirm; setConfirm(null); await powerAction(c.id, c.action); }} className={confirm.action==='reboot' ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40' : 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40'}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
