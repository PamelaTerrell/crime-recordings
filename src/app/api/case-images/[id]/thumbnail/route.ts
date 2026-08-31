import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        {
          status: 401,
          headers: privateNoStoreHeaders,
        },
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
        { error: "Unable to verify account role." },
        {
          status: 500,
          headers: privateNoStoreHeaders,
        },
      );
    }

    if (
      roleRecord?.role !== "admin" &&
      roleRecord?.role !== "editor"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view this image.",
        },
        {
          status: 403,
          headers: privateNoStoreHeaders,
        },
      );
    }

    const { id } = await context.params;

    const { data: image, error: imageError } =
      await supabase
        .from("case_images")
        .select("id, object_key")
        .eq("id", id)
        .maybeSingle();

    if (imageError) {
      return NextResponse.json(
        { error: "Unable to load the image." },
        {
          status: 500,
          headers: privateNoStoreHeaders,
        },
      );
    }

    if (!image?.object_key) {
      return NextResponse.json(
        { error: "The image could not be found." },
        {
          status: 404,
          headers: privateNoStoreHeaders,
        },
      );
    }

    const imageUrl = await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: r2BucketName,
        Key: image.object_key,
        ResponseContentDisposition: "inline",
      }),
      {
        expiresIn: 15 * 60,
      },
    );

    const response = NextResponse.redirect(imageUrl);
    response.headers.set(
      "Cache-Control",
      "private, no-store",
    );

    return response;
  } catch (error) {
    console.error(
      "Unable to prepare case-image thumbnail:",
      error,
    );

    return NextResponse.json(
      { error: "The image could not be opened." },
      {
        status: 500,
        headers: privateNoStoreHeaders,
      },
    );
  }
}
