/**
 * Neon Auth Client SDK for React Components
 *
 * Official pattern from https://neon.com/docs/auth/quick-start/nextjs
 *
 * Usage in Client Components:
 *   'use client';
 *   import { authClient, useAuth, signIn, signOut } from '@/lib/auth/client';
 *   export default function Header() {
 *     const { user } = useAuth();
 *     return user ? (
 *       <button onClick={() => signOut()}>Sign out {user.name}</button>
 *     ) : (
 *       <a href="/signin">Sign in</a>
 *     );
 *   }
 */

"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// ─────────────────────────────────────────────────────────────────────────────
// Neon Auth Client Instance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neon Auth client for browser-side auth operations.
 *
 * Endpoint is configured via NEXT_PUBLIC_NEON_AUTH_URL from env
 * (must be the same as NEON_AUTH_BASE_URL on server).
 *
 * Neon Auth provides React hooks for auth state management.
 */
export const authClient = createAuthClient();

// ─────────────────────────────────────────────────────────────────────────────
// React Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React hook: Get current user session.
 * Triggers re-render on auth state change (login, logout, session refresh).
 *
 * Returns:
 *   user: Current user | null if not authenticated
 *   session: Full session object (includes dates, provider info, etc.)
 *   isLoading: true while session is being fetched
 *   error: Error object if session fetch failed
 *
 * Example:
 *   const { user, isLoading, error } = useAuth();
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorAlert error={error} />;
 *   if (!user) return <SignInForm />;
 *   return <Dashboard user={user} />;
 */
export const useAuth = () => {
  const sessionState = authClient.useSession();

  return {
    user: sessionState.data?.user ?? null,
    session: sessionState.data ?? null,
    isLoading: sessionState.isPending || sessionState.isRefetching,
  };
};

// Alias for downstream compatibility.
export const useSession_ = authClient.useSession;

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 *
 * Usage:
 *   const handleSignIn = async (email, password) => {
 *     try {
 *       await signIn.email({ email, password });
 *       // Session cookie is automatically set by Neon Auth
 *       // Redirect happens via route handler or manually
 *     } catch (err) {
 *       setError(err.message);
 *     }
 *   };
 */
export const signIn = authClient.signIn.email;

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 *
 * Neon Auth provides built-in Google + GitHub support.
 * Custom providers can be configured in console.
 *
 * Usage:
 *   await authClient.signIn.social({
 *     provider: 'google',
 *     callbackURL: '/dashboard',
 *   });
 */
export const signInOAuth = authClient.signIn.social;

/**
 * Sign out and clear session cookie.
 *
 * Usage:
 *   await signOut();
 *   router.push('/');
 */
export const signOut = authClient.signOut;

/**
 * Sign up new user with email and password.
 *
 * Usage:
 *   await signUp({
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     password: 'secure-password',
 *   });
 */
export const signUp = authClient.signUp.email;

/**
 * Request password reset (initiates email flow).
 *
 * Two modes:
 * - 'link': User receives reset link in email (default)
 * - 'code': User receives reset code to enter in form
 *
 * Configure via AUTH_PASSWORD_RESET_DELIVERY env var.
 *
 * Usage:
 *   await resetPassword({ email: 'user@example.com' });
 *   // Email is sent with reset link or code
 */
export const resetPassword = authClient.resetPassword;

/**
 * Change user profile (name, image, etc.)
 *
 * Does NOT change email or password (use separate endpoints).
 *
 * Usage:
 *   await updateProfile({
 *     name: 'Jane Doe',
 *     image: 'https://example.com/avatar.jpg',
 *   });
 */
export const updateProfile = authClient.updateUser;

/**
 * Verify email address (for new signups or email changes).
 *
 * Delegates to Neon Auth verification endpoint.
 */
export const verifyEmail = authClient.verifyEmail;

/**
 * Get current session (low-level; prefer useAuth hook).
 *
 * Direct access to the current browser session.
 */
export const getSession = authClient.getSession;

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type { User, Session } from "better-auth";
