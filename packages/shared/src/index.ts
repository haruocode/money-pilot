import { z } from "zod";

// --- Account Master ---

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

// --- Snapshot ---

export const snapshotBalanceSchema = z.object({
  accountId: z.string(),
  balance: z.number().int(),
});

export const snapshotSchema = z.object({
  id: z.string(),
  snapshotDate: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  balances: z.array(snapshotBalanceSchema),
});

export const snapshotResponseSchema = z.object({
  snapshot: snapshotSchema.nullable(),
});

export const createSnapshotInputSchema = z.object({
  snapshotDate: z.string().regex(/^\d{4}-\d{2}$/),
  note: z.string().nullable().optional(),
  balances: z.array(z.object({
    accountId: z.string(),
    balance: z.number().int().min(0),
  })),
});

export type SnapshotBalance = z.infer<typeof snapshotBalanceSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type SnapshotResponse = z.infer<typeof snapshotResponseSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotInputSchema>;

// --- Dashboard ---

export const dashboardAccountSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  category: accountCategorySchema,
  isDebt: z.boolean(),
  balance: z.number().int(),
});

export const dashboardResponseSchema = z.object({
  snapshotDate: z.string().nullable(),
  netWorth: z.number().int(),
  totalAssets: z.number().int(),
  totalDebt: z.number().int(),
  accounts: z.array(dashboardAccountSchema),
});

export type DashboardAccount = z.infer<typeof dashboardAccountSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
