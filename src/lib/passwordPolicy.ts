type PasswordRuleDefinition = {
  id: "length" | "uppercase" | "lowercase" | "number" | "symbol";
  label: string;
  message: string;
  test: (value: string) => boolean;
};

const PASSWORD_RULES: PasswordRuleDefinition[] = [
  {
    id: "length",
    label: "At least 8 characters",
    message: "Password must be at least 8 characters.",
    test: (value) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    message: "Password must include at least one uppercase letter.",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter",
    message: "Password must include at least one lowercase letter.",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "At least 1 number",
    message: "Password must include at least one number.",
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: "symbol",
    label: "At least 1 symbol (e.g. !@#$)",
    message: "Password must include at least one special symbol.",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export type PasswordRuleState = {
  id: PasswordRuleDefinition["id"];
  label: string;
  message: string;
  met: boolean;
};

export type PasswordStrengthLevel = "weak" | "medium" | "good" | "strong";

export function getPasswordRuleStates(password: string): PasswordRuleState[] {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    message: rule.message,
    met: rule.test(password),
  }));
}

export function getFirstPasswordPolicyError(password: string): string | null {
  const unmetRule = getPasswordRuleStates(password).find((rule) => !rule.met);
  return unmetRule?.message ?? null;
}

export function getPasswordStrength(password: string): {
  level: PasswordStrengthLevel;
  label: string;
  score: number;
  maxScore: number;
} {
  const score = getPasswordRuleStates(password).filter((rule) => rule.met).length;
  const maxScore = PASSWORD_RULES.length;
  let level: PasswordStrengthLevel = "weak";

  if (score >= 5) {
    level = "strong";
  } else if (score >= 4) {
    level = "good";
  } else if (score >= 3) {
    level = "medium";
  }

  return {
    level,
    label: level[0].toUpperCase() + level.slice(1),
    score,
    maxScore,
  };
}
