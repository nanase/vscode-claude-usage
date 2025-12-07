import {
  type CacheData,
  formatUsageText,
  formatUsageTooltip,
  isCacheValid,
  parseUsageResponse,
  type UsageData,
} from './usage.js';

describe('formatUsageText', () => {
  it('should format usage data correctly', () => {
    const usage: UsageData = {
      five_hour: { utilization: 3.5, resets_at: '2025-12-07T16:59:59Z' },
      seven_day: { utilization: 31.2, resets_at: '2025-12-09T00:59:59Z' },
    };

    expect(formatUsageText(usage)).toBe('$(pie-chart) Claude: 4% / 31%');
  });

  it('should round utilization values', () => {
    const usage: UsageData = {
      five_hour: { utilization: 0.4, resets_at: '2025-12-07T16:59:59Z' },
      seven_day: { utilization: 99.9, resets_at: '2025-12-09T00:59:59Z' },
    };

    expect(formatUsageText(usage)).toBe('$(pie-chart) Claude: 0% / 100%');
  });
});

describe('formatUsageTooltip', () => {
  it('should format tooltip with reset times', () => {
    const usage: UsageData = {
      five_hour: { utilization: 10, resets_at: '2025-12-07T16:59:59Z' },
      seven_day: { utilization: 50, resets_at: '2025-12-09T00:59:59Z' },
    };

    const tooltip = formatUsageTooltip(usage);
    expect(tooltip).toContain('5-hour: 10%');
    expect(tooltip).toContain('7-day: 50%');
    expect(tooltip).toContain('resets:');
    expect(tooltip).toContain('Click to refresh');
  });
});

describe('isCacheValid', () => {
  it('should return true for fresh cache', () => {
    const cache: CacheData = {
      usage: null,
      timestamp: Date.now() - 1000,
    };

    expect(isCacheValid(cache, 5 * 60 * 1000)).toBe(true);
  });

  it('should return false for expired cache', () => {
    const cache: CacheData = {
      usage: null,
      timestamp: Date.now() - 10 * 60 * 1000,
    };

    expect(isCacheValid(cache, 5 * 60 * 1000)).toBe(false);
  });

  it('should return false for exactly expired cache', () => {
    const cache: CacheData = {
      usage: null,
      timestamp: Date.now() - 5 * 60 * 1000,
    };

    expect(isCacheValid(cache, 5 * 60 * 1000)).toBe(false);
  });
});

describe('parseUsageResponse', () => {
  it('should parse valid response', () => {
    const data = {
      five_hour: { utilization: 3.0, resets_at: '2025-12-07T16:59:59Z' },
      seven_day: { utilization: 31.0, resets_at: '2025-12-09T00:59:59Z' },
    };

    const result = parseUsageResponse(data);
    expect(result.five_hour.utilization).toBe(3.0);
    expect(result.seven_day.utilization).toBe(31.0);
  });

  it('should throw for missing five_hour', () => {
    const data = {
      seven_day: { utilization: 31.0, resets_at: '2025-12-09T00:59:59Z' },
    };

    expect(() => parseUsageResponse(data)).toThrow('Invalid usage data format');
  });

  it('should throw for missing seven_day', () => {
    const data = {
      five_hour: { utilization: 3.0, resets_at: '2025-12-07T16:59:59Z' },
    };

    expect(() => parseUsageResponse(data)).toThrow('Invalid usage data format');
  });

  it('should throw for invalid utilization type', () => {
    const data = {
      five_hour: { utilization: '3.0', resets_at: '2025-12-07T16:59:59Z' },
      seven_day: { utilization: 31.0, resets_at: '2025-12-09T00:59:59Z' },
    };

    expect(() => parseUsageResponse(data)).toThrow('Invalid usage data format');
  });
});
