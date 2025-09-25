'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  FaBell,
  FaArrowLeft,
  FaServer,
  FaCreditCard,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import Link from 'next/link';

export default function NotificationSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [settings, setSettings] = useState({
    emailAlerts: true,
    serverNotifications: {
      creation: true,
      deletion: true,
      powerEvents: true,
      maintenance: true
    },
    billingReminders: {
      lowBalance: true,
      paymentFailed: true,
      invoices: true,
      monthlyStatement: false
    },
    securityAlerts: {
      loginAttempts: true,
      passwordChanges: true,
      emailChanges: true
    }
  });

  const handleSettingChange = (category: string, setting: string, value?: boolean) => {
    if (value !== undefined) {
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...(prev[category as keyof typeof prev] as any),
          [setting]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [category]: !prev[category as keyof typeof prev]
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Notification settings updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving settings' });
    } finally {
      setLoading(false);
    }
  };

  const Switch = ({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) => (
    <div className="flex items-center justify-between py-2">
      <Label className="text-white font-normal">{label}</Label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#60A5FA]' : 'bg-white/20'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

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
          <h1 className="text-2xl font-medium text-white">Notification Settings</h1>
          <p className="text-white/60">Configure your email and system notifications</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Server Notifications */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaServer className="h-5 w-5" />
                <span>Server Notifications</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Receive updates about your VPS instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Switch
                checked={settings.serverNotifications.creation}
                onChange={(checked) => handleSettingChange('serverNotifications', 'creation', checked)}
                label="Server creation & deployment"
              />
              <Switch
                checked={settings.serverNotifications.deletion}
                onChange={(checked) => handleSettingChange('serverNotifications', 'deletion', checked)}
                label="Server deletion"
              />
              <Switch
                checked={settings.serverNotifications.powerEvents}
                onChange={(checked) => handleSettingChange('serverNotifications', 'powerEvents', checked)}
                label="Power events (start/stop/restart)"
              />
              <Switch
                checked={settings.serverNotifications.maintenance}
                onChange={(checked) => handleSettingChange('serverNotifications', 'maintenance', checked)}
                label="Maintenance windows"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Billing Notifications */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaCreditCard className="h-5 w-5" />
                <span>Billing Notifications</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Stay informed about payments and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Switch
                checked={settings.billingReminders.lowBalance}
                onChange={(checked) => handleSettingChange('billingReminders', 'lowBalance', checked)}
                label="Low wallet balance alerts"
              />
              <Switch
                checked={settings.billingReminders.paymentFailed}
                onChange={(checked) => handleSettingChange('billingReminders', 'paymentFailed', checked)}
                label="Failed payment notifications"
              />
              <Switch
                checked={settings.billingReminders.invoices}
                onChange={(checked) => handleSettingChange('billingReminders', 'invoices', checked)}
                label="New invoices"
              />
              <Switch
                checked={settings.billingReminders.monthlyStatement}
                onChange={(checked) => handleSettingChange('billingReminders', 'monthlyStatement', checked)}
                label="Monthly usage statements"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Notifications */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaExclamationTriangle className="h-5 w-5" />
                <span>Security Alerts</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Important security-related notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Switch
                checked={settings.securityAlerts.loginAttempts}
                onChange={(checked) => handleSettingChange('securityAlerts', 'loginAttempts', checked)}
                label="Suspicious login attempts"
              />
              <Switch
                checked={settings.securityAlerts.passwordChanges}
                onChange={(checked) => handleSettingChange('securityAlerts', 'passwordChanges', checked)}
                label="Password changes"
              />
              <Switch
                checked={settings.securityAlerts.emailChanges}
                onChange={(checked) => handleSettingChange('securityAlerts', 'emailChanges', checked)}
                label="Email address changes"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Email Preferences */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaBell className="h-5 w-5" />
                <span>Email Preferences</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                General email notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Switch
                checked={settings.emailAlerts}
                onChange={(checked) => handleSettingChange('emailAlerts', '', checked)}
                label="Enable email notifications"
              />
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/50 text-sm">
                  Note: Security alerts will always be sent regardless of these settings for your account safety.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div variants={fadeInUp}>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white px-8 py-2"
        >
          {loading ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </motion.div>
    </motion.div>
  );
}