import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Permission } from "../auth/permissions";
import { API_BASE_URL } from "../config/env";
import { Brand, BrandingSettings } from "../config/branding";

export type AuthUser = {
  id: string;
  fullName: string;
  username: string;
  role: "owner" | "employee" | "teacher";
  teacherId: string | null;
  permissions: Permission[];
  status: "active" | "inactive";
  lastLoginAt: string | null;
};

export type AuthCredentials = {
  fullName?: string;
  username: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type AuthStatusResponse = {
  setupRequired: boolean;
};

export type Teacher = {
  id: string;
  fullName: string;
  subject: string;
  phone: string;
  telegram: string;
  gender: "male" | "female";
  experienceYears: number;
  monthlySalary: number;
  salaryType: "fixed" | "percentage";
  salaryPercentage: number;
  status: "active" | "inactive";
  note: string;
  groupsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeacherFilters = {
  search?: string;
  subject?: string;
  status?: Teacher["status"];
  page?: number;
  limit?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type TeacherPayload = {
  fullName: string;
  subject: string;
  phone: string;
  telegram?: string;
  gender: Teacher["gender"];
  experienceYears: number;
  monthlySalary: number;
  salaryType: Teacher["salaryType"];
  salaryPercentage: number;
  status: Teacher["status"];
  note?: string;
};

export type Group = {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacher: Teacher | null;
  room: string;
  lessonDays: WeekDay[];
  startTime: string;
  endTime: string;
  startDate: string;
  monthlyPrice: number;
  priceHistory: GroupPriceHistory[];
  isEnrollmentOpen: boolean;
  endedAt: string | null;
  note: string;
  studentsCount: number;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type GroupPriceHistory = {
  price: number;
  startedAt: string;
  endedAt: string | null;
  reason: string;
};

export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type GroupFilters = {
  search?: string;
  subject?: string;
  teacherId?: string;
  status?: Group["status"];
  isEnrollmentOpen?: boolean;
  accessScope?: "reception";
  page?: number;
  limit?: number;
};

export type GroupPayload = {
  name: string;
  subject: string;
  teacherId: string;
  room?: string;
  lessonDays?: WeekDay[];
  startTime?: string;
  endTime?: string;
  startDate: string;
  monthlyPrice: number;
  priceChangeReason?: string;
  isEnrollmentOpen?: boolean;
  status: Group["status"];
  note?: string;
};

export type RoomsResponse = {
  data: string[];
};

export type Student = {
  id: string;
  fullName: string;
  phone: string;
  secondaryPhone: string;
  parentName: string;
  parentPhone: string;
  source: string;
  groupId: string;
  group: Group | null;
  teacher: Teacher | null;
  status: "active" | "inactive" | "paused" | "left";
  paymentStatus: "paid" | "debt";
  advanceBalance: number;
  leftAt: string | null;
  enrollmentHistory: StudentEnrollmentHistory[];
  enrollments: StudentEnrollment[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentEnrollment = {
  id: string;
  groupId: string;
  group: Group | null;
  groupName?: string;
  subject?: string;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "finished";
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  discountReason: string;
};

export type StudentEnrollmentHistory = {
  groupId: string;
  groupName: string;
  subject: string;
  startedAt: string;
  endedAt: string | null;
  endReason: string;
};

export type StudentFilters = {
  search?: string;
  groupId?: string;
  status?: Student["status"];
  paymentStatus?: Student["paymentStatus"];
  view?: "current" | "history";
  page?: number;
  limit?: number;
};

export type StudentPayload = {
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  parentName?: string;
  parentPhone?: string;
  source?: string;
  groupId: string;
  allowClosedGroup?: boolean;
  status: Student["status"];
  paymentStatus: Student["paymentStatus"];
  note?: string;
  discountType?: StudentEnrollment["discountType"];
  discountValue?: number;
  discountReason?: string;
};

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "click";

export type StudentMonthlyBalance = {
  id: string;
  studentId: string;
  groupId: string;
  month: string;
  monthlyPriceSnapshot: number;
  chargedAmount: number;
  pauseDiscountAmount: number;
  courseDiscountAmount: number;
  lessonProrationDiscountAmount: number;
  paidAmount: number;
  debtAmount: number;
  advanceAppliedAmount: number;
  status: "unpaid" | "partial" | "paid" | "overpaid";
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentPoint = {
  id: string;
  fullName: string;
  phone: string;
  status: Student['status'];
  plus: number;
  minus: number;
};

export type StudentPointsResponse = {
  group: Pick<Group, 'id' | 'name' | 'subject'>;
  data: StudentPoint[];
};

export type StudentPointHistoryItem = {
  id: string;
  type: 'plus' | 'minus';
  amount: number;
  delta: number;
  reason: string;
  createdAt: string;
};

export type StudentPointHistoryResponse = {
  student: Pick<StudentPoint, 'id' | 'fullName'>;
  data: StudentPointHistoryItem[];
};

export type StudentPointGroup = Pick<Group, 'id' | 'name' | 'subject'>;

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  allocations: {
    monthlyBalanceId: string | null;
    month: string;
    amount: number;
  }[];
  advanceAmount: number;
  note: string;
  status: "active" | "cancelled" | "refunded";
  reversalReason: string;
  reversedAt: string | null;
  reversedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentHistoryItem = Payment & {
  student: { id: string; fullName: string; phone: string } | null;
  createdBy: { id: string; fullName: string } | null;
};

export type AppNotification = {
  id: string;
  role: "owner" | "admin" | "reception";
  title: string;
  message: string;
  type: "system";
  status: "unread" | "read";
  relatedId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentsDashboard = {
  recentPayments: {
    totalAmount: number;
    totalsByMethod: Partial<Record<PaymentMethod, number>>;
    paymentsCount: number;
    payments: Payment[];
  };
  today: {
    totalAmount: number;
    totalsByMethod: Partial<Record<PaymentMethod, number>>;
    paymentsCount: number;
  };
};

export type FinancialReport = {
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  debt: number;
  paymentsCount: number;
  expensesCount: number;
};

export type StudentSourceReportItem = {
  source: string;
  count: number;
  percent: number;
};

export type StudentSourceReport = {
  from: string;
  to: string;
  total: number;
  topSource: StudentSourceReportItem | null;
  sources: StudentSourceReportItem[];
};

export type CourseStudentReportItem = {
  course: string;
  count: number;
  percent: number;
};

export type CourseStudentReport = {
  total: number;
  courses: CourseStudentReportItem[];
};

export type Debtor = {
  studentId: string;
  fullName: string;
  phone: string;
  secondaryPhone: string;
  parentPhone?: string;
  subject: string;
  groupName: string;
  totalDebt: number;
  months: { balanceId: string; groupId: string; groupName: string; month: string; debtAmount: number }[];
};

export type SendDebtorSmsResult = {
  studentId: string;
  fullName: string;
  phone: string;
  totalDebt: number;
  status: "sent" | "failed";
  error?: string;
  smsResponse?: unknown;
};

export type SendDebtorSmsResponse = {
  message: string;
  totalDebtors: number;
  sentCount: number;
  failedCount: number;
  results: SendDebtorSmsResult[];
};

export type SendDebtorSmsPayload = {
  message?: string;
  studentIds?: string[];
};

export type EskizSmsReportResponse = {
  year: number;
  month: number;
  isGlobal: boolean;
  report: {
    status?: string;
    data?: EskizSmsReportItem[];
    id?: string | null;
    [key: string]: unknown;
  } | null;
};

export type EskizSmsReportItem = {
  month?: string;
  status?: string;
  packets?: number;
  sent_packets?: number;
  [key: string]: unknown;
};

export type StudentPause = {
  id: string;
  studentId: string;
  groupId: string;
  startDate: string;
  endDate: string | null;
  reason: string;
  status: "active" | "finished" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type StudentFinance = {
  summary: {
    totalDebt: number;
    advanceBalance: number;
    paymentStatus: Student["paymentStatus"];
  };
  balances: StudentMonthlyBalance[];
  payments: Payment[];
  pauses: StudentPause[];
  enrollments: (Omit<StudentEnrollment, "group"> & { groupName: string; subject: string })[];
  paymentMethods: PaymentMethod[];
};

export type PaymentPayload = {
  amount: number;
  method: PaymentMethod;
  targetMonth?: string;
  targetBalanceId?: string;
  isAdvance?: boolean;
  paidAt?: string;
  note?: string;
};

export type Expense = {
  id: string;
  name: string;
  category: string;
  method: PaymentMethod;
  amount: number;
  spentAt: string;
  note: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseFilters = {
  search?: string;
  category?: string;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ExpensePayload = {
  name: string;
  category: string;
  method: PaymentMethod;
  amount: number;
  spentAt: string;
  note?: string;
  createdByName?: string;
};

export type ExpensesResponse = PaginatedResponse<Expense> & {
  summary: {
    totalAmount: number;
    totalsByMethod: Record<PaymentMethod, number>;
  };
  categories: string[];
};

export type DashboardActivity = {
  id: string;
  type: "payment" | "expense" | "advance" | "salary_payment";
  date: string;
  title: string;
  amount: number;
  method: string;
  description: string;
};

export type DashboardDailyTrendItem = {
  day: string;
  incomeAmount: number;
  expenseAmount: number;
  payrollAmount: number;
  outflowAmount: number;
};

export type DashboardGroupPerformance = {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  studentsCount: number;
  chargedAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentPercentage: number;
};

export type DashboardDebtor = {
  studentId: string;
  fullName: string;
  groupName: string;
  phone: string;
  totalDebt: number;
  monthsCount: number;
};

export type DashboardResponse = {
  month: string;
  summary: {
    incomeAmount: number;
    expenseAmount: number;
    payrollPaidAmount: number;
    netAmount: number;
    chargedAmount: number;
    allocatedPaidAmount: number;
    monthDebtAmount: number;
    totalDebtAmount: number;
    advanceBalanceAmount: number;
    salaryAccruedAmount: number;
    salaryPayableAmount: number;
  };
  today: {
    incomeAmount: number;
    expenseAmount: number;
    netAmount: number;
  };
  counts: {
    students: {
      total: number;
      active: number;
      paused: number;
      inactive: number;
      left: number;
      debt: number;
    };
    groups: {
      total: number;
      active: number;
      inactive: number;
      archived: number;
    };
    teachers: { total: number; active: number; inactive: number };
    employees: { total: number; active: number; inactive: number };
  };
  payments: {
    totalAmount: number;
    count: number;
    totalsByMethod: Record<PaymentMethod, number>;
  };
  expenses: {
    totalAmount: number;
    count: number;
    totalsByMethod: Record<PaymentMethod, number>;
  };
  payroll: {
    accruedAmount: number;
    advanceAmount: number;
    paidSalaryAmount: number;
    paidAmount: number;
    payableAmount: number;
  };
  groupPerformance: DashboardGroupPerformance[];
  topDebtors: DashboardDebtor[];
  recentActivities: DashboardActivity[];
  dailyTrend: DashboardDailyTrendItem[];
};

export type Employee = {
  id: string;
  fullName: string;
  username: string;
  role: "owner" | "employee" | "teacher";
  teacherId: string | null;
  permissions: Permission[];
  monthlySalary: number;
  status: "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

export type EmployeePayload = {
  fullName: string;
  username: string;
  password?: string;
  role: Employee["role"];
  teacherId?: string | null;
  permissions: Permission[];
  monthlySalary: number;
  status: Employee["status"];
};

export type SalaryTargetType = "user" | "teacher";

export type EmployeeSalaryRecipient = {
  targetType: SalaryTargetType;
  targetId: string;
  fullName: string;
  role: string;
  status: "active" | "inactive";
  monthlySalary: number;
  salaryType: "fixed" | "percentage";
  salaryPercentage: number;
  month: {
    salaryAmount: number;
    advanceAmount: number;
    paidSalaryAmount: number;
    balance: number;
  };
  total: {
    salaryAmount: number;
    advanceAmount: number;
    paidSalaryAmount: number;
    balance: number;
    receivableAmount: number;
  };
  paymentStats: {
    groupsCount: number;
    chargedAmount: number;
    paidAmount: number;
    throughChargedAmount: number;
    throughPaidAmount: number;
    paymentPercentage: number;
    salaryFromPercentage: number;
  } | null;
};

export type EmployeeSalaryTransaction = {
  id: string;
  targetType: SalaryTargetType;
  targetId: string;
  month: string;
  kind: "salary" | "advance" | "salary_payment";
  amount: number;
  paidAt: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeSalariesResponse = {
  month: string;
  summary: {
    monthSalaryAmount: number;
    monthAdvanceAmount: number;
    monthPaidSalaryAmount: number;
    monthBalance: number;
    totalSalaryAmount: number;
    totalAdvanceAmount: number;
    totalPaidSalaryAmount: number;
    totalBalance: number;
    totalReceivableAmount: number;
  };
  recipients: EmployeeSalaryRecipient[];
  transactions: EmployeeSalaryTransaction[];
  allTransactions: EmployeeSalaryTransaction[];
};

export type EmployeeSalaryTransactionPayload = {
  targetType: SalaryTargetType;
  targetId: string;
  month: string;
  kind: EmployeeSalaryTransaction["kind"];
  amount: number;
  note?: string;
};

export type StudentPausePayload = {
  startDate: string;
  endDate?: string | null;
  reason?: string;
  status?: StudentPause["status"];
};

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "trial_scheduled"
  | "trial_attended"
  | "ready_to_enroll"
  | "converted"
  | "lost";

export type LeadActivity = {
  status: LeadStatus;
  note: string;
  createdBy: string | null;
  createdAt: string;
};

export type Lead = {
  id: string;
  fullName: string;
  phone: string;
  secondaryPhone: string;
  parentName: string;
  parentPhone: string;
  subject: string;
  source: string;
  status: LeadStatus;
  assignedTo: string | null;
  assignedUser: Pick<Employee, "id" | "fullName" | "username" | "role"> | null;
  preferredGroupId: string | null;
  preferredGroup: Group | null;
  trialGroupId: string | null;
  trialGroup: Group | null;
  trialDate: string | null;
  nextContactAt: string | null;
  lostReason: string;
  convertedStudentId: string | null;
  convertedStudent: Pick<Student, "id" | "fullName" | "phone" | "groupId" | "status"> | null;
  note: string;
  activityHistory: LeadActivity[];
  createdAt: string;
  updatedAt: string;
};

export type LeadFilters = {
  search?: string;
  status?: LeadStatus;
  subject?: string;
  source?: string;
  view?: "active" | "closed";
  page?: number;
  limit?: number;
};

export type LeadPayload = {
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  parentName?: string;
  parentPhone?: string;
  subject: string;
  source?: string;
  status: LeadStatus;
  assignedTo?: string | null;
  preferredGroupId?: string | null;
  trialGroupId?: string | null;
  trialDate?: string | null;
  nextContactAt?: string | null;
  lostReason?: string;
  note?: string;
  activityNote?: string;
};

export type ConvertLeadPayload = {
  groupId: string;
  discountType?: StudentEnrollment["discountType"];
  discountValue?: number;
  discountReason?: string;
  note?: string;
};

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceEntryStatus = AttendanceStatus | "unmarked";

export type AttendanceRecord = {
  id: string;
  groupId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  markedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceStudent = Pick<
  Student,
  "id" | "fullName" | "phone" | "secondaryPhone" | "parentName" | "parentPhone" | "status"
>;

export type AttendanceEntry = {
  student: AttendanceStudent;
  attendance: AttendanceRecord | null;
  status: AttendanceEntryStatus;
  note: string;
};

export type AttendanceResponse = {
  group: Group;
  date: string;
  entries: AttendanceEntry[];
  summary: Record<AttendanceEntryStatus | "total", number>;
};

export type AttendanceMonthRecord = {
  attendance: AttendanceRecord;
  status: AttendanceStatus;
  note: string;
};

export type AttendanceMonthStudent = {
  student: AttendanceStudent;
  records: Record<number, AttendanceMonthRecord>;
  summary: Record<AttendanceStatus | "total", number>;
};

export type AttendanceMonthResponse = {
  group: Group;
  month: string;
  daysInMonth: number;
  students: AttendanceMonthStudent[];
};

export type AttendancePayload = {
  groupId: string;
  date: string;
  records: {
    studentId: string;
    status: AttendanceStatus;
    note?: string;
  }[];
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("sab_auth_token");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: [
    "Teacher",
    "Group",
    "Student",
    "Finance",
    "PaymentsDashboard",
    "Expense",
    "Employee",
    "EmployeeSalary",
    "Dashboard",
    "Notification",
    "Settings",
    "Lead",
    "Attendance",
    "StudentPoint",
  ],
  endpoints: (builder) => ({
    getAuthStatus: builder.query<AuthStatusResponse, void>({
      query: () => "/auth/status",
    }),
    getCurrentUser: builder.query<AuthUser, void>({
      query: () => "/auth/me",
    }),
    login: builder.mutation<AuthResponse, AuthCredentials>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    setup: builder.mutation<AuthResponse, Required<AuthCredentials>>({
      query: (body) => ({
        url: "/auth/setup",
        method: "POST",
        body,
      }),
    }),
    getBrandingSettings: builder.query<BrandingSettings, void>({
      query: () => "/settings/branding",
      providesTags: [{ type: "Settings", id: "BRANDING" }],
    }),
    getSubjects: builder.query<{ data: string[] }, void>({
      query: () => "/settings/subjects",
      providesTags: [{ type: "Settings", id: "SUBJECTS" }],
    }),
    getRooms: builder.query<RoomsResponse, void>({
      query: () => "/settings/rooms",
      providesTags: [{ type: "Settings", id: "ROOMS" }],
    }),
    updateRooms: builder.mutation<RoomsResponse, { rooms: string[] }>({
      query: (body) => ({ url: "/settings/rooms", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "ROOMS" }],
    }),
    updateBrandingSettings: builder.mutation<BrandingSettings, { unify: Brand; accounting?: Brand }>({
      query: (body) => ({ url: "/settings/branding", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "BRANDING" }],
    }),
    uploadBrandLogo: builder.mutation<BrandingSettings, { brand: "unify"; file: File }>({
      query: ({ brand, file }) => ({
        url: `/settings/branding/${brand}/logo`,
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      }),
      invalidatesTags: [{ type: "Settings", id: "BRANDING" }],
    }),
    getDashboard: builder.query<DashboardResponse, { month?: string } | void>({
      query: (filters) => ({
        url: "/dashboard",
        params: filters,
      }),
      providesTags: [{ type: "Dashboard", id: "CURRENT" }],
    }),
    getTeachers: builder.query<
      PaginatedResponse<Teacher>,
      TeacherFilters | void
    >({
      query: (filters) => ({
        url: "/teachers",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((teacher) => ({
                type: "Teacher" as const,
                id: teacher.id,
              })),
              { type: "Teacher", id: "LIST" },
            ]
          : [{ type: "Teacher", id: "LIST" }],
    }),
    createTeacher: builder.mutation<Teacher, TeacherPayload>({
      query: (body) => ({
        url: "/teachers",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Teacher", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => undefined);
        dispatch(api.util.invalidateTags([{ type: "Settings", id: "SUBJECTS" }]));
      },
    }),
    updateTeacher: builder.mutation<
      Teacher,
      { id: string; body: TeacherPayload }
    >({
      query: ({ id, body }) => ({
        url: `/teachers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Teacher", id: arg.id },
        { type: "Teacher", id: "LIST" },
        { type: "Settings", id: "SUBJECTS" },
      ],
    }),
    deleteTeacher: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({
        url: `/teachers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Teacher", id: "LIST" }],
    }),
    getGroups: builder.query<PaginatedResponse<Group>, GroupFilters | void>({
      query: (filters) => ({
        url: "/groups",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((group) => ({
                type: "Group" as const,
                id: group.id,
              })),
              { type: "Group", id: "LIST" },
            ]
          : [{ type: "Group", id: "LIST" }],
    }),
    getGroupStudentPoints: builder.query<StudentPointsResponse, string>({
      query: (groupId) => `/student-points/groups/${groupId}/students`,
      providesTags: (_result, _error, groupId) => [{ type: 'StudentPoint', id: groupId }],
    }),
    getStudentPointGroups: builder.query<{ data: StudentPointGroup[] }, void>({
      query: () => '/student-points/groups',
      providesTags: [{ type: 'StudentPoint', id: 'GROUPS' }],
    }),
    getStudentPointHistory: builder.query<StudentPointHistoryResponse, { groupId: string; studentId: string }>({
      query: ({ groupId, studentId }) => `/student-points/groups/${groupId}/students/${studentId}/history`,
      providesTags: (_result, _error, arg) => [{ type: 'StudentPoint', id: `${arg.groupId}:${arg.studentId}` }],
    }),
    adjustStudentPoints: builder.mutation<
      { studentId: string; type: 'plus' | 'minus'; total: number },
      { groupId: string; studentId: string; type: 'plus' | 'minus'; delta: number; reason?: string }
    >({
      query: ({ groupId, studentId, ...body }) => ({
        url: `/student-points/groups/${groupId}/students/${studentId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'StudentPoint', id: arg.groupId },
        { type: 'StudentPoint', id: `${arg.groupId}:${arg.studentId}` },
      ],
    }),
    createGroup: builder.mutation<Group, GroupPayload>({
      query: (body) => ({
        url: "/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Group", id: "LIST" },
        { type: "Teacher", id: "LIST" },
        { type: "Settings", id: "SUBJECTS" },
        { type: "Settings", id: "ROOMS" },
      ],
    }),
    updateGroup: builder.mutation<Group, { id: string; body: GroupPayload }>({
      query: ({ id, body }) => ({
        url: `/groups/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Group", id: arg.id },
        { type: "Group", id: "LIST" },
        { type: "Teacher", id: "LIST" },
        { type: "Settings", id: "SUBJECTS" },
        { type: "Settings", id: "ROOMS" },
      ],
    }),
    deleteGroup: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Group", id: "LIST" },
        { type: "Teacher", id: "LIST" },
        { type: "Settings", id: "SUBJECTS" },
        { type: "Settings", id: "ROOMS" },
      ],
    }),
    getStudents: builder.query<
      PaginatedResponse<Student>,
      StudentFilters | void
    >({
      query: (filters) => ({
        url: "/students",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((student) => ({
                type: "Student" as const,
                id: student.id,
              })),
              { type: "Student", id: "LIST" },
            ]
          : [{ type: "Student", id: "LIST" }],
    }),
    createStudent: builder.mutation<Student, StudentPayload>({
      query: (body) => ({
        url: "/students",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Student", id: "LIST" },
        { type: "Group", id: "LIST" },
      ],
    }),
    updateStudent: builder.mutation<
      Student,
      { id: string; body: StudentPayload }
    >({
      query: ({ id, body }) => ({
        url: `/students/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Student", id: arg.id },
        { type: "Student", id: "LIST" },
        { type: "Group", id: "LIST" },
      ],
    }),
    deleteStudent: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({
        url: `/students/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Student", id: "LIST" },
        { type: "Group", id: "LIST" },
      ],
    }),
    getLeads: builder.query<PaginatedResponse<Lead>, LeadFilters | void>({
      query: (filters) => ({
        url: "/leads",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((lead) => ({ type: "Lead" as const, id: lead.id })),
              { type: "Lead", id: "LIST" },
            ]
          : [{ type: "Lead", id: "LIST" }],
    }),
    createLead: builder.mutation<Lead, LeadPayload>({
      query: (body) => ({
        url: "/leads",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Lead", id: "LIST" }, { type: "Settings", id: "SUBJECTS" }],
    }),
    updateLead: builder.mutation<Lead, { id: string; body: LeadPayload }>({
      query: ({ id, body }) => ({
        url: `/leads/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Lead", id: arg.id },
        { type: "Lead", id: "LIST" },
        { type: "Settings", id: "SUBJECTS" },
      ],
    }),
    convertLead: builder.mutation<Lead, { id: string; body: ConvertLeadPayload }>({
      query: ({ id, body }) => ({
        url: `/leads/${id}/convert`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Lead", id: arg.id },
        { type: "Lead", id: "LIST" },
        { type: "Student", id: "LIST" },
        { type: "Group", id: "LIST" },
      ],
    }),
    deleteLead: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({
        url: `/leads/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Lead", id: "LIST" }],
    }),
    getStudentFinance: builder.query<StudentFinance, string>({
      query: (studentId) => `/finance/students/${studentId}`,
      providesTags: (_result, _error, studentId) => [
        { type: "Finance", id: studentId },
      ],
    }),
    createPayment: builder.mutation<
      Payment,
      { studentId: string; body: PaymentPayload }
    >({
      query: ({ studentId, body }) => ({
        url: `/finance/students/${studentId}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Finance", id: arg.studentId },
        { type: "Finance", id: "DEBTORS" },
        { type: "PaymentsDashboard", id: "CURRENT" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Dashboard", id: "REPORT" },
        { type: "Student", id: arg.studentId },
        { type: "Student", id: "LIST" },
        { type: "Finance", id: "PAYMENT_HISTORY" },
      ],
    }),
    reversePayment: builder.mutation<Payment, { paymentId: string; studentId: string; reason: string }>({
      query: ({ paymentId, reason }) => ({ url: `/finance/payments/${paymentId}/reverse`, method: "PUT", body: { reason } }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Finance", id: arg.studentId }, { type: "Finance", id: "DEBTORS" },
        { type: "PaymentsDashboard", id: "CURRENT" }, { type: "Dashboard", id: "CURRENT" }, { type: "Dashboard", id: "REPORT" }, { type: "Finance", id: "PAYMENT_HISTORY" },
      ],
    }),
    updatePayment: builder.mutation<Payment, { paymentId: string; studentId: string; body: PaymentPayload }>({
      query: ({ paymentId, body }) => ({ url: `/finance/payments/${paymentId}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Finance", id: arg.studentId }, { type: "Finance", id: "DEBTORS" },
        { type: "PaymentsDashboard", id: "CURRENT" }, { type: "Dashboard", id: "CURRENT" }, { type: "Dashboard", id: "REPORT" }, { type: "Finance", id: "PAYMENT_HISTORY" },
      ],
    }),
    getPaymentsHistory: builder.query<PaginatedResponse<PaymentHistoryItem>, {
      studentId?: string;
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      method?: PaymentMethod;
      search?: string;
      status?: Payment["status"];
    }>({
      query: (params) => ({ url: "/finance/payments", params }),
      providesTags: [{ type: "Finance", id: "PAYMENT_HISTORY" }],
    }),
    addStudentEnrollment: builder.mutation<Student, { studentId: string; body: { groupId: string; discountType: StudentEnrollment["discountType"]; discountValue: number; discountReason?: string } }>({
      query: ({ studentId, body }) => ({ url: `/students/${studentId}/enrollments`, method: "POST", body }),
      invalidatesTags: (_result, _error, arg) => [{ type: "Student", id: arg.studentId }, { type: "Student", id: "LIST" }, { type: "Finance", id: arg.studentId }],
    }),
    updateStudentEnrollment: builder.mutation<{ message: string }, { studentId: string; enrollmentId: string; body: Partial<StudentEnrollment> }>({
      query: ({ studentId, enrollmentId, body }) => ({ url: `/students/${studentId}/enrollments/${enrollmentId}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, arg) => [{ type: "Student", id: arg.studentId }, { type: "Student", id: "LIST" }, { type: "Finance", id: arg.studentId }],
    }),
    leaveStudent: builder.mutation<Student, { studentId: string; reason?: string }>({
      query: ({ studentId, reason }) => ({ url: `/students/${studentId}/leave`, method: "PUT", body: { reason } }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Student", id: arg.studentId },
        { type: "Student", id: "LIST" },
        { type: "Finance", id: arg.studentId },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Dashboard", id: "COURSE_STUDENTS" },
      ],
    }),
    createStudentPause: builder.mutation<
      StudentPause,
      { studentId: string; body: StudentPausePayload }
    >({
      query: ({ studentId, body }) => ({
        url: `/finance/students/${studentId}/pauses`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Finance", id: arg.studentId },
        { type: "Finance", id: "DEBTORS" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Student", id: arg.studentId },
        { type: "Student", id: "LIST" },
      ],
    }),
    activatePausedStudent: builder.mutation<{ message: string }, string>({
      query: (studentId) => ({
        url: `/finance/students/${studentId}/activate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, studentId) => [
        { type: "Finance", id: studentId },
        { type: "Finance", id: "DEBTORS" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Student", id: studentId },
        { type: "Student", id: "LIST" },
      ],
    }),
    getAttendance: builder.query<AttendanceResponse, { groupId: string; date: string }>({
      query: (params) => ({
        url: "/attendance",
        params,
      }),
      providesTags: (_result, _error, arg) => [
        { type: "Attendance", id: `${arg.groupId}-${arg.date}` },
      ],
    }),
    getAttendanceMonth: builder.query<AttendanceMonthResponse, { groupId: string; month: string }>({
      query: (params) => ({
        url: "/attendance/month",
        params,
      }),
      providesTags: (_result, _error, arg) => [
        { type: "Attendance", id: `${arg.groupId}-${arg.month}` },
      ],
    }),
    saveAttendance: builder.mutation<AttendanceResponse, AttendancePayload>({
      query: (body) => ({
        url: "/attendance",
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Attendance", id: `${arg.groupId}-${arg.date}` },
      ],
    }),
    getPaymentsDashboard: builder.query<PaymentsDashboard, void>({
      query: () => "/finance/payments-dashboard",
      providesTags: [{ type: "PaymentsDashboard", id: "CURRENT" }],
    }),
    getFinancialReport: builder.query<FinancialReport, { dateFrom: string; dateTo: string }>({
      query: (params) => ({ url: "/reports/finance", params }),
      providesTags: [{ type: "Dashboard", id: "REPORT" }],
    }),
    getStudentSourceReport: builder.query<StudentSourceReport, { dateFrom: string; dateTo: string }>({
      query: (params) => ({ url: "/reports/student-sources", params }),
      providesTags: [{ type: "Dashboard", id: "STUDENT_SOURCES" }],
    }),
    getCourseStudentReport: builder.query<CourseStudentReport, void>({
      query: () => "/reports/course-students",
      providesTags: [{ type: "Dashboard", id: "COURSE_STUDENTS" }],
    }),
    exportFinancialReport: builder.query<Blob, { dateFrom: string; dateTo: string }>({
      query: (params) => ({
        url: "/reports/finance/export",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getNotifications: builder.query<{ data: AppNotification[] }, void>({
      query: () => "/notifications",
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    markNotificationRead: builder.mutation<AppNotification, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
    getDebtors: builder.query<{ data: Debtor[] }, void>({
      query: () => "/finance/debtors",
      providesTags: [{ type: "Finance", id: "DEBTORS" }],
    }),
    getEskizSmsReport: builder.query<EskizSmsReportResponse, { year?: number; month?: number; is_global?: boolean } | void>({
      query: (params) => ({
        url: "/finance/debtors/sms-report",
        params,
      }),
      providesTags: [{ type: "Finance", id: "SMS_REPORT" }],
    }),
    sendDebtorSmsReminders: builder.mutation<
      SendDebtorSmsResponse,
      SendDebtorSmsPayload | void
    >({
      query: (body) => ({
        url: "/finance/debtors/sms-remind",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: [
        { type: "Finance", id: "DEBTORS" },
        { type: "Finance", id: "SMS_REPORT" },
      ],
    }),
    getExpenses: builder.query<ExpensesResponse, ExpenseFilters | void>({
      query: (filters) => ({
        url: "/expenses",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((expense) => ({
                type: "Expense" as const,
                id: expense.id,
              })),
              { type: "Expense", id: "LIST" },
            ]
          : [{ type: "Expense", id: "LIST" }],
    }),
    createExpense: builder.mutation<Expense, ExpensePayload>({
      query: (body) => ({
        url: "/expenses",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Expense", id: "LIST" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Dashboard", id: "REPORT" },
      ],
    }),
    updateExpense: builder.mutation<
      Expense,
      { id: string; body: ExpensePayload }
    >({
      query: ({ id, body }) => ({
        url: `/expenses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Expense", id: arg.id },
        { type: "Expense", id: "LIST" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Dashboard", id: "REPORT" },
      ],
    }),
    deleteExpense: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Expense", id: "LIST" },
        { type: "Dashboard", id: "CURRENT" },
        { type: "Dashboard", id: "REPORT" },
      ],
    }),
    getEmployees: builder.query<
      PaginatedResponse<Employee>,
      EmployeeFilters | void
    >({
      query: (filters) => ({
        url: "/users",
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((employee) => ({
                type: "Employee" as const,
                id: employee.id,
              })),
              { type: "Employee", id: "LIST" },
            ]
          : [{ type: "Employee", id: "LIST" }],
    }),
    createEmployee: builder.mutation<Employee, EmployeePayload>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),
    updateEmployee: builder.mutation<
      Employee,
      { id: string; body: EmployeePayload }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Employee", id: arg.id },
        { type: "Employee", id: "LIST" },
      ],
    }),
    deleteEmployee: builder.mutation<{ message: string; id: string }, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),
    getEmployeeSalaries: builder.query<
      EmployeeSalariesResponse,
      { month?: string; search?: string } | void
    >({
      query: (filters) => ({
        url: "/users/salaries",
        params: filters,
      }),
      providesTags: [{ type: "EmployeeSalary", id: "LIST" }],
    }),
    createEmployeeSalaryTransaction: builder.mutation<
      EmployeeSalaryTransaction,
      EmployeeSalaryTransactionPayload
    >({
      query: (body) => ({
        url: "/users/salaries/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "EmployeeSalary", id: "LIST" },
        { type: "Dashboard", id: "CURRENT" },
      ],
    }),
  }),
});

export const {
  useGetAuthStatusQuery,
  useLazyGetCurrentUserQuery,
  useLoginMutation,
  useSetupMutation,
  useGetBrandingSettingsQuery,
  useGetSubjectsQuery,
  useGetRoomsQuery,
  useUpdateBrandingSettingsMutation,
  useUpdateRoomsMutation,
  useUploadBrandLogoMutation,
  useCreateEmployeeMutation,
  useCreateEmployeeSalaryTransactionMutation,
  useCreateExpenseMutation,
  useCreateGroupMutation,
  useCreateLeadMutation,
  useCreateStudentMutation,
  useCreatePaymentMutation,
  useReversePaymentMutation,
  useUpdatePaymentMutation,
  useGetPaymentsHistoryQuery,
  useAddStudentEnrollmentMutation,
  useUpdateStudentEnrollmentMutation,
  useLeaveStudentMutation,
  useCreateStudentPauseMutation,
  useCreateTeacherMutation,
  useDeleteEmployeeMutation,
  useDeleteExpenseMutation,
  useDeleteGroupMutation,
  useDeleteLeadMutation,
  useDeleteStudentMutation,
  useDeleteTeacherMutation,
  useActivatePausedStudentMutation,
  useGetDashboardQuery,
  useGetEmployeesQuery,
  useGetEmployeeSalariesQuery,
  useGetExpensesQuery,
  useGetGroupsQuery,
  useGetGroupStudentPointsQuery,
  useGetStudentPointHistoryQuery,
  useGetStudentPointGroupsQuery,
  useGetLeadsQuery,
  useGetNotificationsQuery,
  useGetDebtorsQuery,
  useGetEskizSmsReportQuery,
  useSendDebtorSmsRemindersMutation,
  useGetPaymentsDashboardQuery,
  useGetFinancialReportQuery,
  useGetCourseStudentReportQuery,
  useGetStudentSourceReportQuery,
  useLazyExportFinancialReportQuery,
  useGetStudentFinanceQuery,
  useGetStudentsQuery,
  useGetTeachersQuery,
  useGetAttendanceQuery,
  useLazyGetAttendanceMonthQuery,
  useSaveAttendanceMutation,
  useConvertLeadMutation,
  useUpdateEmployeeMutation,
  useUpdateExpenseMutation,
  useUpdateGroupMutation,
  useUpdateLeadMutation,
  useUpdateStudentMutation,
  useUpdateTeacherMutation,
  useMarkNotificationReadMutation,
  useAdjustStudentPointsMutation,
} = api;
