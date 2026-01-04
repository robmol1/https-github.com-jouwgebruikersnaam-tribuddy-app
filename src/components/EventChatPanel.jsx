import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function EventChatPanel({
  eventId,
  session,
  participantsVersion = 0
}) {
  const userId = session.user.id

  const [matches, setMatches] = useState([])
  const [activeMatch, setActiveMatch] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [activeParticipants, setActiveParticipants] = useState([])
  
useEffect(() => {
  if (!activeMatch) {
    setMessages([])
    return
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("match_id", activeMatch.id)
      .order("timestamp", { ascending: true })

    setMessages(data || [])
  }

  loadMessages()
}, [activeMatch?.id])


  /* --------------------------------------------------
     1️⃣ Load accepted matches (chat-buddies)
  -------------------------------------------------- */
useEffect(() => {
  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from("user_events")
      .select("user_id")
      .eq("event_id", eventId)

    if (error) {
      console.error("Load participants error:", error)
      return
    }

    setActiveParticipants(data.map(d => d.user_id))
  }

  loadParticipants()
}, [eventId, participantsVersion])


  useEffect(() => {
    const loadMatches = async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          user1_id,
          user2_id,
          status,
          users1:users!matches_user1_id_fkey(first_name,last_name),
          users2:users!matches_user2_id_fkey(first_name,last_name)
        `)
        .eq("event_id", eventId)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (error) {
        console.error("Load matches error:", error)
        return
      }

      // Alleen accepted, 1 per buddy
      const byBuddy = new Map()
      for (const m of data.filter(m => m.status === "accepted")) {
        const buddyId =
          m.user1_id === userId ? m.user2_id : m.user1_id
        if (!byBuddy.has(buddyId)) byBuddy.set(buddyId, m)
      }

      const filtered = Array.from(byBuddy.values()).filter(m => {
  const buddyId =
    m.user1_id === userId ? m.user2_id : m.user1_id

  return (
    activeParticipants.includes(userId) &&
    activeParticipants.includes(buddyId)
  )
})

setMatches(filtered)

    }

    loadMatches()
  }, [eventId, userId, activeParticipants, participantsVersion])



  /* --------------------------------------------------
     2️⃣ Load messages for selected match
  -------------------------------------------------- */
  useEffect(() => {
    if (!activeMatch) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("match_id", activeMatch.id)
        .order("timestamp", { ascending: true })

      setMessages(data || [])
    }

    loadMessages()
  }, [activeMatch?.id])

  /* --------------------------------------------------
     3️⃣ Realtime updates
  -------------------------------------------------- */
  useEffect(() => {
    if (!activeMatch) return

    const channel = supabase
      .channel(`chat-${activeMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `match_id=eq.${activeMatch.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.find((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new]
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeMatch?.id])

  useEffect(() => {
  if (
    activeMatch &&
    !matches.find(m => m.id === activeMatch.id)
  ) {
    setActiveMatch(null)
  }
}, [matches, activeMatch])

  /* --------------------------------------------------
     4️⃣ Send message
  -------------------------------------------------- */
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeMatch) return

    await supabase.from("chat_messages").insert({
      match_id: activeMatch.id,
      sender_id: userId,
      message_text: newMessage,
    })

    setNewMessage("")
  }

  const buddyName = (m) => {
    const b = m.user1_id === userId ? m.users2 : m.users1
    return `${b.first_name} ${b.last_name}`
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  return (
    <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
      {/* Links: chatlijst */}
      <div style={{ width: "220px", borderRight: "1px solid #ddd" }}>
        <h3>Chats</h3>

        {matches.length === 0 && (
          <p style={{ color: "#666" }}>
            Geen buddies om mee te chatten.
          </p>
        )}

        {matches.map((m) => (
          <div
            key={m.id}
            onClick={() => setActiveMatch(m)}
            style={{
              padding: "8px",
              cursor: "pointer",
              background:
                activeMatch?.id === m.id ? "#eef5ff" : "transparent",
            }}
          >
            {buddyName(m)}
          </div>
        ))}
      </div>

      {/* Rechts: chat */}
      <div style={{ flex: 1 }}>
        {matches.length === 0 ? (
  <p style={{ color: "#666" }}>
    Geen actieve chats voor dit event
  </p>
) : !activeMatch ? (
  <p style={{ color: "#666" }}>
    Selecteer een buddy om te chatten
  </p>
) : (

          <>
            <h3>{buddyName(activeMatch)}</h3>

            <div
              style={{
                minHeight: "200px",
                border: "1px solid #ddd",
                padding: "8px",
                marginBottom: "8px",
                overflowY: "auto",
              }}
            >
              {messages.length === 0 && (
                <p style={{ color: "#999" }}>
                  Nog geen berichten
                </p>
              )}

              {messages.map((m) => (
                <div key={m.id}>
                  <strong>
                    {m.sender_id === userId ? "Jij" : "Buddy"}:
                  </strong>{" "}
                  {m.message_text}
                </div>
              ))}
            </div>

            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Typ een bericht…"
              style={{ width: "75%", marginRight: "6px" }}
            />
            <button onClick={sendMessage}>Verstuur</button>
          </>
        )}
      </div>
    </div>
  )
}
