"use client";

/**
 * MFA Setup Wizard — 3-step TOTP enrollment:
 *   Step 1: Install authenticator app (links + guidance)
 *   Step 2: Scan QR code (or enter secret manually)
 *   Step 3: Verify trial code (confirm enrollment)
 *
 * Designed to be embedded in the security settings page.
 * Server actions generate the TOTP secret and QR code data URI server-side.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ChevronRight,
  ChevronLeft,
  Copy,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Separator,
} from "@afenda/ui";
import { generateTotpSetupAction, confirmTotpSetupAction, disableMfaAction } from "./actions";

type WizardStep = "apps" | "qr" | "verify";

interface MfaSetupClientProps {
  initialEnabled: boolean;
  onComplete: () => void;
  onDisabled: () => void;
}

const APP_LINKS = [
  {
    name: "Google Authenticator",
    ios: "https://apps.apple.com/app/google-authenticator/id388497605",
    android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
  },
  {
    name: "Microsoft Authenticator",
    ios: "https://apps.apple.com/app/microsoft-authenticator/id983156458",
    android: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
  },
  {
    name: "Authy",
    ios: "https://apps.apple.com/app/twilio-authy/id494168017",
    android: "https://play.google.com/store/apps/details?id=com.authy.authy",
  },
];

function StepIndicator({ step }: { step: WizardStep }) {
  const steps: WizardStep[] = ["apps", "qr", "verify"];
  const labels = ["Install App", "Scan QR", "Verify Code"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="mb-6 flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={[
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              i < currentIndex
                ? "bg-primary text-primary-foreground"
                : i === currentIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {i < currentIndex ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={[
              "ml-1.5 text-xs",
              i === currentIndex ? "font-medium text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {labels[i]}
          </span>
          {i < steps.length - 1 && <div className="mx-2 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

/* --- Step 1: Install app ------------------------------------------------- */
function Step1Apps({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        To use two-factor authentication, you need a TOTP authenticator app on your phone. Install
        one of the apps below, then continue.
      </p>

      <div className="space-y-2">
        {APP_LINKS.map((app) => (
          <div key={app.name} className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">{app.name}</span>
            <div className="flex gap-2">
              <a
                href={app.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                iOS
              </a>
              <span className="text-xs text-muted-foreground">·</span>
              <a
                href={app.android}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Android
              </a>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full">
        I have an app installed <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

/* --- Step 2: QR code ----------------------------------------------------- */
function Step2QR({
  qrCodeDataUri,
  secret,
  onNext,
  onBack,
}: {
  qrCodeDataUri: string | null;
  secret: string | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [secret]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Open your authenticator app, add a new account, and scan this QR code.
      </p>

      {qrCodeDataUri ? (
        <div className="flex justify-center">
          {/* shadcn-exempt: native img for base64 PNG QR code generated server-side */}
          <img
            src={qrCodeDataUri}
            alt="TOTP QR Code — scan with your authenticator app"
            width={200}
            height={200}
            className="rounded-lg border bg-white p-2"
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground">QR code unavailable</p>
        </div>
      )}

      {/* Manual entry fallback */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground transition-colors select-none hover:text-foreground">
          Can&apos;t scan the QR code? Enter the key manually
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            In your authenticator app, choose &quot;Enter setup key&quot; and type this secret:
          </p>
          <div className="flex items-center gap-2 rounded-md bg-muted p-2 font-mono text-xs break-all">
            <span className="flex-1">
              {secret && showSecret
                ? secret
                : secret
                  ? `${secret.slice(0, 4)}${"·".repeat(Math.max(0, secret.length - 8))}${secret.slice(-4)}`
                  : "—"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setShowSecret((p) => !p)}
              aria-label={showSecret ? "Hide secret" : "Show secret"}
            >
              {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => void handleCopy()}
              aria-label="Copy secret"
            >
              {copied ? (
                <CheckCircle className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Account type: Time-based (TOTP) · Algorithm: SHA-1 · Digits: 6 · Period: 30s
          </p>
        </div>
      </details>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          I&apos;ve scanned it <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* --- Step 3: Verify code ------------------------------------------------- */
function Step3Verify({
  secret,
  onBack,
  onSuccess,
}: {
  secret: string | null;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(
    async (submittedCode: string) => {
      if (!secret) return;
      setIsLoading(true);
      setError(null);
      try {
        await confirmTotpSetupAction(secret, submittedCode);
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Invalid code. Please check your authenticator app and try again.",
        );
        setCode("");
      } finally {
        setIsLoading(false);
      }
    },
    [secret, onSuccess],
  );

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && !isLoading) {
      void handleVerify(code);
    }
  }, [code, isLoading, handleVerify]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code currently shown in your authenticator app to confirm setup.
      </p>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          disabled={isLoading}
          aria-label="6-digit verification code"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={() => void handleVerify(code)}
          disabled={code.length !== 6 || isLoading}
          className="flex-1"
        >
          {isLoading ? "Verifying..." : "Confirm setup"}
        </Button>
      </div>
    </div>
  );
}

/* --- Disable confirmation ------------------------------------------------ */
function DisableConfirm({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <Alert variant="destructive" className="space-y-3">
      <AlertTitle>Disable two-factor authentication?</AlertTitle>
      <AlertDescription>
        You will no longer need a TOTP code to sign in. Your account will only be protected by your
        password.
      </AlertDescription>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "Disabling..." : "Yes, disable MFA"}
        </Button>
      </div>
    </Alert>
  );
}

/* --- Main exported component --------------------------------------------- */
export function MfaSetupClient({ initialEnabled, onComplete, onDisabled }: MfaSetupClientProps) {
  const [mfaEnabled, setMfaEnabled] = useState(initialEnabled);
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>("apps");
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const startSetup = useCallback(async () => {
    setIsGenerating(true);
    setStep("apps");
    setSecret(null);
    setQrCodeDataUri(null);
    try {
      const result = await generateTotpSetupAction();
      setSecret(result.secret);
      setQrCodeDataUri(result.qrCodeDataUri);
      setShowWizard(true);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDisable = useCallback(async () => {
    setIsDisabling(true);
    try {
      await disableMfaAction();
      setMfaEnabled(false);
      setShowDisableConfirm(false);
      onDisabled();
    } finally {
      setIsDisabling(false);
    }
  }, [onDisabled]);

  const handleSetupComplete = useCallback(() => {
    setMfaEnabled(true);
    setShowWizard(false);
    setSecret(null);
    setQrCodeDataUri(null);
    onComplete();
  }, [onComplete]);

  /* -- Enabled state ------------------------------------------------------- */
  if (mfaEnabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Two-factor authentication is enabled</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You will be asked for a 6-digit code from your authenticator app each time you sign
              in.
            </p>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>

        {showDisableConfirm ? (
          <DisableConfirm
            onConfirm={() => void handleDisable()}
            onCancel={() => setShowDisableConfirm(false)}
            isLoading={isDisabling}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisableConfirm(true)}
            className="border-destructive/30 text-destructive hover:border-destructive hover:text-destructive"
          >
            <ShieldX className="mr-2 h-4 w-4" />
            Disable two-factor authentication
          </Button>
        )}
      </div>
    );
  }

  /* -- Wizard active ------------------------------------------------------- */
  if (showWizard) {
    return (
      <div>
        <StepIndicator step={step} />
        <Separator className="mb-4" />

        {step === "apps" && <Step1Apps onNext={() => setStep("qr")} />}

        {step === "qr" && (
          <Step2QR
            qrCodeDataUri={qrCodeDataUri}
            secret={secret}
            onNext={() => setStep("verify")}
            onBack={() => setStep("apps")}
          />
        )}

        {step === "verify" && (
          <Step3Verify
            secret={secret}
            onBack={() => setStep("qr")}
            onSuccess={handleSetupComplete}
          />
        )}

        <Separator className="mt-4 mb-3" />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowWizard(false)}
        >
          Cancel setup
        </Button>
      </div>
    );
  }

  /* -- Not yet enabled ----------------------------------------------------- */
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Two-factor authentication is not enabled</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add an extra layer of security by requiring a code from your authenticator app at sign
            in.
          </p>
        </div>
      </div>

      <Button onClick={() => void startSetup()} disabled={isGenerating} size="sm">
        <ShieldCheck className="mr-2 h-4 w-4" />
        {isGenerating ? "Preparing..." : "Set up two-factor authentication"}
      </Button>
    </div>
  );
}
