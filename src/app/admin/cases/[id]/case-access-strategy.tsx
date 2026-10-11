"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordingOption = {
  id: string;
  title: string;
  access_level: string;
  is_published: boolean;
};

type AccessStrategy = "fully_free" | "free_sample" | "members_only";

type CaseAccessStrategyProps = {
  caseId: string;
  strategy: string;
  freeRecordingId: string | null;
  recordings: RecordingOption[];
};

export default function CaseAccessStrategy({
  caseId,
  strategy,
  freeRecordingId,
  recordings,
}: CaseAccessStrategyProps) {
  const router = useRouter();

  const [selectedStrategy, setSelectedStrategy] =
    useState<AccessStrategy>(
      strategy === "fully_free" ||
      strategy === "free_sample"
        ? strategy
        : "members_only",
    );

  const [selectedRecordingId, setSelectedRecordingId] =
    useState(freeRecordingId ?? "");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const publishedRecordings = recordings.filter(
    (recording) => recording.is_published,
  );

  async function handleSave() {
    if (selectedStrategy === "free_sample" && !selectedRecordingId) {
      setMessage("Please select a published free recording.");
      return;
    }

    const confirmation =
      selectedStrategy === "fully_free"
        ? "Make every published recording in this case free? This will also replace your current fully free showcase."
        : selectedStrategy === "free_sample"
          ? "Make the selected recording free and require membership for the other recordings?"
          : "Require membership for every recording in this case?";

    if (!window.confirm(confirmation)) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/cases/${caseId}/recording-access`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strategy: selectedStrategy,
            freeRecordingId:
              selectedRecordingId || null,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to save access settings.",
        );
      }

      setMessage("Recording access updated successfully.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save recording access.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#394454] bg-[#17212f] p-5">
      <p className="admin-eyebrow">Recording access</p>

      <h3 className="mt-2 font-serif text-2xl text-[#f4f1e9]">
        Case Access Strategy
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#a8adb5]">
        Choose which recordings visitors can play for free.
        Only one case can be your fully free showcase.
      </p>

      <label
        htmlFor="case-access-strategy"
        className="mt-5 block text-sm font-medium text-[#f4f1e9]"
      >
        Access strategy
      </label>

      <select
        id="case-access-strategy"
        value={selectedStrategy}
        onChange={(event) =>
          setSelectedStrategy(event.target.value as AccessStrategy)
        }
        disabled={saving}
        className="mt-2 w-full rounded-xl border border-[#394454] bg-[#0f1722] p-3 text-[#f4f1e9]"
      >
        <option value="fully_free">Fully Free Showcase</option>
        <option value="free_sample">One Free Featured Recording</option>
        <option value="members_only">Members Only</option>
      </select>

      {selectedStrategy === "free_sample" && (
        <>
          <label
            htmlFor="case-free-recording"
            className="mt-5 block text-sm font-medium text-[#f4f1e9]"
          >
            Free featured recording
          </label>

          <select
            id="case-free-recording"
            value={selectedRecordingId}
            onChange={(event) =>
              setSelectedRecordingId(event.target.value)
            }
            disabled={saving}
            className="mt-2 w-full rounded-xl border border-[#394454] bg-[#0f1722] p-3 text-[#f4f1e9]"
          >
            <option value="">Select a recording</option>

            {publishedRecordings.map((recording) => (
              <option key={recording.id} value={recording.id}>
                {recording.title}
              </option>
            ))}
          </select>
        </>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-[#e6c985]">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={
          saving ||
          (selectedStrategy === "free_sample" &&
            !selectedRecordingId)
        }
        className="mt-5 rounded-xl bg-[#e6c985] px-5 py-3 font-semibold text-[#111827] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Access Strategy"}
      </button>
    </div>
  );
}
