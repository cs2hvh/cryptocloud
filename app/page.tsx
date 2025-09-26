"use client";

import { motion } from "framer-motion";
import LightRays from "@/components/LightRays";
import Link from "next/link";
import { FaBitcoin, FaEthereum, FaShieldAlt, FaBolt, FaServer, FaMicrochip, FaHdd, FaNetworkWired, FaLock, FaGlobe, FaClock, FaCloudUploadAlt, FaCode, FaHeadset } from "react-icons/fa";
import { useMemo } from "react";
import { WorldMap } from "@/components/ui/world-map";

export default function Home() {
  // Static regions showcased on the map
  const regions = [
    "us_west",
    "us_east",
    "uk",
    "germany",
    "france",
    "poland",
    "india",
    "singapore",
    "sydney",
    "canada",
  ];

  const regionCoords = useMemo(() => ({
    // India marker moved south (Mumbai area)
    india: { lat: -5.0760, lng: 75.8777 },
    singapore: { lat: -20.3521, lng: 103.8198 },
    uk: { lat: 45.5074, lng: -0.1278 },
    // Sydney moved slightly lower (further south)
    sydney: { lat: -50.0000, lng: 151.2093 },
    germany: { lat: 40.1109, lng: 8.6821 },
    france: { lat: 29.8566, lng: -2.3522 },
    poland: { lat: 42.2297, lng: 21.0122 },
    us_east: { lat: 39.0438, lng: -77.4874 },
    us_west: { lat: 34.0522, lng: -118.2437 },
    canada: { lat: 43.6532, lng: -79.3832 },
  }), []);

  // Use Frankfurt as a neutral hub to visualize connectivity
  const hub = { lat: 50.1109, lng: 8.6821 };
  const regionNames: Record<string, string> = {
    india: "India",
    singapore: "Singapore",
    uk: "United Kingdom",
    sydney: "Sydney",
    germany: "Germany",
    france: "France",
    poland: "Poland",
    us_east: "US East",
    us_west: "US West",
    canada: "Canada",
  };

  const dots = useMemo(() => {
    return regions
      .map((slug) => ({ slug, coord: (regionCoords as any)[slug] }))
      .filter((r) => r.coord)
      .map(({ slug, coord }) => ({
        start: { ...(coord as any), label: regionNames[slug] || slug },
        end: { ...hub, label: "Hub" },
      }));
  }, [regions, regionCoords]);

  return (
    <main className="relative min-h-[100svh] bg-black overflow-hidden">
      <div className="absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#00E5FF"
          raysSpeed={0.18}
          lightSpread={1.6}
          rayLength={3.2}
          pulsating={true}
          fadeDistance={1.4}
          saturation={1.0}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.0}
          distortion={0.04}
          className="opacity-70 md:opacity-80"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/90" />

      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 min-h-[calc(100svh-56px)] flex items-center py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-6">
            <FaShieldAlt className="h-3.5 w-3.5 text-[#60A5FA]" />
            <span>Private • Global</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white">
            Cloud Infrastructure
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#22d3ee]">
              Servers in Seconds
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-white/70 mx-auto md:mx-0 text-base md:text-lg">
            Launch secure virtual servers across global regions and pay with BTC/ETH/XMR. Fast, reliable infrastructure at your fingertips.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] px-6 py-3 text-white font-medium shadow-lg shadow-[#60A5FA]/20 hover:from-[#3B82F6] hover:to-[#1D4ED8] transition-colors">
              Get Started
            </Link>
            <Link href="/dashboard/servers" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-white/90 hover:bg-white/10 transition-colors">
              <FaServer className="mr-2 h-4 w-4" /> Launch a Server
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <FaBolt className="h-4 w-4 text-yellow-300" />
              <span className="text-white/80">Provision in under 60s</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <FaShieldAlt className="h-4 w-4 text-[#60A5FA]" />
              <span className="text-white/80">Private by design</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex -space-x-2 items-center">
                <FaBitcoin className="h-4 w-4 text-orange-400" />
                <FaEthereum className="h-4 w-4 text-blue-400 -ml-1" />
              </div>
              <span className="text-white/80">Pay with BTC / ETH / XMR</span>
            </div>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#60A5FA]/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-[#22d3ee]/20 blur-3xl" />
        </div>
      </section>

      {/* Global map */}
      <section id="regions" className="relative z-10 bg-black">
        <div className="max-w-7xl mx-auto px-6 md:px-10 min-h-[calc(100svh-56px)] flex flex-col justify-center py-16 md:py-20">
          <div className="text-center mb-8 md:mb-10">
            <motion.h2
              className="mt-4 md:mt-6 text-2xl md:text-3xl font-semibold text-white"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
            >
              Global Coverage
            </motion.h2>
            <motion.p
              className="text-white/60 max-w-2xl mx-auto mt-2"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              From North America to Europe and Asia-Pacific, we deploy where you need it.
            </motion.p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <WorldMap dots={dots} lineColor="#3B82F6" hideEndDots hideLines />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section id="features" className="relative z-10 bg-black">
        {/* Subtle section background hue */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#3B82F6]/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-10 min-h-[calc(100svh-56px)] flex flex-col justify-center py-16 md:py-20">
          <div className="text-center mb-8 md:mb-10">
            <motion.h2
              className="text-2xl md:text-3xl font-semibold text-white"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
            >
              Built For Demanding Workloads
            </motion.h2>
            <motion.p
              className="text-white/60 max-w-2xl mx-auto mt-2"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Modern compute, storage and network — engineered for speed, reliability and security.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <FaMicrochip className="h-5 w-5 text-white" />,
                title: 'Latest‑Gen CPUs',
                desc: 'AMD Ryzen, EPYC and Intel Xeon platforms tuned for performance.'
              },
              {
                icon: <FaHdd className="h-5 w-5 text-white" />,
                title: 'NVMe SSD',
                desc: 'High IOPS storage for rapid builds, databases and caching.'
              },
              {
                icon: <FaNetworkWired className="h-5 w-5 text-white" />,
                title: 'HA Network',
                desc: 'Redundant links and smart routing for consistent throughput.'
              },
              {
                icon: <FaShieldAlt className="h-5 w-5 text-white" />,
                title: 'Hardened Security',
                desc: 'Isolated tenants, secure images and optional DDoS protection.'
              },
              {
                icon: <FaGlobe className="h-5 w-5 text-white" />,
                title: 'Global Coverage',
                desc: 'Regions across North America, Europe and APAC.'
              },
              {
                icon: <FaClock className="h-5 w-5 text-white" />,
                title: '99.99% Uptime',
                desc: 'Reliable platform with continuous monitoring and alerting.'
              },
              {
                icon: <FaCloudUploadAlt className="h-5 w-5 text-white" />,
                title: 'Instant Provisioning',
                desc: 'Launch in seconds with optimized OS templates.'
              },
              {
                icon: <FaCode className="h-5 w-5 text-white" />,
                title: 'API & Automation',
                desc: 'Integrate with CI/CD and tooling via simple REST endpoints.'
              },
              {
                icon: <FaHeadset className="h-5 w-5 text-white" />,
                title: 'Expert Support',
                desc: 'Guidance from engineers who understand production workloads.'
              }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm"
              >
                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-[#3B82F6]/10 blur-2xl" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/30 to-[#3B82F6]/50 border border-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="text-white mt-4 font-medium">{f.title}</h3>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10/50 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span>Crypto Cloud</span>
            <span className="opacity-50">•</span>
            <span>Privacy-first infrastructure</span>
          </div>
          <div className="flex items-center gap-3">
            <span>BTC</span>
            <span className="opacity-40">/</span>
            <span>ETH</span>
            <span className="opacity-40">/</span>
            <span>XMR</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
