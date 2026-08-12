"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { onboardingService } from "../services/onboarding.service";

/** No existing upload infra in the app — this is the first Supabase Storage consumer. Public bucket: logos are shown to storefront customers. */
export const LOGO_BUCKET = "workspace-logos";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadLogoAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionValidationError("Choose an image to upload.");
  }
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return actionValidationError("Only PNG, JPG, or WEBP images are allowed.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    return actionValidationError("Image must be smaller than 5MB.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const admin = createSupabaseAdminClient();

    // Idempotent — lazily provisions the bucket on first-ever logo upload rather
    // than requiring a manual dashboard step; safe to call on every upload.
    const { error: bucketError } = await admin.storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: MAX_LOGO_BYTES,
    });
    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
      throw new Error(bucketError.message);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${workspace.id}/logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(LOGO_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);

    await onboardingService.saveLogo(workspace.id, workspace, publicUrl);
    return actionOk({ url: publicUrl });
  } catch (error) {
    return actionFail(error);
  }
}
