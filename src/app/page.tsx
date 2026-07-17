import Image from "next/image";

const RECORDING_TYPES = [
  "Interviews",
  "Interrogations",
  "Emergency Calls",
  "Dispatch Audio",
  "Courtroom Recordings",
  "Official Statements",
];

const PLATFORM_FEATURES = [
  {
    number: "01",
    title: "Original recordings",
    description:
      "Listen to recordings obtained from official agencies and public-records sources.",
  },
  {
    number: "02",
    title: "Case context",
    description:
      "Understand when the recording occurred, who is speaking, and how it relates to the case.",
  },
  {
    number: "03",
    title: "Complete access",
    description:
      "Watch selected excerpts publicly and explore extended recordings through the full archive.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Crime Recordings home">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={270}
            height={180}
            priority
            className="site-logo"
          />
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#about">About</a>
          <a href="#archive">The Archive</a>
          <a href="#coming-soon">Updates</a>
          <a href="/login">Sign In</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />

        <div className="hero-content">
          <p className="eyebrow">
            Public records · Original audio · True cases
          </p>

          <h1>
            Hear the records
            <span>behind the cases.</span>
          </h1>

          <p className="hero-description">
            Crime Recordings presents interviews, interrogations, emergency
            calls, dispatch audio, and other official recordings obtained
            through public-records requests.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#coming-soon">
              Follow the investigation
              <span aria-hidden="true">→</span>
            </a>

            <a className="secondary-button" href="#about">
              Learn about the archive
            </a>
          </div>

          <div className="audio-preview" aria-label="Audio preview placeholder">
            <button
              className="play-button"
              type="button"
              aria-label="Audio preview coming soon"
              disabled
            >
              ▶
            </button>

            <div className="audio-information">
              <span className="audio-label">Archive preview</span>

              <strong>First recording coming soon</strong>

              <div className="audio-progress" aria-hidden="true">
                <span />
              </div>
            </div>

            <span className="audio-time">00:00</span>
          </div>
        </div>

        <aside className="case-file" aria-label="Crime Recordings introduction">
          <div className="file-top">
            <span>Crime Recordings</span>
            <span>File 001</span>
          </div>

          <div className="file-stamp">Original Record</div>

          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 46 }, (_, index) => (
              <span
                key={index}
                style={{
                  height: `${18 + ((index * 19) % 68)}%`,
                }}
              />
            ))}
          </div>

          <dl className="file-details">
            <div>
              <dt>Source</dt>
              <dd>Official public record</dd>
            </div>

            <div>
              <dt>Format</dt>
              <dd>Audio archive</dd>
            </div>

            <div>
              <dt>Status</dt>
              <dd>
                <span className="status-dot" />
                In development
              </dd>
            </div>
          </dl>

          <p className="file-note">
            Selected excerpts will appear on YouTube. Complete recordings,
            timelines, transcripts, and source information will be available
            here.
          </p>
        </aside>
      </section>

      <section className="statement-section" id="about">
        <p className="section-label">Why Crime Recordings</p>

        <div className="statement-layout">
          <h2>The source material tells a story of its own.</h2>

          <div className="statement-copy">
            <p>
              True-crime stories are often condensed into headlines,
              summaries, and commentary. Crime Recordings takes listeners
              closer to the original record.
            </p>

            <p>
              Our goal is to present compelling source material with context,
              careful organization, and respect for the people connected to
              each case.
            </p>
          </div>
        </div>
      </section>

      <section className="features-section" id="archive">
        <div className="section-heading">
          <div>
            <p className="section-label">Inside the archive</p>
            <h2>Real cases. Original recordings.</h2>
          </div>

          <p>
            Built as a growing documentary archive rather than a collection of
            disconnected clips.
          </p>
        </div>

        <div className="feature-grid">
          {PLATFORM_FEATURES.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="recording-types">
          {RECORDING_TYPES.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
      </section>

      <section className="coming-soon-section" id="coming-soon">
        <div>
          <p className="section-label">The first case is coming</p>
          <h2>Crime Recordings is now under development.</h2>
        </div>

        <div className="coming-soon-copy">
          <p>
            We are preparing the first collection of official recordings,
            supporting timelines, source details, and case background.
          </p>

          <p className="launch-note">
            CrimeRecordings.com · Established 2026 
          </p>
          
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={240}
            height={160}
            className="footer-logo"
          />

          <p>Real cases. Original recordings.</p>
        </div>

        <p>© {new Date().getFullYear()} Crime Recordings - A Stabile USA Project</p>
      </footer>
    </main>
  );
}