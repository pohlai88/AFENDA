export class AuthAdapterError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AuthAdapterError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class MfaRequiredError extends Error {
  constructor(public mfaToken: string, message = "MFA required") {
    super(message);
    this.name = "MfaRequiredError";
  }
}
