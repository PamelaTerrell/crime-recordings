import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2BucketName, r2Client } from "@/lib/r2";

export async function GET(
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
    const supabase = await createClient();

    const { data: document, error } = await supabase
      .from("case_documents")
      .select(
        `
          id,
          title,
          object_key,
          original_filename,
          mime_type,
          access_level,
          is_published
        `,
      )
      .eq("id", id)
      .eq("is_published", true)
      .eq("access_level", "public")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: `Unable to load document: ${error.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (!document) {
      return NextResponse.json(
        {
          error: "The document could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const safeFilename =
      document.original_filename
        ?.replace(/["\r\n]/g, "")
        .trim() || "case-document.pdf";

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: document.object_key,
      ResponseContentType:
        document.mime_type || "application/pdf",
      ResponseContentDisposition:
        `inline; filename="${safeFilename}"`,
    });

    const documentUrl = await getSignedUrl(
      r2Client,
      command,
      {
        expiresIn: 60 * 60,
      },
    );

    return NextResponse.redirect(documentUrl);
  } catch (error) {
    console.error(
      "Unable to prepare public case document:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The document could not be opened.",
      },
      {
        status: 500,
      },
    );
  }
}
