'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FilamentBackground } from '@/components/ui/filament-background';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05060A] px-4 relative">
      <FilamentBackground />

      <Card className="w-full max-w-md bg-[#0B1020]/80 border-[rgba(230,194,122,0.1)] backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          {/* Quipu-inspired logo */}
          <div className="flex justify-center mb-4">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border border-[#E6C27A]/30" />
              <div className="absolute inset-2 rounded-full bg-[#E6C27A]/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-[#E6C27A]" />
              </div>
              <div className="absolute -top-1 left-1/2 w-px h-3 bg-gradient-to-b from-[#E6C27A]/40 to-transparent" />
              <div className="absolute -bottom-1 left-1/2 w-px h-3 bg-gradient-to-t from-[#E6C27A]/40 to-transparent" />
              <div className="absolute top-1/2 -left-1 h-px w-3 bg-gradient-to-r from-[#E6C27A]/40 to-transparent" />
              <div className="absolute top-1/2 -right-1 h-px w-3 bg-gradient-to-l from-[#E6C27A]/40 to-transparent" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#E6E8EF]">Join the network</CardTitle>
          <CardDescription className="text-[#9AA3B2]">
            Create your Kipu account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <Separator className="bg-[rgba(230,194,122,0.1)]" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B1020] px-2 text-xs text-[#6B7280]">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#9AA3B2]">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1C2233]/50 border-[rgba(230,194,122,0.1)] text-[#E6E8EF] placeholder:text-[#6B7280] focus:border-[#E6C27A]/30 focus:ring-[#E6C27A]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#9AA3B2]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1C2233]/50 border-[rgba(230,194,122,0.1)] text-[#E6E8EF] placeholder:text-[#6B7280] focus:border-[#E6C27A]/30 focus:ring-[#E6C27A]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#9AA3B2]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1C2233]/50 border-[rgba(230,194,122,0.1)] text-[#E6E8EF] placeholder:text-[#6B7280] focus:border-[#E6C27A]/30 focus:ring-[#E6C27A]/20"
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Initializing...' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-[#9AA3B2]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#E6C27A] hover:text-[#E6C27A]/80 transition-colors">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
