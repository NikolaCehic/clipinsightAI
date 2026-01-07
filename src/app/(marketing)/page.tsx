import Link from 'next/link';
import { ArrowRight, RefreshCw, BarChart3, Lock, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="flex flex-col justify-center items-center px-6 text-center pt-24 pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium mb-8 animate-in">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          Now using Gemini 2.0 Flash
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl leading-[1.1] animate-in [animation-delay:100ms]">
          Turn One Video Into <br />
          <span className="gradient-text">A Multi-Channel Campaign.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed animate-in [animation-delay:200ms]">
          Stop manually repurposing content. ClipInsight&apos;s multimodal engine analyzes your
          video to generate ready-to-publish newsletters, tweets, LinkedIn posts, and blogs in
          seconds.
        </p>

        <Button
          asChild
          size="lg"
          className="group gradient-purple hover:opacity-90 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg shadow-purple-500/20 animate-in [animation-delay:300ms]"
        >
          <Link href="/register">
            Start Repurposing Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>

        {/* Trust Bar */}
        <div className="mt-24 pt-12 border-t border-zinc-800/50 w-full max-w-5xl animate-in [animation-delay:500ms]">
          <p className="text-zinc-500 text-xs font-semibold tracking-wider mb-8 uppercase">
            Trusted by modern content teams
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['Acme Corp', 'Global Dynamics', 'Nebula Inc', 'Stark Ind', 'Massive Dynamic'].map(
              (company, i) => (
                <span
                  key={i}
                  className="text-lg font-bold text-zinc-300 flex items-center gap-2"
                >
                  <div className="w-5 h-5 bg-zinc-700 rounded-full" /> {company}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-zinc-900/30 border-y border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              One Upload. Four Platforms. Zero Effort.
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Our AI doesn&apos;t just transcribe - it understands context, tone, and visual
              elements to create platform-perfect content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800/50 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 group-hover:bg-purple-500/10 transition-colors">
                <RefreshCw className="w-6 h-6 text-zinc-400 group-hover:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multimodal Analysis</h3>
              <p className="text-zinc-400 leading-relaxed">
                Our engine doesn&apos;t just read transcripts. It sees frames, understands
                context, and captures your unique visual tone.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800/50 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 group-hover:bg-purple-500/10 transition-colors">
                <BarChart3 className="w-6 h-6 text-zinc-400 group-hover:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Adaptive Personas</h3>
              <p className="text-zinc-400 leading-relaxed">
                Generates content with distinct voices: Viral for Twitter, Professional for
                LinkedIn, and SEO-driven for Blogs.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800/50 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 group-hover:bg-purple-500/10 transition-colors">
                <Lock className="w-6 h-6 text-zinc-400 group-hover:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Enterprise Grade</h3>
              <p className="text-zinc-400 leading-relaxed">
                Your video content is processed ephemerally on secure infrastructure and never
                trained on without explicit permission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-zinc-400 text-lg">Three simple steps to content domination</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload Your Video',
                description:
                  'Drag and drop your MP4 or MOV file. Our engine handles files up to 20MB for web processing.',
              },
              {
                step: '02',
                title: 'AI Analyzes Content',
                description:
                  'Gemini 2.0 processes visual cues, audio, and context to understand your message deeply.',
              },
              {
                step: '03',
                title: 'Get Your Content Suite',
                description:
                  'Receive ready-to-publish content for newsletters, Twitter, LinkedIn, and your blog.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-zinc-800 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-900/30 border-y border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Zap className="w-12 h-12 text-purple-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Content Workflow?
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of content creators who save hours every week with ClipInsight AI.
            Start with 3 free video analyses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-purple text-white">
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Common Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'How does the AI analyze video files?',
              a: "We use Gemini's latest multimodal models to process video frames and audio simultaneously, extracting semantic meaning to generate high-fidelity text content.",
            },
            {
              q: 'What file formats are supported?',
              a: 'Currently, we support MP4 and MOV files. For this web demo, files are processed client-side, so we recommend files under 20MB for optimal performance.',
            },
            {
              q: 'Is my video content stored?',
              a: 'No. Your videos are processed in-memory and discarded immediately after content generation. We never store or train on your original media.',
            },
            {
              q: 'Can I edit the generated content?',
              a: 'Absolutely! All generated content is fully editable before publishing. You can tweak headlines, adjust tone, or add your personal touch.',
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group bg-zinc-900/30 rounded-xl border border-zinc-800 open:bg-zinc-900/80 transition-all"
            >
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-zinc-200">
                <span>{item.q}</span>
                <span className="transition group-open:rotate-180">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </span>
              </summary>
              <div className="text-zinc-400 px-6 pb-6 pt-0 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

