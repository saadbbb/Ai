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
import { loginAction } from "../actions/login.action";
import { loginSchema } from "../validation/schemas";

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { rememberMe: false } });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await loginAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password}>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          </Field>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" {...register("rememberMe")} />
              Remember me
            </label>
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
