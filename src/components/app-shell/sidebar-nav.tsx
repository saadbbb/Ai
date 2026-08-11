import { NavLink } from "./nav-link";

export interface NavLinkItem {
  href: string;
  label: string;
}

export interface NavGroupItem {
  heading?: string;
  links: NavLinkItem[];
}

export function SidebarNav({ groups }: { groups: NavGroupItem[] }) {
  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.heading ?? group.links[0]?.href} className="space-y-0.5">
          {group.heading && (
            <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.heading}
            </p>
          )}
          {group.links.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      ))}
    </nav>
  );
}
