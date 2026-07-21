import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const MEMBER_ACCESS_STATUSES = new Set([
  "trialing",
  "active",
]);

function subscriptionHasAccess(
  status: string,
  currentPeriodEnd: string | null,
) {
  if (!MEMBER_ACCESS_STATUSES.has(status)) {
    return false;
  }

  if (!currentPeriodEnd) {
    return true;
  }

  const periodEnd = new Date(currentPeriodEnd);

  if (Number.isNaN(periodEnd.getTime())) {
    return false;
  }

  return periodEnd.getTime() > Date.now();
}

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

    const { data: recording, error: recordingError } =
      await supabase
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

    if (recordingError) {
      return NextResponse.json(
        { error: recordingError.message },
        { status: 500 },
      );
    }

    if (!recording || !recording.is_published) {
      return NextResponse.json(
        { error: "The recording could not be found." },
        { status: 404 },
      );
    }

    if (recording.access_level === "member") {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          {
            error:
              "Please sign in to access this members-only recording.",
            requiresSignIn: true,
          },
          { status: 401 },
        );
      }

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .select(
          `
            status,
            current_period_end
          `,
        )
        .eq("user_id", user.id)
        .in("status", ["trialing", "active"])
        .order("current_period_end", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.error(
          "Unable to verify subscription:",
          subscriptionError,
        );

        return NextResponse.json(
          {
            error:
              "Your membership status could not be verified.",
          },
          { status: 500 },
        );
      }

      const hasMemberAccess =
        subscription !== null &&
        subscriptionHasAccess(
          subscription.status,
          subscription.current_period_end,
        );

      if (!hasMemberAccess) {
        return NextResponse.json(
          {
            error:
              "An active membership is required to access this recording.",
            requiresMembership: true,
          },
          { status: 403 },
        );
      }
    } else if (recording.access_level !== "public") {
      return NextResponse.json(
        {
          error:
            "This recording is not currently available.",
        },
        { status: 403 },
      );
    }

    if (!recording.full_object_key) {
      return NextResponse.json(
        {
          error:
            "This recording does not have a media file.",
        },
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
      "Unable to create playback URL:",
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