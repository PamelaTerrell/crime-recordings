import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

async function getMembershipStatus() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      signedIn: false,
      hasMemberAccess: false,
    };
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
      "Unable to verify image-gallery membership:",
      subscriptionError,
    );

    throw new Error(
      "Your membership status could not be verified.",
    );
  }

  return {
    signedIn: true,
    hasMemberAccess:
      subscription !== null &&
      subscriptionHasAccess(
        subscription.status,
        subscription.current_period_end,
      ),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const caseId =
      typeof body.caseId === "string"
        ? body.caseId.trim()
        : "";

    if (!caseId) {
      return NextResponse.json(
        { error: "A case ID is required." },
        { status: 400 },
      );
    }

    const { data: caseRecord, error: caseError } =
      await supabaseAdmin
        .from("cases")
        .select("id, case_status")
        .eq("id", caseId)
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
        { error: "The case could not be found." },
        { status: 404 },
      );
    }

    const membership = await getMembershipStatus();

    const { data: images, error: imagesError } =
      await supabaseAdmin
        .from("case_images")
        .select(
          `
            id,
            title,
            caption,
            source_name,
            source_reference,
            image_date,
            mime_type,
            access_level,
            is_disturbing,
            sort_order,
            created_at
          `,
        )
        .eq("case_id", caseId)
        .eq("is_published", true)
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

    if (imagesError) {
      return NextResponse.json(
        { error: imagesError.message },
        { status: 500 },
      );
    }

    const publishedImages = images ?? [];

    const visibleImages = publishedImages.filter(
      (image) =>
        image.access_level === "public" ||
        (image.access_level === "member" &&
          membership.hasMemberAccess),
    );

    const restrictedImageCount =
      publishedImages.filter(
        (image) =>
          image.access_level === "member" &&
          !membership.hasMemberAccess,
      ).length;

    return NextResponse.json({
      images: visibleImages,
      signedIn: membership.signedIn,
      hasMemberAccess: membership.hasMemberAccess,
      restrictedImageCount,
    });
  } catch (error) {
    console.error(
      "Unable to load published case images:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The case images could not be loaded.",
      },
      { status: 500 },
    );
  }
}