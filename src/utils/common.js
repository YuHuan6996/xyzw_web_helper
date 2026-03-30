/**
 * 通用工具函数集合
 * 提供项目中常用的工具方法
 */

// 类型定义
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  data?: any;
}

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间(ms)
 * @param options 配置选项
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  
  const {
    leading = false,
    trailing = true,
    maxWait
  } = options;

  function invokeFunc(time: number) {
    const args = lastArgs;
    lastArgs = null;
    lastInvokeTime = time;
    return func(...(args as Parameters<T>));
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    if (leading) {
      invokeFunc(time);
    }
    return startTimer(time);
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function startTimer(time: number) {
    return setTimeout(timerExpired, remainingWait(time));
  }

  function cancelTimer() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      timeoutId = startTimer(time);
    }
  }

  function trailingEdge(time: number) {
    timeoutId = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    return undefined;
  }

  function debounced(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        cancelTimer();
        timeoutId = startTimer(time);
        return invokeFunc(time);
      }
    }
    if (timeoutId === null) {
      timeoutId = startTimer(time);
    }
  }

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = null;
    timeoutId = null;
  };

  return debounced;
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param wait 等待时间(ms)
 * @param options 配置选项
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let previous = 0;
  let result: ReturnType<T> | undefined;
  
  const { leading = true, trailing = true } = options;

  function later(this: any) {
    previous = trailing === false ? 0 : Date.now();
    timeoutId = null;
    result = func.apply(this, arguments as any);
  }

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (!previous && leading === false) previous = now;
    
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      previous = now;
      result = func.apply(this, args);
    } else if (!timeoutId && trailing !== false) {
      timeoutId = setTimeout(later.bind(this, ...args), remaining);
    }
    return result;
  };
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        (clonedObj as any)[key] = deepClone((obj as any)[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * 对象深度合并
 * @param target 目标对象
 * @param sources 源对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  
  const source = sources.shift();

  if (source === undefined) {
    return target;
  }

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!(key in target)) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查是否为普通对象
 * @param obj 要检查的对象
 */
function isPlainObject(obj: any): obj is Record<string, any> {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * 格式化字节数
 * @param bytes 字节数
 * @param decimals 小数位数
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 生成随机ID
 * @param length ID长度
 */
export function generateId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 等待指定时间
 * @param ms 毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 限制数值范围
 * @param value 数值
 * @param min 最小值
 * @param max 最大值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    isValid,
    message: isValid ? undefined : '请输入有效的邮箱地址'
  };
}

/**
 * 验证手机号格式
 * @param phone 手机号
 */
export function validatePhone(phone: string): ValidationResult {
  const phoneRegex = /^1[3-9]\d{9}$/;
  const isValid = phoneRegex.test(phone);
  
  return {
    isValid,
    message: isValid ? undefined : '请输入有效的手机号码'
  };
}

/**
 * 验证URL格式
 * @param url URL地址
 */
export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: '请输入有效的URL地址'
    };
  }
}

/**
 * 防止XSS攻击的HTML转义
 * @param str 要转义的字符串
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (match) => map[match]);
}

/**
 * 数组去重
 * @param array 数组
 * @param keyFn 用于比较的键函数
 */
export function uniqueBy<T>(array: T[], keyFn?: (item: T) => any): T[] {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 分组函数
 * @param array 数组
 * @param keyFn 分组键函数
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 排序函数
 * @param array 数组
 * @param keyFn 排序键函数
 * @param ascending 是否升序
 */
export function sortBy<T>(array: T[], keyFn: (item: T) => any, ascending = true): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 批量处理函数
 * @param items 项目数组
 * @param processor 处理函数
 * @param batchSize 批次大小
 * @param delay 批次间延迟
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 10,
  delay = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (i + batchSize < items.length && delay > 0) {
      await sleep(delay);
    }
  }
  
  return results;
}

/**
 * 缓存装饰器
 * @param func 要缓存的函数
 * @param ttl 缓存时间(ms)
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  ttl = 300000 // 5分钟默认
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const result = func(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    
    // 清理过期缓存
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp >= ttl) {
          cache.delete(k);
        }
      }
    }
    
    return result;
  } as T;
}

export default {
  debounce,
  throttle,
  deepClone,
  deepMerge,
  formatBytes,
  generateId,
  sleep,
  clamp,
  validateEmail,
  validatePhone,
  validateUrl,
  escapeHtml,
  uniqueBy,
  groupBy,
  sortBy,
  batchProcess,
  memoize
};