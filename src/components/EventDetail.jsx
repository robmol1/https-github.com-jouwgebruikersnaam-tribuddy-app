import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../supabaseClient"
import EventParticipants from "./EventParticipants"
import BuddyMatches from "./BuddyMatches"
import EventChatPanel from "./EventChatPanel"

// TODO: BuddyMatches component komt later → alvast voorbereiden
// import BuddyMatches from "./BuddyMatches"

export default function EventDetail({ session }) {
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [buddyEnabled, setBuddyEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState("participants")
  const [participantsVersion, setParticipantsVersion] = useState(0)

  const handleJoin = async () => {
    console.log("[EVENT] join button clicked", {
      action: joined ? "leave" : "join",
      eventId: id,
      userId: session?.user?.id
    })

    if (!session?.user) {
      alert("Log in om mee te doen aan dit event.")
      return
    }

    // profiel check
    if (!joined) {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()

      if (!profile) {
        alert("Sla eerst je profiel op voordat je aan een event kunt deelnemen.")
        return
      }
    }

    if (!joined) {
      const { error } = await supabase
        .from("user_events")
        .insert({
          user_id: session.user.id,
          event_id: id,
          buddy_enabled: false
        })

      if (!error) {
        console.log("[EVENT] joined", { eventId: id })
        setJoined(true)
        setParticipantsVersion(v => v + 1)
      }
    } else {
      const { error } = await supabase
        .from("user_events")
        .delete()
        .eq("user_id", session.user.id)
        .eq("event_id", id)

      if (!error) {
        console.log("[EVENT] left", { eventId: id })
        setJoined(false)
        setParticipantsVersion(v => v + 1)
      }
    }
  }

const handleBuddyToggle = async (e) => {
  const newValue = e.target.checked

  console.log("[EVENT] buddy toggle clicked", {
    eventId: id,
    userId: session.user.id,
    enabled: newValue
  })

  setBuddyEnabled(newValue)

  const { error } = await supabase
    .from("user_events")
    .update({ buddy_enabled: newValue })
    .eq("user_id", session.user.id)
    .eq("event_id", id)

  if (error) {
    console.error("[EVENT] buddy toggle failed", error)
    // rollback UI
    setBuddyEnabled(!newValue)
  } else {
    console.log("[EVENT] buddy toggle saved", {
      eventId: id,
      enabled: newValue
    })
  }
}


  useEffect(() => {
  const loadEvent = async () => {
    console.log("[EVENT] load start", {
      eventId: id,
      userId: session?.user?.id
    })

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("[EVENT] load failed", error)
      setLoading(false)
      return
    }

    setEvent(data)

    console.log("[EVENT] loaded", {
      eventId: data.id,
      name: data.name
    })

    if (session?.user) {
      const { data: joinData } = await supabase
        .from("user_events")
        .select("id, buddy_enabled")
        .eq("user_id", session.user.id)
        .eq("event_id", id)
        .maybeSingle()

      setJoined(!!joinData)
      setBuddyEnabled(joinData?.buddy_enabled ?? false)

      console.log("[EVENT] join status", {
        joined: !!joinData,
        buddyEnabled: joinData?.buddy_enabled ?? false
      })
    }

    setLoading(false)
  }

  loadEvent()
}, [id, session])


  if (loading) return <p>Evenement laden...</p>
  if (!event) return <p>Event niet gevonden.</p>

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>{event.name}</h2>

      <p><strong>Datum:</strong> {event.event_date}</p>
      <p><strong>Locatie:</strong> {event.city}, {event.country}</p>
      <p><strong>Organisator:</strong> {event.organizer}</p>
      <p><strong>Afstand:</strong> {event.distance}</p>

      <a href={event.website} target="_blank" rel="noopener noreferrer">
        Officiële website
      </a>

      <hr />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <button
          onClick={() => setActiveTab("participants")}
          style={{
            border: "none",
            background: activeTab === "participants" ? "#eee" : "transparent",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Deelnemers
        </button>

        <button
          onClick={() => setActiveTab("buddies")}
          style={{
            border: "none",
            background: activeTab === "buddies" ? "#eee" : "transparent",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Buddy Matches
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          style={{
            border: "none",
            background: activeTab === "chat" ? "#eee" : "transparent",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Chat
        </button>
      </div>


      <hr />

{/* Join / Leave */}
<button onClick={handleJoin}>
  {joined ? "Leave Event" : "Join Event"}
</button>

{/* Buddy toggle */}
{joined && (
  <label style={{ display: "block", marginTop: "10px" }}>
    <input
  type="checkbox"
  checked={buddyEnabled}
  onChange={handleBuddyToggle}
/>
    Ik zoek een buddy voor dit event
  </label>
)}


      {/* TAB CONTENT */}
      {activeTab === "participants" && (
  <EventParticipants
    eventId={id}
    session={session}
    joined={joined}
  />
)}


      {activeTab === "buddies" && joined && (
  <BuddyMatches
    eventId={id}
    session={session}
    joined={joined}
    participantsVersion={participantsVersion}
  />
)}

{activeTab === "buddies" && !joined && (
  <p>Neem deel aan dit event om buddies te bekijken.</p>
)}



      {activeTab === "chat" && session?.user && (
  <EventChatPanel
    eventId={id}
    session={session}
    participantsVersion={participantsVersion}
  />
)}

    </div>
  )
}
