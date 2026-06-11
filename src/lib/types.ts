export type Role = "super_admin" | "admin" | "user";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: "super_admin" | "admin";
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  generatedPassword?: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  targetUsername: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  changedFields?: Record<string, unknown> | null;
  createdAt: string;
}

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
  status: "active" | "pending" | "resigned" | "terminated";
  approvalStatus?: string;
  onboardingStatus?: string;
  avatarUrl?: string;
  totalLeaves?: number;
  weeklyAllowedHours?: number;
  oldAddressLog?: string;
  performanceNotes?: string;
  assignedProjects?: string[];
  cvName?: string;
  passportCopyName?: string;
  visaCopyName?: string;
  holidaySheetName?: string;
  otherDocsName?: string;
  otherInfo?: string;
  profileCompletionPercentage: number;
  userIsActive: boolean;
  isDeleted: boolean;
  hasRequiredDocuments: boolean;
}

export function isResourceAssignable(resource: Resource) {
  return (
    resource.status === "active" &&
    resource.approvalStatus === "approved" &&
    resource.onboardingStatus === "completed" &&
    resource.profileCompletionPercentage >= 80 &&
    resource.userIsActive === true &&
    resource.isDeleted !== true
  );
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
  status: "pending" | "in-progress" | "completed" | "wanting-requirements";
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
  status: "pending" | "approved" | "rejected" | "deleted" | "in draft";
  projectName?: string;
  dailyHours?: number[];
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

export interface ProjectRequirement {
  id: number;
  projectId: string;
  moduleName: string;
  description?: string;
  estimatedHours: number;
  priority: string;
  status: string;
  createdAt?: string;
}

export interface ProjectSkillRequirement {
  id: number;
  requirementId: number;
  skillId: string;
  requiredLevel?: string;
  mandatory: boolean;
}

export interface ProjectAssignment {
  id: number;
  projectId: string;
  requirementId: number;
  resourceId: string;
  assignmentType?: string;
  assignedBy?: string;
  assignedAt?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  requirementId: number;
  resourceId: string | null;
  resourceName: string;
  parentTaskId: string | null;
  taskName: string;
  description: string | null;
  estimatedHours: number;
  actualHours: number;
  priority: string;
  status: "pending" | "in_progress" | "paused" | "completed";
  startDate: string | null;
  endDate: string | null;
  dependsOn: string[];
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  resourceId: string | null;
  action: "started" | "paused" | "completed" | "reopened";
  createdAt: string;
}

export interface TaskScheduleEntry {
  id: string;
  taskId: string;
  resourceId: string;
  workDate: string;
  plannedHours: number;
  status: string;
}

export interface TaskTimeLog {
  id: string;
  taskId: string;
  resourceId: string;
  hoursLogged: number;
  notes: string | null;
  loggedAt: string;
}

export interface DailyReportItem {
  id: string;
  reportId: string;
  taskId: string;
  taskName?: string;
  hoursSpent: number;
  completionPercent: number;
  comments?: string;
}

export interface ReportFlag {
  id: string;
  reportId: string;
  flagType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
}

export interface ReportAnalysisResult {
  summary?: string;
  progressScore: number;
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
}

export interface DailyReport {
  id: string;
  resourceId: string;
  resourceName?: string;
  projectId: string;
  projectName?: string;
  workDate: string;
  workDone?: string;
  blockers?: string;
  tomorrowPlan?: string;
  hoursWorked: number;
  status: "pending" | "analyzed";
  createdAt: string;
  submittedAt: string;
  items?: DailyReportItem[];
  analysisResult?: ReportAnalysisResult | null;
  flags?: ReportFlag[];
}

export interface ModuleProgress {
  moduleId: number;
  moduleName: string;
  progress: number;
  estimatedHours: number;
  completedHours: number;
}

export interface BurndownPoint {
  workDate: string;
  plannedRemainingHours: number;
  actualRemainingHours: number;
}

export interface ProjectProgress {
  projectId: string;
  overallProgress: number;
  moduleProgress: ModuleProgress[];
  estimatedHours: number;
  actualHours: number;
  burndownData: BurndownPoint[];
  riskLevel: "low" | "medium" | "high";
  riskWarnings: string[];
}

export interface ProductivityMetrics {
  id: string;
  name: string;
  reportsSubmitted: number;
  hoursLogged: number;
  tasksCompleted: number;
  currentProgress: number;
  reportingStreak: number;
  efficiencyMetrics?: {
    efficiencyScore?: number;
    auditsFailed?: number;
    activeDevelopers?: number;
    tasksTotal?: number;
  };
}

