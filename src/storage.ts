/**
 * storage.ts — localStorage 安全读写模块
 *
 * 解决的问题：
 * 1. JSON.parse 可能因数据损坏抛异常 → 用 try-catch 兜底
 * 2. 数据格式可能因版本升级不兼容 → 用版本号检测
 * 3. 写入时统一加版本标记，便于后续迁移
 */

/** 当前存储格式版本。数据结构变更时递增此值。 */
export const STORAGE_VERSION = 1;

interface VersionedData<T> {
  version: number;
  data: T;
}

/**
 * 从 localStorage 安全读取数据。
 * - 解析失败 → 返回 fallback
 * - 版本号不匹配 → 返回 fallback 并打印警告
 * - 旧格式（无版本号的裸 JSON）→ 尝试兼容读取
 */
export function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed = JSON.parse(raw);

    // 新格式：{ version, data }
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
      const versioned = parsed as VersionedData<T>;
      if (versioned.version !== STORAGE_VERSION) {
        console.warn(
          `[storage] "${key}" 版本不匹配（存储=${versioned.version}，当前=${STORAGE_VERSION}），已回退到默认值`
        );
        return fallback;
      }
      return versioned.data;
    }

    // 旧格式兼容：直接存的数组/对象（无 version 包裹）
    // 直接返回，下一次 safeStringify 时会自动升级格式
    return parsed as T;
  } catch (e) {
    console.warn(`[storage] "${key}" 解析失败，已回退到默认值`, e);
    return fallback;
  }
}

/**
 * 安全写入 localStorage，自动附带版本号。
 */
export function safeStringify<T>(key: string, data: T): void {
  try {
    const wrapped: VersionedData<T> = {
      version: STORAGE_VERSION,
      data,
    };
    localStorage.setItem(key, JSON.stringify(wrapped));
  } catch (e) {
    console.error(`[storage] "${key}" 写入失败`, e);
  }
}

/**
 * 清除所有 localStorage 数据。
 * 用于"重置系统"功能。
 */
export function clearAll(): void {
  localStorage.clear();
}
