import { z } from "zod";
import { isPortalType } from "./portal-registry";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
  callbackUrl: z.string().optional(),
});

export const portalSignInSchema = signInSchema.extend({
  portal: z.string().refine(isPortalType, {
    message: "Invalid portal.",
  }),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Please enter your full name.").max(120),
    companyName: z.string().trim().min(1, "Please enter your company name.").max(160),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(256),
    confirmPassword: z.string().min(8, "Please confirm your password."),
    callbackUrl: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Missing reset token."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const verifySchema = z.object({
  code: z
    .string()
    .min(6, "Verification code must be 6 digits.")
    .max(8, "Verification code is too long."),
  callbackUrl: z.string().optional(),
  mfaToken: z.string().min(1, "Missing MFA token."),
});

export const inviteAcceptSchema = z
  .object({
    token: z.string().min(1, "Missing invitation token."),
    name: z.string().min(2, "Please enter your full name."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm your password."),
    callbackUrl: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type PortalSignInInput = z.infer<typeof portalSignInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
