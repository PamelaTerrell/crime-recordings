import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { r2BucketName, r2Client } from "@/lib/r2";

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

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await params;

    const imageId =
      typeof id === "string" ? id.trim() : "";

    if (!imageId) {
      return NextResponse.json(
        { error: "An image ID is required." },
        { status: 400 },
      );
    }

    const { data: image, error: imageError } =
      await supabaseAdmin
        .from("case_images")
        .select(
          `
            id,
            case_id,
            object_key,
            mime_type,
            access_level,
            is_published
          `,
        )
        .eq("id", imageId)
        .maybeSingle();

    if (imageError) {
      return NextResponse.json(
        { error: imageError.message },
        { status: 500 },
      );
    }

    if (!image || !image.is_published) {
      return NextResponse.json(
        { error: "The image could not be found." },
        { status: 404 },
      );
    }

    const { data: caseRecord, error: caseError } =
      await supabaseAdmin
        .from("cases")
        .select("id, case_status")
        .eq("id", image.case_id)
        .maybeSingle();

    if (caseError) {
      return NextResponse.json(
        { error: caseError.message },
        { status: 500 },
      );
    }

    if (
      !caseRecord ||
      caseRecord.case_status !== "published"
    ) {
      return NextResponse.json(
        { error: "The image could not be found." },
        { status: 404 },
      );
    }

    if (image.access_level === "member") {
      const supabase = await createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          {
            error:
              "Please sign in to access this members-only image.",
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
          "Unable to verify image membership:",
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
              "An active membership is required to access this image.",
            requiresMembership: true,
          },
          { status: 403 },
        );
      }
    } else if (image.access_level !== "public") {
      return NextResponse.json(
        {
          error:
            "This image is not currently available.",
        },
        { status: 403 },
      );
    }

    if (!image.object_key) {
      return NextResponse.json(
        {
          error:
            "This image does not have a stored file.",
        },
        { status: 404 },
      );
    }

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: image.object_key,
      ResponseContentType:
        image.mime_type ?? "application/octet-stream",
      ResponseContentDisposition: "inline",
    });

    const viewUrl = await getSignedUrl(
      r2Client,
      command,
      {
        expiresIn: 60 * 60,
      },
    );

    return NextResponse.json({
      viewUrl,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    console.error(
      "Unable to create case image URL:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The image could not be prepared.",
      },
      { status: 500 },
    );
  }
}