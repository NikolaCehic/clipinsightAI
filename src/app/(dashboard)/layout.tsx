import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar user={session.user} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <DashboardHeader user={session.user} />

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Background Effects */}
          <div className="absolute inset-0 grid-pattern pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-[500px] bg-purple-500/5 blur-[100px] pointer-events-none" />

          <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

