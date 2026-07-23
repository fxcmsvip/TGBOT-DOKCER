/**
 * Time utilities for ADMINCHAT Panel.
 * All backend timestamps are in UTC. This module converts to local timezone.
 * Locale-aware formatting based on current language setting.
 */

import { langStore } from '../stores/langStore';

/** Get the appropriate locale string based on current language */
function getLocale(): string {
  const lang = langStore.getState().lang;
  if (lang === 'zh-CN') return 'zh-CN';
  if (lang === 'zh-TW') return 'zh-TW';
  return 'en-US';
}

/** Parse a UTC timestamp string from backend, ensuring it's treated as UTC */
function parseUTC(dateStr: string): Date {
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('T')) {
    return new Date(dateStr + 'Z');
  }
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
}

/** Format as time only: "20:02" */
export function formatTime(dateStr: string): string {
  const date = parseUTC(dateStr);
  return date.toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Format as full date-time: "2026/03/21 20:02:30" */
export function formatDateTime(dateStr: string): string {
  const date = parseUTC(dateStr);
  return date.toLocaleString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Format as date only: "2026/03/21" */
export function formatDate(dateStr: string): string {
  const date = parseUTC(dateStr);
  return date.toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Format as relative time: locale-aware */
export function formatRelativeTime(dateStr: string): string {
  const date = parseUTC(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const lang = langStore.getState().lang;
  const isZh = lang === 'zh-CN' || lang === 'zh-TW';

  if (diffMins < 1) return isZh ? '刚刚' : 'just now';
  if (diffMins < 60) return isZh ? `${diffMins}分钟前` : `${diffMins}m ago`;
  if (diffHours < 24) return isZh ? `${diffHours}小时前` : `${diffHours}h ago`;
  if (diffDays < 2) return isZh ? '昨天' : 'yesterday';
  if (diffDays < 7) return isZh ? `${diffDays}天前` : `${diffDays}d ago`;

  return formatDate(dateStr);
}
