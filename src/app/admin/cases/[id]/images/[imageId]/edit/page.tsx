import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EditCaseImagePageProps = {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
};

export default async function EditCaseImagePage({
  params,
}: EditCaseImagePageProps) {
  const { id, imageId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: roleRecord, error: roleError } =
    await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

  if (roleError) {
    throw new Error(
      `Unable to verify account role: ${roleError.message}`,
    );
  }

  if (
    roleRecord?.role !== "admin" &&
    roleRecord?.role !== "editor"
  ) {
    redirect("/account");
  }

  const { data: caseItem, error: caseError } =
    await supabase
      .from("cases")
      .select("id, title, slug")
      .eq("id", id)
      .maybeSingle();

  if (caseError || !caseItem) {
    notFound();
  }

  const caseSlug = caseItem.slug;

  const { data: image, error: imageError } =
    await supabase
      .from("case_images")
      .select(
        `
          id,
          case_id,
          title,
          caption,
          source_name,
          source_reference,
          image_date,
          original_filename,
          mime_type,
          file_size_bytes,
          access_level,
          is_published,
          is_disturbing,
          sort_order
        `,
      )
      .eq("id", imageId)
      .eq("case_id", id)
      .maybeSingle();

  if (imageError || !image) {
    notFound();
  }

  async function updateImage(
    formData: FormData,
  ) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login");
    }

    const { data: roleRecord, error: roleError } =
      await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      throw new Error(
        `Unable to verify account role: ${roleError.message}`,
      );
    }

    if (
      roleRecord?.role !== "admin" &&
      roleRecord?.role !== "editor"
    ) {
      redirect("/account");
    }

    const title =
      typeof formData.get("title") === "string"
        ? String(formData.get("title")).trim()
        : "";

    const caption =
      typeof formData.get("caption") === "string"
        ? String(formData.get("caption")).trim()
        : "";

    const sourceName =
      typeof formData.get("source_name") === "string"
        ? String(
            formData.get("source_name"),
          ).trim()
        : "";

    const sourceReference =
      typeof formData.get("source_reference") ===
      "string"
        ? String(
            formData.get(
              "source_reference",
            ),
          ).trim()
        : "";

    const imageDate =
      typeof formData.get("image_date") === "string"
        ? String(
            formData.get("image_date"),
          ).trim()
        : "";

    const accessLevel =
      formData.get("access_level") === "public"
        ? "public"
        : "member";

    const isPublished =
      formData.get("is_published") === "on";

    const isDisturbing =
      formData.get("is_disturbing") === "on";

    const rawSortOrder =
      typeof formData.get("sort_order") === "string"
        ? String(
            formData.get("sort_order"),
          ).trim()
        : "";

    const sortOrder =
      rawSortOrder === ""
        ? 0
        : Number.parseInt(
            rawSortOrder,
            10,
          );

    if (!title) {
      throw new Error(
        "Image title is required.",
      );
    }

    if (
      !Number.isFinite(sortOrder) ||
      sortOrder < 0
    ) {
      throw new Error(
        "Sort order must be zero or greater.",
      );
    }

    const { error: updateError } =
      await supabase
        .from("case_images")
        .update({
          title,
          caption:
            caption.length > 0
              ? caption
              : null,
          source_name:
            sourceName.length > 0
              ? sourceName
              : null,
          source_reference:
            sourceReference.length > 0
              ? sourceReference
              : null,
          image_date:
            imageDate.length > 0
              ? imageDate
              : null,
          access_level: accessLevel,
          is_published: isPublished,
          is_disturbing: isDisturbing,
          sort_order: sortOrder,
        })
        .eq("id", imageId)
        .eq("case_id", id);

    if (updateError) {
      throw new Error(
        `Unable to update image: ${updateError.message}`,
      );
    }

    revalidatePath(
      `/admin/cases/${id}`,
    );

    revalidatePath(
      `/admin/cases/${id}/images/${imageId}/edit`,
    );

    revalidatePath(
      `/cases/${caseSlug}`,
    );

    revalidatePath("/cases");

    redirect(
      `/admin/cases/${id}`,
    );
  }

  return (
    <section>
      <Link
        href={`/admin/cases/${caseItem.id}`}
        className="admin-back-link"
      >
        ← Back to {caseItem.title}
      </Link>

      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            Image management
          </p>

          <h1>Edit image</h1>

          <p>
            Update the image title,
            description, access level,
            warning status, publication
            status, and display order.
          </p>
        </div>
      </div>

      <form
        action={updateImage}
        className="admin-form"
      >
        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>01</span>

            <div>
              <h2>Image details</h2>

              <p>
                Change the descriptive
                information shown with this
                image.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field admin-field-full">
              <label htmlFor="title">
                Image title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={image.title}
              />
            </div>

            <div className="admin-field admin-field-full">
              <label htmlFor="caption">
                Caption
              </label>

              <textarea
                id="caption"
                name="caption"
                defaultValue={
                  image.caption ?? ""
                }
                rows={5}
              />

              <small>
                Describe what is actually
                shown in the photograph.
              </small>
            </div>

            <div className="admin-field">
              <label htmlFor="source_name">
                Source
              </label>

              <input
                id="source_name"
                name="source_name"
                type="text"
                defaultValue={
                  image.source_name ?? ""
                }
              />
            </div>

            <div className="admin-field">
              <label htmlFor="source_reference">
                Source reference
              </label>

              <input
                id="source_reference"
                name="source_reference"
                type="text"
                defaultValue={
                  image.source_reference ??
                  ""
                }
              />
            </div>

            <div className="admin-field">
              <label htmlFor="image_date">
                Image date
              </label>

              <input
                id="image_date"
                name="image_date"
                type="date"
                defaultValue={
                  image.image_date ?? ""
                }
              />
            </div>

            <div className="admin-field">
              <label htmlFor="sort_order">
                Sort order
              </label>

              <input
                id="sort_order"
                name="sort_order"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  image.sort_order ?? 0
                }
              />

              <small>
                Lower numbers appear first.
              </small>
            </div>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>02</span>

            <div>
              <h2>
                Access and publication
              </h2>

              <p>
                Control who can see this
                photograph and whether it is
                currently published.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="access_level">
                Access level
              </label>

              <select
                id="access_level"
                name="access_level"
                defaultValue={
                  image.access_level
                }
              >
                <option value="public">
                  Public
                </option>

                <option value="member">
                  Members only
                </option>
              </select>

              <small>
                Members-only images remain
                protected from public access.
              </small>
            </div>

            <div className="admin-field">
              <label>
                Publication settings
              </label>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={
                    image.is_published
                  }
                />

                <span>
                  <strong>
                    Published
                  </strong>

                  <small>
                    Allow this image to appear
                    in the case gallery for
                    eligible viewers.
                  </small>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>03</span>

            <div>
              <h2>
                Content warning
              </h2>

              <p>
                Identify photographs that may
                contain disturbing or graphic
                material.
              </p>
            </div>
          </div>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              name="is_disturbing"
              defaultChecked={
                image.is_disturbing
              }
            />

            <span>
              <strong>
                Mark as sensitive
              </strong>

              <small>
                Use this for crime-scene,
                injury, deceased-person, or
                otherwise disturbing imagery.
              </small>
            </span>
          </label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>04</span>

            <div>
              <h2>
                Stored file
              </h2>

              <p>
                File information is shown for
                reference. Editing metadata
                does not replace the underlying
                R2 object.
              </p>
            </div>
          </div>

          <div className="admin-detail-grid">
            <article className="admin-detail-card">
              <span>Filename</span>

              <strong>
                {image.original_filename ??
                  "Not recorded"}
              </strong>
            </article>

            <article className="admin-detail-card">
              <span>MIME type</span>

              <strong>
                {image.mime_type ??
                  "Not recorded"}
              </strong>
            </article>

            <article className="admin-detail-card">
              <span>File size</span>

              <strong>
                {image.file_size_bytes !== null
                  ? `${(
                      image.file_size_bytes /
                      (1024 * 1024)
                    ).toFixed(2)} MB`
                  : "Not recorded"}
              </strong>
            </article>

            <article className="admin-detail-card">
              <span>Image ID</span>

              <strong>
                {image.id}
              </strong>
            </article>
          </div>
        </section>

        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-submit"
          >
            Save image changes
          </button>
        </div>
      </form>
    </section>
  );
}