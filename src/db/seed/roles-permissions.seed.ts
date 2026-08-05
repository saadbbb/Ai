import { db } from "../client";
import { permissions } from "../schema/permissions";
import { rolePermissions } from "../schema/role-permissions";
import { roles } from "../schema/roles";

const PERMISSIONS = [
  { key: "workspace.manage", description: "Delete or transfer ownership of the workspace" },
  { key: "workspace.settings.view", description: "View workspace settings" },
  { key: "workspace.settings.manage", description: "Edit workspace settings" },
  { key: "workspace.members.view", description: "View workspace members" },
  { key: "workspace.members.invite", description: "Invite new workspace members" },
  { key: "workspace.members.manage", description: "Change member roles or remove members" },
  { key: "analytics.view", description: "View the Analytics & Business Intelligence dashboard" },
] as const;

const ROLES: Array<{ key: string; name: string; description: string; permissionKeys: string[] }> = [
  {
    key: "owner",
    name: "Owner",
    description: "Full control over the workspace",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manages settings and members",
    permissionKeys: [
      "workspace.settings.view",
      "workspace.settings.manage",
      "workspace.members.view",
      "workspace.members.invite",
      "workspace.members.manage",
      "analytics.view",
    ],
  },
  {
    key: "manager",
    name: "Manager",
    description: "Manages day-to-day operations and invites team members",
    permissionKeys: [
      "workspace.settings.view",
      "workspace.members.view",
      "workspace.members.invite",
      "analytics.view",
    ],
  },
  {
    key: "agent",
    name: "Agent",
    description: "Handles conversations and daily work",
    permissionKeys: ["workspace.settings.view", "workspace.members.view"],
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissionKeys: ["workspace.settings.view"],
  },
];

async function seed() {
  console.log("Seeding permissions...");
  for (const permission of PERMISSIONS) {
    await db.insert(permissions).values(permission).onConflictDoNothing({ target: permissions.key });
  }

  console.log("Seeding roles...");
  for (const role of ROLES) {
    await db
      .insert(roles)
      .values({ key: role.key, name: role.name, description: role.description, isSystem: true })
      .onConflictDoNothing({ target: roles.key });
  }

  console.log("Linking role permissions...");
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  for (const role of ROLES) {
    const roleRow = allRoles.find((r) => r.key === role.key);
    if (!roleRow) continue;

    for (const permissionKey of role.permissionKeys) {
      const permissionRow = allPermissions.find((p) => p.key === permissionKey);
      if (!permissionRow) continue;

      await db
        .insert(rolePermissions)
        .values({ roleId: roleRow.id, permissionId: permissionRow.id })
        .onConflictDoNothing();
    }
  }

  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
