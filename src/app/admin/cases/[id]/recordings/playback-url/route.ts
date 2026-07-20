import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

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
        {
          error: `Unable to verify account role: ${roleError.message}`,
        },
        { status: 500 },
      );
    }

    if (
      roleRecord?.role !== "admin" &&
      roleRecord?.role !== "editor"
    ) {
      return NextResponse.json(
        {
          error: "You do not have permission to play this recording.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const recordingId =
      typeof body.recordingId === "string"
        ? body.recordingId.trim()
        : "";

    if (!recordingId) {
      return NextResponse.json(
        { error: "A recording ID is required." },
        { status: 400 },
      );
    }

    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select(`
        id,
        title,
        full_object_key,
        mime_type
      `)
      .eq("id", recordingId)
      .maybeSingle();

    if (recordingError) {
      return NextResponse.json(
        { error: recordingError.message },
        { status: 500 },
      );
    }

    if (!recording) {
      return NextResponse.json(
        { error: "The recording could not be found." },
        { status: 404 },
      );
    }

    if (!recording.full_object_key) {
      return NextResponse.json(
        { error: "This recording does not have an audio file." },
        { status: 404 },
      );
    }

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: recording.full_object_key,
      ResponseContentType:
        recording.mime_type ?? "application/octet-stream",
      ResponseContentDisposition: "inline",
    });

    const playbackUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 60 * 60,
    });

    return NextResponse.json({
      playbackUrl,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    console.error("Unable to create playback URL:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The playback URL could not be created.",
      },
      { status: 500 },
    );
  }
}