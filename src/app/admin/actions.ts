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
  const victimNames = getOptionalString(formData, "victim_names");
  const accusedNames = getOptionalString(formData, "accused_names");
  const locationCity = getOptionalString(formData, "location_city");
  const locationState = getOptionalString(formData, "location_state");
  const locationCountry =
    getOptionalString(formData, "location_country") ?? "United States";
  const incidentDate = getOptionalString(formData, "incident_date");

  const isFeatured =
    formData.get("is_featured") === "on" ||
    formData.get("featured") === "on";

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

  const { data: existingCase, error: existingCaseError } = await supabase
    .from("cases")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingCaseError) {
    return {
      error: existingCaseError.message,
    };
  }

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
      victim_names: victimNames,
      accused_names: accusedNames,
      location_city: locationCity,
      location_state: locationState,
      location_country: locationCountry,
      incident_date: incidentDate,
      is_featured: isFeatured,
      case_status: "draft",
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
  const victimNames = getOptionalString(formData, "victim_names");
  const accusedNames = getOptionalString(formData, "accused_names");
  const locationCity = getOptionalString(formData, "location_city");
  const locationState = getOptionalString(formData, "location_state");
  const locationCountry =
    getOptionalString(formData, "location_country") ?? "United States";
  const incidentDate = getOptionalString(formData, "incident_date");
  const isFeatured = formData.get("is_featured") === "on";
  const caseStatus = getRequiredString(formData, "case_status");

  if (!title) {
    return {
      error: "Please enter a case title.",
    };
  }

  if (
    !caseStatus ||
    !allowedStatuses.includes(caseStatus as CaseStatus)
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

  const { data: currentCase, error: currentCaseError } = await supabase
    .from("cases")
    .select("published_at")
    .eq("id", caseId)
    .maybeSingle();

  if (currentCaseError) {
    return {
      error: currentCaseError.message,
    };
  }

  if (!currentCase) {
    return {
      error: "The case could not be found.",
    };
  }

  const publishedAt =
    caseStatus === "published"
      ? currentCase.published_at ?? new Date().toISOString()
      : null;

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      title,
      subtitle,
      slug,
      summary,
      description,
      content_warning: contentWarning,
      victim_names: victimNames,
      accused_names: accusedNames,
      location_city: locationCity,
      location_state: locationState,
      location_country: locationCountry,
      incident_date: incidentDate,
      is_featured: isFeatured,
      case_status: caseStatus,
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

export async function archiveCase(caseId: string) {
  const { supabase, user } = await requireEditorialAccess();

  const { error } = await supabase
    .from("cases")
    .update({
      case_status: "archived",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (error) {
    throw new Error(`Unable to archive case: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/cases/${caseId}`);

  redirect("/admin");
}

export async function deleteCase(caseId: string) {
  const { supabase } = await requireEditorialAccess();

  const { error } = await supabase
    .from("cases")
    .delete()
    .eq("id", caseId);

  if (error) {
    throw new Error(`Unable to delete case: ${error.message}`);
  }

  revalidatePath("/admin");

  redirect("/admin");
}