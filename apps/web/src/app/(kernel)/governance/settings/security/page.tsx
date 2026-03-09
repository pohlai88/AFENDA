import { ChangePasswordClient } from "./ChangePasswordClient";

/** Security settings — change password. */
export default function SecuritySettingsPage() {
  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Security</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account security and password.
        </p>
      </div>
      <ChangePasswordClient />
    </div>
  );
}
