'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ChevronRight, Zap, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './sidebar';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscriptionTier?: string;
    creditsRemaining?: number;
  };
}

export function DashboardHeader({ user }: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'New Project';
    if (pathname.startsWith('/projects/')) return 'Project Details';
    if (pathname === '/history') return 'Project History';
    if (pathname === '/analytics') return 'Analytics';
    if (pathname === '/settings') return 'Settings';
    return 'Dashboard';
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden h-16 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 z-20">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <span className="font-bold">ClipInsight</span>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-zinc-950 border-zinc-800">
              <DashboardSidebar user={user} />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-zinc-400"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:flex h-16 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl items-center justify-between px-8 z-10 sticky top-0">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>Dashboard</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-200">{getPageTitle()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-medium text-emerald-500 tracking-wide uppercase">
            System Operational
          </span>
        </div>
      </div>
    </>
  );
}

