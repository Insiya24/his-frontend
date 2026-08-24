export const CLEANING_ITEM_STATUSES = [
  "PENDING",
  "COMPLETED",
  "ISSUE_FOUND",
  "NOT_APPLICABLE",
] as const;

export type CleaningItemStatus = (typeof CLEANING_ITEM_STATUSES)[number];

export interface CleaningChecklist {
  id: number;
  branch_id: number;
  checklist_date: string;
  items: Record<string, CleaningItemData>;
  completed_by_id: number;
  remarks: string | null;
  morning_timing: string | null;
  evening_timing: string | null;
  issues_found: string | null;
  inspection_remarks: string | null;
  manager_verified: boolean;
}

export interface CleaningItemData {
  status?: CleaningItemStatus;
  morning_timing?: string | null;
  evening_timing?: string | null;
  done_by_staff_id?: number | null;
  done_by_staff_name?: string | null;
  issues_found?: string | null;
  remarks?: string | null;
}

export interface CleaningItemPayload {
  status: CleaningItemStatus;
  morning_timing?: string | null;
  evening_timing?: string | null;
  done_by_staff_id?: number | null;
  done_by_staff_name?: string | null;
  issues_found?: string | null;
  remarks?: string | null;
}

export interface CleaningChecklistPayload {
  checklist_date: string;
  items: Record<string, CleaningItemPayload>;
  morning_timing?: string | null;
  evening_timing?: string | null;
  issues_found?: string | null;
  inspection_remarks?: string | null;
  manager_verified?: boolean;
  remarks?: string | null;
}

export const CLEANING_ITEMS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "sweeping_floor", label: "Sweeping Floor" },
  { key: "mopping_floor", label: "Mopping Floor" },
  { key: "plants_watering", label: "Plants Watering" },
  { key: "hair_cut_chair", label: "Hair Cut Chair" },
  { key: "hair_trimmer", label: "Hair Trimmer" },
  { key: "hair_wash_chair", label: "Hair Wash Chair" },
  { key: "hair_dryer", label: "Hair Dryer" },
  { key: "fridge", label: "Fridge" },
  { key: "bowl_brush", label: "Bowl & Brush" },
  { key: "mirrors", label: "Mirrors" },
  { key: "face_steamer", label: "Face Steamer" },
  { key: "head_steamer", label: "Head Steamer" },
  { key: "bakoor_loban", label: "Bakoor / Loban" },
  { key: "outside_board", label: "Outside Board" },
  { key: "ac_working_condition", label: "AC Working Condition" },
  { key: "ac_no_1", label: "AC No. 1" },
  { key: "ac_no_2", label: "AC No. 2" },
  { key: "ac_no_3", label: "AC No. 3" },
];
