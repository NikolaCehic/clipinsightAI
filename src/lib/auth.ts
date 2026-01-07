import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { supabaseAdmin } from './supabase';

/**
 * Generate a consistent user ID from email
 */
function generateUserId(email: string): string {
  // Create a simple hash from email for consistent IDs
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to UUID-like format
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hexHash}-0000-4000-8000-000000000000`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHub({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
    // Email/Password and Demo credentials provider
    Credentials({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password', placeholder: 'Password (optional for demo)' },
        name: { label: 'Name', type: 'text', placeholder: 'Your name' },
      },
      authorize(credentials) {
        const email = credentials?.email;
        const name = credentials?.name;
        
        // Accept any valid email for now (demo mode)
        // In production, you'd verify password against stored hash
        if (email && typeof email === 'string' && email.includes('@')) {
          const userId = generateUserId(email);
          return {
            id: userId,
            email: email,
            name: (name as string) || email.split('@')[0],
          };
        }
        
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        console.log('Supabase not configured - skipping user sync');
        return true;
      }

      try {
        // Generate consistent user ID
        const userId = user.id || generateUserId(user.email);
        
        // Check if user exists in Supabase
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          console.log('Creating new user:', user.email);
          
          // Create new user in Supabase (new schema - no subscription_tier/credits)
          const { error: userError } = await supabaseAdmin.from('users').insert({
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
          });

          if (userError) {
            console.error('Error creating user:', userError);
            return true; // Still allow sign in
          }

          // Create a default workspace for the user
          const workspaceName = `${user.name || user.email.split('@')[0]}'s Workspace`;
          const { data: workspace, error: workspaceError } = await supabaseAdmin
            .from('workspaces')
            .insert({
              name: workspaceName,
              owner_user_id: userId,
            })
            .select()
            .single();

          if (workspaceError) {
            console.error('Error creating workspace:', workspaceError);
            return true;
          }

          console.log('Created workspace:', workspace.id);

          // Add user as workspace owner
          const { error: memberError } = await supabaseAdmin
            .from('workspace_members')
            .insert({
              workspace_id: workspace.id,
              user_id: userId,
              role: 'OWNER',
            });

          if (memberError) {
            console.error('Error adding workspace member:', memberError);
          }

          // Create free tier entitlement
          const { error: entitlementError } = await supabaseAdmin
            .from('workspace_entitlements')
            .insert({
              workspace_id: workspace.id,
              plan_name: 'free',
              minutes_per_day: 10,
              jobs_per_day: 3,
              max_video_duration_sec: 600,
              allowed_formats: ['NEWSLETTER', 'BLOG', 'TWITTER_THREAD', 'LINKEDIN'],
            });

          if (entitlementError) {
            console.error('Error creating entitlement:', entitlementError);
          }

          console.log('User setup complete:', user.email);
        } else {
          console.log('User already exists:', user.email);
          
          // Check if user has a workspace, if not create one
          const { data: membership } = await supabaseAdmin
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', existingUser.id)
            .limit(1)
            .single();

          if (!membership) {
            console.log('User has no workspace, creating one...');
            
            const workspaceName = `${user.name || user.email.split('@')[0]}'s Workspace`;
            const { data: workspace, error: workspaceError } = await supabaseAdmin
              .from('workspaces')
              .insert({
                name: workspaceName,
                owner_user_id: existingUser.id,
              })
              .select()
              .single();

            if (!workspaceError && workspace) {
              await supabaseAdmin.from('workspace_members').insert({
                workspace_id: workspace.id,
                user_id: existingUser.id,
                role: 'OWNER',
              });

              await supabaseAdmin.from('workspace_entitlements').insert({
                workspace_id: workspace.id,
                plan_name: 'free',
                minutes_per_day: 10,
                jobs_per_day: 3,
                max_video_duration_sec: 600,
                allowed_formats: ['NEWSLETTER', 'BLOG', 'TWITTER_THREAD', 'LINKEDIN'],
              });
            }
          }
        }
      } catch (error) {
        console.error('Database error during sign in:', error);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Use consistent ID
        token.id = user.id || generateUserId(user.email!);
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
});

// Extend the session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
