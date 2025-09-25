'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  FaLock,
  FaArrowLeft,
  FaShieldAlt,
  FaMobile,
  FaHistory,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDesktop,
  FaClock,
  FaMapMarkerAlt
} from 'react-icons/fa';
import Link from 'next/link';

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecuritySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<Array<{
    id: string;
    timestamp: string;
    location: string;
    ip: string;
    success: boolean;
    device: string;
  }>>([]);

  useEffect(() => {
    // NOTE: This is mock/demo data - NOT actually functional
    // Active sessions and login history are placeholder UI only
    setSessions([
      {
        id: '1',
        device: 'Chrome on Windows',
        location: 'New York, NY',
        ip: '192.168.1.1',
        lastActive: '2024-01-15T10:30:00Z',
        isCurrent: true
      },
      {
        id: '2',
        device: 'Safari on iPhone',
        location: 'New York, NY',
        ip: '192.168.1.2',
        lastActive: '2024-01-14T15:45:00Z',
        isCurrent: false
      }
    ]);

    setLoginHistory([
      {
        id: '1',
        timestamp: '2024-01-15T10:30:00Z',
        location: 'New York, NY',
        ip: '192.168.1.1',
        success: true,
        device: 'Chrome on Windows'
      },
      {
        id: '2',
        timestamp: '2024-01-14T15:45:00Z',
        location: 'New York, NY',
        ip: '192.168.1.2',
        success: true,
        device: 'Safari on iPhone'
      },
      {
        id: '3',
        timestamp: '2024-01-13T08:20:00Z',
        location: 'Unknown Location',
        ip: '10.0.0.1',
        success: false,
        device: 'Chrome on Linux'
      }
    ]);
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    // NOTE: This is mock functionality - not actually implemented
    setMessage({ type: 'error', text: 'Session management not yet implemented' });
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center space-x-4">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10">
            <FaArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-white">Security Settings</h1>
          <p className="text-white/60">Advanced security settings and monitoring</p>
        </div>
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-200'
              : 'bg-red-500/10 border-red-500/20 text-red-200'
          } flex items-center space-x-2`}
        >
          {message.type === 'success' ?
            <FaCheckCircle className="h-5 w-5" /> :
            <FaExclamationTriangle className="h-5 w-5" />
          }
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Active Sessions */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FaDesktop className="h-5 w-5" />
              <span>Active Sessions</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              <FaExclamationTriangle className="inline h-4 w-4 mr-1 text-yellow-400" />
              Demo UI only - Session management not yet implemented
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl opacity-60">
                <div className="flex items-center space-x-3">
                  <FaDesktop className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="text-white font-medium">{session.device}</p>
                    <div className="flex items-center space-x-2 text-white/60 text-sm">
                      <FaMapMarkerAlt className="h-3 w-3" />
                      <span>{session.location}</span>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-200 text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">
                    {new Date(session.lastActive).toLocaleString()}
                  </p>
                  {!session.isCurrent && (
                    <Button
                      onClick={() => handleRevokeSession(session.id)}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                      disabled
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Login History */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FaHistory className="h-5 w-5" />
              <span>Login History</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              <FaExclamationTriangle className="inline h-4 w-4 mr-1 text-yellow-400" />
              Demo UI only - Login tracking not yet implemented
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loginHistory.map((login) => (
                <div key={login.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${login.success ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-white font-medium">{login.device}</p>
                      <div className="flex items-center space-x-4 text-white/60 text-sm">
                        <div className="flex items-center space-x-1">
                          <FaMapMarkerAlt className="h-3 w-3" />
                          <span>{login.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FaClock className="h-3 w-3" />
                          <span>{new Date(login.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant={login.success ? 'default' : 'destructive'} className={
                    login.success ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
                  }>
                    {login.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}