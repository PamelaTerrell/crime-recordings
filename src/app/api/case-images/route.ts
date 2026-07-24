import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const allowedAccessLevels = new Set(["public", "member"]);

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

async function removeUploadedObject(objectKey: string) {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
      }),
    );
  } catch (error) {
    console.error(
      "Unable to remove orphaned case image from R2:",
      error,
    );
  }
}

function getOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
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
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const { data: roleRecord, error: roleError } =
      await supabase
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
          error:
            "You do not have permission to add case images.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const caseId =
      typeof body.caseId === "string"
        ? body.caseId.trim()
        : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const caption = getOptionalString(body.caption);
    const sourceName = getOptionalString(body.sourceName);
    const sourceReference = getOptionalString(
      body.sourceReference,
    );
    const imageDate = getOptionalString(body.imageDate);

    const accessLevel =
      typeof body.accessLevel === "string"
        ? body.accessLevel.trim()
        : "";

    const objectKey =
      typeof body.objectKey === "string"
        ? body.objectKey.trim()
        : "";

    const originalFilename =
      typeof body.originalFilename === "string"
        ? body.originalFilename.trim()
        : "";

    const mimeType =
      typeof body.mimeType === "string"
        ? body.mimeType.trim().toLowerCase()
        : "";

    const fileSizeBytes =
      typeof body.fileSizeBytes === "number" &&
      Number.isFinite(body.fileSizeBytes)
        ? body.fileSizeBytes
        : null;

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isInteger(body.sortOrder)
        ? body.sortOrder
        : 0;

    const isPublished = body.isPublished === true;
    const isDisturbing = body.isDisturbing !== false;

    if (!caseId) {
      return NextResponse.json(
        {
          error: "A case ID is required.",
        },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          error: "Please enter an image title.",
        },
        { status: 400 },
      );
    }

    if (!allowedAccessLevels.has(accessLevel)) {
      return NextResponse.json(
        {
          error: "Please select a valid access level.",
        },
        { status: 400 },
      );
    }

    if (!objectKey) {
      return NextResponse.json(
        {
          error: "The uploaded image object key is missing.",
        },
        { status: 400 },
      );
    }

    const expectedPrefix = `cases/${caseId}/images/`;

    if (!objectKey.startsWith(expectedPrefix)) {
      return NextResponse.json(
        {
          error:
            "The uploaded image does not belong to this case.",
        },
        { status: 400 },
      );
    }

    if (!allowedImageTypes.has(mimeType)) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            "Please upload a supported JPEG, PNG, WebP, GIF, or AVIF image.",
        },
        { status: 400 },
      );
    }

    if (
      fileSizeBytes !== null &&
      (fileSizeBytes < 0 ||
        fileSizeBytes > 50 * 1024 * 1024)
    ) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            "The image must be no larger than 50 MB.",
        },
        { status: 400 },
      );
    }

    if (sortOrder < 0) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            "Display order cannot be a negative number.",
        },
        { status: 400 },
      );
    }

    const { data: caseRecord, error: caseError } =
      await supabase
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .maybeSingle();

    if (caseError) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error: caseError.message,
        },
        { status: 500 },
      );
    }

    if (!caseRecord) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            "The selected case could not be found.",
        },
        { status: 404 },
      );
    }

    const { data: caseImage, error: insertError } =
      await supabase
        .from("case_images")
        .insert({
          case_id: caseId,
          title,
          caption,
          source_name: sourceName,
          source_reference: sourceReference,
          image_date: imageDate,
          object_key: objectKey,
          original_filename:
            originalFilename || "case-image",
          mime_type: mimeType,
          file_size_bytes: fileSizeBytes,
          access_level: accessLevel,
          is_published: isPublished,
          is_disturbing: isDisturbing,
          sort_order: sortOrder,
          uploaded_by: user.id,
        })
        .select("id")
        .single();

    if (insertError || !caseImage) {
      await removeUploadedObject(objectKey);

      return NextResponse.json(
        {
          error:
            insertError?.message ??
            "The case image could not be saved.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imageId: caseImage.id,
    });
  } catch (error) {
    console.error("Unable to save case image:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The case image could not be saved.",
      },
      { status: 500 },
    );
  }
}