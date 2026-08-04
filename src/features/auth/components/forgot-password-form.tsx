"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "../actions/forgot-password.action";
import { requestPasswordResetSchema } from "../validation/schemas";

type RequestResetInput = z.infer<typeof requestPasswordResetSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await requestPasswordResetAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>We&apos;ll send a code to reset your password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending code..." : "Send code"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
