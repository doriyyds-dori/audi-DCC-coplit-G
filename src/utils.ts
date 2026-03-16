import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn() — Tailwind CSS 类名合并工具
 * 合并 clsx + tailwind-merge，解决 Tailwind 类冲突问题。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
