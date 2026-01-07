'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Zap,
  LogOut,
  LayoutGrid,
  FileText,
  Settings,
  HelpCircle,
  BarChart3,
  History,
  User,
  CreditCard,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscriptionTier?: string;
    creditsRemaining?: number;
  };
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Project History', href: '/history', icon: History },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const secondaryNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Billing', href: '/settings?tab=billing', icon: CreditCard },
    { name: 'Support', href: '#', icon: HelpCircle },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col hidden md:flex z-20">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800/50">
        <div className="w-8 h-8 gradient-purple rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        <span className="font-bold text-lg tracking-tight">ClipInsight</span>
      </div>

      {/* Credits Badge */}
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 font-medium">Credits Remaining</p>
            <p className="text-lg font-bold text-white">
              {user.creditsRemaining === -1 ? '∞' : user.creditsRemaining ?? 3}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${
              user.subscriptionTier === 'pro'
                ? 'bg-purple-500/20 text-purple-400'
                : user.subscriptionTier === 'enterprise'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {user.subscriptionTier?.toUpperCase() || 'FREE'}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Workspace
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-8 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          System
        </div>
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

