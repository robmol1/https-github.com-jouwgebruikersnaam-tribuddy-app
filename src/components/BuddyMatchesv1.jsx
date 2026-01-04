import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function BuddyMatches({ eventId, session, joined }) {
  if (!joined) {
    return null
  }

  const currentUserId = session.user.id

  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          user1_id,
          user2_id,
          status,
          users1:users!matches_user1_id_fkey(
            first_name,last_name,country_code,experience_level
          ),
          users2:users!matches_user2_id_fkey(
            first_name,last_name,country_code,experience_level
          )
        `)
        .eq("event_id", eventId)
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

      if (error) {
        console.error("Error loading matches:", error)
        setLoading(false)
        return
      }

      // accepted wint altijd (per buddy)
      const byBuddy = new Map()
      for (const m of data || []) {
        const buddyId =
          m.user1_id === currentUserId ? m.user2_id : m.user1_id

        const existing = byBuddy.get(buddyId)
        if (!existing) {
          byBuddy.set(buddyId, m)
        } else {
          const rank = (s) => (s === "accepted" ? 2 : s === "pending" ? 1 : 0)
          if (rank(m.status) > rank(existing.status)) {
            byBuddy.set(buddyId, m)
          }
        }
      }

      const deduped = Array.from(byBuddy.values())

// 🔎 Check wie nog actief deelnemer is aan dit event
const userIdsToCheck = Array.from(
  new Set([
    currentUserId,
    ...deduped.map(m =>
      m.user1_id === currentUserId ? m.user2_id : m.user1_id
    ),
  ])
)

const { data: ueData, error: ueError } = await supabase
  .from("user_events")
  .select("user_id")
  .eq("event_id", eventId)
  .in("user_id", userIdsToCheck)

if (ueError) {
  console.error("Error loading user_events:", ueError)
  setMatches([])
  setLoading(false)
  return
}

const activeUserIds = new Set(ueData.map(r => r.user_id))

// ❗ Filter: alleen tonen als BEIDE users nog deelnemen
const filtered = deduped.filter(m => {
  const buddyId =
    m.user1_id === currentUserId ? m.user2_id : m.user1_id

  return (
    activeUserIds.has(currentUserId) &&
    activeUserIds.has(buddyId)
  )
})

setMatches(filtered)

      setLoading(false)
    }

    load()
  }, [eventId, currentUserId])

  const acceptBuddy = async (otherUserId) => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "accepted" })
      .eq("event_id", eventId)
      .eq("user1_id", otherUserId)
      .eq("user2_id", currentUserId)

    if (error) {
      console.error("Accept buddy error:", error)
      alert("Kon buddy-verzoek niet accepteren")
      return
    }

    console.log("[BUDDY] load matches", {
  eventId,
  userId: currentUserId
})


    setMatches((prev) =>
      prev.map((m) =>
        m.user1_id === otherUserId && m.user2_id === currentUserId
          ? { ...m, status: "accepted" }
          : m
      )
    )
  }
console.log("[BUDDY] matches filtered", {
  total: deduped.length,
  active: filtered.length
})
  if (loading) return <p>Buddy matches laden…</p>
  if (matches.length === 0) return <p>Geen buddy matches gevonden.</p>

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>🔗 Jouw Buddy Matches</h3>

      {matches.map((m) => {
        const isInitiator = m.user1_id === currentUserId
        const buddy = isInitiator ? m.users2 : m.users1

        return (
          <div
            key={m.id}
            style={{
              padding: "12px",
              marginTop: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              background: "#fafafa",
            }}
          >
            <strong>
              {buddy.first_name} {buddy.last_name}
            </strong>

            <div style={{ color: "#666", fontSize: "14px" }}>
              Niveau: {buddy.experience_level} — Land: {buddy.country_code}
            </div>

            {m.status === "pending" && !isInitiator && (
              <button
                style={{
                  marginTop: "8px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #4A90E2",
                  background: "white",
                  cursor: "pointer",
                }}
                onClick={() =>
                  acceptBuddy(
                    isInitiator ? m.user2_id : m.user1_id
                  )
                }
              >
                Accepteer buddy
              </button>
            )}

console.log("[BUDDY] accept attempt", {
  eventId,
  from: otherUserId,
  to: currentUserId
})

            {m.status === "pending" && isInitiator && (
              <span style={{ marginTop: "8px", display: "block" }}>
                Verzoek verstuurd
              </span>
            )}

            {m.status === "accepted" && (
              <span
                style={{
                  marginTop: "8px",
                  display: "block",
                  color: "green",
                  fontWeight: 500,
                }}
              >
                Buddy ✔ — ga naar Chat
              </span>
            )}

            console.log("[BUDDY] accepted", {
  eventId,
  buddyId: otherUserId
})

          </div>
        )
      })}
    </div>
  )
}
