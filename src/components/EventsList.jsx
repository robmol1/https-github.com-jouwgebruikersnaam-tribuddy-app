import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from "react-router-dom"

export default function EventsList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)

      // 🔍 Haal ALLE events op (zonder filter)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (error) {
        console.error("Fout bij ophalen events:", error)
        setError(error.message)
        setLoading(false)
        return
      }

      console.log("📦 Events ontvangen:", data)

      // 🔍 Debug alle datums
      data.forEach((e) =>
        console.log(
          '📅 Event:',
          e.name,
          '| event_date:', e.event_date,
          '| typeof:', typeof e.event_date
        )
      )

      setEvents(data)
      setLoading(false)
    }

    fetchEvents()
  }, [])

  if (loading) return <p>Events laden...</p>
  if (error) return <p>Fout: {error}</p>

  return (
    <div>
      <h2>TriBuddy Events</h2>

      {events.length === 0 && <p>Geen events gevonden.</p>}

      <ul>
        {events.map(ev => (
          <li key={ev.id}>
            <Link to={`/events/${ev.id}`}>
              <strong>{ev.name}</strong>
            </Link> — {ev.city}, {ev.country}
            <br />
            Datum: {ev.event_date}
            <br />
            Organisator: {ev.organizer}
          </li>
        ))}
      </ul>
    </div>
  )
}
