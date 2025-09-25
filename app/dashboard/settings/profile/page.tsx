'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaKey
} from 'react-icons/fa';
import Link from 'next/link';

type ChangeEmailStep = 'enter_new_email' | 'verify_current_email' | 'verify_new_email' | 'completed';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Email change state
  const [emailChangeStep, setEmailChangeStep] = useState<ChangeEmailStep>('enter_new_email');
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    currentEmailOtp: '',
    newEmailOtp: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating password' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChangeStep = async (step: ChangeEmailStep) => {
    setLoading(true);
    try {
      let endpoint = '';
      let body = {};

      switch (step) {
        case 'verify_current_email':
          endpoint = '/api/auth/email-change/send-current-otp';
          body = { newEmail: emailForm.newEmail };
          break;
        case 'verify_new_email':
          endpoint = '/api/auth/email-change/verify-current-otp';
          body = {
            newEmail: emailForm.newEmail,
            otp: emailForm.currentEmailOtp
          };
          break;
        case 'completed':
          endpoint = '/api/auth/email-change/complete';
          body = {
            newEmail: emailForm.newEmail,
            currentEmailOtp: emailForm.currentEmailOtp,
            newEmailOtp: emailForm.newEmailOtp
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.ok) {
        setEmailChangeStep(step);
        if (step === 'completed') {
          setMessage({ type: 'success', text: 'Email address updated successfully' });
          setEmailForm({ newEmail: '', currentEmailOtp: '', newEmailOtp: '' });
          setEmailChangeStep('enter_new_email');
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to process email change' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred during email change process' });
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
          <h1 className="text-2xl font-medium text-white">Profile Settings</h1>
          <p className="text-white/60">Manage your account details and security</p>
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
        {/* Change Password */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaLock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Update your account password for better security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label className="text-white font-medium">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white font-medium">New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-2"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <Label className="text-white font-medium">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-2"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Email */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FaEnvelope className="h-5 w-5" />
                <span>Change Email Address</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Current email: {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailChangeStep === 'enter_new_email' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-white font-medium">New Email Address</Label>
                    <Input
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      placeholder="Enter new email address"
                      required
                    />
                  </div>
                  <Button
                    onClick={() => handleEmailChangeStep('verify_current_email')}
                    disabled={loading || !emailForm.newEmail}
                    className="w-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white"
                  >
                    {loading ? 'Sending...' : 'Send Verification to Current Email'}
                  </Button>
                </div>
              )}

              {emailChangeStep === 'verify_current_email' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-200 text-sm">
                      <FaKey className="inline h-4 w-4 mr-2" />
                      We've sent a verification code to your current email address ({user?.email})
                    </p>
                  </div>
                  <div>
                    <Label className="text-white font-medium">Verification Code</Label>
                    <Input
                      type="text"
                      value={emailForm.currentEmailOtp}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, currentEmailOtp: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setEmailChangeStep('enter_new_email')}
                      variant="outline"
                      className="flex-1 border-white/10 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleEmailChangeStep('verify_new_email')}
                      disabled={loading || !emailForm.currentEmailOtp}
                      className="flex-1 bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white"
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </Button>
                  </div>
                </div>
              )}

              {emailChangeStep === 'verify_new_email' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-green-200 text-sm">
                      <FaKey className="inline h-4 w-4 mr-2" />
                      We've sent a verification code to your new email address ({emailForm.newEmail})
                    </p>
                  </div>
                  <div>
                    <Label className="text-white font-medium">Verification Code</Label>
                    <Input
                      type="text"
                      value={emailForm.newEmailOtp}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, newEmailOtp: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setEmailChangeStep('verify_current_email')}
                      variant="outline"
                      className="flex-1 border-white/10 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleEmailChangeStep('completed')}
                      disabled={loading || !emailForm.newEmailOtp}
                      className="flex-1 bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#1E40AF] text-white"
                    >
                      {loading ? 'Completing...' : 'Complete Email Change'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Account Information */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FaUser className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-white/60 text-sm">Email Address</Label>
                <p className="text-white font-medium mt-1">{user?.email}</p>
              </div>
              <div>
                <Label className="text-white/60 text-sm">Account ID</Label>
                <p className="text-white font-medium mt-1 font-mono text-sm">{user?.id}</p>
              </div>
              <div>
                <Label className="text-white/60 text-sm">Member Since</Label>
                <p className="text-white font-medium mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}