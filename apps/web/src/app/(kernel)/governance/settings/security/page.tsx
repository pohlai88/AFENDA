import { auth } from "@/auth";
import { fetchMfaStatus } from "@/lib/api-client";
import { MfaSetupClient } from "./MfaSetupClient";
import { ChangePasswordClient } from "./ChangePasswordClient";
import { SendVerificationEmailClient } from "./SendVerificationEmailClient";
import { VerifyEmailWithOtpClient } from "./VerifyEmailWithOtpClient";
import { ListSessionsClient } from "./ListSessionsClient";
import { DeleteAccountClient } from "./DeleteAccountClient";

/** Security settings — MFA enrollment + password change. */
export default async function SecuritySettingsPage() {
  const session = await auth();
  let mfaEnabled = false;
  try {
    const status = await fetchMfaStatus();
    mfaEnabled = status.enabled;
  } catch {
    // If the MFA status call fails (first setup, network error) default to not enabled.
  }

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Security</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account security, two-factor authentication, and password.
        </p>
      </div>

      <div className="max-w-lg space-y-10 px-8 py-6">
        {/* ── Two-factor authentication ── */}
        <section>
          <h2 className="mb-0.5 text-sm font-semibold text-foreground">
            Two-factor authentication
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Add an extra layer of security with a TOTP authenticator app.
          </p>
          <MfaSetupClient initialEnabled={mfaEnabled} onComplete={() => {}} onDisabled={() => {}} />
        </section>

        <div className="border-t" />

        {/* ── Email verification ── */}
        <SendVerificationEmailClient />

        {/* ── Verify email with code ── */}
        <VerifyEmailWithOtpClient defaultEmail={session?.user?.email} />

        <div className="border-t" />

        {/* ── Active sessions ── */}
        <ListSessionsClient />

        <div className="border-t" />

        {/* ── Password ── */}
        <ChangePasswordClient />

        <div className="border-t" />

        {/* ── Delete account ── */}
        <DeleteAccountClient />
      </div>
    </div>
  );
}
