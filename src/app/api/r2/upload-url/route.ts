import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2BucketName, r2Client } from "@/lib/r2";

const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
]);

function sanitizeFilename(filename: string) {
  const extension = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";

  const nameWithoutExtension = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${nameWithoutExtension || "audio-recording"}${extension}`;
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
        { error: "You do not have permission to upload recordings." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const caseId =
      typeof body.caseId === "string" ? body.caseId.trim() : "";

    const filename =
      typeof body.filename === "string" ? body.filename.trim() : "";

    const contentType =
      typeof body.contentType === "string"
        ? body.contentType.trim().toLowerCase()
        : "";

    if (!caseId) {
      return NextResponse.json(
        { error: "A case ID is required." },
        { status: 400 },
      );
    }

    if (!filename) {
      return NextResponse.json(
        { error: "A filename is required." },
        { status: 400 },
      );
    }

    if (!allowedAudioTypes.has(contentType)) {
      return NextResponse.json(
        {
          error:
            "Please select a supported audio file such as MP3, M4A, WAV, AAC, OGG, or FLAC.",
        },
        { status: 400 },
      );
    }

    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      return NextResponse.json(
        { error: caseError.message },
        { status: 500 },
      );
    }

    if (!caseRecord) {
      return NextResponse.json(
        { error: "The selected case could not be found." },
        { status: 404 },
      );
    }

    const safeFilename = sanitizeFilename(filename);
    const objectKey = `cases/${caseId}/recordings/${crypto.randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60,
    });

    return NextResponse.json({
      uploadUrl,
      objectKey,
      originalFilename: filename,
      contentType,
    });
  } catch (error) {
    console.error("Unable to create R2 upload URL:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The upload URL could not be created.",
      },
      { status: 500 },
    );
  }
}