'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { FaEnvelope, FaLock, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup' | 'forgot';
  onModeChange: (mode: 'signin' | 'signup' | 'forgot') => void;
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for verification link');
      setOtpSent(true);
    }
    setIsLoading(false);
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signed in successfully');
      onClose();
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent');
    }
    setIsLoading(false);
  };

  const handleOtpVerification = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Account verified successfully');
      onClose();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setMessage('');
    setOtpSent(false);
    setShowPassword(false);
  };

  const handleModeChange = (newMode: 'signin' | 'signup' | 'forgot') => {
    resetForm();
    onModeChange(newMode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardHeader className="relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
                <CardTitle className="text-white text-2xl font-normal">
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Reset Password'}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {mode === 'signin' && 'Welcome back to Unserver'}
                  {mode === 'signup' && 'Join Unserver today'}
                  {mode === 'forgot' && 'Reset your password'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!otpSent ? (
                  <>
                    <div>
                      <Label htmlFor="email" className="text-white font-normal">Email</Label>
                      <div className="relative mt-2">
                        <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/5 border-white/20 text-white pl-10 h-12"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    {mode !== 'forgot' && (
                      <div>
                        <Label htmlFor="password" className="text-white font-normal">Password</Label>
                        <div className="relative mt-2">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-white/20 text-white pl-10 pr-10 h-12"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'signup' && (
                      <div>
                        <Label htmlFor="confirmPassword" className="text-white font-normal">Confirm Password</Label>
                        <div className="relative mt-2">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-white/5 border-white/20 text-white pl-10 h-12"
                            placeholder="Confirm your password"
                          />
                        </div>
                      </div>
                    )}

                    {message && (
                      <div className={`p-3 rounded-lg text-sm ${
                        message.includes('success') || message.includes('sent') 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {message}
                      </div>
                    )}

                    <Button
                      onClick={
                        mode === 'signin' ? handleSignIn :
                        mode === 'signup' ? handleSignUp :
                        handleForgotPassword
                      }
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#3B82F6] hover:to-[#1D4ED8] text-white font-normal h-12"
                    >
                      {isLoading ? 'Processing...' : 
                        mode === 'signin' ? 'Sign In' :
                        mode === 'signup' ? 'Create Account' :
                        'Send Reset Email'
                      }
                    </Button>

                    <div className="text-center space-y-2">
                      {mode === 'signin' && (
                        <>
                          <button
                            onClick={() => handleModeChange('forgot')}
                            className="text-gray-400 hover:text-[#60A5FA] transition-colors text-sm"
                          >
                            Forgot your password?
                          </button>
                          <div className="text-gray-400 text-sm">
                            Don&apos;t have an account?{' '}
                            <button
                              onClick={() => handleModeChange('signup')}
                              className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                            >
                              Sign up
                            </button>
                          </div>
                        </>
                      )}
                      {mode === 'signup' && (
                        <div className="text-gray-400 text-sm">
                          Already have an account?{' '}
                          <button
                            onClick={() => handleModeChange('signin')}
                            className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                          >
                            Sign in
                          </button>
                        </div>
                      )}
                      {mode === 'forgot' && (
                        <div className="text-gray-400 text-sm">
                          Remember your password?{' '}
                          <button
                            onClick={() => handleModeChange('signin')}
                            className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                          >
                            Sign in
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="otp" className="text-white font-normal">Verification Code</Label>
                      <div className="relative mt-2">
                        <Input
                          id="otp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="bg-white/5 border-white/20 text-white h-12 text-center text-2xl tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                        />
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Enter the 6-digit code sent to {email}
                      </p>
                    </div>

                    {message && (
                      <div className={`p-3 rounded-lg text-sm ${
                        message.includes('success') 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {message}
                      </div>
                    )}

                    <Button
                      onClick={handleOtpVerification}
                      disabled={isLoading || otp.length !== 6}
                      className="w-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#3B82F6] hover:to-[#1D4ED8] text-white font-normal h-12"
                    >
                      {isLoading ? 'Verifying...' : 'Verify Account'}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={() => setOtpSent(false)}
                        className="text-gray-400 hover:text-[#60A5FA] transition-colors text-sm"
                      >
                        Back to sign up
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}