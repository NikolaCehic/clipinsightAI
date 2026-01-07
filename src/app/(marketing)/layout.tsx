import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px]" />
      </div>

      {/* Navigation */}
      <nav className="w-full py-6 px-6 md:px-12 flex justify-between items-center z-10 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">ClipInsight</span>
        </Link>

        <div className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
          <Link href="/#features" className="hover:text-white transition-colors">
            Product
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/#faq" className="hover:text-white transition-colors">
            Resources
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-zinc-300 hover:text-white">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-white text-zinc-950 hover:bg-zinc-200">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 relative z-10">{children}</main>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-800/50 text-center text-zinc-600 text-sm relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <p>© {new Date().getFullYear()} ClipInsight AI. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
}

