import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.customer && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          const priceId = subscription.items.data[0]?.price.id;
          let tier: 'free' | 'pro' | 'enterprise' = 'free';
          
          if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
            tier = 'pro';
          } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            tier = 'enterprise';
          }

          // Update user in database
          await supabaseAdmin
            .from('users')
            .update({
              stripe_customer_id: session.customer as string,
              subscription_tier: tier,
              credits_remaining: tier === 'enterprise' ? -1 : tier === 'pro' ? 50 : 3,
            })
            .eq('email', session.customer_email);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const priceId = subscription.items.data[0]?.price.id;
        let tier: 'free' | 'pro' | 'enterprise' = 'free';
        let credits = 3;
        
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          tier = 'pro';
          credits = 50;
        } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
          tier = 'enterprise';
          credits = -1;
        }

        // Update user tier
        await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: tier,
            credits_remaining: credits,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade to free tier
        await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'free',
            credits_remaining: 3,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Reset credits on successful payment (monthly renewal)
        if (invoice.billing_reason === 'subscription_cycle') {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('subscription_tier')
            .eq('stripe_customer_id', customerId)
            .single();

          if (user) {
            const credits = user.subscription_tier === 'enterprise' 
              ? -1 
              : user.subscription_tier === 'pro' 
              ? 50 
              : 3;

            await supabaseAdmin
              .from('users')
              .update({ credits_remaining: credits })
              .eq('stripe_customer_id', customerId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Log payment failure (could also send notification)
        console.log(`Payment failed for customer: ${customerId}`);
        
        await supabaseAdmin.from('usage_logs').insert({
          user_id: customerId,
          action: 'payment_failed',
          metadata: {
            invoice_id: invoice.id,
            amount: invoice.amount_due,
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}


