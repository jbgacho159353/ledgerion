import { requireUserId } from "@/lib/session";
import { getAllTradesForUser } from "@/lib/data/trades";
import { getAccountForUser } from "@/lib/data/account";
import { serializeTrades } from "@/lib/serialize";
import DashboardClient from "@/components/dashboard/DashboardClient";
import EmptyState from "@/components/EmptyState";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [trades, account] = await Promise.all([getAllTradesForUser(userId), getAccountForUser(userId)]);

  if (trades.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <EmptyState
          icon="📈"
          title="Log your first trade"
          description="Your dashboard will come alive with equity curves, win rates, and insights as soon as you log a trade."
          actionLabel="+ Log your first trade"
          actionHref="/trades"
        />
      </div>
    );
  }

  return <DashboardClient trades={serializeTrades(trades)} startingBalance={Number(account.startingBalance)} />;
}
