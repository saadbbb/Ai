import { Button } from "@/components/ui/button";
import { logoutAction } from "../actions/logout.action";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Log out
      </Button>
    </form>
  );
}
