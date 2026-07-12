import { requireUserId } from "@/lib/session";
import { getAllTradesForUser } from "@/lib/data/trades";
import { getAccountForUser } from "@/lib/data/account";
import { serializeTrades } from "@/lib/serialize";
import ReportsClient from "@/components/reports/ReportsClient";

export default async function ReportsPage() {
  const userId = await requireUserId();
  const [trades, account] = await Promise.all([getAllTradesForUser(userId), getAccountForUser(userId)]);

  return <ReportsClient trades={serializeTrades(trades)} startingBalance={Number(account.startingBalance)} />;
}
