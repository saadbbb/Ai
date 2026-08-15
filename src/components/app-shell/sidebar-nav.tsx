import { NavGroupList, type NavGroupItem } from "./nav-group-list";

export type { NavLinkItem, NavGroupItem } from "./nav-group-list";

export function SidebarNav({ groups }: { groups: NavGroupItem[] }) {
  return <NavGroupList groups={groups} />;
}
