import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    const supabase = await createClient();

    const { data: recording, error } = await supabase
      .from("recordings")
      .select(
        `
          id,
          title,
          mime_type,
          full_object_key,
          access_level,
          is_published
        `,
      )
      .eq("id", recordingId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    if (!recording || !recording.is_published) {
      return NextResponse.json(
        { error: "The recording could not be found." },
        { status: 404 },
      );
    }

    if (recording.access_level !== "public") {
      return NextResponse.json(
        {
          error:
            "This recording is available to members only.",
          requiresMembership: true,
        },
        { status: 403 },
      );
    }

    if (!recording.full_object_key) {
      return NextResponse.json(
        { error: "This recording does not have a media file." },
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

    const playbackUrl = await getSignedUrl(
      r2Client,
      command,
      {
        expiresIn: 60 * 60,
      },
    );

    return NextResponse.json({
      playbackUrl,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    console.error(
      "Unable to create public playback URL:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The recording could not be prepared.",
      },
      { status: 500 },
    );
  }
}