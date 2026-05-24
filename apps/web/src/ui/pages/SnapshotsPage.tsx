import type {
  AccountType,
  CreateAccountInput,
  CreateMonthlyExpenseInput,
} from "@money-pilot/shared";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSnapshot, fetchSnapshots } from "../../lib/api";
import { formatAccountType, formatMoney } from "../../lib/format";
import { DataTable } from "../components/DataTable";

type AccountFormRow = {
  name: string;
  accountType: AccountType;
  balance: string;
  creditLimit: string;
  isDebt: boolean;
};

type ExpenseFormRow = {
  category: string;
  amount: string;
};

const accountTypeOptions: { value: AccountType; label: string }[] = [
  { value: "Bank", label: "銀行口座" },
  { value: "CreditCard", label: "クレジットカード" },
  { value: "CardLoan", label: "カードローン" },
  { value: "ConsumerLoan", label: "消費者ローン" },
  { value: "Investment", label: "投資" },
  { value: "Crypto", label: "暗号資産" },
  { value: "Cash", label: "現金" },
  { value: "Other", label: "その他" },
];

function collectBankAccountNames(
  snapshots: Awaited<ReturnType<typeof fetchSnapshots>>["snapshots"] | undefined,
  accounts: AccountFormRow[],
) {
  const names = new Set<string>();

  for (const snapshot of snapshots ?? []) {
    for (const account of snapshot.accounts) {
      if (account.accountType !== "Bank") {
        continue;
      }

      const name = account.name.trim();

      if (name !== "") {
        names.add(name);
      }
    }
  }

  for (const account of accounts) {
    if (account.accountType !== "Bank") {
      continue;
    }

    const name = account.name.trim();

    if (name !== "") {
      names.add(name);
    }
  }

  return Array.from(names);
}

function createEmptyAccount(): AccountFormRow {
  return {
    name: "",
    accountType: "Bank",
    balance: "",
    creditLimit: "",
    isDebt: false,
  };
}

function createEmptyExpense(): ExpenseFormRow {
  return {
    category: "",
    amount: "",
  };
}

export function SnapshotsPage() {
  const queryClient = useQueryClient();
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [accounts, setAccounts] = useState<AccountFormRow[]>([
    {
      name: "メイン口座",
      accountType: "Bank",
      balance: "250000",
      creditLimit: "",
      isDebt: false,
    },
  ]);
  const [expenses, setExpenses] = useState<ExpenseFormRow[]>([
    {
      category: "家賃",
      amount: "85000",
    },
  ]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshots"],
    queryFn: fetchSnapshots,
  });
  const bankAccountOptions = collectBankAccountNames(data?.snapshots, accounts);

  const mutation = useMutation({
    mutationFn: (payload: {
      snapshotDate: string;
      note?: string;
      accounts: CreateAccountInput[];
      monthlyExpenses: CreateMonthlyExpenseInput[];
    }) =>
      createSnapshot({
        snapshotDate: payload.snapshotDate,
        currency: "JPY",
        note: payload.note,
        accounts: payload.accounts,
        monthlyExpenses: payload.monthlyExpenses,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snapshots"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

      setSnapshotDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setAccounts([createEmptyAccount()]);
      setExpenses([createEmptyExpense()]);
    },
  });

  const handleAccountChange = <K extends keyof AccountFormRow>(
    index: number,
    field: K,
    value: AccountFormRow[K],
  ) => {
    setAccounts((current) =>
      current.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [field]: value } : account,
      ),
    );
  };

  const handleAccountTypeChange = (index: number, accountType: AccountType) => {
    setAccounts((current) =>
      current.map((account, accountIndex) => {
        if (accountIndex !== index) {
          return account;
        }

        if (accountType !== "Bank") {
          return { ...account, accountType };
        }

        const nextName = bankAccountOptions.includes(account.name.trim())
          ? account.name
          : (bankAccountOptions[0] ?? "");

        return {
          ...account,
          accountType,
          name: nextName,
        };
      }),
    );
  };

  const handleExpenseChange = <K extends keyof ExpenseFormRow>(
    index: number,
    field: K,
    value: ExpenseFormRow[K],
  ) => {
    setExpenses((current) =>
      current.map((expense, expenseIndex) =>
        expenseIndex === index ? { ...expense, [field]: value } : expense,
      ),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.reset();

    const normalizedAccounts = accounts
      .map((account) => ({
        name: account.name.trim(),
        accountType: account.accountType,
        balance: Number(account.balance),
        creditLimit: account.creditLimit.trim() === "" ? undefined : Number(account.creditLimit),
        isDebt: account.isDebt,
      }))
      .filter((account) => account.name !== "");

    const normalizedExpenses = expenses
      .map((expense) => ({
        category: expense.category.trim(),
        amount: Number(expense.amount),
      }))
      .filter((expense) => expense.category !== "");

    mutation.mutate({
      snapshotDate,
      note: note.trim() || undefined,
      accounts: normalizedAccounts,
      monthlyExpenses: normalizedExpenses,
    });
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">履歴</p>
          <h2>スナップショット</h2>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h3>新しいスナップショットを入力</h3>
            <p className="muted">金額はすべて円で入力します。</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>日付</span>
              <input
                type="date"
                value={snapshotDate}
                onChange={(event) => setSnapshotDate(event.target.value)}
                required
              />
            </label>

            <label className="field field-full">
              <span>メモ</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <h3>口座</h3>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setAccounts((current) => [...current, createEmptyAccount()])}
              >
                口座を追加
              </button>
            </div>

            <div className="form-stack">
              {accounts.map((account, index) => (
                <div className="entry-card" key={`account-${index}`}>
                  {account.accountType === "Bank" && bankAccountOptions.length > 0 ? (
                    <p className="muted">銀行口座は登録済みの候補から選択します。</p>
                  ) : null}

                  <div className="form-grid">
                    <label className="field">
                      <span>口座名</span>
                      {account.accountType === "Bank" && bankAccountOptions.length > 0 ? (
                        <select
                          value={account.name}
                          onChange={(event) => handleAccountChange(index, "name", event.target.value)}
                          required={index === 0}
                        >
                          <option value="">銀行口座を選択</option>
                          {bankAccountOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={account.name}
                          onChange={(event) => handleAccountChange(index, "name", event.target.value)}
                          required={index === 0}
                        />
                      )}
                    </label>

                    <label className="field">
                      <span>種別</span>
                      <select
                        value={account.accountType}
                        onChange={(event) =>
                          handleAccountTypeChange(index, event.target.value as AccountType)
                        }
                      >
                        {accountTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>残高</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={account.balance}
                        onChange={(event) => handleAccountChange(index, "balance", event.target.value)}
                        required={index === 0}
                      />
                    </label>

                    <label className="field">
                      <span>利用枠</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={account.creditLimit}
                        onChange={(event) => handleAccountChange(index, "creditLimit", event.target.value)}
                      />
                    </label>

                    <label className="field field-checkbox">
                      <input
                        type="checkbox"
                        checked={account.isDebt}
                        onChange={(event) => handleAccountChange(index, "isDebt", event.target.checked)}
                      />
                      <span>負債として扱う</span>
                    </label>
                  </div>

                  <div className="entry-actions">
                    <span className="muted">{formatAccountType(account.accountType)}</span>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        setAccounts((current) =>
                          current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                      disabled={accounts.length === 1}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <h3>毎月の支出</h3>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setExpenses((current) => [...current, createEmptyExpense()])}
              >
                支出を追加
              </button>
            </div>

            <div className="form-stack">
              {expenses.map((expense, index) => (
                <div className="entry-card" key={`expense-${index}`}>
                  <div className="form-grid">
                    <label className="field">
                      <span>項目</span>
                      <input
                        value={expense.category}
                        onChange={(event) => handleExpenseChange(index, "category", event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>金額</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={expense.amount}
                        onChange={(event) => handleExpenseChange(index, "amount", event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="entry-actions">
                    <span className="muted">毎月の固定支出に含めます。</span>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        setExpenses((current) =>
                          current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                      disabled={expenses.length === 1}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "保存中..." : "入力内容を保存"}
            </button>
            {mutation.isSuccess ? (
              <p className="status-message status-message-success">
                スナップショットを保存しました。
              </p>
            ) : null}
            {mutation.isError ? (
              <p className="status-message status-message-error">
                保存に失敗しました。{mutation.error.message}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        {isLoading ? (
          <p>スナップショットを読み込み中...</p>
        ) : error ? (
          <p>スナップショットの読み込みに失敗しました。</p>
        ) : (
          <DataTable
            columns={["日付", "口座数", "支出合計", "メモ"]}
            rows={(data?.snapshots ?? []).map((snapshot) => [
              snapshot.snapshotDate,
              snapshot.accounts.length.toString(),
              formatMoney(snapshot.monthlyExpenses.reduce((total, expense) => total + expense.amount, 0)),
              snapshot.note ?? "",
            ])}
          />
        )}
      </section>
    </section>
  );
}
