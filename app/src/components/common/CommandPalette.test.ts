import { describe, it, expect } from 'vitest'

describe('CommandPalette Logic', () => {
  it('correctly matches party search queries across name, phone, and aliases', () => {
    const mockParties = [
      { id: '1', name: 'Shree Ganesh Textiles', phone: '9876543210', aliases: ['SGT', 'Ganesh'] },
      { id: '2', name: 'Maruti Kasab Works', phone: '9123456789', aliases: ['MKW'] },
      { id: '3', name: 'Kuber Val Center', phone: null, aliases: [] },
    ]

    const search = (q: string) => {
      const lower = q.trim().toLowerCase()
      return mockParties.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(lower)
        const phoneMatch = p.phone ? p.phone.toLowerCase().includes(lower) : false
        const aliasMatch = p.aliases.some((a) => a.toLowerCase().includes(lower))
        return nameMatch || phoneMatch || aliasMatch
      })
    }

    expect(search('ganesh')).toHaveLength(1)
    expect(search('ganesh')[0].name).toBe('Shree Ganesh Textiles')

    // Search by alias
    expect(search('sgt')).toHaveLength(1)
    expect(search('sgt')[0].id).toBe('1')

    // Search by phone
    expect(search('9123')).toHaveLength(1)
    expect(search('9123')[0].name).toBe('Maruti Kasab Works')

    // No match
    expect(search('nonexistent')).toHaveLength(0)
  })

  it('correctly matches challan numbers for inward and outward dispatches', () => {
    const challans = [
      { type: 'inward', challanNo: 'CH-1024', party: 'Shree Ganesh' },
      { type: 'inward', challanNo: 'CH-1025', party: 'Maruti' },
      { type: 'outward', challanNo: 'VAL-882', party: 'Shree Ganesh' },
    ]

    const filterChallans = (q: string) => {
      const lower = q.trim().toLowerCase()
      return challans.filter((c) => c.challanNo.toLowerCase().includes(lower))
    }

    expect(filterChallans('1024')).toHaveLength(1)
    expect(filterChallans('1024')[0].type).toBe('inward')

    expect(filterChallans('val')).toHaveLength(1)
    expect(filterChallans('val')[0].challanNo).toBe('VAL-882')

    expect(filterChallans('ch-')).toHaveLength(2)
  })
})
