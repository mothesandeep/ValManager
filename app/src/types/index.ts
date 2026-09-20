export interface SyncFailure {
  id: string
  table_name: string | null
  record_id: string | null
  error: string | null
  attempted_at: string
}
