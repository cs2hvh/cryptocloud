'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  FaUser,
  FaLock,
  FaBell,
  FaCog,
  FaChevronRight
} from 'react-icons/fa';
import Link from 'next/link';

const settingsCategories = [
  {
    title: 'Profile',
    description: 'Manage your account details and security',
    icon: FaUser,
    href: '/dashboard/settings/profile',
    items: [
      'Change email address',
      'Update password',
      'Account information'
    ]
  },
  {
    title: 'Notifications',
    description: 'Configure email and system notifications',
    icon: FaBell,
    href: '/dashboard/settings/notifications',
    items: [
      'Email alerts',
      'Server notifications',
      'Billing reminders'
    ]
  },
  {
    title: 'Preferences',
    description: 'Customize your dashboard experience',
    icon: FaCog,
    href: '/dashboard/settings/preferences',
    items: [
      'Theme settings',
      'Date & time formats',
      'Timezone preferences'
    ]
  },
  {
    title: 'Security',
    description: 'View security information',
    icon: FaLock,
    href: '/dashboard/settings/security',
    items: [
      'Active sessions (demo)',
      'Login history (demo)',
      'Security overview'
    ]
  }
];

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

export default function Settings() {
  const { user } = useAuth();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-medium text-white mb-2">Settings</h1>
        <p className="text-white/60">Manage your account settings and preferences</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => (
          <Link key={category.title} href={category.href}>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#60A5FA]/20 flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-[#60A5FA]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{category.title}</h3>
                      <p className="text-white/60 text-sm">{category.description}</p>
                    </div>
                  </div>
                  <FaChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <div className="space-y-1">
                  {category.items.map((item, index) => (
                    <div key={index} className="text-white/50 text-sm flex items-center">
                      <div className="w-1 h-1 bg-white/30 rounded-full mr-2" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FaUser className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm">Email</label>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="text-white/60 text-sm">Account Type</label>
                <p className="text-white font-medium">Standard User</p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <Link href="/dashboard/settings/profile">
                <Button className="bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}