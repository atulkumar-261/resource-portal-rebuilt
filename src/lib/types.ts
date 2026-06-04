export type Role = "admin" | "user";

export interface Resource {
  id: string;
  fullName: string;
  jobTitle: string;
  email: string;
  employeeId: string;
  skillset: string;
  phone: string;
  address: string;
  citizenOf: string;
  passportNumber: string;
  passportExpiry: string;
  visaNumber: string;
  visaExpiry: string;
  niNumber: string;
  dob: string;
  bankAccount: string;
  sortCode: string;
  bankName: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyEmail: string;
  emergencyAddress: string;
  status: "active" | "pending";
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "on-hold";
  description: string;
}

export interface Task {
  id: string;
  subject: string;
  startDate: string;
  resourceId: string;
  resourceName: string;
  project: string;
  notes: string;
  status: "pending" | "in-progress" | "completed";
}

export interface Leave {
  id: string;
  resourceId: string;
  resourceName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  type: "Annual" | "Sick" | "Unpaid" | "Casual";
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export interface Timesheet {
  id: string;
  resourceId: string;
  resourceName: string;
  weekNumber: number;
  weekEndDate: string;
  totalHours: number;
  status: "pending" | "approved" | "rejected";
}

export interface Payslip {
  id: string;
  resourceId: string;
  resourceName: string;
  month: string;
  days: number;
  notes: string;
  amount: number;
}

export interface Announcement {
  id: string;
  subject: string;
  message: string;
  date: string;
}
