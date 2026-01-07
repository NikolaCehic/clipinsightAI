import Stripe from 'stripe';

// Lazy-initialize Stripe to handle missing env vars during build
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeInstance;
};

// For backwards compatibility - throws if not configured
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    credits: 3,
    features: [
      '3 video analyses per month',
      'All content formats',
      'Basic export options',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    credits: 50,
    features: [
      '50 video analyses per month',
      'All content formats',
      'Priority processing',
      'Direct platform publishing',
      'Analytics dashboard',
      'Email support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    credits: -1, // Unlimited
    features: [
      'Unlimited video analyses',
      'All content formats',
      'Priority processing',
      'Direct platform publishing',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;

export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

export const createCustomer = async (email: string, name?: string) => {
  const customer = await getStripe().customers.create({
    email,
    name: name || undefined,
  });

  return customer;
};

export const getSubscription = async (subscriptionId: string) => {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  return subscription;
};

export const cancelSubscription = async (subscriptionId: string) => {
  const subscription = await getStripe().subscriptions.cancel(subscriptionId);
  return subscription;
};
