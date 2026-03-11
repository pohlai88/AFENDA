/**
 * MockAfendaAuthService — fake implementation for testing.
 *
 * Does NOT hardcode passwords or tokens. Returns ok: false for all operations
 * unless the mock stack owns invite issuance and user creation consistently.
 * Use MOCK_AUTH=1 when you need a stub that never pretends to succeed.
 */

import type {
  AcceptInviteInput,
  AcceptInviteResult,
  ActionResult,
  AfendaAuthService,
  ResetPasswordInput,
  SignUpInput,
  SignUpResult,
  VerifyCredentialsInput,
  VerifyCredentialsResult,
  VerifyInviteTokenResult,
  VerifyMfaInput,
  VerifyMfaResult,
  VerifyResetTokenResult,
} from "./afenda-auth.types";

const MOCK_NOT_AVAILABLE = "AUTH_MOCK_NOT_AVAILABLE";
const MOCK_MESSAGE = "Auth mock does not own user/invite state. Use API or set up mock data.";

export class MockAfendaAuthService implements AfendaAuthService {
  async verifyCredentials(_input: VerifyCredentialsInput): Promise<VerifyCredentialsResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async verifyResetToken(_input: { token: string }): Promise<VerifyResetTokenResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async resetPassword(_input: ResetPasswordInput): Promise<ActionResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async verifyInviteToken(_input: { token: string }): Promise<VerifyInviteTokenResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async acceptInvite(_input: AcceptInviteInput): Promise<AcceptInviteResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async verifyMfaChallenge(_input: VerifyMfaInput): Promise<VerifyMfaResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }

  async signUp(_input: SignUpInput): Promise<SignUpResult> {
    return { ok: false, code: MOCK_NOT_AVAILABLE, message: MOCK_MESSAGE };
  }
}
