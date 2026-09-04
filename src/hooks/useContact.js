import { useEffect, useState } from 'react'
import { getContact } from '../lib/api'

export function useContact(mobile) {
  const [contactByMobile, setContactByMobile] = useState({})

  useEffect(() => {
    if (mobile == null || contactByMobile[mobile]) return undefined

    let cancelled = false
    getContact(mobile)
      .then((data) => {
        if (!cancelled) setContactByMobile((prev) => ({ ...prev, [mobile]: data }))
      })
      .catch(() => {
        if (!cancelled) setContactByMobile((prev) => ({ ...prev, [mobile]: { mobile, name: mobile, stopService: false } }))
      })

    return () => {
      cancelled = true
    }
  }, [mobile, contactByMobile])

  const contact = mobile != null ? contactByMobile[mobile] || null : null
  return { contact, isLoading: mobile != null && !contact }
}