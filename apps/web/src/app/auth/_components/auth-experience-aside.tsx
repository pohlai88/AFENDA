import { CheckCircle2, Fingerprint, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";
import type { PortalType } from "@afenda/contracts";
import { getPortal } from "../_lib/portal-registry";

const assurancePoints = [
  {
    icon: ShieldCheck,
    title: "Audit-first security",
    body: "Every sign-in and sign-out event is traceable for compliance and incident response.",
  },
  {
    icon: Fingerprint,
    title: "Adaptive verification",
    body: "Risk and MFA checks add friction only when needed to keep teams productive.",
  },
  {
    icon: CheckCircle2,
    title: "Portal-aware access",
    body: "Role-based routing ensures each user lands in the right environment after auth.",
  },
] as const;

type AuthJourney = "signin" | "signup";

interface AsideContent {
  badge: string;
  heading: string;
  description: string;
  cardTitle: string;
  points: readonly {
    icon: typeof ShieldCheck;
    title: string;
    body: string;
  }[];
}

function buildAsideContent(portal: PortalType, journey: AuthJourney): AsideContent {
  const portalMeta = getPortal(portal);

  if (journey === "signup") {
    return {
      badge: "Workspace onboarding",
      heading: "Build your operating system for accountable growth.",
      description:
        "Set up your team, controls, and access model from day one so execution stays fast and auditable.",
      cardTitle: "What happens next",
      points: [
        {
          icon: CheckCircle2,
          title: "Create your workspace",
          body: "Provision your organization shell and baseline settings in minutes.",
        },
        {
          icon: Fingerprint,
          title: "Assign role-aware access",
          body: "Map users to responsibilities with clear permissions and safer handoffs.",
        },
        {
          icon: ShieldCheck,
          title: "Start with audit visibility",
          body: "Every important action becomes traceable from your first operational day.",
        },
      ],
    };
  }

  if (portal === "app") {
    return {
      badge: "Secure workspace access",
      heading: "Secure access for teams that need operational clarity.",
      description:
        "AFENDA combines guided sign-in, adaptive verification, and auditable access so finance and governance teams can move quickly without sacrificing control.",
      cardTitle: "Built for finance and governance teams",
      points: assurancePoints,
    };
  }

  if (portalMeta.group === "internal") {
    return {
      badge: "Internal operations access",
      heading: `${portalMeta.label} access with tighter controls.`,
      description:
        "Internal environments require stronger assurance. Access is continuously verified and logged for security operations.",
      cardTitle: "Internal access guidelines",
      points: [
        {
          icon: ShieldCheck,
          title: "Higher-trust entry checks",
          body: "Risk and policy checks are stricter for internal operational surfaces.",
        },
        {
          icon: Fingerprint,
          title: "Adaptive challenge flow",
          body: "Verification intensity scales with context, device, and sign-in behavior.",
        },
        {
          icon: CheckCircle2,
          title: "Continuous audit trace",
          body: "All sign-in decisions are retained for governance and investigation workflows.",
        },
      ],
    };
  }

  return {
    badge: "Portal access guidance",
    heading: `${portalMeta.label} access for external stakeholders.`,
    description:
      "Sign in with the right identity to reach your portal workspace with scoped permissions and clear operational boundaries.",
    cardTitle: "Before you continue",
    points: [
      {
        icon: CheckCircle2,
        title: "Use the assigned business email",
        body: "Portal access is tied to your invited identity and organization relationship.",
      },
      {
        icon: Fingerprint,
        title: "Complete verification when prompted",
        body: "Additional checks help protect transactions and sensitive records.",
      },
      {
        icon: ShieldCheck,
        title: "Expect scoped workspace access",
        body: "You will only see data and actions available to your portal role.",
      },
    ],
  };
}

interface AuthExperienceAsideProps {
  portal?: PortalType;
  journey?: AuthJourney;
}

export function AuthExperienceAside({
  portal = "app",
  journey = "signin",
}: AuthExperienceAsideProps) {
  const content = buildAsideContent(portal, journey);

  return (
    <aside className="space-y-8">
      <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs font-medium">
        {content.badge}
      </Badge>

      <div className="max-w-xl space-y-4">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
          {content.heading}
        </h1>
        <p className="max-w-[60ch] text-sm leading-7 text-muted-foreground sm:text-base">
          {content.description}
        </p>
      </div>

      <Card className="border border-border-interactive bg-surface-300 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
            {content.cardTitle}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {content.points.map((point, index) => {
            const Icon = point.icon;

            return (
              <div key={point.title}>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-interactive bg-surface-250">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium leading-5 text-foreground sm:text-base">
                      {point.title}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                </div>

                {index < content.points.length - 1 ? (
                  <Separator className="mt-5" />
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </aside>
  );
}