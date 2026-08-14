"use server";

import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AD_IMAGE_BUCKET = "storefront-ad-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadStorefrontAdImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionValidationError("Choose an image to upload.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return actionValidationError("Only PNG, JPG, or WEBP images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return actionValidationError("Image must be smaller than 5MB.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const admin = createSupabaseAdminClient();

    const { error: bucketError } = await admin.storage.createBucket(AD_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
    });
    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
      throw new Error(bucketError.message);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${workspace.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(AD_IMAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = admin.storage.from(AD_IMAGE_BUCKET).getPublicUrl(path);

    return actionOk({ url: publicUrl });
  } catch (error) {
    return actionFail(error);
  }
}
