import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";

const headers = {
  "Cache-Control": "public, max-age=60",
};

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    // Only published recordings belonging to published cases
    // are eligible for public thumbnail previews.
    const { data: catalogRecord, error: catalogError } =
      await supabaseAdmin
        .from("public_recording_catalog")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (catalogError) {
      console.error("Thumbnail catalog lookup failed:", catalogError);
      return NextResponse.json(
        { error: "Unable to load thumbnail." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!catalogRecord) {
      return NextResponse.json(
        { error: "Thumbnail not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: recording, error: recordingError } =
      await supabaseAdmin
        .from("recordings")
        .select("thumbnail_object_key")
        .eq("id", id)
        .single();

    if (recordingError || !recording?.thumbnail_object_key) {
      return NextResponse.json(
        { error: "Thumbnail not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const url = await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: r2BucketName,
        Key: recording.thumbnail_object_key,
        ResponseContentDisposition: "inline",
      }),
      { expiresIn: 15 * 60 },
    );

    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", headers["Cache-Control"]);
    return response;
  } catch (error) {
    console.error("Public recording thumbnail error:", error);
    return NextResponse.json(
      { error: "Unable to load thumbnail." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
