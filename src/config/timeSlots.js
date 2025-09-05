export const TIME_SLOTS = [
  { key: '8:30', label: '8:30 a.m. to 9:10 a.m.' },
  { key: '9:10', label: '9:10 AM to 9:50 AM' },
  { key: '9:50', label: '9:50 AM to 10:30 AM' },
  { key: '10:30', label: '10:30 AM to 11:10 AM' },
  { key: '11:10', label: '11:10 AM to lunch' },
  { key: '1:10', label: 'after lunch to 1:10 PM' },
  { key: '1:50', label: '1:10 PM to 1:50 PM' },
  { key: '2:30', label: '1:50 PM to 2:30 PM' },
]

export const TIME_SLOT_KEYS = TIME_SLOTS.map(s => s.key)
export const TIME_SLOT_LABELS = Object.fromEntries(TIME_SLOTS.map(s => [s.key, s.label]))

