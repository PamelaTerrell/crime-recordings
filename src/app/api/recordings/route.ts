import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const allowedAccessLevels = new Set(["public", "member"]);

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function removeUploadedObject(objectKey: string) {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
      }),
    );
  } catch (error) {
    console.error("Unable to remove orphaned R2 object:", error);
  }
}

export async function POST(request: Request) {
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

    const { data: roleRecord, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        { error: `Unable to verify account role: ${roleError.message}` },
        { status: 500 },
      );
    }

    if (
      roleRecord?.role !== "admin" &&
      roleRecord?.role !== "editor"
    ) {
      return NextResponse.json(
        { error: "You do not have permission to add recordings." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const caseId =
      typeof body.caseId === "string" ? body.caseId.trim() : "";

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const recordingType =
      typeof body.recordingType === "string"
        ? body.recordingType.trim()
        : "";

    const accessLevel =
      typeof body.accessLevel === "string"
        ? body.accessLevel.trim()
        : "";

    const objectKey =
      typeof body.objectKey === "string" ? body.objectKey.trim() : "";

    const originalFilename =
      typeof body.originalFilename === "string"
        ? body.originalFilename.trim()
        : "";

    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType.trim() : "";

    const fileSizeBytes =
      typeof body.fileSizeBytes === "number"
        ? body.fileSizeBytes
        : null;

    const isPublished = body.isPublished === true;

    if (!caseId) {
      return NextResponse.json(
        { error: "A case ID is required." },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Please enter a recording title." },
        { status: 400 },
      );
    }

    if (!recordingType) {
      return NextResponse.json(
        { error: "Please select a recording type." },
        { status: 400 },
      );
    }

    if (!allowedAccessLevels.has(accessLevel)) {
      return NextResponse.json(
        { error: "Please select a valid access level." },
        { status: 400 },
      );
    }

    if (!objectKey) {
      return NextResponse.json(
        { error: "The uploaded audio object key is missing." },
        { status: 400 },
      );
    }

    const expectedPrefix = `cases/${caseId}/recordings/`;

    if (!objectKey.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "The uploaded object does not belong to this case." },
        { status: 400 },
      );
    }

    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        { error: caseError.message },
        { status: 500 },
      );
    }

    if (!caseRecord) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        { error: "The selected case could not be found." },
        { status: 404 },
      );
    }

    const baseSlug = createSlug(title) || "audio-recording";

    const { data: matchingRecording, error: slugError } = await supabase
      .from("recordings")
      .select("id")
      .eq("case_id", caseId)
      .eq("slug", baseSlug)
      .maybeSingle();

    if (slugError) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        { error: slugError.message },
        { status: 500 },
      );
    }

    const slug = matchingRecording
      ? `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
      : baseSlug;

    const publishedAt = isPublished
      ? new Date().toISOString()
      : null;

    const { data: recording, error: insertError } = await supabase
      .from("recordings")
      .insert({
        case_id: caseId,
        slug,
        title,
        recording_type: recordingType,
        access_level: accessLevel,
        full_object_key: objectKey,
        original_filename: originalFilename || null,
        mime_type: mimeType || null,
        file_size_bytes: fileSizeBytes,
        is_published: isPublished,
        published_at: publishedAt,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !recording) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            insertError?.message ??
            "The recording could not be saved.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      recordingId: recording.id,
    });
  } catch (error) {
    console.error("Unable to save recording:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The recording could not be saved.",
      },
      { status: 500 },
    );
  }
}