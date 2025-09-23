"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaBars, FaTimes, FaChevronDown, FaUser } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const pathname = usePathname();
  // Hide global navbar inside dashboard to avoid double headers
  if (pathname?.startsWith("/dashboard")) return null;

  return <TopNav />;
}

function TopNav() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const initial = (user?.email || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="w-full border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white/10 border border-white/10">
              <span className="text-white font-semibold">U</span>
            </div>
            <span className="text-white text-base md:text-lg font-semibold tracking-tight">Unserver</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-white/80 hover:text-white transition-colors">Features</Link>
            <Link href="#regions" className="text-white/80 hover:text-white transition-colors">Regions</Link>
            <Link href="#pricing" className="text-white/80 hover:text-white transition-colors">Pricing</Link>
          </nav>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-3" ref={menuRef}>
            {!user ? (
              <div className="relative">
                <Button onClick={() => setMenuOpen((v) => !v)} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  Login <FaChevronDown className="ml-2 h-3.5 w-3.5 opacity-70" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-md border border-white/10 bg-black/80 backdrop-blur-md shadow-lg py-1">
                    <Link href="/auth/signin" className="block px-3 py-2 text-sm text-white/90 hover:bg-white/10">Sign in</Link>
                    <Link href="/auth/signup" className="block px-3 py-2 text-sm text-white/90 hover:bg-white/10">Create account</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="inline-flex items-center gap-2 text-white/90 hover:text-white">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                    <span className="text-white text-sm">{initial}</span>
                  </div>
                  <FaChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-white/10 bg-black/80 backdrop-blur-md shadow-lg py-1">
                    <Link href="/dashboard" className="block px-3 py-2 text-sm text-white/90 hover:bg-white/10">Dashboard</Link>
                    <button onClick={signOut} className="block w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10">Sign out</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-white/80 hover:text-white" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle Menu">
            {mobileOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-2 space-y-2">
            <Link href="#features" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Features</Link>
            <Link href="#regions" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Regions</Link>
            <Link href="#pricing" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Pricing</Link>
            <div className="h-px bg-white/10 my-2" />
            {!user ? (
              <div className="space-y-2">
                <Link href="/auth/signin" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Sign in</Link>
                <Link href="/auth/signup" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Create account</Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/dashboard" className="block px-2 py-2 text-white/90 hover:bg-white/10 rounded">Dashboard</Link>
                <button onClick={signOut} className="w-full text-left px-2 py-2 text-white/90 hover:bg-white/10 rounded">Sign out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
