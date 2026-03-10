/**
 * Password strength calculator and validator
 * Returns strength score 0-4 and feedback
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Fair" | "Good" | "Strong" | "Excellent";
  feedback: string[];
  percentage: number;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Weak",
      feedback: ["Enter a password"],
      percentage: 0,
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check (most important)
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length < 8) feedback.push("Use at least 8 characters");

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (varietyCount >= 3) score++;
  if (varietyCount >= 4) score++;

  if (!hasLower || !hasUpper) feedback.push("Mix uppercase and lowercase");
  if (!hasNumber) feedback.push("Include numbers");
  if (!hasSpecial) feedback.push("Add special characters (!@#$%)");

  // Common patterns (reduce score)
  const commonPatterns = [
    /^123|456|789|abc/i,
    /password|admin|user/i,
    /^qwert|asdf|zxcv/i,
  ];
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score = Math.max(0, score - 1);
    feedback.push("Avoid common patterns");
  }

  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    feedback.push("Avoid repeated characters");
  }

  const labels: Array<"Weak" | "Fair" | "Good" | "Strong" | "Excellent"> = [
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Excellent",
  ];

  // Clamp score to valid range [0, 4]
  const clampedScore = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;

  return {
    score: clampedScore,
    label: labels[clampedScore]!,
    feedback: feedback.length > 0 ? feedback.slice(0, 2) : ["Great password!"],
    percentage: (clampedScore / 4) * 100,
  };
}

export function getPasswordStrengthColor(score: number): string {
  if (score === 0) return "hsl(var(--destructive))";
  if (score === 1) return "hsl(var(--warning))";
  if (score === 2) return "hsl(var(--warning))";
  if (score === 3) return "hsl(var(--success))";
  return "hsl(var(--success))";
}
