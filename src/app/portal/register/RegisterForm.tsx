"use client";

import { useActionState, useMemo, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFirstPasswordPolicyError,
  getPasswordRuleStates,
  getPasswordStrength,
} from "@/lib/passwordPolicy";

const initialState = { error: undefined as string | undefined };

export default function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const errors = useMemo(() => {
    const next: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!values.name.trim()) {
      next.name = "Full name is required.";
    } else if (values.name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
    }

    const email = values.email.trim();
    if (!email) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address.";
    }

    if (!values.password) {
      next.password = "Password is required.";
    } else {
      const passwordPolicyError = getFirstPasswordPolicyError(values.password);
      if (passwordPolicyError) {
        next.password = passwordPolicyError;
      }
    }

    if (!values.confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (values.confirmPassword !== values.password) {
      next.confirmPassword = "Passwords do not match.";
    }

    return next;
  }, [values]);

  const passwordRules = useMemo(
    () => getPasswordRuleStates(values.password),
    [values.password]
  );
  const passwordStrength = useMemo(
    () => getPasswordStrength(values.password),
    [values.password]
  );

  const showError = (
    field: "name" | "email" | "password" | "confirmPassword"
  ) =>
    (touched[field] || submitted) && errors[field];

  const hasErrors = Object.keys(errors).length > 0;
  const strengthPercent =
    (passwordStrength.score / passwordStrength.maxScore) * 100;
  const strengthColors: Record<
    ReturnType<typeof getPasswordStrength>["level"],
    { text: string; bar: string }
  > = {
    weak: { text: "text-red-600", bar: "bg-red-500" },
    medium: { text: "text-amber-600", bar: "bg-amber-500" },
    good: { text: "text-sky-600", bar: "bg-sky-500" },
    strong: { text: "text-emerald-600", bar: "bg-emerald-500" },
  };

  const features = [
    { icon: Palette, title: "Interior Design", desc: "Transform your spaces" },
    { icon: Home, title: "Architecture", desc: "Build your dreams" },
    { icon: Award, title: "Award Winning", desc: "Recognized excellence" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div
        className={cn(
          "hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden",
          "bg-gradient-to-br from-purple-600 via-primary to-pink-600"
        )}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-32 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-16 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        {/* Content */}
        <div className={cn(
          "relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white",
          "transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
        )}>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
              <span className="text-3xl font-bold">A</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ayra Design</h1>
              <p className="text-white/80 text-lg">Interior & Architecture</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Start Your
            <br />
            <span className="text-white/90">Journey</span>
          </h2>
          <p className="text-xl text-white/80 max-w-md mb-12 leading-relaxed">
            Create your account to submit enquiries, follow project progress, and manage payments securely.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20",
                  "transition-all duration-500 hover:bg-white/15 hover:scale-[1.02]",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
                style={{ transitionDelay: `${300 + i * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-white/70">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-gradient-to-b from-background to-muted/30">
        <div className={cn(
          "w-full max-w-lg",
          "transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">A</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ayra Design</h1>
              <p className="text-muted-foreground">Interior & Architecture</p>
            </div>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-6 pt-8 px-8">
              <CardTitle className="text-4xl font-bold tracking-tight">Create account</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Create your client account to get started with enquiries, progress tracking, and secure payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form
                action={formAction}
                className="space-y-5"
                onSubmit={(event) => {
                  setSubmitted(true);
                  if (hasErrors) {
                    event.preventDefault();
                  }
                }}
              >
                {state.error && (
                  <Alert variant="destructive" className="border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base">{state.error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label htmlFor="name" className="text-base font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={values.name}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, name: event.target.value }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    aria-invalid={!!showError("name")}
                    className={cn(
                      "h-14 text-lg px-4 transition-all duration-200",
                      "border-2 focus:ring-2 focus:ring-primary/20",
                      showError("name") && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                  {showError("name") && (
                    <p className="text-base text-destructive font-medium">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={values.email}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, email: event.target.value }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    aria-invalid={!!showError("email")}
                    className={cn(
                      "h-14 text-lg px-4 transition-all duration-200",
                      "border-2 focus:ring-2 focus:ring-primary/20",
                      showError("email") && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                  {showError("email") && (
                    <p className="text-base text-destructive font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-base font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Use uppercase, number, and symbol"
                      required
                      value={values.password}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, password: event.target.value }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      aria-invalid={!!showError("password")}
                      className={cn(
                        "h-14 text-lg px-4 pr-14 transition-all duration-200",
                        "border-2 focus:ring-2 focus:ring-primary/20",
                        showError("password") &&
                          "border-destructive focus-visible:ring-destructive/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {showError("password") && (
                    <p className="text-base text-destructive font-medium">
                      {errors.password}
                    </p>
                  )}
                  <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Password strength
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          strengthColors[passwordStrength.level].text
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          strengthColors[passwordStrength.level].bar
                        )}
                        style={{ width: `${strengthPercent}%` }}
                      />
                    </div>
                    <ul className="mt-3 grid gap-1.5">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.id}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            rule.met ? "text-emerald-700" : "text-muted-foreground"
                          )}
                        >
                          {rule.met ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          <span>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      required
                      value={values.confirmPassword}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, confirmPassword: true }))
                      }
                      aria-invalid={!!showError("confirmPassword")}
                      className={cn(
                        "h-14 text-lg px-4 pr-14 transition-all duration-200",
                        "border-2 focus:ring-2 focus:ring-primary/20",
                        showError("confirmPassword") &&
                          "border-destructive focus-visible:ring-destructive/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {showError("confirmPassword") && (
                    <p className="text-base text-destructive font-medium">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <RegisterSubmitButton disabled={hasErrors} />

                <p className="text-center text-base text-muted-foreground pt-2">
                  You’ll receive a 6-digit email verification code after submitting.
                </p>

                <p className="text-center text-base text-muted-foreground">
                  Already registered?{" "}
                  <Link
                    href="/portal/login"
                    className="font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            © 2026 Ayra Design (M) Sdn Bhd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-14 text-lg font-semibold gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Creating Account...
        </>
      ) : (
        <>
          Create Account
          <ArrowRight className="h-5 w-5" />
        </>
      )}
    </Button>
  );
}
