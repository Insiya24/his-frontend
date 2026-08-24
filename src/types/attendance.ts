export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "HALF_DAY",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceRecord {
  id: number;
  staff_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  branch_id: number;
  manager_id: number | null;
  management_name: string | null;
  management_login_time: string | null;
  check_in: string | null;
  check_out: string | null;
  personal_hygiene_checked: boolean;
  uniform_checked: boolean;
  t_shirt_checked: boolean;
  jeans_checked: boolean;
  shoes_checked: boolean;
  bath_checked: boolean;
  cleanliness_checked: boolean;
  hygiene_checked_at: string | null;
  remarks: string | null;
}

export interface AttendanceListParams {
  branch_id?: number;
  attendance_date?: string;
  month?: string;
  staff_id?: number;
  page?: number;
  page_size?: number;
}

export interface AttendanceCreateRequest {
  staff_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  management_login_time?: string;
  t_shirt_checked?: boolean;
  jeans_checked?: boolean;
  shoes_checked?: boolean;
  bath_checked?: boolean;
  cleanliness_checked?: boolean;
  hygiene_checked_at?: string;
  remarks?: string;
}

export interface AttendanceUpdateRequest {
  status?: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  personal_hygiene_checked?: boolean;
  uniform_checked?: boolean;
  t_shirt_checked?: boolean;
  jeans_checked?: boolean;
  shoes_checked?: boolean;
  bath_checked?: boolean;
  cleanliness_checked?: boolean;
  hygiene_checked_at?: string;
  remarks?: string;
}
