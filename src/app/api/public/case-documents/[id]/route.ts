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
          case_id,
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

    if (!document.case_id) {
      return NextResponse.json(
        {
          error: "The document could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const { data: caseRecord, error: caseError } =
      await supabase
        .from("cases")
        .select("id, case_status")
        .eq("id", document.case_id)
        .maybeSingle();

    if (caseError) {
      return NextResponse.json(
        {
          error: `Unable to verify document case: ${caseError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (
      !caseRecord ||
      caseRecord.case_status !== "published"
    ) {
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
