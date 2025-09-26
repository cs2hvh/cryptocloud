'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { InlineLoader } from '@/components/ui/loader';
import toast from 'react-hot-toast';
import LightRays from '@/components/LightRays';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt } from 'react-icons/fa';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      router.push('/');
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
                Welcome back to the future of VPS hosting
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Sign in to access your private servers, manage your cryptocurrency deposits, and deploy with complete privacy.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              <div className="text-center">
                <FaShieldAlt className="h-8 w-8 text-[#60A5FA] mx-auto mb-2" />
                <p className="text-sm text-gray-400">Private</p>
              </div>
              <div className="text-center">
                <FaLock className="h-8 w-8 text-[#60A5FA] mx-auto mb-2" />
                <p className="text-sm text-gray-400">Private</p>
              </div>
              <div className="text-center">
                <FaShieldAlt className="h-8 w-8 text-[#60A5FA] mx-auto mb-2" />
                <p className="text-sm text-gray-400">Secure</p>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Sign In Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
              <CardHeader className="text-center pb-8">
                <Link 
                  href="/"
                  className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
                >
                  <FaArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Back to home
                </Link>
                <CardTitle className="text-white text-3xl font-normal">Sign In</CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Access your Unserver account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-6">
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
                        placeholder="Enter your password"
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
                  </div>

                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl text-sm ${
                        message.includes('success') 
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
                    {isLoading ? <InlineLoader text="Signing in" /> : 'Sign In'}
                  </Button>

                  <div className="text-center space-y-4 pt-6 border-t border-white/10">
                    <Link
                      href="/auth/forgot-password"
                      className="block text-gray-400 hover:text-[#60A5FA] transition-colors"
                    >
                      Forgot your password?
                    </Link>
                    <div className="text-gray-400">
                      Don&apos;t have an account?{' '}
                      <Link
                        href="/auth/signup"
                        className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors font-medium"
                      >
                        Create account
                      </Link>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
