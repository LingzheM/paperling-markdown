// src/hooks/useAutosave.ts
import { useEffect, useRef } from "react";

interface Options {
  enabled: boolean;                    // 设置里的总开关
  canSave: boolean;                    // 有 handle 才能静默保存（新文件不能自动弹选择器）
  content: string;
  originalContent: string;
  onSave: () => Promise<void>;         // App 提供的实际保存动作
  onError: (msg: string) => void;
}

const AUTOSAVE_DELAY_MS = 1500;
const ERROR_THROTTLE_MS = 30_000;

export function useAutosave({ enabled, canSave, content, originalContent, onSave, onError }: Options) {
  const lastErrorRef = useRef(0);

  useEffect(() => {
    // 守卫：关着 / 存不了 / 本来就干净 —— 什么都不做
    if (!enabled || !canSave || content === originalContent) return;

    // ★★ 防抖的全部魔法在这四行 ★★
    // 每次 content 变化 → effect 重新运行 → 但重新运行【之前】React 会先
    // 执行上一次的 cleanup → 上一个定时器被清掉。
    // 于是连续打字时定时器不断地"立了又拆"，只有停手 1.5 秒后
    // 最后一个定时器才活到触发。没有 lodash.debounce，没有额外状态。
    const id = window.setTimeout(async () => {
      try {
        await onSave();
        lastErrorRef.current = 0;      // 成功后解除错误节流
      } catch (err) {
        // ★ 错误节流：磁盘坏了的话每 1.5 秒就失败一次，
        //   不能每次都弹 toast 轰炸用户 —— 30 秒最多提醒一次。
        const now = Date.now();
        if (now - lastErrorRef.current > ERROR_THROTTLE_MS) {
          lastErrorRef.current = now;
          onError(err instanceof Error ? err.message : "Autosave failed");
        }
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [enabled, canSave, content, originalContent, onSave, onError]);
}