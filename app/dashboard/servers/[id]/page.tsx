"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LineChart from "@/components/ui/line-chart";
import { supabase } from "@/lib/supabase";
import { FaPlay, FaRedo, FaPowerOff, FaCopy, FaMapMarkerAlt, FaMicrochip, FaMemory, FaHdd, FaThumbsUp } from "react-icons/fa";
import Image from "next/image";

type MetricsPoint = { t: number; cpu: number | null; memUsed: number | null; netIn: number | null; netOut: number | null };
type RangeKey = "hour" | "day" | "week";
type LocationOption = { id: string; name?: string; location?: string };

export default function VmMonitorPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<null | "start" | "reboot" | "stop">(null);
  const [confirmAction, setConfirmAction] = useState<null | "reboot" | "stop">(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const loadServer = useCallback(async () => {
    const { data, error } = await supabase.from("servers").select("*").eq("id", id).maybeSingle();
    if (!error) setServer(data);
  }, [id]);

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/infra/options", { cache: "no-store" });
      const json = await res.json();
      setLocations(json.locations || []);
    } catch {}
  }, []);

  // Per-chart ranges and metrics
  const [cpuRange, setCpuRange] = useState<RangeKey>("hour");
  const [ramRange, setRamRange] = useState<RangeKey>("hour");
  const [netRange, setNetRange] = useState<RangeKey>("hour");

  const useMetrics = (range: RangeKey) => {
    const [series, setSeries] = useState<MetricsPoint[]>([]);
    const load = useCallback(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/proxmox/vms/metrics?serverId=${encodeURIComponent(id)}&range=${range}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await res.json();
      if (res.ok && json.ok) setSeries(json.series || []);
    }, [id, range]);
    useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);
    return series;
  };

  useEffect(() => { setLoading(true); Promise.all([loadServer(), loadLocations()]).finally(()=>setLoading(false)); }, [loadServer, loadLocations]);

  const cpuMetrics = useMetrics(cpuRange);
  const ramMetrics = useMetrics(ramRange);
  const netMetrics = useMetrics(netRange);

  const cpuSeries = useMemo(() => cpuMetrics.map((p: MetricsPoint) => ({ x: p.t, y: p.cpu ?? null })), [cpuMetrics]);
  const ramSeries = useMemo(() => ramMetrics.map((p: MetricsPoint) => ({ x: p.t, y: p.memUsed ?? null })), [ramMetrics]);
  const netInSeries = useMemo(() => netMetrics.map((p: MetricsPoint) => ({ x: p.t, y: p.netIn ?? null })), [netMetrics]);
  const netOutSeries = useMemo(() => netMetrics.map((p: MetricsPoint) => ({ x: p.t, y: p.netOut ?? null })), [netMetrics]);

  const maxOf = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => typeof v === "number" && isFinite(v));
    return vals.length ? Math.max(...vals) : 1;
  };
  const netMax = Math.max(maxOf(netInSeries.map(p=>p.y)), maxOf(netOutSeries.map(p=>p.y)));
  const fmtBytes = (v: number) => {
    if (v < 1024) return `${Math.round(v)} B/s`;
    if (v < 1024*1024) return `${(v/1024).toFixed(1)} KB/s`;
    if (v < 1024*1024*1024) return `${(v/1024/1024).toFixed(2)} MB/s`;
    return `${(v/1024/1024/1024).toFixed(2)} GB/s`;
  };

  // Region details for header
  const regionObj = useMemo(() => {
    const locId = String(server?.location || "");
    return locations.find((l) => String(l.id) === locId);
  }, [locations, server?.location]);
  const regionName = useMemo(() => {
    return (regionObj?.name || regionObj?.id || server?.location || "");
  }, [regionObj?.name, regionObj?.id, server?.location]);
  const isIndia = useMemo(() => {
    const slug = String(regionObj?.location || regionName || "").toLowerCase();
    return /india/.test(slug);
  }, [regionObj?.location, regionName]);

  const powerAction = async (action: "start" | "reboot" | "stop") => {
    if (!server?.id) return;
    setActing(action);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/proxmox/vms/power", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ serverId: server.id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Action failed");
      await loadServer();
    } catch {}
    finally { setActing(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white flex items-center gap-3">
            <span className="truncate max-w-[60vw]">{server?.name || "Server"}</span>
            <span className="inline-flex items-center gap-2 text-sm text-white/70">
              {isIndia ? (
                <Image src="/india.png" alt="India" width={20} height={20} className="h-5 w-5 rounded-sm object-cover" />
              ) : (
                <FaMapMarkerAlt className="h-4 w-4 text-white/60" />
              )}
              <span className="truncate max-w-[40vw]">{regionName || "Region"}</span>
            </span>
          </h1>
          <p className="text-white/60 text-sm">IP: {server?.ip || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/servers?view=list"><Button className="bg-white/10 text-white border border-white/10 hover:bg-white/20">Back to My Servers</Button></Link>
        </div>
      </div>

      {loading ? (<div className="text-white/60">Loading...</div>) : (
        <>
          {/* Details & actions */}
          <Card className="bg-black/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">{server?.name || 'VM'}</CardTitle>
              <CardDescription className="text-white/60">IP: {server?.ip || '—'} • Status: {server?.status || '—'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/10">
                  <FaMicrochip className="text-white/60" />
                  <span>{server?.cpu_cores || '?'} vCPU</span>
                </span>
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/10">
                  <FaMemory className="text-white/60" />
                  <span>{server?.memory_mb || 0} MB</span>
                </span>
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/10">
                  <FaHdd className="text-white/60" />
                  <span>{server?.disk_gb ? `${server.disk_gb} GB` : '—'}</span>
                </span>
              </div>
              <div className="grow" />
              {String(server?.status || '').toLowerCase() === 'stopped' ? (
                <Button onClick={() => powerAction('start')} disabled={acting==='start'} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer"><FaPlay className="mr-2" /> Start</Button>
              ) : (
                <>
                  <Button onClick={() => setConfirmAction('reboot')} disabled={acting==='reboot'} className="group bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40 cursor-pointer">
                    <span className="relative w-4 h-4 mr-2 inline-block">
                      <FaRedo className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                      <FaThumbsUp className="absolute inset-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100" />
                    </span>
                    Reboot
                  </Button>
                  <Button onClick={() => setConfirmAction('stop')} disabled={acting==='stop'} className="group bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 cursor-pointer">
                    <span className="relative w-4 h-4 mr-2 inline-block">
                      <FaPowerOff className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                      <FaThumbsUp className="absolute inset-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100" />
                    </span>
                    Power Off
                  </Button>
                </>
              )}
              <Button onClick={async()=>{ if(server?.ip) { await navigator.clipboard.writeText(server.ip);} }} variant="ghost" className="text-white/80 hover:text-white"><FaCopy className="mr-2" /> Copy IP</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-white">CPU Usage</CardTitle>
                    <CardDescription className="text-white/60">Percent over time</CardDescription>
                  </div>
                  <select className="bg-black border border-white/10 text-white rounded px-2 py-1 text-sm"
                          value={cpuRange} onChange={(e)=>setCpuRange(e.target.value as RangeKey)}>
                    <option value="hour">Last hour</option>
                    <option value="day">Last day</option>
                    <option value="week">Last week</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart data={cpuSeries} width={700} height={280} color="#60A5FA" yMin={0} yMax={100} yPercent={true} />
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-white">RAM Usage</CardTitle>
                    <CardDescription className="text-white/60">Percent over time</CardDescription>
                  </div>
                  <select className="bg-black border border-white/10 text-white rounded px-2 py-1 text-sm"
                          value={ramRange} onChange={(e)=>setRamRange(e.target.value as RangeKey)}>
                    <option value="hour">Last hour</option>
                    <option value="day">Last day</option>
                    <option value="week">Last week</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart data={ramSeries} width={700} height={280} color="#34D399" yMin={0} yMax={100} yPercent={true} />
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-white">Network In</CardTitle>
                    <CardDescription className="text-white/60">Bytes per second</CardDescription>
                  </div>
                  <select className="bg-black border border-white/10 text-white rounded px-2 py-1 text-sm"
                          value={netRange} onChange={(e)=>setNetRange(e.target.value as RangeKey)}>
                    <option value="hour">Last hour</option>
                    <option value="day">Last day</option>
                    <option value="week">Last week</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart data={netInSeries} width={700} height={280} color="#FBBF24" yMin={0} yMax={Math.max(1, netMax)} yPercent={false} formatY={fmtBytes} />
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-white">Network Out</CardTitle>
                    <CardDescription className="text-white/60">Bytes per second</CardDescription>
                  </div>
                  <select className="bg-black border border-white/10 text-white rounded px-2 py-1 text-sm"
                          value={netRange} onChange={(e)=>setNetRange(e.target.value as RangeKey)}>
                    <option value="hour">Last hour</option>
                    <option value="day">Last day</option>
                    <option value="week">Last week</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart data={netOutSeries} width={700} height={280} color="#F472B6" yMin={0} yMax={Math.max(1, netMax)} yPercent={false} formatY={fmtBytes} />
              </CardContent>
            </Card>
          </div>

          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900 p-5 text-white shadow-xl">
                <h3 className="text-lg font-semibold mb-2">Confirm {confirmAction === 'reboot' ? 'Reboot' : 'Power Off'}</h3>
                <p className="text-white/70 mb-4">Are you sure you want to {confirmAction === 'reboot' ? 'reboot' : 'power off'} <span className="font-medium">{server?.name || 'this VM'}</span>? This may cause temporary downtime.</p>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setConfirmAction(null)} variant="ghost" className="text-white/80 hover:text-white">Cancel</Button>
                  <Button onClick={async()=>{ const a=confirmAction; setConfirmAction(null); await powerAction(a!); }} className={confirmAction==='reboot' ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40' : 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40'}>
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
