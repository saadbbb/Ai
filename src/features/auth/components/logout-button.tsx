import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { logoutAction } from "../actions/logout.action";

export async function LogoutButton() {
  const t = await getTranslations("auth");

  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        {t("logout")}
      </Button>
    </form>
  );
}
