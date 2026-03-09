import Link from "next/link";

export type AuthFooterLink = {
  href: string;
  label: string;
};

export function AuthFooterLinks({ links }: { links: AuthFooterLink[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {links.map((link) => (
        <Link
          key={link.href}
          className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          href={link.href}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
