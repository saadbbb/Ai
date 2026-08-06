"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Primary sign-in path per the spec (PART 3) — code-ready but only works once
 * Google is enabled as a provider in the Supabase dashboard (Authentication ->
 * Providers -> Google), which itself needs a Google Cloud OAuth client. See
 * DEFERRED_TASKS.md. Until then this redirects to Google and Supabase returns
 * an error on the way back, surfaced as a toast rather than a crash.
 */
export function GoogleSignInButton() {
  const t = useTranslations("auth.google");
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleClick() {
    setIsRedirecting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      toast.error(error.message);
      setIsRedirecting(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" disabled={isRedirecting} onClick={handleClick}>
      {isRedirecting ? t("redirecting") : t("continueWithGoogle")}
    </Button>
  );
}
