"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CaseFormState = {
  error?: string;
};

const allowedStatuses = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
] as const;

type CaseStatus = (typeof allowedStatuses)[number];

function getRequiredString(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function getOptionalString(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireEditorialAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    throw new Error(`Unable to verify account role: ${roleError.message}`);
  }

  if (
    roleRecord?.role !== "admin" &&
    roleRecord?.role !== "editor"
  ) {
    redirect("/account");
  }

  return {
    supabase,
    user,
  };
}

export async function createCase(
  _previousState: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const { supabase, user } = await requireEditorialAccess();

  const title = getRequiredString(formData, "title");
  const subtitle = getOptionalString(formData, "subtitle");
  const requestedSlug = getOptionalString(formData, "slug");
  const summary = getOptionalString(formData, "summary");
  const description = getOptionalString(formData, "description");
  const contentWarning = getOptionalString(formData, "content_warning");
  const locationCity = getOptionalString(formData, "location_city");
  const locationState = getOptionalString(formData, "location_state");
  const locationCountry =
    getOptionalString(formData, "location_country") ?? "United States";
  const incidentDate = getOptionalString(formData, "incident_date");
  const featured = formData.get("featured") === "on";

  if (!title) {
    return {
      error: "Please enter a case title.",
    };
  }

  const slug = createSlug(requestedSlug ?? title);

  if (!slug) {
    return {
      error: "Please enter a title or slug containing letters or numbers.",
    };
  }

  const { data: existingCase } = await supabase
    .from("cases")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingCase) {
    return {
      error: "That case slug is already in use. Please choose another one.",
    };
  }

  const { data: createdCase, error: insertError } = await supabase
    .from("cases")
    .insert({
      title,
      subtitle,
      slug,
      summary,
      description,
      content_warning: contentWarning,
      location_city: locationCity,
      location_state: locationState,
      location_country: locationCountry,
      incident_date: incidentDate,
      featured,
      status: "draft",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !createdCase) {
    return {
      error:
        insertError?.message ??
        "The case could not be created. Please try again.",
    };
  }

  revalidatePath("/admin");
  redirect(`/admin/cases/${createdCase.id}`);
}

export async function updateCase(
  caseId: string,
  _previousState: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const { supabase, user } = await requireEditorialAccess();

  const title = getRequiredString(formData, "title");
  const subtitle = getOptionalString(formData, "subtitle");
  const requestedSlug = getOptionalString(formData, "slug");
  const summary = getOptionalString(formData, "summary");
  const description = getOptionalString(formData, "description");
  const contentWarning = getOptionalString(formData, "content_warning");
  const locationCity = getOptionalString(formData, "location_city");
  const locationState = getOptionalString(formData, "location_state");
  const locationCountry =
    getOptionalString(formData, "location_country") ?? "United States";
  const incidentDate = getOptionalString(formData, "incident_date");
  const featured = formData.get("featured") === "on";
  const statusValue = getRequiredString(formData, "status");

  if (!title) {
    return {
      error: "Please enter a case title.",
    };
  }

  if (
    !statusValue ||
    !allowedStatuses.includes(statusValue as CaseStatus)
  ) {
    return {
      error: "Please select a valid case status.",
    };
  }

  const slug = createSlug(requestedSlug ?? title);

  if (!slug) {
    return {
      error: "Please enter a title or slug containing letters or numbers.",
    };
  }

  const { data: duplicateCase, error: duplicateError } = await supabase
    .from("cases")
    .select("id")
    .eq("slug", slug)
    .neq("id", caseId)
    .maybeSingle();

  if (duplicateError) {
    return {
      error: duplicateError.message,
    };
  }

  if (duplicateCase) {
    return {
      error: "That case slug is already in use. Please choose another one.",
    };
  }

  const publishedAt =
    statusValue === "published" ? new Date().toISOString() : null;

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      title,
      subtitle,
      slug,
      summary,
      description,
      content_warning: contentWarning,
      location_city: locationCity,
      location_state: locationState,
      location_country: locationCountry,
      incident_date: incidentDate,
      featured,
      status: statusValue,
      published_at: publishedAt,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (updateError) {
    return {
      error: updateError.message,
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath(`/admin/cases/${caseId}/edit`);

  redirect(`/admin/cases/${caseId}`);
}