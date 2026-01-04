import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ProfileForm({ profileDirty, setProfileDirty }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [countryCode, setCountryCode] = useState('NL')
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [openForBuddy, setOpenForBuddy] = useState(true)


  // ✅ Profielgegevens inladen bij openen formulier
  useEffect(() => {
    const loadProfile = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Fout bij ophalen profiel:', error.message)
        return
      }

      if (data) {
  setFirstName(data.first_name || '')
  setLastName(data.last_name || '')
  setOpenForBuddy(data.open_for_buddy ?? true)
  setCountryCode(data.country_code || 'NL')
  setExperienceLevel(data.experience_level || 'beginner')
  setProfileDirty(false) // 🔥 BELANGRIJK: geladen data = clean
}

    }

    loadProfile()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error: userError } = await supabase.auth.getUser()
    const userId = data?.user?.id

    if (!userId) {
      setStatus('User not authenticated.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        country_code: countryCode,
        experience_level: experienceLevel,
        open_for_buddy: openForBuddy,
        updated_at: new Date().toISOString()
      })

    if (error) {
      setStatus('Fout bij opslaan: ' + error.message)
    } else {
  setStatus('Profiel opgeslagen!')
  setProfileDirty(false) // ✅ PROFIEL IS WEER CLEAN
}

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Mijn Profiel</h2>

      <label>
        Voornaam:
        <input
  value={firstName}
  onChange={(e) => {
    setFirstName(e.target.value)
    setProfileDirty(true)
  }}
  required
/>
      </label>

      <label>
        Achternaam:
        <input
  value={lastName}
  onChange={(e) => {
    setLastName(e.target.value)
    setProfileDirty(true)
  }}
  required
/>

      </label>

      <label>
        Landcode:
        <input
  value={countryCode}
  onChange={(e) => {
    setCountryCode(e.target.value)
    setProfileDirty(true)
  }}
  required
/>

      </label>

      <label>
        Niveau:
        <select
  value={experienceLevel}
  onChange={(e) => {
    setExperienceLevel(e.target.value)
    setProfileDirty(true)
  }}
>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>

<label style={{ display: "block", marginTop: "12px" }}>
  <input
  type="checkbox"
  checked={openForBuddy}
  onChange={(e) => {
    setOpenForBuddy(e.target.checked)
    setProfileDirty(true)
  }}
/>

  {" "}Ik sta open voor een buddy
</label>

{profileDirty && (
  <p style={{ color: "#c0392b", fontSize: "0.9em" }}>
    ⚠️ Wijzigingen zijn pas actief na opslaan
  </p>
)}


      <button type="submit" disabled={loading}>
        {loading ? 'Opslaan...' : 'Profiel opslaan'}
      </button>

      {status && <p>{status}</p>}
    </form>
  )
}
