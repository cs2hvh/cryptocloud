'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';

interface AdminProtectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AdminProtection({ children, fallback }: AdminProtectionProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="max-w-md bg-white/5 border-white/10 text-center text-white/80">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center mb-4">
              <FaExclamationTriangle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-white/70">
              Please sign in to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback || (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="max-w-md bg-white/5 border-white/10 text-center text-white/80">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-4">
              <FaShieldAlt className="h-6 w-6 text-amber-400" />
            </div>
            <CardTitle className="text-white">Admin Access Required</CardTitle>
            <CardDescription className="text-white/70">
              You need administrator permissions to access this dashboard. Contact your system administrator if you believe this is an error.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/50 space-y-1">
              <div>User: {user.email}</div>
              <div>Role: User</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}