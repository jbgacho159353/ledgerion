import type { SerializedTrade } from "@/lib/serialize";
import { groupBySetup, groupBySession, groupByPair, computeTradeStats } from "@/lib/stats";

export type InsightAction =
  | "CUT"
  | "DOUBLE DOWN"
  | "REWORK"
  | "MAINTAIN"
  | "COMING SOON"
  | "HEALTHY RECOVERY"
  | "MONITOR";

export interface Insight {
  emoji: string;
  title: string;
  description: string;
  action: InsightAction;
}

const MIN_SAMPLE = 3;

export function generateInsights(trades: SerializedTrade[]): Insight[] {
  if (trades.length < MIN_SAMPLE) return [];

  const insights: Insight[] = [];
  const stats = computeTradeStats(trades);
  const setups = groupBySetup(trades).filter((s) => s.count >= MIN_SAMPLE);
  const sessions = groupBySession(trades).filter((s) => s.count >= MIN_SAMPLE);
  const pairs = groupByPair(trades).filter((p) => p.count >= MIN_SAMPLE);

  const worstSetup = [...setups].sort((a, b) => a.winRate - b.winRate)[0];
  if (worstSetup && worstSetup.winRate === 0) {
    insights.push({
      emoji: "🛑",
      title: `Cut "${worstSetup.setup}"`,
      description: `${worstSetup.count} trades, 0% win rate, ${worstSetup.totalPnl >= 0 ? "+" : ""}$${worstSetup.totalPnl.toFixed(
        2
      )} total. This setup has not produced a single winner — stop trading it.`,
      action: "CUT",
    });
  } else if (worstSetup && worstSetup.winRate < 35 && worstSetup.totalPnl < 0) {
    insights.push({
      emoji: "⚠️",
      title: `Rework "${worstSetup.setup}"`,
      description: `${worstSetup.winRate.toFixed(0)}% win rate across ${worstSetup.count} trades, losing $${Math.abs(
        worstSetup.totalPnl
      ).toFixed(2)} total. The entry criteria for this setup need revisiting.`,
      action: "REWORK",
    });
  }

  const bestSetup = [...setups].sort((a, b) => b.totalPnl - a.totalPnl)[0];
  if (bestSetup && bestSetup.totalPnl > 0 && bestSetup.winRate >= 50) {
    insights.push({
      emoji: "🚀",
      title: `Double down on "${bestSetup.setup}"`,
      description: `${bestSetup.winRate.toFixed(0)}% win rate across ${bestSetup.count} trades, +$${bestSetup.totalPnl.toFixed(
        2
      )} total. Your most reliable edge — consider sizing up here.`,
      action: "DOUBLE DOWN",
    });
  }

  const worstSession = [...sessions].sort((a, b) => a.winRate - b.winRate)[0];
  if (worstSession && worstSession.winRate < 35 && worstSession.totalPnl < 0) {
    insights.push({
      emoji: "🌙",
      title: `${worstSession.session} session is bleeding`,
      description: `${worstSession.winRate.toFixed(0)}% win rate, $${Math.abs(worstSession.totalPnl).toFixed(
        2
      )} lost across ${worstSession.count} trades. Consider avoiding this session or trading smaller size.`,
      action: "CUT",
    });
  }

  const bestSession = [...sessions].sort((a, b) => b.totalPnl - a.totalPnl)[0];
  if (bestSession && bestSession.totalPnl > 0 && bestSession.winRate >= 50) {
    insights.push({
      emoji: "⭐",
      title: `${bestSession.session} session is your best`,
      description: `${bestSession.winRate.toFixed(0)}% win rate, +$${bestSession.totalPnl.toFixed(2)} across ${
        bestSession.count
      } trades. Prioritize screen time during this window.`,
      action: "DOUBLE DOWN",
    });
  }

  const bestPair = pairs[0];
  if (bestPair && bestPair.totalPnl > 0) {
    insights.push({
      emoji: "💰",
      title: `${bestPair.pair} is your strongest pair`,
      description: `+$${bestPair.totalPnl.toFixed(2)} across ${bestPair.count} trades. This is where your edge shows up most clearly.`,
      action: "DOUBLE DOWN",
    });
  }

  if (stats.avgLoss > 0 && stats.avgWin > 0) {
    const ratio = stats.avgWin / stats.avgLoss;
    if (ratio < 1) {
      insights.push({
        emoji: "📉",
        title: "Average loss exceeds average win",
        description: `Avg win $${stats.avgWin.toFixed(2)} vs avg loss $${stats.avgLoss.toFixed(
          2
        )}. You need a win rate well above 50% just to break even — tighten stops or let winners run longer.`,
        action: "REWORK",
      });
    } else if (ratio >= 1.5) {
      insights.push({
        emoji: "✅",
        title: "Strong risk management",
        description: `Avg win $${stats.avgWin.toFixed(2)} is ${ratio.toFixed(1)}x your avg loss $${stats.avgLoss.toFixed(
          2
        )}. Keep executing your exit process as-is.`,
        action: "MAINTAIN",
      });
    }
  }

  if (stats.profitFactor != null) {
    if (stats.profitFactor < 1) {
      insights.push({
        emoji: "🔻",
        title: "Profit factor below 1.0",
        description: `Profit factor is ${stats.profitFactor.toFixed(2)} — you're losing more than you win overall. Review position sizing and setup selection together.`,
        action: "REWORK",
      });
    } else if (stats.profitFactor >= 2) {
      insights.push({
        emoji: "🏆",
        title: "Excellent profit factor",
        description: `Profit factor of ${stats.profitFactor.toFixed(2)} means you're winning $${stats.profitFactor.toFixed(
          2
        )} for every $1 lost. Whatever you're doing, maintain it.`,
        action: "MAINTAIN",
      });
    }
  }

  return insights;
}
