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
import { registerAction } from "../actions/register.action";
import { registerSchema } from "../validation/schemas";

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await registerAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>We&apos;ll send a verification code to your email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending code..." : "Continue"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
