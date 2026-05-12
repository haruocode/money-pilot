import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSnapshots, createSnapshot } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useUiStore } from "../../store/ui-store";
import { DataTable } from "../components/DataTable";

export function SnapshotsPage() {
  const queryClient = useQueryClient();
  const { currency } = useUiStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshots"],
    queryFn: fetchSnapshots,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createSnapshot({
        snapshotDate: new Date().toISOString().slice(0, 10),
        currency,
        note: "Initial manual snapshot",
        accounts: [
          {
            name: "Main Bank",
            accountType: "Bank",
            balance: 250000,
            isDebt: false,
          },
          {
            name: "Credit Card",
            accountType: "CreditCard",
            balance: 45000,
            creditLimit: 200000,
            isDebt: true,
          },
        ],
        monthlyExpenses: [
          { category: "Rent", amount: 85000 },
          { category: "Utilities", amount: 12000 },
          { category: "Groceries", amount: 40000 },
        ],
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snapshots"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Snapshots</h2>
        </div>

        <button className="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Add sample snapshot"}
        </button>
      </div>

      <section className="panel">
        {isLoading ? (
          <p>Loading snapshots...</p>
        ) : error ? (
          <p>Failed to load snapshots.</p>
        ) : (
          <DataTable
            columns={["Date", "Currency", "Accounts", "Expenses", "Note"]}
            rows={(data?.snapshots ?? []).map((snapshot) => [
              snapshot.snapshotDate,
              snapshot.currency,
              snapshot.accounts.length.toString(),
              formatMoney(
                snapshot.monthlyExpenses.reduce((total, expense) => total + expense.amount, 0),
                currency,
              ),
              snapshot.note ?? "",
            ])}
          />
        )}
      </section>
    </section>
  );
}

