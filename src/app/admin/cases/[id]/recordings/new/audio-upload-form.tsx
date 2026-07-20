"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type AudioUploadFormProps = {
  caseId: string;
};

type UploadUrlResponse = {
  uploadUrl?: string;
  objectKey?: string;
  originalFilename?: string;
  contentType?: string;
  error?: string;
};

type SaveRecordingResponse = {
  recordingId?: string;
  error?: string;
};

const MAX_SINGLE_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

const recordingTypes = [
  { value: "911-call", label: "911 call" },
  { value: "interrogation", label: "Interrogation" },
  { value: "dispatch", label: "Dispatch audio" },
  { value: "court-audio", label: "Court audio" },
  { value: "interview", label: "Interview" },
  { value: "body-camera", label: "Body-camera audio" },
  { value: "other", label: "Other" },
];

function detectAudioType(file: File) {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/x-m4a",
    mp4: "audio/mp4",
    wav: "audio/wav",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };

  return extension ? mimeTypes[extension] ?? "" : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function uploadFileToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (percentage: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", uploadUrl);

    request.setRequestHeader("Content-Type", contentType);

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percentage = Math.round(
        (event.loaded / event.total) * 100,
      );

      onProgress(percentage);
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(
        new Error(
          `Cloudflare rejected the upload with status ${request.status}.`,
        ),
      );
    });

    request.addEventListener("error", () => {
      reject(
        new Error(
          "The upload was interrupted before it reached Cloudflare.",
        ),
      );
    });

    request.addEventListener("abort", () => {
      reject(new Error("The upload was canceled."));
    });

    request.send(file);
  });
}

export default function AudioUploadForm({
  caseId,
}: AudioUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [recordingType, setRecordingType] =
    useState("911-call");
  const [accessLevel, setAccessLevel] =
    useState<"public" | "member">("member");
  const [isPublished, setIsPublished] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const fileDescription = useMemo(() => {
    if (!audioFile) {
      return "";
    }

    return `${audioFile.name} · ${formatFileSize(audioFile.size)}`;
  }, [audioFile]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setError("");
    setUploadProgress(0);

    if (!selectedFile) {
      setAudioFile(null);
      return;
    }

    if (selectedFile.size > MAX_SINGLE_UPLOAD_BYTES) {
      setAudioFile(null);
      event.target.value = "";

      setError(
        "This file is larger than the 5 GB single-upload limit. It will require multipart uploading.",
      );

      return;
    }

    const contentType = detectAudioType(selectedFile);

    if (!contentType) {
      setAudioFile(null);
      event.target.value = "";

      setError(
        "Please choose an MP3, M4A, MP4 audio, WAV, AAC, OGG, or FLAC file.",
      );

      return;
    }

    setAudioFile(selectedFile);

    if (!title.trim()) {
      const filenameWithoutExtension = selectedFile.name.replace(
        /\.[^/.]+$/,
        "",
      );

      setTitle(filenameWithoutExtension);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setStatusMessage("");
    setUploadProgress(0);

    if (!title.trim()) {
      setError("Please enter a recording title.");
      return;
    }

    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }

    const contentType = detectAudioType(audioFile);

    if (!contentType) {
      setError("The selected file type is not supported.");
      return;
    }

    setPending(true);

    try {
      setStatusMessage("Preparing secure upload…");

      const uploadUrlResponse = await fetch(
        "/api/r2/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId,
            filename: audioFile.name,
            contentType,
          }),
        },
      );

      const uploadUrlData =
        (await uploadUrlResponse.json()) as UploadUrlResponse;

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlData.uploadUrl ||
        !uploadUrlData.objectKey
      ) {
        throw new Error(
          uploadUrlData.error ??
            "The secure upload could not be prepared.",
        );
      }

      setStatusMessage("Uploading audio to Cloudflare R2…");

      await uploadFileToR2(
        uploadUrlData.uploadUrl,
        audioFile,
        contentType,
        setUploadProgress,
      );

      setStatusMessage("Saving recording information…");

      const saveResponse = await fetch("/api/recordings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId,
          title: title.trim(),
          recordingType,
          accessLevel,
          isPublished,
          objectKey: uploadUrlData.objectKey,
          originalFilename: audioFile.name,
          mimeType: contentType,
          fileSizeBytes: audioFile.size,
        }),
      });

      const saveData =
        (await saveResponse.json()) as SaveRecordingResponse;

      if (!saveResponse.ok || !saveData.recordingId) {
        throw new Error(
          saveData.error ??
            "The recording information could not be saved.",
        );
      }

      setStatusMessage("Recording uploaded successfully.");

      router.push(`/admin/cases/${caseId}`);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The recording could not be uploaded.",
      );

      setStatusMessage("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6"
    >
      {error ? (
        <div
          role="alert"
          className="border border-red-400/50 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Recording details
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Identify the audio
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Recording title
            </span>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
              placeholder="Example: 911 Call — Initial Report"
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Recording type
            </span>

            <select
              value={recordingType}
              onChange={(event) =>
                setRecordingType(event.target.value)
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            >
              {recordingTypes.map((recording) => (
                <option
                  key={recording.value}
                  value={recording.value}
                >
                  {recording.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Access
            </span>

            <select
              value={accessLevel}
              onChange={(event) =>
                setAccessLevel(
                  event.target.value as "public" | "member",
                )
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            >
              <option value="member">Members only</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>
      </section>

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Audio file
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Select the recording
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-[#a8adb5]">
            The file uploads directly to the private Cloudflare
            bucket. Keep this page open until the upload finishes.
          </p>
        </div>

        <label className="grid cursor-pointer gap-3 border border-dashed border-[#c8a66a]/50 bg-[#080b0f] p-6 transition hover:border-[#c8a66a] md:p-10">
          <span className="text-sm font-bold uppercase tracking-[0.1em] text-[#e1c58f]">
            Choose audio file
          </span>

          <input
            type="file"
            accept=".mp3,.m4a,.mp4,.wav,.aac,.ogg,.flac,audio/*"
            onChange={handleFileChange}
            disabled={pending}
            className="block w-full text-sm text-[#a8adb5] file:mr-4 file:border file:border-[#c8a66a] file:bg-[#c8a66a] file:px-5 file:py-3 file:text-xs file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[#111318]"
            required
          />

          {fileDescription ? (
            <span className="text-sm text-[#c2c5ca]">
              {fileDescription}
            </span>
          ) : null}
        </label>

        {pending || uploadProgress > 0 ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-[#c2c5ca]">
                {statusMessage || "Preparing upload…"}
              </span>

              <strong className="text-[#e1c58f]">
                {uploadProgress}%
              </strong>
            </div>

            <div className="h-2 overflow-hidden bg-white/10">
              <div
                className="h-full bg-[#c8a66a] transition-[width]"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) =>
              setIsPublished(event.target.checked)
            }
            disabled={pending}
            className="mt-1 h-5 w-5 accent-[#c8a66a]"
          />

          <span>
            <strong className="block text-[#f4f1e9]">
              Publish immediately
            </strong>

            <small className="mt-1 block leading-6 text-[#a8adb5]">
              Leave this unchecked while reviewing the recording.
            </small>
          </span>
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 w-full items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.09em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60 md:w-auto"
        >
          {pending
            ? "Uploading recording…"
            : "Upload recording"}
        </button>
      </div>
    </form>
  );
}