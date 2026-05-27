import DashboardShell from "@/components/dashboard-shell";
import { listPlants } from "@/lib/plants";

export const dynamic = "force-dynamic";

function SetupState({ message }) {
  return (
    <section className="setup-state panel-card">
      <p className="eyebrow">Code Pub</p>
      <h1>Connect a database to bring the platform online.</h1>
      <p className="platform-copy">
        The dashboard and API are ready, but the app needs a Postgres connection before it can
        persist plants and their latest reading snapshot.
      </p>
      <div className="setup-copy">
        <p>{message}</p>
        <ol>
          <li>Create a Neon Postgres database.</li>
          <li>Add its connection string as <code>DATABASE_URL</code>.</li>
          <li>Restart the Next.js app or redeploy on Vercel.</li>
        </ol>
      </div>
    </section>
  );
}

export default async function HomePage() {
  try {
    const plants = await listPlants();

    return (
      <main className="platform-page">
        <div className="background-blob blob-a"></div>
        <div className="background-blob blob-b"></div>

        <div className="platform-shell">
          <DashboardShell initialPlants={plants} />
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="platform-page">
        <div className="background-blob blob-a"></div>
        <div className="background-blob blob-b"></div>

        <div className="platform-shell">
          <SetupState message={error.message} />
        </div>
      </main>
    );
  }
}
