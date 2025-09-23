'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import LightRays from '@/components/LightRays';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaRocket, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setMessage('');

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
      setEmailSent(true);
      setMessage('Check your email for the verification link');
    }
    setIsLoading(false);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* LightRays Background */}
      <div className="absolute inset-0 w-full h-full">
        <LightRays
          raysOrigin="top-center"
          raysColor="#00ffff"
          raysSpeed={0.3}
          lightSpread={1.2}
          rayLength={2.0}
          pulsating={true}
          fadeDistance={0.8}
          saturation={0.6}
          followMouse={true}
          mouseInfluence={0.1}
          className="w-full h-full opacity-40"
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div
            className="text-center lg:text-left"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <div className="mb-8">
              <div className="flex items-center justify-center lg:justify-start space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] rounded-2xl flex items-center justify-center">
                  <span className="text-white font-normal text-2xl">U</span>
                </div>
                <h1 className="text-4xl font-normal bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Unserver
                </h1>
              </div>
              <h2 className="text-3xl md:text-4xl font-normal text-white mb-4 leading-tight">
                Join the privacy revolution
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Create your account and start deploying VPS servers with complete anonymity. No personal information required.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center space-x-3 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                <FaShieldAlt className="h-6 w-6 text-[#60A5FA]" />
                <span className="text-gray-300">Fast, seamless onboarding</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                <FaRocket className="h-6 w-6 text-[#60A5FA]" />
                <span className="text-gray-300">Deploy servers in under 60 seconds</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                <FaCheckCircle className="h-6 w-6 text-[#60A5FA]" />
                <span className="text-gray-300">Pay with cryptocurrency only</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Sign Up Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {!emailSent ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <Link 
                    href="/"
                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
                  >
                    <FaArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to home
                  </Link>
                  <CardTitle className="text-white text-3xl font-normal">Create Account</CardTitle>
                  <CardDescription className="text-gray-400 text-lg">
                    Start your privacy-first hosting journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                      <Label htmlFor="email" className="text-white font-normal text-lg">Email Address</Label>
                      <div className="relative mt-3">
                        <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/5 border-white/20 text-white pl-12 h-14 text-lg rounded-xl focus:border-[#60A5FA] transition-colors"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-white font-normal text-lg">Password</Label>
                      <div className="relative mt-3">
                        <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/5 border-white/20 text-white pl-12 pr-12 h-14 text-lg rounded-xl focus:border-[#60A5FA] transition-colors"
                          placeholder="Create a password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm mt-2">Minimum 6 characters</p>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-white font-normal text-lg">Confirm Password</Label>
                      <div className="relative mt-3">
                        <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-white/5 border-white/20 text-white pl-12 h-14 text-lg rounded-xl focus:border-[#60A5FA] transition-colors"
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>

                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl text-sm ${
                          message.includes('Check') || message.includes('success')
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {message}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] hover:from-[#3B82F6] hover:to-[#1D4ED8] text-white font-normal h-14 text-lg rounded-xl shadow-lg hover:shadow-[#60A5FA]/25 transition-all duration-300"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Creating account...</span>
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </Button>

                    <div className="text-center pt-6 border-t border-white/10">
                      <div className="text-gray-400">
                        Already have an account?{' '}
                        <Link
                          href="/auth/signin"
                          className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors font-medium"
                        >
                          Sign in
                        </Link>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
                <CardContent className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaCheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-normal text-white mb-4">Check Your Email</h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    We&apos;ve sent a verification link to <span className="text-[#60A5FA]">{email}</span>. 
                    Click the link to activate your account.
                  </p>
                  <Link href="/auth/signin">
                    <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-white/10">
                      Back to Sign In
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
