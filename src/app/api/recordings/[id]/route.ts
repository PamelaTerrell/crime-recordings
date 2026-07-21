import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const allowedAccessLevels = new Set(["public", "member"]);

async function requireEditorialAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorResponse: NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      ),
    };
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Unable to verify account role: ${roleError.message}`,
        },
        { status: 500 },
      ),
    };
  }

  if (
    roleRecord?.role !== "admin" &&
    roleRecord?.role !== "editor"
  ) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "You do not have permission to manage recordings.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    user,
  };
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const access = await requireEditorialAccess();

    if ("errorResponse" in access) {
      return access.errorResponse;
    }

    const { supabase, user } = access;
    const { id } = await context.params;
    const body = await request.json();

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

    const isPublished = body.isPublished === true;
    const isFeatured = body.isFeatured === true;

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isInteger(body.sortOrder)
        ? body.sortOrder
        : 0;

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

    const { data: currentRecording, error: currentError } =
      await supabase
        .from("recordings")
        .select(
          `
            id,
            case_id,
            mime_type,
            published_at,
            is_featured
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        { error: currentError.message },
        { status: 500 },
      );
    }

    if (!currentRecording) {
      return NextResponse.json(
        { error: "The recording could not be found." },
        { status: 404 },
      );
    }

    const isVideo =
      currentRecording.mime_type?.startsWith("video/") ?? false;

    if (isFeatured && !isVideo) {
      return NextResponse.json(
        {
          error:
            "Only video recordings can be featured at the top of a public case page.",
        },
        { status: 400 },
      );
    }

    if (isFeatured && !isPublished) {
      return NextResponse.json(
        {
          error:
            "A featured video must also be published.",
        },
        { status: 400 },
      );
    }

    const publishedAt = isPublished
      ? currentRecording.published_at ??
        new Date().toISOString()
      : null;

    /*
     * Remove the featured flag from every other recording
     * belonging to this case before featuring the selected one.
     */
    if (isFeatured) {
      const { error: clearFeaturedError } = await supabase
        .from("recordings")
        .update({
          is_featured: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("case_id", currentRecording.case_id)
        .neq("id", id)
        .eq("is_featured", true);

      if (clearFeaturedError) {
        return NextResponse.json(
          {
            error: `Unable to replace the current featured video: ${clearFeaturedError.message}`,
          },
          { status: 500 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("recordings")
      .update({
        title,
        recording_type: recordingType,
        access_level: accessLevel,
        is_published: isPublished,
        is_featured: isFeatured,
        published_at: publishedAt,
        sort_order: sortOrder,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Unable to update recording:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The recording could not be updated.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const access = await requireEditorialAccess();

    if ("errorResponse" in access) {
      return access.errorResponse;
    }

    const { supabase } = access;
    const { id } = await context.params;

    const { data: recording, error: recordingError } =
      await supabase
        .from("recordings")
        .select(
          `
            id,
            full_object_key,
            preview_object_key
          `,
        )
        .eq("id", id)
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

    const { error: deleteError } = await supabase
      .from("recordings")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    const objectKeys = [
      recording.full_object_key,
      recording.preview_object_key,
    ].filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    );

    const cleanupResults = await Promise.allSettled(
      objectKeys.map((objectKey) =>
        r2Client.send(
          new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: objectKey,
          }),
        ),
      ),
    );

    const cleanupFailed = cleanupResults.some(
      (result) => result.status === "rejected",
    );

    if (cleanupFailed) {
      console.error(
        "Recording row deleted, but one or more R2 objects could not be removed.",
        cleanupResults,
      );
    }

    return NextResponse.json({
      success: true,
      cleanupWarning: cleanupFailed
        ? "The recording was removed, but a media object may require manual cleanup."
        : null,
    });
  } catch (error) {
    console.error("Unable to delete recording:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The recording could not be deleted.",
      },
      { status: 500 },
    );
  }
}