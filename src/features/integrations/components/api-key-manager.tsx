"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiKey } from "@/db/schema";
import { createApiKeyAction } from "../actions/create-api-key.action";
import { revokeApiKeyAction } from "../actions/revoke-api-key.action";

export function ApiKeyManager({ initialApiKeys }: { initialApiKeys: ApiKey[] }) {
  const t = useTranslations("integrations.apiKeys");
  const tCommon = useTranslations("common");
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;

    setIsCreating(true);
    const result = await createApiKeyAction({ name: name.trim() });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setApiKeys((current) => [result.data.apiKey, ...current]);
    setRevealedKey(result.data.plaintext);
    setName("");
  }

  async function handleRevoke(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await revokeApiKeyAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setApiKeys((current) => current.map((key) => (key.id === id ? result.data : key)));
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">{t("heading")}</p>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {revealedKey && (
          <div className="space-y-1 rounded-md bg-muted p-2 text-xs">
            <p className="text-muted-foreground">{t("revealHint")}</p>
            <code className="block break-all">{revealedKey}</code>
          </div>
        )}

        <div className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} />
          <Button type="button" disabled={isCreating} onClick={handleCreate}>
            {isCreating ? t("creating") : t("create")}
          </Button>
        </div>

        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {key.keyPrefix}… · {key.revokedAt ? t("revoked") : t("active")}
                  </p>
                </div>
                {!key.revokedAt && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRevoke(key.id)}>
                    {t("revoke")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
