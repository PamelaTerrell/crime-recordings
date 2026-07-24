import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "An image ID is required." },
        { status: 400 },
      );
    }

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
        { error: "You do not have permission to delete case images." },
        { status: 403 },
      );
    }

    const { data: caseImage, error: imageError } = await supabase
      .from("case_images")
      .select("id, case_id, object_key")
      .eq("id", id)
      .maybeSingle();

    if (imageError) {
      return NextResponse.json(
        { error: imageError.message },
        { status: 500 },
      );
    }

    if (!caseImage) {
      return NextResponse.json(
        { error: "The case image could not be found." },
        { status: 404 },
      );
    }

    if (caseImage.object_key) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: caseImage.object_key,
          }),
        );
      } catch (storageError) {
        console.error(
          "Unable to delete case image from R2:",
          storageError,
        );

        return NextResponse.json(
          {
            error:
              "The image file could not be removed from storage.",
          },
          { status: 500 },
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("case_images")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/cases/${caseImage.case_id}`);
    revalidatePath("/cases");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Unable to delete case image:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The case image could not be deleted.",
      },
      { status: 500 },
    );
  }
}