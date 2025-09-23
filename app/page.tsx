"use client";

import { motion } from "framer-motion";
import LightRays from "@/components/LightRays";
import Link from "next/link";
import { FaBitcoin, FaEthereum, FaShieldAlt, FaBolt, FaServer } from "react-icons/fa";

export default function Home() {
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

      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-28 pb-20 md:pt-36 md:pb-28">
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
            The Crypto Cloud for Builders
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#22d3ee]">
              Anonymous VPS in Seconds
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
