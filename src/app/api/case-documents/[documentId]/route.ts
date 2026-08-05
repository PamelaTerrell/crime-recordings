import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AccessLevel = "public" | "member";

type UpdateDocumentBody = {
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

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      documentId: string;
    }>;
  },
) {
  try {
    const { documentId } = await params;
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
            "You do not have permission to edit case documents.",
        },
        {
          status: 403,
        },
      );
    }

    let body: UpdateDocumentBody;

    try {
      body = (await request.json()) as UpdateDocumentBody;
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

    const sourceName = getOptionalString(
      body.sourceName,
    );

    const sourceReference = getOptionalString(
      body.sourceReference,
    );

    const documentDate = getTrimmedString(
      body.documentDate,
    );

    const isPublished =
      typeof body.isPublished === "boolean"
        ? body.isPublished
        : null;

    const isSensitive =
      typeof body.isSensitive === "boolean"
        ? body.isSensitive
        : null;

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isInteger(body.sortOrder)
        ? body.sortOrder
        : Number.NaN;

    if (!documentId) {
      return NextResponse.json(
        {
          error: "A document ID is required.",
        },
        {
          status: 400,
        },
      );
    }

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

    if (isPublished === null) {
      return NextResponse.json(
        {
          error:
            "The publication setting must be true or false.",
        },
        {
          status: 400,
        },
      );
    }

    if (isSensitive === null) {
      return NextResponse.json(
        {
          error:
            "The sensitive-material setting must be true or false.",
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

    const {
      data: existingDocument,
      error: existingDocumentError,
    } = await supabase
      .from("case_documents")
      .select("id, case_id")
      .eq("id", documentId)
      .eq("case_id", caseId)
      .maybeSingle();

    if (existingDocumentError) {
      return NextResponse.json(
        {
          error: `Unable to load the document: ${existingDocumentError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (!existingDocument) {
      return NextResponse.json(
        {
          error:
            "The selected document could not be found for this case.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: updatedDocument,
      error: updateError,
    } = await supabase
      .from("case_documents")
      .update({
        title,
        description,
        source_name: sourceName,
        source_reference: sourceReference,
        document_date: documentDate || null,
        access_level: body.accessLevel,
        is_published: isPublished,
        is_sensitive: isSensitive,
        sort_order: sortOrder,
      })
      .eq("id", documentId)
      .eq("case_id", caseId)
      .select("id")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: `The document settings could not be saved: ${updateError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      documentId: updatedDocument.id,
    });
  } catch (error) {
    console.error(
      "Unable to update case document:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The document settings could not be saved.",
      },
      {
        status: 500,
      },
    );
  }
}