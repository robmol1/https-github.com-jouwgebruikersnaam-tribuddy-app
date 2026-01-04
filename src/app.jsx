import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import Dashboard from "./components/Dashboard"
import Login from "./components/Login" // als je die hebt

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // 1. Huidige sessie ophalen
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // 2. Luisteren op login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    // Cleanup
    return () => listener.subscription.unsubscribe()
  }, [])

  // Niet ingelogd → toon loginpagina
  if (!session) {
    return <Login />
  }

  // Ingelogd → toon dashboard + session object
  return <Dashboard session={session} />
}
