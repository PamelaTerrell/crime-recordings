import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AccessLevel = "public" | "member";

type CreateDocumentBody = {
  caseId?: unknown;
  title?: unknown;
  description?: unknown;
  sourceName?: unknown;
  sourceReference?: unknown;
  documentDate?: unknown;
  accessLevel?: unknown;
  isPublished?: unknown;
  isSensitive?: unknown;
  sortOrder?: unknown;
  objectKey?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  fileSizeBytes?: unknown;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value: unknown) {
  const normalized = getTrimmedString(value);

  return normalized || null;
}

function isValidAccessLevel(
  value: unknown,
): value is AccessLevel {
  return value === "public" || value === "member";
}

function isValidDateString(value: string) {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidDocumentObjectKey(
  objectKey: string,
  caseId: string,
) {
  const requiredPrefix = `cases/${caseId}/documents/`;

  return (
    objectKey.startsWith(requiredPrefix) &&
    !objectKey.includes("..") &&
    !objectKey.includes("\\")
  );
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
        {
          status: 401,
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
        {
          error: `Unable to verify account role: ${roleError.message}`,
        },
        {
          status: 500,
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
            "You do not have permission to save case documents.",
        },
        {
          status: 403,
        },
      );
    }

    let body: CreateDocumentBody;

    try {
      body = (await request.json()) as CreateDocumentBody;
    } catch {
      return NextResponse.json(
        {
          error: "The request body must contain valid JSON.",
        },
        {
          status: 400,
        },
      );
    }

    const caseId = getTrimmedString(body.caseId);
    const title = getTrimmedString(body.title);
    const description = getOptionalString(
      body.description,
    );
    const sourceName = getOptionalString(body.sourceName);
    const sourceReference = getOptionalString(
      body.sourceReference,
    );
    const documentDate = getTrimmedString(
      body.documentDate,
    );
    const objectKey = getTrimmedString(body.objectKey);
    const originalFilename = getTrimmedString(
      body.originalFilename,
    );
    const mimeType = getTrimmedString(
      body.mimeType,
    ).toLowerCase();

    const isPublished =
      typeof body.isPublished === "boolean"
        ? body.isPublished
        : false;

    const isSensitive =
      typeof body.isSensitive === "boolean"
        ? body.isSensitive
        : false;

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isInteger(body.sortOrder)
        ? body.sortOrder
        : Number.NaN;

    const fileSizeBytes =
      typeof body.fileSizeBytes === "number" &&
      Number.isFinite(body.fileSizeBytes)
        ? Math.trunc(body.fileSizeBytes)
        : Number.NaN;

    if (!caseId) {
      return NextResponse.json(
        {
          error: "A case ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          error: "A document title is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (title.length > 250) {
      return NextResponse.json(
        {
          error:
            "The document title cannot exceed 250 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      description &&
      description.length > 10000
    ) {
      return NextResponse.json(
        {
          error:
            "The document description cannot exceed 10,000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      sourceName &&
      sourceName.length > 250
    ) {
      return NextResponse.json(
        {
          error:
            "The source agency cannot exceed 250 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      sourceReference &&
      sourceReference.length > 500
    ) {
      return NextResponse.json(
        {
          error:
            "The source reference cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidDateString(documentDate)) {
      return NextResponse.json(
        {
          error:
            "The document date must use the YYYY-MM-DD format.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidAccessLevel(body.accessLevel)) {
      return NextResponse.json(
        {
          error:
            "The access level must be public or member.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Display order must be a nonnegative whole number.",
        },
        {
          status: 400,
        },
      );
    }

    if (!objectKey) {
      return NextResponse.json(
        {
          error: "An R2 object key is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidDocumentObjectKey(
        objectKey,
        caseId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The document storage location is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (!originalFilename) {
      return NextResponse.json(
        {
          error:
            "The original filename is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      originalFilename.length > 500
    ) {
      return NextResponse.json(
        {
          error:
            "The original filename cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (mimeType !== "application/pdf") {
      return NextResponse.json(
        {
          error:
            "Only PDF documents are currently supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(fileSizeBytes) ||
      fileSizeBytes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "The document file size is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const maxDocumentBytes =
      250 * 1024 * 1024;

    if (fileSizeBytes > maxDocumentBytes) {
      return NextResponse.json(
        {
          error:
            "The PDF exceeds the 250 MB document limit.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: caseRecord, error: caseError } =
      await supabase
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .maybeSingle();

    if (caseError) {
      return NextResponse.json(
        {
          error: `Unable to verify the selected case: ${caseError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (!caseRecord) {
      return NextResponse.json(
        {
          error:
            "The selected case could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const { data: existingDocument, error: duplicateError } =
      await supabase
        .from("case_documents")
        .select("id")
        .eq("object_key", objectKey)
        .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        {
          error: `Unable to check the document record: ${duplicateError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (existingDocument) {
      return NextResponse.json(
        {
          error:
            "This uploaded document has already been saved.",
        },
        {
          status: 409,
        },
      );
    }

    const { data: documentRecord, error: insertError } =
      await supabase
        .from("case_documents")
        .insert({
          case_id: caseId,
          title,
          description,
          source_name: sourceName,
          source_reference: sourceReference,
          document_date: documentDate || null,
          access_level: body.accessLevel,
          is_published: isPublished,
          is_sensitive: isSensitive,
          sort_order: sortOrder,
          object_key: objectKey,
          original_filename: originalFilename,
          mime_type: mimeType,
          file_size_bytes: fileSizeBytes,
          uploaded_by: user.id,
        })
        .select("id")
        .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: `The document information could not be saved: ${insertError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        documentId: documentRecord.id,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Unable to save case document:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The case document could not be saved.",
      },
      {
        status: 500,
      },
    );
  }
}