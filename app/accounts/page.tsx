import { getFundTree, getAccountTree } from "../../lib/chartOfAccounts";
import { getServerSession } from "../../lib/getServerSession";
import ChartOfAccountsView from "../../components/ChartOfAccountsView";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await getServerSession();
  if (!session) return null;

  const [funds, accounts] = await Promise.all([
    getFundTree(session.companyId),
    getAccountTree(session.companyId),
  ]);
  const isAdmin = session.role === "admin";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Funds and chart of accounts, with balances rolled up from the general ledger.
      </p>
      <div className="mt-6">
        <ChartOfAccountsView funds={funds} accounts={accounts} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
