'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Github, Mail, Loader2, User } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(provider);
    await signIn(provider, { callbackUrl });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading('credentials');
    await signIn('credentials', { 
      email,
      password,
      name,
      redirect: true,
      callbackUrl 
    });
  };

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold text-white">Welcome to ClipInsight</CardTitle>
        <CardDescription className="text-zinc-400">
          Sign in or create an account to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error === 'OAuthAccountNotLinked' 
              ? 'This email is already associated with another account.' 
              : error === 'CredentialsSignin'
              ? 'Invalid credentials. Please try again.'
              : 'An error occurred during sign in.'}
          </div>
        )}

        {/* Email/Password Sign In */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500/20"
              required
            />
          </div>
          
          {showPassword && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Name <span className="text-zinc-500">(optional)</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  Password <span className="text-zinc-500">(optional for demo)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
            disabled={isLoading !== null}
          >
            {isLoading === 'credentials' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {showPassword ? 'Sign In / Sign Up' : 'Continue with Email'}
          </Button>
          
          {!showPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(true)}
              className="w-full text-sm text-zinc-400 hover:text-zinc-300"
            >
              <User className="w-3 h-3 inline mr-1" />
              Add name & password
            </button>
          )}
        </form>

        <div className="relative">
          <Separator className="bg-zinc-800" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 px-3 text-xs text-zinc-500">
            or continue with
          </span>
        </div>

        {/* OAuth Providers */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
            )}
            Continue with Google
          </Button>
          
          <Button
            variant="outline"
            className="w-full bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading !== null}
          >
            {isLoading === 'github' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Github className="w-4 h-4 mr-2" />
            )}
            Continue with GitHub
          </Button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
          <br />
          <span className="text-purple-400">Demo mode: Any email works without password.</span>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md h-96 bg-zinc-900/50 border border-zinc-800 rounded-lg animate-pulse" />
    }>
      <LoginForm />
    </Suspense>
  );
}
