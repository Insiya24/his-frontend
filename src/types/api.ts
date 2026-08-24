export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  records: T[];
  pagination: PaginationMeta;
}
