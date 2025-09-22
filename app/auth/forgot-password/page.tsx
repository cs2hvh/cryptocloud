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
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setEmailSent(true);
      setMessage('Password reset email sent');
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
        <div className="w-full max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-8"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] rounded-2xl flex items-center justify-center">
                <span className="text-white font-normal text-2xl">U</span>
              </div>
              <h1 className="text-4xl font-normal bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Unserver
              </h1>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            {!emailSent ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <Link 
                    href="/auth/signin"
                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
                  >
                    <FaArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to sign in
                  </Link>
                  <CardTitle className="text-white text-3xl font-normal">Reset Password</CardTitle>
                  <CardDescription className="text-gray-400 text-lg">
                    Enter your email to receive a reset link
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-6">
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

                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl text-sm ${
                          message.includes('sent') || message.includes('success')
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
                          <span>Sending...</span>
                        </div>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>

                    <div className="text-center pt-6 border-t border-white/10">
                      <div className="text-gray-400">
                        Remember your password?{' '}
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
                    We&apos;ve sent a password reset link to <span className="text-[#60A5FA]">{email}</span>. 
                    Click the link to reset your password.
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