import { useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { exportTableToCSV, getSanitizedFilename } from '@/utils/exportHelpers'
import { currentMonthStr, shiftMonth, fmtDate } from '@/utils/date'
import type {
  DispatchWithParty,
  ChallanGroup,
  DispatchSortField,
  DispatchWeightFilter,
  DispatchDateRange,
} from '@/features/outward/types'
import type { PrintableChallanItem } from '@/features/outward/sheets/ChallanPrintModal'

export function useOutwardFiltersAndList(optimisticDeletedIds: Set<string>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { dispatches, parties } = useData()
  const {
    filterByMonth,
    selectedMonth,
    setSelectedMonth,
    setThisMonth,
    setLastMonth,
    setLast7Days,
    setAllTime,
    setCustomRange,
    formattedMonth,
    dateFilterLabel,
    isAllTime,
    isCurrentMonth,
  } = useMonth()
  const { showToast } = useToast()

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(() => searchParams.get('party') || null)
  const [weightFilter, setWeightFilter] = useState<DispatchWeightFilter>('all')
  const [sortField, setSortField] = useState<DispatchSortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printModalInitialView, setPrintModalInitialView] = useState<'register' | 'statement' | 'challan'>('register')
  const [singlePrintGroup, setSinglePrintGroup] = useState<PrintableChallanItem | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [modalChallanImage, setModalChallanImage] = useState<string | null>(null)
  const [activeRowMenuKey, setActiveRowMenuKey] = useState<string | null>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)

  const isRolaEntry = (d: DispatchWithParty) => d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'

  const baseDateDispatches = useMemo(() => filterByMonth(dispatches), [dispatches, filterByMonth])

  const partyDispatchCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of baseDateDispatches) {
      if (d.party_id) counts[d.party_id] = (counts[d.party_id] || 0) + 1
    }
    return counts
  }, [baseDateDispatches])

  const displayDispatches = useMemo(() => {
    let list = selectedPartyId ? baseDateDispatches.filter((d) => d.party_id === selectedPartyId) : baseDateDispatches
    if (optimisticDeletedIds.size > 0) {
      list = list.filter((d) => !optimisticDeletedIds.has(d.id))
    }
    return list
  }, [baseDateDispatches, selectedPartyId, optimisticDeletedIds])

  const monthValNet = useMemo(() => {
    return (
      Math.round(
        displayDispatches.filter((d) => !isRolaEntry(d)).reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0) * 1000
      ) / 1000
    )
  }, [displayDispatches])

  const monthValGross = useMemo(() => {
    return (
      Math.round(
        displayDispatches.filter((d) => !isRolaEntry(d)).reduce((s, d) => s + (Number(d.bore_gross_weight) || 0), 0) * 1000
      ) / 1000
    )
  }, [displayDispatches])

  const monthBilling = useMemo(() => displayDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0), [displayDispatches])

  const monthRolaCount = useMemo(() => {
    return displayDispatches.filter((d) => isRolaEntry(d)).reduce((s, d) => s + (Number(d.rola_count) || 0), 0)
  }, [displayDispatches])

  const monthRolaGross = useMemo(() => {
    return (
      Math.round(
        displayDispatches.filter((d) => isRolaEntry(d)).reduce((s, d) => s + (Number(d.bore_gross_weight) || 0), 0) * 1000
      ) / 1000
    )
  }, [displayDispatches])

  const challanGroups = useMemo((): ChallanGroup[] => {
    const grouped: Map<string, DispatchWithParty[]> = new Map()
    for (const d of displayDispatches) {
      const chClean = (d.challan_no || '').trim()
      const key = chClean
        ? `ch:${chClean}:${d.party_id}:${d.date}`
        : `batch:${d.party_id}:${d.date}:${d.created_at ? d.created_at.slice(0, 16) : d.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }
    return Array.from(grouped.entries()).map(([key, rawEntries]) => {
      const entries = [...rawEntries].sort((a, b) => {
        const aIsRola = isRolaEntry(a) ? 1 : 0
        const bIsRola = isRolaEntry(b) ? 1 : 0
        return aIsRola - bIsRola
      })
      const first = entries[0]
      const totalGross = entries.reduce((s, e) => s + (Number(e.bore_gross_weight) || 0), 0)
      const totalValNet = entries.reduce((s, e) => s + (!isRolaEntry(e) ? Number(e.net_val_weight) || 0 : 0), 0)
      const totalRolaGross = entries.reduce((s, e) => s + (isRolaEntry(e) ? Number(e.bore_gross_weight) || 0 : 0), 0)
      const totalRolaCount = entries.reduce((s, e) => s + (isRolaEntry(e) ? Number(e.rola_count) || 0 : 0), 0)
      const totalNet = totalValNet + totalRolaGross
      const totalAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id || '',
        partyName: first.party?.name ?? '—',
        entries,
        totalGross,
        totalNet,
        totalValNet,
        totalRolaGross,
        totalRolaCount,
        totalAmount,
        hasVal: entries.some((e) => !isRolaEntry(e)),
        hasRola: entries.some((e) => isRolaEntry(e)),
        imageUrl:
          entries.find((e) => e.image_url || e.challan_image || e.image_data)?.image_url ||
          entries.find((e) => e.image_url || e.challan_image || e.image_data)?.challan_image ||
          entries.find((e) => e.image_url || e.challan_image || e.image_data)?.image_data ||
          null,
      }
    })
  }, [displayDispatches])

  const searchedChallanGroups = useMemo(() => {
    let result = challanGroups
    if (weightFilter === 'under10') result = result.filter((g) => g.totalValNet < 10)
    else if (weightFilter === '10to25') result = result.filter((g) => g.totalValNet >= 10 && g.totalValNet <= 25)
    else if (weightFilter === 'over25') result = result.filter((g) => g.totalValNet > 25)

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((g) => {
        const chMatch = g.challanNo ? g.challanNo.toLowerCase().includes(q) : false
        const partyMatch = g.partyName.toLowerCase().includes(q)
        const dateMatch = fmtDate(g.date).toLowerCase().includes(q)
        return chMatch || partyMatch || dateMatch
      })
    }
    return result
  }, [challanGroups, weightFilter, searchQuery])

  const sortedChallanGroups = useMemo(() => {
    const list = [...searchedChallanGroups]
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'challanNo') cmp = (a.challanNo || '').localeCompare(b.challanNo || '')
      else if (sortField === 'partyName') cmp = a.partyName.localeCompare(b.partyName)
      else if (sortField === 'totalValNet') cmp = a.totalValNet - b.totalValNet
      else if (sortField === 'totalRolaGross') cmp = a.totalRolaGross - b.totalRolaGross
      else if (sortField === 'totalRolaCount') cmp = a.totalRolaCount - b.totalRolaCount
      else if (sortField === 'totalAmount') cmp = a.totalAmount - b.totalAmount
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return list
  }, [searchedChallanGroups, sortField, sortOrder])

  const paginatedChallanGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedChallanGroups.slice(start, start + pageSize)
  }, [sortedChallanGroups, currentPage, pageSize])

  const totalPages = Math.ceil(sortedChallanGroups.length / pageSize) || 1
  const filteredTotalValNet = useMemo(() => sortedChallanGroups.reduce((acc, g) => acc + g.totalValNet, 0), [sortedChallanGroups])
  const filteredTotalGross = useMemo(() => sortedChallanGroups.reduce((acc, g) => acc + g.totalGross, 0), [sortedChallanGroups])
  const filteredTotalRolaGross = useMemo(() => sortedChallanGroups.reduce((acc, g) => acc + g.totalRolaGross, 0), [sortedChallanGroups])
  const filteredTotalRolaCount = useMemo(() => sortedChallanGroups.reduce((acc, g) => acc + g.totalRolaCount, 0), [sortedChallanGroups])
  const filteredTotalAmount = useMemo(() => sortedChallanGroups.reduce((acc, g) => acc + g.totalAmount, 0), [sortedChallanGroups])

  const toggleSort = (field: DispatchSortField) => {
    if (sortField === field) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortOrder(field === 'partyName' || field === 'challanNo' ? 'asc' : 'desc')
    }
  }

  const handleSelectParty = useCallback(
    (partyId: string | null) => {
      setSelectedPartyId(partyId)
      setCurrentPage(1)
      const newParams = new URLSearchParams(searchParams)
      if (partyId) newParams.set('party', partyId)
      else newParams.delete('party')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    handleSelectParty(null)
    setWeightFilter('all')
    setThisMonth()
    setCurrentPage(1)
  }

  const curMonthStr = currentMonthStr()
  const prevMonthStr = shiftMonth(curMonthStr, -1)

  const dateRangeFilter: DispatchDateRange = useMemo(() => {
    if (selectedMonth === 'all') return 'all'
    if (selectedMonth === '7days') return '7days'
    if (selectedMonth.startsWith('custom:')) return 'custom'
    if (selectedMonth === prevMonthStr) return 'last_month'
    if (selectedMonth === curMonthStr) return 'month'
    return 'month'
  }, [selectedMonth, curMonthStr, prevMonthStr])

  const customStartDate = useMemo(() => {
    if (selectedMonth.startsWith('custom:')) {
      return selectedMonth.split(':')[1] || ''
    }
    return ''
  }, [selectedMonth])

  const customEndDate = useMemo(() => {
    if (selectedMonth.startsWith('custom:')) {
      return selectedMonth.split(':')[2] || ''
    }
    return ''
  }, [selectedMonth])

  const handleSelectDateRangeFilter = useCallback(
    (d: DispatchDateRange) => {
      if (d === 'month') setThisMonth()
      else if (d === 'last_month') setLastMonth()
      else if (d === '7days') setLast7Days()
      else if (d === 'all') setAllTime()
      setCurrentPage(1)
    },
    [setThisMonth, setLastMonth, setLast7Days, setAllTime]
  )

  const handleChangeCustomStart = useCallback(
    (val: string) => {
      setCustomRange(val, customEndDate)
      setCurrentPage(1)
    },
    [setCustomRange, customEndDate]
  )

  const handleChangeCustomEnd = useCallback(
    (val: string) => {
      setCustomRange(customStartDate, val)
      setCurrentPage(1)
    },
    [setCustomRange, customStartDate]
  )

  const partyFilterButtonLabel = useMemo(() => {
    if (!selectedPartyId) return 'All Parties'
    const p = parties.find((x) => x.id === selectedPartyId)
    return p ? p.name : 'All Parties'
  }, [selectedPartyId, parties])

  const weightFilterLabel = useMemo(() => {
    switch (weightFilter) {
      case 'under10': return '< 10 kg'
      case '10to25': return '10 – 25 kg'
      case 'over25': return '> 25 kg'
      default: return 'All Weights'
    }
  }, [weightFilter])

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedPartyId || weightFilter !== 'all' || !isCurrentMonth
  )

  const mapGroupToPrintableItem = useCallback(
    (g: ChallanGroup): PrintableChallanItem => {
      const party = parties.find((p) => p.id === g.partyId || p.name === g.partyName)
      return {
        id: g.key,
        challanNo: g.challanNo,
        date: g.date,
        partyId: g.partyId,
        partyName: g.partyName,
        partyPhone: party?.phone || null,
        partyAddress: party?.address || null,
        grossWeight: g.totalGross,
        tareWeight: Math.max(0, Math.round((g.totalGross - g.totalNet) * 1000) / 1000),
        netWeight: g.totalValNet,
        rolaCount: g.totalRolaCount,
        bigRolaCount: 0,
        bagsCount: g.entries.length,
        amount: g.totalAmount,
        breakdown: g.entries.map((e, idx) => ({
          description: `Bag #${idx + 1} (${e.dispatch_type || 'Val'})`,
          tar: e.cord_count ?? 10,
          twist: e.twist_type || 'S',
          bags: 1,
          grossKg: Number(e.bore_gross_weight) || 0,
          netKg: Number(e.net_val_weight) || 0,
          rate: e.rate_per_kg || 0,
          amount: Number(e.amount) || 0,
        })),
      }
    },
    [parties]
  )

  const handleExportCSV = useCallback(
    (selectedGroupKeys?: Set<string>) => {
      const targetGroups =
        selectedGroupKeys && selectedGroupKeys.size > 0
          ? sortedChallanGroups.filter((g) => selectedGroupKeys.has(g.key))
          : sortedChallanGroups
      if (!targetGroups.length) return
      const filename = getSanitizedFilename('Outward_Dispatches')
      exportTableToCSV({
        filename,
        headers: ['Challan No', 'Party', 'Date', 'Net Val (kg)', 'Rola Gross (kg)', 'Rola Pcs', 'Amount (INR)'],
        data: targetGroups,
        rowMapper: (g) => [
          g.challanNo ? g.challanNo : '',
          g.partyName,
          g.date,
          g.totalValNet.toFixed(3),
          g.totalRolaGross.toFixed(3),
          g.totalRolaCount,
          g.totalAmount.toFixed(2),
        ],
      })
      showToast(`Exported ${targetGroups.length} outward challans to ${filename}`, 'success')
    },
    [sortedChallanGroups, showToast]
  )

  const checkTableScroll = useCallback(() => {
    if (tableScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
    }
  }, [])

  return {
    selectedPartyId,
    setSelectedPartyId,
    handleSelectParty,
    partyDispatchCounts,
    weightFilter,
    setWeightFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    toggleSort,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    displayDispatches,
    challanGroups,
    sortedChallanGroups,
    paginatedChallanGroups,
    monthValNet,
    monthValGross,
    monthBilling,
    monthRolaCount,
    monthRolaGross,
    filteredTotalValNet,
    filteredTotalGross,
    filteredTotalRolaGross,
    filteredTotalRolaCount,
    filteredTotalAmount,
    handleResetFilters,
    handleExportCSV,
    mapGroupToPrintableItem,
    isPrintModalOpen,
    setIsPrintModalOpen,
    printModalInitialView,
    setPrintModalInitialView,
    singlePrintGroup,
    setSinglePrintGroup,
    isLightboxOpen,
    setIsLightboxOpen,
    modalChallanImage,
    setModalChallanImage,
    activeRowMenuKey,
    setActiveRowMenuKey,
    canScrollRight,
    checkTableScroll,
    tableScrollRef,
    rowMenuRef,
    selectedMonth,
    setSelectedMonth,
    formattedMonth,
    dateFilterLabel,
    isAllTime,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    handleSelectDateRangeFilter,
    handleChangeCustomStart,
    handleChangeCustomEnd,
    partyFilterButtonLabel,
    weightFilterLabel,
    hasActiveFilters,
  }
}
