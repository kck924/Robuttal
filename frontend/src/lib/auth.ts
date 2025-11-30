import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          // Create or update user in backend database
          const response = await fetch(`${API_BASE}/api/auth/user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              provider: 'google',
              provider_id: account.providerAccountId,
            }),
          });

          if (!response.ok) {
            console.error('Failed to create/update user in backend');
            // Still allow sign in even if backend fails
          }
        } catch (error) {
          console.error('Error syncing user to backend:', error);
          // Still allow sign in even if backend fails
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign in, add user data to token
      if (account && user) {
        token.provider = account.provider;
        token.providerId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom properties to session
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
