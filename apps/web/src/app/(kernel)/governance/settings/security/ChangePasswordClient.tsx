"use client";

/**
 * Change password form — calls PATCH /v1/me/password via server action.
 */
import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck, ShieldX } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  Label,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@afenda/ui";
import { changePasswordAction } from "./actions";

export function ChangePasswordClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await changePasswordAction(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Keep your account secure by rotating credentials and using a strong passphrase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="session">Session Security</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>
                        <Lock />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="current-password"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                        onClick={() => setShowCurrentPassword((current) => !current)}
                      >
                        {showCurrentPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-password">New password</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="xs" className="h-6 px-2">
                          Policy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Minimum 8 characters. Prefer 12+ characters with mixed symbols and numbers.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>
                        <ShieldCheck />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={isLoading}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                        onClick={() => setShowNewPassword((current) => !current)}
                      >
                        {showNewPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>
                        <ShieldX />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={isLoading}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                        onClick={() => setShowConfirmPassword((current) => !current)}
                      >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                {error ? (
                  <Alert variant="destructive">
                    <ShieldX />
                    <AlertTitle>Update failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                {success ? (
                  <Alert>
                    <ShieldCheck />
                    <AlertTitle>Password updated</AlertTitle>
                    <AlertDescription>
                      Password changed successfully.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Change password"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="session" className="space-y-3">
              <Alert>
                <ShieldCheck />
                <AlertTitle>Session hardening</AlertTitle>
                <AlertDescription>
                  After changing your password, review active sessions and revoke unknown devices.
                </AlertDescription>
              </Alert>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Use the Sessions panel in Governance Security to invalidate stale browser sessions.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
