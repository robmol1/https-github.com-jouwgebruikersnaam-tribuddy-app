import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function EventParticipants({ eventId, session, joined }) {
  const currentUserId = session?.user?.id

  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  /* --------------------------------------------------
     Load deelnemers + matches
  -------------------------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // 1️⃣ Alle deelnemers van dit event (NIET filteren!)
      const { data: participantData, error: participantError } =
        await supabase
          .from("user_events")
          .select(`
            user_id,
            buddy_enabled,
            users (
              id,
              first_name,
              last_name,
              country_code,
              experience_level
            )
          `)

          .eq("event_id", eventId)
          .neq("user_id", currentUserId)

      if (participantError) {
        console.error("Fout bij ophalen deelnemers:", participantError)
        setLoading(false)
        return
      }

      setParticipants(participantData || [])

      // 2️⃣ Alle matches voor dit event
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("user1_id, user2_id, status")
        .eq("event_id", eventId)

      if (matchError) {
        console.error("Fout bij ophalen matches:", matchError)
      } else {
        setMatches(matchData || [])
      }

      setLoading(false)
    }

    if (currentUserId) loadData()
  }, [eventId, currentUserId])

  /* --------------------------------------------------
     Helpers
  -------------------------------------------------- */
  const getMatchWith = (otherUserId) => {
    const relevant = matches.filter(
      (m) =>
        (m.user1_id === currentUserId &&
          m.user2_id === otherUserId) ||
        (m.user2_id === currentUserId &&
          m.user1_id === otherUserId)
    )

    // accepted wint altijd
    return (
      relevant.find((m) => m.status === "accepted") ||
      relevant.find((m) => m.status === "pending") ||
      null
    )
  }

  /* --------------------------------------------------
     Actions
  -------------------------------------------------- */
  const requestBuddy = async (otherUserId) => {
    if (!currentUserId) return

    if (!joined) {
      alert("Je moet deelnemen aan het event om een buddy-verzoek te sturen.")
      return
    }

    if (getMatchWith(otherUserId)) {
      alert("Er bestaat al een buddy-verzoek.")
      return
    }

    const { error } = await supabase.from("matches").insert({
      user1_id: currentUserId,
      user2_id: otherUserId,
      event_id: eventId,
      status: "pending",
    })

    if (error) {
      console.error("Buddy request error:", error)
      alert("Buddy-verzoek kon niet worden verstuurd")
      return
    }

    setMatches((prev) => [
      ...prev,
      {
        user1_id: currentUserId,
        user2_id: otherUserId,
        status: "pending",
      },
    ])
  }

  const acceptBuddy = async (otherUserId) => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "accepted" })
      .eq("event_id", eventId)
      .eq("user1_id", otherUserId)
      .eq("user2_id", currentUserId)

    if (error) {
      console.error("Accept buddy error:", error)
      alert("Buddy-verzoek kon niet worden geaccepteerd")
      return
    }

    setMatches((prev) =>
      prev.map((m) =>
        m.user1_id === otherUserId && m.user2_id === currentUserId
          ? { ...m, status: "accepted" }
          : m
      )
    )
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  if (loading) return <p>Deelnemers laden…</p>

  return (
    <div>
      {participants.map((p) => {
        const match = getMatchWith(p.user_id)
        const status = match?.status

        return (
          <div
            key={p.user_id}
            style={{
              padding: "12px",
              marginBottom: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              background: "#fafafa",
            }}
          >
            <strong>
              {p.users.first_name} {p.users.last_name}
            </strong>

            <div style={{ color: "#666", fontSize: "14px" }}>
              {p.users.experience_level} — {p.users.country_code}
            </div>

            {joined && !status && p.buddy_enabled && (
  <button onClick={() => requestBuddy(p.user_id)}>
    Connect als buddy
  </button>
)}



            {status === "pending" &&
              match.user2_id === currentUserId && (
                <button onClick={() => acceptBuddy(p.user_id)}>
                  Accepteer buddy
                </button>
              )}

            {status === "pending" &&
              match.user1_id === currentUserId && (
                <span>Verzoek verstuurd</span>
              )}

            {status === "accepted" && (
              <span style={{ color: "green" }}>Buddy ✔</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
