import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  type CacheData,
  fetchUsage,
  formatUsageText,
  formatUsageTooltip,
  isCacheValid,
  type UsageData,
} from './usage.js';

const SECRET_KEY_SESSION = 'claude-usage.sessionKey';
const SECRET_KEY_ORG_ID = 'claude-usage.organizationId';
const CACHE_FILE_NAME = 'vscode-claude-usage-cache.json';
const ERROR_THRESHOLD = 3;

let statusBarItem: vscode.StatusBarItem;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let lastSuccessfulUsage: UsageData | null = null;

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'claude-usage.refresh';
  context.subscriptions.push(statusBarItem);

  const setupCredentialsCommand = vscode.commands.registerCommand('claude-usage.setupCredentials', async () => {
    const currentSessionKey = await context.secrets.get(SECRET_KEY_SESSION);
    const sessionKey = await vscode.window.showInputBox({
      prompt: 'Step 1/2: Enter your Claude session key',
      password: true,
      placeHolder: 'sk-ant-...',
      value: currentSessionKey,
    });
    if (sessionKey === undefined) {
      return;
    }
    if (sessionKey !== '') {
      await context.secrets.store(SECRET_KEY_SESSION, sessionKey);
    }

    const currentOrgId = await context.secrets.get(SECRET_KEY_ORG_ID);
    const orgId = await vscode.window.showInputBox({
      prompt: 'Step 2/2: Enter your Claude organization ID',
      placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      value: currentOrgId,
    });
    if (orgId === undefined) {
      return;
    }
    if (orgId !== '') {
      await context.secrets.store(SECRET_KEY_ORG_ID, orgId);
    }

    vscode.window.showInformationMessage('Credentials saved successfully');
    clearCache();
    await refreshUsage(context);
  });

  const refreshCommand = vscode.commands.registerCommand('claude-usage.refresh', async () => {
    clearCache();
    await refreshUsage(context);
  });

  const clearCredentialsCommand = vscode.commands.registerCommand('claude-usage.clearCredentials', async () => {
    await context.secrets.delete(SECRET_KEY_SESSION);
    await context.secrets.delete(SECRET_KEY_ORG_ID);
    clearCache();
    vscode.window.showInformationMessage('Credentials cleared');
    updateStatusBar(null, 'No credentials');
  });

  context.subscriptions.push(setupCredentialsCommand, refreshCommand, clearCredentialsCommand);

  // Restore last successful usage from cache on startup
  const cache = readCache();
  if (cache?.usage) {
    lastSuccessfulUsage = cache.usage;
    updateStatusBar(cache.usage);
  }

  statusBarItem.show();
  refreshUsage(context);
  startRefreshTimer(context);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('claudeUsage.refreshInterval')) {
      startRefreshTimer(context);
    }
  });
}

export function deactivate(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

function startRefreshTimer(context: vscode.ExtensionContext): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const config = vscode.workspace.getConfiguration('claudeUsage');
  const intervalMinutes = config.get<number>('refreshInterval', 5);
  const intervalMs = intervalMinutes * 60 * 1000;

  refreshTimer = setInterval(() => {
    // Only auto-refresh when window is focused to avoid duplicate requests
    const currentConfig = vscode.workspace.getConfiguration('claudeUsage');
    const refreshOnlyWhenFocused = currentConfig.get<boolean>('refreshOnlyWhenFocused', true);
    if (!refreshOnlyWhenFocused || vscode.window.state.focused) {
      refreshUsage(context, false);
    }
  }, intervalMs);
}

function getCachePath(): string {
  return path.join(os.tmpdir(), CACHE_FILE_NAME);
}

function readCache(): CacheData | null {
  try {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    const content = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(content) as CacheData;
  } catch {
    return null;
  }
}

function writeCache(data: CacheData): void {
  try {
    const cachePath = getCachePath();
    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
  } catch {
    // Ignore write errors
  }
}

function clearCache(): void {
  try {
    const cachePath = getCachePath();
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  } catch {
    // Ignore errors
  }
}

function getMaxCacheAge(): number {
  const config = vscode.workspace.getConfiguration('claudeUsage');
  const intervalMinutes = config.get<number>('refreshInterval', 5);
  return intervalMinutes * 60 * 1000;
}

async function refreshUsage(context: vscode.ExtensionContext, force = true): Promise<void> {
  const sessionKey = await context.secrets.get(SECRET_KEY_SESSION);
  const orgId = await context.secrets.get(SECRET_KEY_ORG_ID);

  if (!sessionKey || !orgId) {
    const missing = !sessionKey && !orgId ? 'credentials' : !sessionKey ? 'session key' : 'org ID';
    updateStatusBar(null, `Missing ${missing}`);
    statusBarItem.command = 'claude-usage.setupCredentials';
    return;
  }

  statusBarItem.command = 'claude-usage.refresh';

  const cache = readCache();
  if (!force && cache && isCacheValid(cache, getMaxCacheAge())) {
    if (cache.error && (cache.errorCount ?? 0) >= ERROR_THRESHOLD) {
      updateStatusBar(null, cache.error);
    } else if (cache.usage) {
      updateStatusBar(cache.usage);
    }
    return;
  }

  // Show spinning icon without text change during fetch
  if (lastSuccessfulUsage) {
    statusBarItem.text = `$(loading~spin) ${formatUsageText(lastSuccessfulUsage).replace('$(pie-chart) ', '')}`;
  } else {
    statusBarItem.text = '$(loading~spin) Claude';
  }

  try {
    const usage = await fetchUsage(sessionKey, orgId);
    lastSuccessfulUsage = usage;
    writeCache({ usage, timestamp: Date.now(), errorCount: 0 });
    updateStatusBar(usage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const previousErrorCount = cache?.errorCount ?? 0;
    const newErrorCount = previousErrorCount + 1;

    // Keep the last successful usage in cache but track error count
    writeCache({
      usage: lastSuccessfulUsage,
      timestamp: Date.now(),
      error: errorMessage,
      errorCount: newErrorCount,
    });

    // Only show error if it persists for ERROR_THRESHOLD times
    if (newErrorCount >= ERROR_THRESHOLD) {
      updateStatusBar(null, errorMessage);
    } else if (lastSuccessfulUsage) {
      // Show last successful data instead of error
      updateStatusBar(lastSuccessfulUsage);
    } else {
      updateStatusBar(null, errorMessage);
    }
  }
}

function updateStatusBar(usage: UsageData | null, message?: string): void {
  if (usage) {
    statusBarItem.text = formatUsageText(usage);
    statusBarItem.tooltip = formatUsageTooltip(usage);
  } else {
    statusBarItem.text = `$(pie-chart) Claude: ${message || 'N/A'}`;
    statusBarItem.tooltip = message || 'Click to refresh';
  }
}
