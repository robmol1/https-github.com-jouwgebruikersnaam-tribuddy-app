import { Link } from "react-router-dom"

export default function Home({ session }) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Welkom bij TriBuddy 👋</h1>

      {session?.user ? (
        <p>Ingelogd als: <strong>{session.user.email}</strong></p>
      ) : (
        <p>Je bent niet ingelogd.</p>
      )}

      <nav style={{ marginTop: "20px" }}>
        <Link to="/events">➡️ Bekijk Events</Link> |{" "}
        <Link to="/profile">👤 Profiel</Link>
      </nav>
    </div>
  )
}
