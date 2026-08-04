"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeRegistrationAction } from "../actions/complete-registration.action";
import { verifyRegistrationOtpAction } from "../actions/verify-otp.action";

const otpStepSchema = z.object({ code: z.string().length(6, "Enter the 6-digit code.") });

const passwordStepSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    acceptTerms: z.boolean(),
  })
  .refine((data) => data.acceptTerms, {
    message: "You must accept the terms to continue.",
    path: ["acceptTerms"],
  });

type OtpStepInput = z.infer<typeof otpStepSchema>;
type PasswordStepInput = z.infer<typeof passwordStepSchema>;

export function VerifyRegistrationForm({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpForm = useForm<OtpStepInput>({ resolver: zodResolver(otpStepSchema) });
  const passwordForm = useForm<PasswordStepInput>({
    resolver: zodResolver(passwordStepSchema),
    defaultValues: { acceptTerms: false },
  });

  const onSubmitOtp = otpForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await verifyRegistrationOtpAction({ email, code: values.code });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setStep("password");
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await completeRegistrationAction({
      email,
      password: values.password,
      acceptTerms: values.acceptTerms,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Account created!");
    router.push("/dashboard");
    router.refresh();
  });

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing email</CardTitle>
          <CardDescription>Start the registration process again from the sign-up page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (step === "otp") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>Enter the 6-digit code we sent to {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <Field label="Verification code" htmlFor="code" error={otpForm.formState.errors.code}>
              <Input id="code" inputMode="numeric" maxLength={6} {...otpForm.register("code")} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a password</CardTitle>
        <CardDescription>Choose a password for {email}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmitPassword} className="space-y-4">
          <Field label="Password" htmlFor="password" error={passwordForm.formState.errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("password")}
            />
          </Field>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1" {...passwordForm.register("acceptTerms")} />
              <span>I agree to the Terms of Service and Privacy Policy.</span>
            </label>
            {passwordForm.formState.errors.acceptTerms && (
              <p className="text-sm text-destructive">{passwordForm.formState.errors.acceptTerms.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
