import Link from "next/link";

export const FOOTER_ERROR_LINKS = [
  { href: "/auth/signin", label: "Sign in" },
  { href: "/auth/signup", label: "Sign up" },
];

export const FOOTER_RESET_LINKS = [
  { href: "/auth/signin", label: "Back to sign in" },
];

export const FOOTER_SIGNIN_LINKS = [
  { href: "/auth/reset-password", label: "Forgot password" },
  { href: "/auth/signup", label: "Create account" },
  { href: "/auth/portal/accept", label: "Accept invitation" },
];

interface AuthFooterLinksProps {
  links: Array<{ href: string; label: string }>;
}

export function AuthFooterLinks({ links }: AuthFooterLinksProps) {
  return (
    <div className="flex justify-center gap-4 text-sm text-muted-foreground">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="hover:underline">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
