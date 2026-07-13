// src/utils/persistence.ts
import { ViewMode } from "../components/ModeToggle";

const PREFIX = "paperling:";

/**
 * 工业级防御：安全读取 localStorage
 * 挡住的坑：
 * 1. 浏览器禁用了 Cookie / 开启了变态无痕模式：此时访问 `window.localStorage` 直接报 SecurityError。
 * 2. 存储的数据不是合法的 JSON：导致 `JSON.parse` 崩溃。
 */
export function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const value = localStorage.getItem(PREFIX + key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Persistence] 读取 key "${key}" 失败，回退到默认值:`, error);
    return fallback;
  }
}

/**
 * 工业级防御：安全写入 localStorage
 * 挡住的坑：
 * 1. 浏览器无痕模式/禁用限制：直接引发写入写入异常。
 * 2. 空间占满（QuotaExceededError）：手机端或大缓存导致 5MB 满额，不加 catch 会导致整个应用崩溃闪退。
 */
export function safeSet<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Persistence] 写入 key "${key}" 失败:`, error);
  }
}

// -----------------------------------------------------------------
// ★ B2. 派生的强类型持久化层 API
// -----------------------------------------------------------------

const KEYS = {
  THEME: "theme",
  VIEW_MODE: "view-mode",
  AUTO_SAVE: "auto-save",
};

export function getSavedTheme(): "light" | "dark" {
  return safeGet<"light" | "dark">(KEYS.THEME, "dark");
}

export function setSavedTheme(theme: "light" | "dark"): void {
  safeSet(KEYS.THEME, theme);
}

export function getSavedViewMode(): ViewMode {
  return safeGet<ViewMode>(KEYS.VIEW_MODE, "split");
}

export function setSavedViewMode(mode: ViewMode): void {
  safeSet(KEYS.VIEW_MODE, mode);
}

export function getAutoSave(): boolean {
  return safeGet<boolean>(KEYS.AUTO_SAVE, false); // 默认关闭自动保存
}

export function setAutoSave(enabled: boolean): void {
  safeSet(KEYS.AUTO_SAVE, enabled);
}