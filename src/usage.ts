export interface UsageData {
  five_hour: {
    utilization: number;
    resets_at: string;
  };
  seven_day: {
    utilization: number;
    resets_at: string;
  };
}

export interface CacheData {
  usage: UsageData | null;
  timestamp: number;
  error?: string;
  errorCount?: number;
}

export function formatUsageText(usage: UsageData): string {
  const fiveHour = Math.round(usage.five_hour.utilization);
  const sevenDay = Math.round(usage.seven_day.utilization);
  return `$(pie-chart) Claude: ${fiveHour}% / ${sevenDay}%`;
}

function formatResetTime(resetAt: string): string {
  const resetDate = new Date(resetAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  const localTime = resetDate.toLocaleString();
  const remaining = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return `${localTime} - ${remaining}`;
}

export function formatUsageTooltip(usage: UsageData): string {
  const fiveHour = Math.round(usage.five_hour.utilization);
  const sevenDay = Math.round(usage.seven_day.utilization);
  const fiveHourReset = formatResetTime(usage.five_hour.resets_at);
  const sevenDayReset = formatResetTime(usage.seven_day.resets_at);

  return `5-hour: ${fiveHour}% (resets: ${fiveHourReset})\n7-day: ${sevenDay}% (resets: ${sevenDayReset})\nClick to refresh`;
}

export function isCacheValid(cache: CacheData, maxAgeMs: number): boolean {
  return Date.now() - cache.timestamp < maxAgeMs;
}

export function parseUsageResponse(data: unknown): UsageData {
  const usage = data as UsageData;
  if (typeof usage?.five_hour?.utilization !== 'number' || typeof usage?.seven_day?.utilization !== 'number') {
    throw new Error('Invalid usage data format');
  }
  return usage;
}

export async function fetchUsage(sessionKey: string, orgId: string): Promise<UsageData> {
  const url = `https://claude.ai/api/organizations/${orgId}/usage`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Cookie: `sessionKey=${sessionKey}`,
      'User-Agent': 'VSCode-Claude-Usage-Extension',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Auth failed');
    }

    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseUsageResponse(data);
}
