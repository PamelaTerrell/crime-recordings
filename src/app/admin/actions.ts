"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CaseFormState = {
  error?: string;
};

function cleanOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCase(
  _previousState: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRecord } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRecord?.role;

  if (role !== "admin" && role !== "editor") {
    return {
      error: "You do not have permission to create cases.",
    };
  }

  const titleValue = formData.get("title");
  const slugValue = formData.get("slug");
  const incidentDateValue = formData.get("incident_date");
  const featuredValue = formData.get("is_featured");

  const title =
    typeof titleValue === "string" ? titleValue.trim() : "";

  const requestedSlug =
    typeof slugValue === "string" ? slugValue.trim() : "";

  const slug = createSlug(requestedSlug || title);

  if (!title) {
    return {
      error: "Please enter a case title.",
    };
  }

  if (!slug) {
    return {
      error: "Please enter a valid title or slug.",
    };
  }

  const incidentDate =
    typeof incidentDateValue === "string" &&
    incidentDateValue.trim().length > 0
      ? incidentDateValue
      : null;

  const { data: createdCase, error } = await supabase
    .from("cases")
    .insert({
      title,
      slug,
      subtitle: cleanOptionalText(formData.get("subtitle")),
      summary: cleanOptionalText(formData.get("summary")),
      description: cleanOptionalText(formData.get("description")),
      location_city: cleanOptionalText(formData.get("location_city")),
      location_state: cleanOptionalText(formData.get("location_state")),
      location_country:
        cleanOptionalText(formData.get("location_country")) ??
        "United States",
      incident_date: incidentDate,
      content_warning: cleanOptionalText(
        formData.get("content_warning"),
      ),
      case_status: "draft",
      is_featured: featuredValue === "on",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Unable to create case:", error);

    if (error.code === "23505") {
      return {
        error:
          "That slug is already being used. Please choose a different one.",
      };
    }

    return {
      error:
        "The case could not be saved. Please review the information and try again.",
    };
  }

  revalidatePath("/admin");

  redirect(`/admin/cases/${createdCase.id}`);
}