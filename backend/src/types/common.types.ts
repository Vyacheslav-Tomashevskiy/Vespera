// backend/src/types/common.types.ts

export type UUID = string;
export type StellarPublicKey = string;
export type StellarSecretKey = string;
export type TransactionHash = string;
export type ISO8601DateTime = string;

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: ISO8601DateTime;
}
