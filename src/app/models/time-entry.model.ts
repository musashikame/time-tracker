export interface TimeEntry {
  id: string;
  projectId: string;
  /** yyyy-MM-dd — the day this entry counts toward */
  date: string;
  /** ISO datetime */
  start: string;
  /** ISO datetime */
  end: string;
  durationMinutes: number;
  notes?: string;
}
