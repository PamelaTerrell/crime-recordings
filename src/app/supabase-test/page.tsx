import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { error } = await supabase.auth.getUser();

  const connected =
    !error ||
    error.message.toLowerCase().includes("auth session missing");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#080b0f",
        color: "#f4f1e9",
      }}
    >
      <section
        style={{
          width: "min(100%, 620px)",
          padding: "40px",
          border: "1px solid rgba(200, 166, 106, 0.4)",
          background: "#10151b",
        }}
      >
        <p
          style={{
            color: "#e1c58f",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            fontSize: "12px",
          }}
        >
          Crime Recordings
        </p>

        <h1>Supabase connection test</h1>

        <p>
          {connected
            ? "Supabase is connected successfully."
            : "Supabase could not be reached."}
        </p>

        {!connected && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#ffb4b4",
            }}
          >
            {error?.message}
          </pre>
        )}
      </section>
    </main>
  );
}