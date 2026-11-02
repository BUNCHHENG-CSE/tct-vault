import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthInput = z.infer<typeof authSchema>;

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  type: z.enum(["checking", "savings", "credit", "investment"], {
    errorMap: () => ({ message: "Please select a valid account type" }),
  }),
  balance: z.coerce.number({
    errorMap: () => ({ message: "Balance must be a valid number" }),
  }),
  currency: z.string().default("USD"),
  institution_id: z.string().optional().nullable(),
  institution_name: z.string().optional().nullable(),
});

export type AccountInput = z.infer<typeof accountSchema>;

export const transactionCategories = [
  "salary",
  "freelance",
  "housing",
  "food",
  "utilities",
  "software",
  "entertainment",
  "shopping",
  "transfer",
  "general",
] as const;

export const transactionSchema = z.object({
  account_id: z.string().min(1, "Please select an account"),
  to_account_id: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required").max(200),
  amount: z.coerce
    .number({
      errorMap: () => ({ message: "Amount must be a valid number" }),
    })
    .positive("Amount must be greater than 0"),
  type: z.enum(["income", "expense", "transfer"], {
    errorMap: () => ({ message: "Please select income, expense, or transfer" }),
  }),
  category: z.enum([
    "salary",
    "freelance",
    "housing",
    "food",
    "utilities",
    "software",
    "entertainment",
    "shopping",
    "transfer",
    "general",
  ], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  date: z.string().min(1, "Date is required"),
  currency: z.string().optional().default("USD"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transferSchema = z
  .object({
    from_account_id: z.string().min(1, "Source account is required"),
    to_account_id: z.string().min(1, "Destination account is required"),
    amount: z.coerce
      .number({
        errorMap: () => ({ message: "Amount must be a valid number" }),
      })
      .positive("Amount must be greater than 0"),
    date: z.string().min(1, "Date is required"),
    description: z.string().max(200).optional(),
  })
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: "Source and destination accounts must be different",
    path: ["to_account_id"],
  });

export type TransferInput = z.infer<typeof transferSchema>;

export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  target_amount: z.coerce
    .number({
      errorMap: () => ({ message: "Target amount must be a valid number" }),
    })
    .positive("Target amount must be greater than 0"),
  current_amount: z.coerce
    .number({
      errorMap: () => ({ message: "Current amount must be a number" }),
    })
    .min(0, "Current amount cannot be negative")
    .default(0),
  target_date: z.string().optional().nullable(),
  category: z.string().default("general"),
  account_id: z.string().optional().nullable(),
});

export type GoalInput = z.infer<typeof goalSchema>;

export const goalContributionSchema = z.object({
  goal_id: z.string().min(1, "Goal ID is required"),
  amount: z.coerce
    .number({
      errorMap: () => ({ message: "Amount must be a valid number" }),
    })
    .positive("Amount must be greater than 0"),
  type: z.enum(["deposit", "withdraw"], {
    errorMap: () => ({ message: "Please select deposit or withdraw" }),
  }),
  account_id: z.string().optional().nullable(),
});

export type GoalContributionInput = z.infer<typeof goalContributionSchema>;

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Subscription name is required").max(100),
  amount: z.coerce
    .number({
      errorMap: () => ({ message: "Amount must be a valid number" }),
    })
    .positive("Amount must be greater than 0"),
  billing_day: z.coerce
    .number({
      errorMap: () => ({ message: "Billing day must be a number" }),
    })
    .int("Billing day must be an integer")
    .min(1, "Day must be between 1 and 31")
    .max(31, "Day must be between 1 and 31"),
  category: z.string().min(1, "Category is required").default("software"),
  status: z.enum(["active", "paused"]).default("active"),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  monthly_limit: z.coerce
    .number({
      errorMap: () => ({ message: "Monthly limit must be a valid number" }),
    })
    .positive("Monthly limit must be greater than 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
