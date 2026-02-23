"use client";

import { useActionState, useMemo, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "../actions";
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
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState = { error: undefined as string | undefined };

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const errors = useMemo(() => {
    const next: { email?: string; password?: string } = {};
    const email = values.email.trim();
    if (!email) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address.";
    }

    if (!values.password) {
      next.password = "Password is required.";
    } else if (values.password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    return next;
  }, [values]);

  const showError = (field: "email" | "password") =>
    (touched[field] || submitted) && errors[field];

  const hasErrors = Object.keys(errors).length > 0;

  const features = [
    { icon: Shield, title: "Secure Escrow", desc: "Protected payment milestones" },
    { icon: Users, title: "Project Tracking", desc: "Follow updates anytime" },
    { icon: Sparkles, title: "Design Support", desc: "Guidance at every stage" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div
        className={cn(
          "hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden",
          "bg-gradient-to-br from-primary via-primary/90 to-purple-700"
        )}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
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
            Welcome
            <br />
            <span className="text-white/90">Back</span>
          </h2>
          <p className="text-xl text-white/80 max-w-md mb-12 leading-relaxed">
            Sign in to manage your enquiries, track payment progress, and stay updated on your project journey.
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
              <CardTitle className="text-4xl font-bold tracking-tight">Sign in</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Access your enquiries, payments, and project updates in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form
                action={formAction}
                className="space-y-6"
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
                  <Label htmlFor="email" className="text-base font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    spellCheck={false}
                    required
                    value={values.email}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, email: event.target.value }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    aria-invalid={!!showError("email")}
                    aria-describedby={showError("email") ? "login-email-error" : undefined}
                    className={cn(
                      "h-14 text-lg px-4 transition-all duration-200",
                      "border-2 focus:ring-2 focus:ring-primary/20",
                      showError("email") && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                  {showError("email") && (
                    <p id="login-email-error" className="text-base text-destructive font-medium">
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
                      autoComplete="current-password"
                      required
                      value={values.password}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, password: true }))
                      }
                      aria-invalid={!!showError("password")}
                      aria-describedby={
                        showError("password") ? "login-password-error" : undefined
                      }
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
                    <p id="login-password-error" className="text-base text-destructive font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>

                <LoginSubmitButton disabled={hasErrors} />

                <p className="text-center text-base text-muted-foreground pt-4">
                  New here?{" "}
                  <Link
                    href="/portal/register"
                    className="font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    Create an account
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

function LoginSubmitButton({ disabled }: { disabled: boolean }) {
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
          Signing In...
        </>
      ) : (
        <>
          Sign In
          <ArrowRight className="h-5 w-5" />
        </>
      )}
    </Button>
  );
}
