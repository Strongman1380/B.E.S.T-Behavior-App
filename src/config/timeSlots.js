export const TIME_SLOTS = [
  { key: '8:30', label: '8:30 AM - 9:15 AM' },
  { key: '9:15', label: '9:15 AM - 10:00 AM' },
  { key: '10:00', label: '10:00 AM - 10:45 AM' },
  { key: '10:45', label: '10:45 AM - 11:30 AM' },
  { key: '11:30', label: '11:30 AM - 1:00 PM' },
  { key: '1:00', label: '1:00 PM - 1:45 PM' },
  { key: '1:45', label: '1:45 PM - 2:30 PM' },
]

export const TIME_SLOT_KEYS = TIME_SLOTS.map(s => s.key)
export const TIME_SLOT_LABELS = Object.fromEntries(TIME_SLOTS.map(s => [s.key, s.label]))

