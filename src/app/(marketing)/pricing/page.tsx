import Link from 'next/link';
import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe';

export default function PricingPage() {
  const tiers = [
    { key: 'free', ...SUBSCRIPTION_TIERS.free, popular: false },
    { key: 'pro', ...SUBSCRIPTION_TIERS.pro, popular: true },
    { key: 'enterprise', ...SUBSCRIPTION_TIERS.enterprise, popular: false },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
            Simple Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include access to our full content generation suite.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => (
            <Card
              key={tier.key}
              className={`relative bg-zinc-900/50 border-zinc-800 ${
                tier.popular ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-purple text-white border-0">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-white text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-zinc-400">
                  {tier.key === 'free' && 'Perfect for trying out ClipInsight'}
                  {tier.key === 'pro' && 'For growing content creators'}
                  {tier.key === 'enterprise' && 'For teams and agencies'}
                </CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold text-white">${tier.price}</span>
                  {tier.price > 0 && <span className="text-zinc-500">/month</span>}
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  {tier.credits === -1
                    ? 'Unlimited video analyses'
                    : `${tier.credits} video analyses per month`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  asChild
                  className={`w-full ${
                    tier.popular
                      ? 'gradient-purple text-white hover:opacity-90'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  <Link href={tier.key === 'free' ? '/register' : '/register?plan=' + tier.key}>
                    {tier.key === 'free' ? 'Get Started' : 'Subscribe Now'}
                  </Link>
                </Button>

                <div className="space-y-3 pt-4">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Mini */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. You\'ll retain access until the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards through Stripe. Enterprise customers can also pay via invoice.',
              },
              {
                q: 'Do unused credits roll over?',
                a: 'Credits reset at the start of each billing cycle. Enterprise plans have unlimited usage with no caps.',
              },
              {
                q: 'Is there a free trial for Pro?',
                a: 'Yes! Start with our Free plan to test the product, then upgrade when you\'re ready for more.',
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                <h4 className="font-medium text-white mb-2">{item.q}</h4>
                <p className="text-sm text-zinc-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16 p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
          <Zap className="w-10 h-10 text-purple-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Need a custom solution?</h3>
          <p className="text-zinc-400 mb-6">
            Let&apos;s discuss your specific requirements and build a plan that works for you.
          </p>
          <Button asChild variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
            <Link href="mailto:enterprise@clipinsight.ai">Contact Sales</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

