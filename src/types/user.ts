export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "user" | "admin";

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  hospitalName?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface UsageLog {
  id: string;
  uid: string;
  email: string;
  route: string;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  createdAt: string;
}
