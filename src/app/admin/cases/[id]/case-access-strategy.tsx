type RecordingOption = {
  id: string;
  title: string;
  access_level: string;
  is_published: boolean;
};

type CaseAccessStrategyProps = {
  strategy: string;
  freeRecordingId: string | null;
  recordings: RecordingOption[];
};

const strategyLabels: Record<string, string> = {
  fully_free: "Fully Free Showcase",
  free_sample: "One Free Featured Recording",
  members_only: "Members Only",
};

export default function CaseAccessStrategy({
  strategy,
  freeRecordingId,
  recordings,
}: CaseAccessStrategyProps) {
  const selectedRecording = recordings.find(
    (recording) => recording.id === freeRecordingId,
  );

  return (
    <div className="mb-6 rounded-2xl border border-[#394454] bg-[#17212f] p-5">
      <p className="admin-eyebrow">
        Recording access
      </p>

      <h3 className="mt-2 font-serif text-2xl text-[#f4f1e9]">
        Case Access Strategy
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#a8adb5]">
        Manage which recordings visitors can
        play for free and which require membership.
      </p>

      <div className="mt-5 rounded-xl border border-[#394454] p-4">
        <p className="text-sm text-[#a8adb5]">
          Current strategy
        </p>

        <p className="mt-1 font-medium text-[#f4f1e9]">
          {strategyLabels[strategy] ??
            "Not configured"}
        </p>

        {strategy === "free_sample" && (
          <p className="mt-3 text-sm text-[#c6cbd2]">
            Free recording:{" "}
            {selectedRecording?.title ??
              "No recording selected"}
          </p>
        )}

        <p className="mt-4 text-xs text-[#a8adb5]">
          Editing will become available after
          the database safeguards and secure
          save operation are installed.
        </p>
      </div>
    </div>
  );
}
