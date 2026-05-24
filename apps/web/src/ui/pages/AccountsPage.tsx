import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountCategory,
  AccountMaster,
  CreateAccountMasterInput,
  UpdateAccountMasterInput,
} from "@money-pilot/shared";
import { archiveAccount, createAccount, fetchAccounts, updateAccount } from "../../lib/api";
import { formatMoney } from "../../lib/format";

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  Bank: "銀行",
  CreditCard: "クレジットカード",
  CardLoan: "カードローン",
  ConsumerLoan: "消費者ローン",
  Investment: "証券・投資",
  Crypto: "暗号資産",
  Cash: "現金",
  Other: "その他",
};

const CATEGORIES: AccountCategory[] = [
  "Bank", "Investment", "Crypto", "Cash", "Other",
  "CreditCard", "CardLoan", "ConsumerLoan",
];

const CREDIT_LIMIT_CATEGORIES: AccountCategory[] = ["CreditCard", "CardLoan"];

type AddFormState = { name: string; category: AccountCategory; creditLimit: string };
type EditFormState = { name: string; creditLimit: string };

export function AccountsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({ name: "", category: "Bank", creditLimit: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ name: "", creditLimit: "" });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsAdding(false);
      setAddForm({ name: "", category: "Bank", creditLimit: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountMasterInput }) =>
      updateAccount(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setEditingId(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const accounts = data?.accounts ?? [];
  const assets = accounts.filter((a) => !a.isDebt);
  const debts = accounts.filter((a) => a.isDebt);

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateAccountMasterInput = {
      name: addForm.name.trim(),
      category: addForm.category,
      creditLimit: addForm.creditLimit ? parseInt(addForm.creditLimit, 10) : null,
    };
    createMutation.mutate(input);
  }

  function startEdit(account: AccountMaster) {
    setEditingId(account.id);
    setEditForm({
      name: account.name,
      creditLimit: account.creditLimit != null ? String(account.creditLimit) : "",
    });
  }

  function handleEditSubmit(e: React.FormEvent, account: AccountMaster) {
    e.preventDefault();
    const input: UpdateAccountMasterInput = {
      name: editForm.name.trim(),
      creditLimit: editForm.creditLimit ? parseInt(editForm.creditLimit, 10) : null,
    };
    updateMutation.mutate({ id: account.id, input });
  }

  const showAddCreditLimit = CREDIT_LIMIT_CATEGORIES.includes(addForm.category);

  return (
    <div className="page">
      <div className="page-header">
        <h2>口座管理</h2>
        {!isAdding && (
          <button className="button" onClick={() => setIsAdding(true)}>
            口座を追加
          </button>
        )}
      </div>

      {isAdding && (
        <div className="panel">
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <div className="field">
                <span>口座名</span>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: 三菱UFJ普通"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <span>カテゴリ</span>
                <select
                  value={addForm.category}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      category: e.target.value as AccountCategory,
                      creditLimit: "",
                    }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {showAddCreditLimit && (
                <div className="field">
                  <span>限度額（円）</span>
                  <input
                    type="number"
                    value={addForm.creditLimit}
                    onChange={(e) => setAddForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder="例: 500000"
                    min="0"
                  />
                </div>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <div>
                {createMutation.isError && (
                  <p className="status-message status-message-error">
                    {createMutation.error.message}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setIsAdding(false);
                    createMutation.reset();
                  }}
                >
                  キャンセル
                </button>
                <button type="submit" className="button" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="muted">読み込み中...</p>
      ) : accounts.length === 0 && !isAdding ? (
        <p className="muted">
          口座がまだ登録されていません。「口座を追加」から登録してください。
        </p>
      ) : (
        <div className="panel-stack">
          {assets.length > 0 && (
            <AccountSection
              title="資産"
              accounts={assets}
              editingId={editingId}
              editForm={editForm}
              onEditFormChange={setEditForm}
              onEditStart={startEdit}
              onEditCancel={() => setEditingId(null)}
              onEditSubmit={handleEditSubmit}
              onArchive={(id) => {
                if (confirm(`この口座を削除しますか？`)) archiveMutation.mutate(id);
              }}
              isUpdating={updateMutation.isPending}
              updateError={updateMutation.error?.message ?? null}
            />
          )}
          {debts.length > 0 && (
            <AccountSection
              title="負債"
              accounts={debts}
              editingId={editingId}
              editForm={editForm}
              onEditFormChange={setEditForm}
              onEditStart={startEdit}
              onEditCancel={() => setEditingId(null)}
              onEditSubmit={handleEditSubmit}
              onArchive={(id) => {
                if (confirm(`この口座を削除しますか？`)) archiveMutation.mutate(id);
              }}
              isUpdating={updateMutation.isPending}
              updateError={updateMutation.error?.message ?? null}
            />
          )}
        </div>
      )}
    </div>
  );
}

type AccountSectionProps = {
  title: string;
  accounts: AccountMaster[];
  editingId: string | null;
  editForm: EditFormState;
  onEditFormChange: React.Dispatch<React.SetStateAction<EditFormState>>;
  onEditStart: (account: AccountMaster) => void;
  onEditCancel: () => void;
  onEditSubmit: (e: React.FormEvent, account: AccountMaster) => void;
  onArchive: (id: string) => void;
  isUpdating: boolean;
  updateError: string | null;
};

function AccountSection({
  title,
  accounts,
  editingId,
  editForm,
  onEditFormChange,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onArchive,
  isUpdating,
  updateError,
}: AccountSectionProps) {
  return (
    <div className="panel">
      <div className="section-heading" style={{ marginBottom: 12 }}>
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>口座名</th>
              <th>カテゴリ</th>
              <th>限度額</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) =>
              editingId === account.id ? (
                <tr key={account.id}>
                  <td colSpan={4}>
                    <form
                      onSubmit={(e) => onEditSubmit(e, account)}
                      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => onEditFormChange((f) => ({ ...f, name: e.target.value }))}
                        required
                        autoFocus
                        style={{ padding: "6px 10px", border: "1px solid #c2cee1", flex: "1 1 160px" }}
                      />
                      {CREDIT_LIMIT_CATEGORIES.includes(account.category) && (
                        <input
                          type="number"
                          value={editForm.creditLimit}
                          onChange={(e) =>
                            onEditFormChange((f) => ({ ...f, creditLimit: e.target.value }))
                          }
                          placeholder="限度額"
                          min="0"
                          style={{ padding: "6px 10px", border: "1px solid #c2cee1", width: 140 }}
                        />
                      )}
                      {updateError && (
                        <span className="status-message status-message-error">{updateError}</span>
                      )}
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ padding: "6px 12px" }}
                        onClick={onEditCancel}
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="button"
                        style={{ padding: "6px 12px" }}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "保存中..." : "保存"}
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{CATEGORY_LABELS[account.category]}</td>
                  <td>{account.creditLimit != null ? formatMoney(account.creditLimit) : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: 13 }}
                        onClick={() => onEditStart(account)}
                      >
                        編集
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: 13, color: "#b42318", borderColor: "#b42318" }}
                        onClick={() => onArchive(account.id)}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
