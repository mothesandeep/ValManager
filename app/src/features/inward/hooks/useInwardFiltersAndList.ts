import { useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { exportTableToCSV, getSanitizedFilename } from '@/utils/exportHelpers'
import { currentMonthStr, shiftMonth, fmtDate } from '@/utils/date'
import { getGlobalSettings, resolvePartyRolaWeight } from '@/features/settings/utils'
import type {
  InwardReceiptGroup,
  InwardSortField,
  DateRangeOption,
  WeightFilterOption,
} from '@/features/inward/types/inward.types'
import type { PrintableChallanItem } from '@/features/outward/sheets/ChallanPrintModal'

export function useInwardFiltersAndList(optimisticDeletedIds: Set<string>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { receipts, parties } = useData()
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
  const [weightFilter, setWeightFilter] = useState<WeightFilterOption>('all')
  const [sortField, setSortField] = useState<InwardSortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [singlePrintGroup, setSinglePrintGroup] = useState<PrintableChallanItem | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [modalChallanImage, setModalChallanImage] = useState<string | null>(null)
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const tableScrollRef = useRef<HTMLDivElement>(null)

  const baseDateReceipts = useMemo(() => filterByMonth(receipts), [receipts, filterByMonth])

  const partyReceiptCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of baseDateReceipts) {
      if (r.party_id) counts[r.party_id] = (counts[r.party_id] || 0) + 1
    }
    return counts
  }, [baseDateReceipts])

  const displayReceipts = useMemo(() => {
    let list = selectedPartyId ? baseDateReceipts.filter((r) => r.party_id === selectedPartyId) : baseDateReceipts
    if (optimisticDeletedIds.size > 0) {
      list = list.filter((r) => !optimisticDeletedIds.has(r.id))
    }
    return list
  }, [baseDateReceipts, selectedPartyId, optimisticDeletedIds])

  const monthGross = useMemo(() => {
    return Math.round(displayReceipts.reduce((s, r) => s + (Number(r.gross_weight) || 0), 0) * 1000) / 1000
  }, [displayReceipts])

  const monthNet = useMemo(() => {
    return Math.round(displayReceipts.reduce((s, r) => s + (Number(r.net_weight) || 0), 0) * 1000) / 1000
  }, [displayReceipts])

  const monthRolaCount = useMemo(() => {
    return displayReceipts.reduce((s, r) => s + (Number(r.rola_count) || 0), 0)
  }, [displayReceipts])

  const monthRolaWeight = useMemo(() => {
    return Math.round(displayReceipts.reduce((s, r) => s + (Number(r.tare_weight) || 0), 0) * 1000) / 1000
  }, [displayReceipts])

  const groupedReceipts = useMemo((): InwardReceiptGroup[] => {
    const groups: Record<string, InwardReceiptGroup> = {}

    displayReceipts.forEach((r) => {
      const chClean = (r.challan_no || '').trim()
      const key = chClean
        ? `ch:${chClean}:${r.party_id}:${r.date}`
        : `batch:${r.party_id}:${r.date}:${r.created_at ? r.created_at.slice(0, 16) : r.id}`
      if (!groups[key]) {
        groups[key] = {
          id: key,
          challan_no: r.challan_no || '—',
          party_name: r.party?.name || 'Unknown',
          date: r.date,
          gross: 0,
          tare: 0,
          net: 0,
          rola: 0,
          bagsCount: 0,
          receipts: [],
          hasBig: false,
          imageUrl: null,
        }
      }
      groups[key].gross += Number(r.gross_weight) || 0
      groups[key].tare += Number(r.tare_weight) || 0
      const rNet =
        r.net_weight !== null && r.net_weight !== undefined
          ? Number(r.net_weight)
          : Math.max(0, (Number(r.gross_weight) || 0) - (Number(r.tare_weight) || 0))
      groups[key].net += rNet
      groups[key].rola += Number(r.rola_count) || 0
      groups[key].bagsCount += 1
      groups[key].receipts.push(r)

      const imgVal = r.image_url || r.challan_image
      if (imgVal && !groups[key].imageUrl) {
        groups[key].imageUrl = imgVal
      }

      const rolaVal = Number(r.rola_count) || 0
      if (rolaVal > 0 && Number(r.gross_weight) > 0 && Number(r.tare_weight) > 0) {
        const boriKg = getGlobalSettings().defaultBoriGrams / 1000 || 0.1
        const tareVal = Number(r.tare_weight)
        const tareWithoutBori = tareVal >= boriKg ? tareVal - boriKg : tareVal
        const perRolaGrams = Math.round((tareWithoutBori * 1000) / rolaVal)
        const normalWeight = resolvePartyRolaWeight(r.party)
        if (perRolaGrams > normalWeight + 15) {
          groups[key].hasBig = true
        }
      }
    })

    return Object.values(groups)
  }, [displayReceipts])

  const searchedReceiptGroups = useMemo(() => {
    let result = groupedReceipts
    if (weightFilter === 'under10') result = result.filter((g) => g.net < 10)
    else if (weightFilter === '10to25') result = result.filter((g) => g.net >= 10 && g.net <= 25)
    else if (weightFilter === 'over25') result = result.filter((g) => g.net > 25)

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((g) => {
        const chMatch = g.challan_no && g.challan_no !== '—' ? g.challan_no.toLowerCase().includes(q) : false
        const partyMatch = g.party_name.toLowerCase().includes(q)
        const dateMatch = fmtDate(g.date).toLowerCase().includes(q)
        return chMatch || partyMatch || dateMatch
      })
    }
    return result
  }, [groupedReceipts, weightFilter, searchQuery])

  const sortedReceiptGroups = useMemo(() => {
    const list = [...searchedReceiptGroups]
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'challan_no') cmp = (a.challan_no || '').localeCompare(b.challan_no || '')
      else if (sortField === 'party_name') cmp = a.party_name.localeCompare(b.party_name)
      else if (sortField === 'gross') cmp = a.gross - b.gross
      else if (sortField === 'rola') cmp = a.rola - b.rola
      else if (sortField === 'net') cmp = a.net - b.net
      else if (sortField === 'bagsCount') cmp = a.bagsCount - b.bagsCount
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return list
  }, [searchedReceiptGroups, sortField, sortOrder])

  const paginatedReceiptGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedReceiptGroups.slice(start, start + pageSize)
  }, [sortedReceiptGroups, currentPage, pageSize])

  const totalPages = Math.ceil(sortedReceiptGroups.length / pageSize) || 1
  const filteredTotalGross = useMemo(() => sortedReceiptGroups.reduce((acc, g) => acc + g.gross, 0), [sortedReceiptGroups])
  const filteredTotalTare = useMemo(() => sortedReceiptGroups.reduce((acc, g) => acc + g.tare, 0), [sortedReceiptGroups])
  const filteredTotalNet = useMemo(() => sortedReceiptGroups.reduce((acc, g) => acc + g.net, 0), [sortedReceiptGroups])
  const filteredTotalRolaCount = useMemo(() => sortedReceiptGroups.reduce((acc, g) => acc + g.rola, 0), [sortedReceiptGroups])

  const toggleSort = (field: InwardSortField) => {
    if (sortField === field) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortOrder(field === 'party_name' || field === 'challan_no' ? 'asc' : 'desc')
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

  const dateRangeFilter: DateRangeOption = useMemo(() => {
    if (selectedMonth === 'all') return 'all'
    if (selectedMonth === '7days') return '7days'
    if (selectedMonth.startsWith('custom:')) return 'custom'
    if (selectedMonth === prevMonthStr) return 'last_month'
    if (selectedMonth === curMonthStr) return 'month'
    return 'month'
  }, [selectedMonth, curMonthStr, prevMonthStr])

  const customStartDate = useMemo(() => {
    if (selectedMonth.startsWith('custom:')) return selectedMonth.split(':')[1] || ''
    return ''
  }, [selectedMonth])

  const customEndDate = useMemo(() => {
    if (selectedMonth.startsWith('custom:')) return selectedMonth.split(':')[2] || ''
    return ''
  }, [selectedMonth])

  const handleSelectDateRangeFilter = useCallback(
    (d: DateRangeOption) => {
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

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedPartyId || weightFilter !== 'all' || !isCurrentMonth)

  const mapGroupToPrintableItem = useCallback(
    (g: InwardReceiptGroup): PrintableChallanItem => {
      const party = parties.find((p) => p.name === g.party_name)
      return {
        id: g.id,
        challanNo: g.challan_no !== '—' ? g.challan_no : null,
        date: g.date,
        partyId: party?.id,
        partyName: g.party_name,
        partyPhone: party?.phone || null,
        partyAddress: party?.address || null,
        grossWeight: g.gross,
        tareWeight: g.tare,
        netWeight: g.net,
        rolaCount: g.rola,
        bigRolaCount: g.hasBig ? 1 : 0,
        bagsCount: g.bagsCount,
        breakdown: g.receipts.map((r, idx) => ({
          description: `Bag #${idx + 1}`,
          bags: 1,
          grossKg: Number(r.gross_weight) || 0,
          netKg: Number(r.net_weight) || 0,
        })),
      }
    },
    [parties]
  )

  const handleExportCSV = useCallback(
    (selectedGroupIds?: Set<string>) => {
      const targetGroups =
        selectedGroupIds && selectedGroupIds.size > 0
          ? sortedReceiptGroups.filter((g) => selectedGroupIds.has(g.id))
          : sortedReceiptGroups
      if (!targetGroups.length) return
      const filename = getSanitizedFilename('Inward_Receipts')
      exportTableToCSV({
        filename,
        headers: ['Challan No', 'Party', 'Date', 'Gross Wt (kg)', 'Rola Count', 'Net Kasab (kg)', 'Bags Count'],
        data: targetGroups,
        rowMapper: (g) => [
          g.challan_no !== '—' ? g.challan_no : '',
          g.party_name,
          g.date,
          g.gross.toFixed(3),
          g.rola,
          g.net.toFixed(3),
          g.bagsCount,
        ],
      })
      showToast(`Exported ${targetGroups.length} inward challans to ${filename}`, 'success')
    },
    [sortedReceiptGroups, showToast]
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
    partyReceiptCounts,
    partyFilterButtonLabel,
    weightFilter,
    setWeightFilter,
    weightFilterLabel,
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
    displayReceipts,
    groupedReceipts,
    sortedReceiptGroups,
    paginatedReceiptGroups,
    monthGross,
    monthNet,
    monthRolaCount,
    monthRolaWeight,
    filteredTotalGross,
    filteredTotalTare,
    filteredTotalNet,
    filteredTotalRolaCount,
    handleResetFilters,
    handleExportCSV,
    mapGroupToPrintableItem,
    isPrintModalOpen,
    setIsPrintModalOpen,
    singlePrintGroup,
    setSinglePrintGroup,
    isLightboxOpen,
    setIsLightboxOpen,
    modalChallanImage,
    setModalChallanImage,
    activeRowMenuId,
    setActiveRowMenuId,
    canScrollRight,
    checkTableScroll,
    tableScrollRef,
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
    hasActiveFilters,
  }
}
