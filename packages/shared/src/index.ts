import { z } from "zod";

// --- Account Master (permanent account registry) ---

export const accountCategorySchema = z.enum([
  "Bank",
  "CreditCard",
  "CardLoan",
  "ConsumerLoan",
  "Investment",
  "Crypto",
  "Cash",
  "Other",
]);

export const accountMasterSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: accountCategorySchema,
  isDebt: z.boolean(),
  creditLimit: z.number().int().nullable(),
  displayOrder: z.number().int(),
  isArchived: z.boolean(),
  createdAt: z.string(),
});

export const createAccountMasterInputSchema = z.object({
  name: z.string().trim().min(1),
  category: accountCategorySchema,
  creditLimit: z.number().int().positive().nullable().optional(),
});

export const updateAccountMasterInputSchema = z.object({
  name: z.string().trim().min(1),
  creditLimit: z.number().int().positive().nullable().optional(),
});

export const accountMastersResponseSchema = z.object({
  accounts: z.array(accountMasterSchema),
});

export type AccountCategory = z.infer<typeof accountCategorySchema>;
export type AccountMaster = z.infer<typeof accountMasterSchema>;
export type CreateAccountMasterInput = z.infer<typeof createAccountMasterInputSchema>;
export type UpdateAccountMasterInput = z.infer<typeof updateAccountMasterInputSchema>;
export type AccountMastersResponse = z.infer<typeof accountMastersResponseSchema>;

// --- Snapshot (legacy, snapshot-scoped accounts) ---

export const accountTypeSchema = z.enum([
  "Bank",
  "CreditCard",
  "CardLoan",
  "ConsumerLoan",
  "Investment",
  "Crypto",
  "Cash",
  "Other",
]);

export const accountSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  name: z.string(),
  accountType: accountTypeSchema,
  balance: z.number().int(),
  creditLimit: z.number().int().nullable(),
  isDebt: z.boolean(),
});

export const monthlyExpenseSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  category: z.string(),
  amount: z.number().int(),
});

export const snapshotSchema = z.object({
  id: z.string(),
  snapshotDate: z.string(),
  currency: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  accounts: z.array(accountSchema),
  monthlyExpenses: z.array(monthlyExpenseSchema),
});

export const createAccountInputSchema = z.object({
  name: z.string().min(1),
  accountType: accountTypeSchema,
  balance: z.number().int(),
  creditLimit: z.number().int().nullable().optional(),
  isDebt: z.boolean().default(false),
});

export const createMonthlyExpenseInputSchema = z.object({
  category: z.string().min(1),
  amount: z.number().int(),
});

export const createSnapshotInputSchema = z.object({
  snapshotDate: z.string().min(1),
  currency: z.string().optional().default("JPY"),
  note: z.string().trim().min(1).nullable().optional(),
  accounts: z.array(createAccountInputSchema),
  monthlyExpenses: z.array(createMonthlyExpenseInputSchema),
});

export const dashboardMetricsSchema = z.object({
  totalAssets: z.number().int(),
  totalDebt: z.number().int(),
  netWorth: z.number().int(),
  creditUtilizationRatio: z.number(),
  monthlyFixedExpenses: z.number().int(),
  debtDependencyRatio: z.number(),
});

export const dashboardResponseSchema = z.object({
  latestSnapshot: snapshotSchema.nullable(),
  metrics: dashboardMetricsSchema,
});

export const snapshotsResponseSchema = z.object({
  snapshots: z.array(snapshotSchema),
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type MonthlyExpense = z.infer<typeof monthlyExpenseSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;
export type CreateMonthlyExpenseInput = z.infer<typeof createMonthlyExpenseInputSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotInputSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type SnapshotsResponse = z.infer<typeof snapshotsResponseSchema>;
