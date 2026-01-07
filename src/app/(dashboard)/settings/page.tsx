'use client';

import { useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  CreditCard, 
  Key, 
  Bell,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe';
import { toast } from 'sonner';

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'account';
  
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/webhooks/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start upgrade process');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTier = (session?.user as { subscriptionTier?: string })?.subscriptionTier || 'free';

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account and subscription</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="account" className="data-[state=active]:bg-zinc-800">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-zinc-800">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-zinc-800">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-zinc-800">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Profile</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xl">
                    {session?.user?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-white">{session?.user?.name || 'User'}</h3>
                  <p className="text-sm text-zinc-500">{session?.user?.email}</p>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-zinc-300">Display Name</Label>
                  <Input
                    id="name"
                    defaultValue={session?.user?.name || ''}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-zinc-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={session?.user?.email || ''}
                    disabled
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <p className="text-xs text-zinc-500">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
              </div>

              <Button className="gradient-purple">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Current Plan</CardTitle>
              <CardDescription>Manage your subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-lg">
                      {SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]?.name || 'Free'} Plan
                    </h3>
                    <Badge className="gradient-purple text-white border-0">Active</Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    {currentTier === 'enterprise' 
                      ? 'Unlimited video analyses' 
                      : `${SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]?.credits || 3} credits per month`}
                  </p>
                </div>
                {currentTier !== 'enterprise' && (
                  <Button 
                    onClick={() => handleUpgrade(currentTier === 'free' ? 'pro' : 'enterprise')}
                    disabled={isLoading}
                    className="gradient-purple"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Available Plans</CardTitle>
              <CardDescription>Choose the plan that works for you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border ${
                      currentTier === key
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-700 bg-zinc-800/30'
                    }`}
                  >
                    <h4 className="font-semibold text-white">{tier.name}</h4>
                    <p className="text-2xl font-bold text-white mt-2">
                      ${tier.price}
                      {tier.price > 0 && <span className="text-sm text-zinc-500">/mo</span>}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {tier.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                          <Check className="w-4 h-4 text-purple-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {currentTier === key ? (
                      <Badge className="mt-4 w-full justify-center bg-zinc-700 text-zinc-300">
                        Current Plan
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(key)}
                        disabled={isLoading}
                        variant="outline"
                        className="mt-4 w-full border-zinc-700 text-white hover:bg-zinc-800"
                      >
                        {key === 'free' ? 'Downgrade' : 'Upgrade'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">API Keys</CardTitle>
              <CardDescription>Manage API access for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">Production API Key</span>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value="clip_live_••••••••••••••••"
                    disabled
                    className="bg-zinc-900 border-zinc-700 font-mono text-sm"
                  />
                  <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Created on Jan 1, 2024 • Last used 2 hours ago
                </p>
              </div>

              <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                <Key className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-400">
                  API access is available on Pro and Enterprise plans.
                </span>
                <Button variant="link" className="text-amber-400 p-0 h-auto">
                  Upgrade now <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Project completed', desc: 'Get notified when content generation finishes' },
                { label: 'Weekly digest', desc: 'Summary of your content performance' },
                { label: 'Product updates', desc: 'New features and improvements' },
                { label: 'Tips & tutorials', desc: 'Learn how to get the most from ClipInsight' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30">
                  <div>
                    <h4 className="font-medium text-white">{item.label}</h4>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={i < 2}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-zinc-900"
                  />
                </div>
              ))}

              <Button className="gradient-purple">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8 max-w-4xl animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-32" />
        <div className="h-96 bg-zinc-800 rounded" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
