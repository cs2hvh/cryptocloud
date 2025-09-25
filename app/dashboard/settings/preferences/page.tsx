'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  FaCog,
  FaArrowLeft,
  FaPalette,
  FaGlobe,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import Link from 'next/link';

export default function PreferencesSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Preferences updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving preferences' });
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-medium text-white">Preferences</h1>
          <p className="text-white/60">Customize your dashboard experience</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 max-w-2xl">
        {/* Display Settings */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaPalette className="h-5 w-5" />
                <span>Display</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Customize the appearance of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white font-medium">Theme</Label>
                <Select value={preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="dark" className="text-white hover:bg-white/10">Dark</SelectItem>
                    <SelectItem value="light" className="text-white hover:bg-white/10">Light (Coming Soon)</SelectItem>
                    <SelectItem value="auto" className="text-white hover:bg-white/10">Auto (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Date & Time */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaClock className="h-5 w-5" />
                <span>Date & Time</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Configure how dates and times are displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white font-medium">Timezone</Label>
                <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="UTC" className="text-white hover:bg-white/10">UTC</SelectItem>
                    <SelectItem value="America/New_York" className="text-white hover:bg-white/10">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago" className="text-white hover:bg-white/10">Central Time</SelectItem>
                    <SelectItem value="America/Denver" className="text-white hover:bg-white/10">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles" className="text-white hover:bg-white/10">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London" className="text-white hover:bg-white/10">London</SelectItem>
                    <SelectItem value="Europe/Paris" className="text-white hover:bg-white/10">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo" className="text-white hover:bg-white/10">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white font-medium">Date Format</Label>
                <Select value={preferences.dateFormat} onValueChange={(value) => handlePreferenceChange('dateFormat', value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="MM/DD/YYYY" className="text-white hover:bg-white/10">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY" className="text-white hover:bg-white/10">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD" className="text-white hover:bg-white/10">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white font-medium">Time Format</Label>
                <Select value={preferences.timeFormat} onValueChange={(value) => handlePreferenceChange('timeFormat', value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="12h" className="text-white hover:bg-white/10">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h" className="text-white hover:bg-white/10">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
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
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </motion.div>
    </motion.div>
  );
}