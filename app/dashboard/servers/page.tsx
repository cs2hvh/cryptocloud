'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaServer } from 'react-icons/fa';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function ServersPage() {
  const { user } = useAuth();

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
          <p className="text-white/60 mt-1">Manage your VPS servers</p>
        </div>
      </div>

      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <FaServer className="h-5 w-5" />
            <span>Server Management</span>
          </CardTitle>
          <CardDescription className="text-white/60">
            VPS server provisioning is currently unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FaServer className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
            <p className="text-white/60">
              Server management features are temporarily disabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}