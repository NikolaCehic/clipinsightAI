import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side Supabase client with service role key
// Returns a mock client if environment variables are not set
const createSupabaseAdmin = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseServiceKey) {
    // Return a mock client for build time / when env vars are not set
    console.warn('Supabase credentials not configured - some features will be disabled');
    
    // Create a chainable mock that returns itself for any method
    const createChainableMock = (): Record<string, unknown> => {
      const mock: Record<string, unknown> = {
        data: null,
        error: null,
      };
      
      const chainable = new Proxy(mock, {
        get(target, prop) {
          if (prop === 'data' || prop === 'error') {
            return target[prop as keyof typeof target];
          }
          // Return a function that returns the chainable for any method call
          return () => chainable;
        },
      });
      
      return chainable;
    };
    
    return {
      from: () => createChainableMock(),
      rpc: () => Promise.resolve({ data: null, error: null }),
    } as unknown as SupabaseClient;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const supabaseAdmin = createSupabaseAdmin();

// Client-side Supabase client (read-only operations)
export const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );
};

// Database types
export type Tables = {
  users: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    stripe_customer_id: string | null;
    subscription_tier: 'free' | 'pro' | 'enterprise';
    credits_remaining: number;
    created_at: string;
  };
  projects: {
    id: string;
    user_id: string;
    title: string;
    video_filename: string | null;
    newsletter_subject: string;
    newsletter_body: string;
    twitter_thread: string[];
    linkedin_post: string;
    blog_post: string;
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    updated_at: string;
  };
  usage_logs: {
    id: string;
    user_id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
  };
};

