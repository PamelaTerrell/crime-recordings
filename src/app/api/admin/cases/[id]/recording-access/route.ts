import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_STRATEGIES = new Set([
  "fully_free",
  "free_sample",
  "members_only",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    const { data: role, error: roleError } =
      await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        { error: "Unable to verify permissions." },
        { status: 500 },
      );
    }

    if (
      role?.role !== "admin" &&
      role?.role !== "editor"
    ) {
      return NextResponse.json(
        { error: "You do not have permission." },
        { status: 403 },
      );
    }

    const { id: caseId } = await context.params;

    const body = await request.json();

    const strategy = body.strategy;
    const freeRecordingId = body.freeRecordingId;

    if (
      typeof strategy !== "string" ||
      !VALID_STRATEGIES.has(strategy)
    ) {
      return NextResponse.json(
        { error: "Invalid access strategy." },
        { status: 400 },
      );
    }

    if (
      freeRecordingId != null &&
      typeof freeRecordingId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid recording selection." },
        { status: 400 },
      );
    }

    if (
      strategy === "free_sample" &&
      (!freeRecordingId || !freeRecordingId.trim())
    ) {
      return NextResponse.json(
        { error: "Please select a free recording." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.rpc(
      "set_case_recording_access_strategy",
      {
        p_case_id: caseId,
        p_strategy: strategy,
        p_free_recording_id:
          typeof freeRecordingId === "string"
            ? freeRecordingId
            : null,
      },
    );

    if (error) {
      console.error(
        "Unable to update recording access:",
        error,
      );

      return NextResponse.json(
        { error: "Unable to save recording access." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Unexpected recording access error:",
      error,
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
