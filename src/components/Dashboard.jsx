import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from "../supabaseClient"
import EventsList from "./EventsList"
import EventDetail from "./EventDetail"
import ProfileForm from "../ProfileForm"
import Home from "../Home"
import { useState } from "react"


const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("[AUTH] logout failed", error)
    alert("Uitloggen mislukt")
    return
  }

  console.info("[AUTH] user logged out")
  window.location.reload()
}


export default function Dashboard({ session }) {
  const [profileDirty, setProfileDirty] = useState(false)
  return (
    <BrowserRouter>
      {/* ⭐ Nav-balk */}
      <nav style={{ padding: "12px", background: "#eee", marginBottom: "20px" }}>
  <Link to="/">Home</Link> |{" "}
  <Link to="/profile">Profiel</Link> |{" "}
  <Link to="/events">Events</Link> |{" "}
  <button
    onClick={handleLogout}
    style={{
      background: "none",
      border: "none",
      color: "#0077cc",
      cursor: "pointer",
      padding: 0
    }}
  >
    Uitloggen
  </button>
</nav>


      {/* ⭐ Router */}
      <Routes>
        <Route path="/" element={<Home session={session} />} />
        <Route
  path="/profile"
  element={
    <ProfileForm
      session={session}
      profileDirty={profileDirty}
      setProfileDirty={setProfileDirty}
    />
  }
/>
        <Route path="/events" element={<EventsList session={session} />} />
        <Route path="/events/:id" element={<EventDetail session={session} />} />
      </Routes>
    </BrowserRouter>
  )
}
