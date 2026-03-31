/**
 * 智能日志管理系统
 * 支持日志级别控制、开发/生产环境区分、性能监控和远程日志
 */

// 日志级别定义
export const LOG_LEVELS = {
  ERROR: 0,   // 错误 - 始终显示
  WARN: 1,    // 警告 - 生产环境显示
  INFO: 2,    // 信息 - 开发环境显示
  DEBUG: 3,   // 调试 - 开发环境详细模式
  VERBOSE: 4, // 详细 - 仅在明确启用时显示
};

// 日志类别定义
export const LOG_CATEGORIES = {
  NETWORK: 'network',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  USER_ACTION: 'user_action',
  SYSTEM: 'system',
  BUSINESS: 'business'
};

class Logger {
  constructor(namespace = "APP", category = LOG_CATEGORIES.SYSTEM) {
    this.namespace = namespace;
    this.category = category;
    this.level = this.getLogLevel();
    this.isDev = import.meta.env.DEV;
    this.enableVerbose = localStorage.getItem("ws_debug_verbose") === "true";
    this.enablePerformance = localStorage.getItem("ws_performance_logging") === "true";
    
    // 性能监控
    this.performanceMarks = new Map();
    this.logs = []; // 内存中的日志缓冲区
    
    // 绑定方法上下文
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.verbose = this.verbose.bind(this);
    this.isDev = import.meta.env.DEV;

    // 初始化 enableVerbose
    // const savedVerbose = localStorage.getItem("ws_debug_verbose");
    // if (savedVerbose !== null) {
    //   this.enableVerbose = savedVerbose === "true";
    // } else {
    //   // 开发环境默认开启详细日志，生产环境默认关闭
    //   this.enableVerbose = this.isDev;
    // }

    // this.level = this.getLogLevel();
  }

  getLogLevel() {
    // 生产环境默认只显示错误和警告
    if (!this.isDev) {
      return LOG_LEVELS.WARN;
    }

    // 开发环境根据localStorage配置决定
    const saved = localStorage.getItem("ws_debug_level");
    if (saved) {
      return parseInt(saved, 10);
    }

    return LOG_LEVELS.VERBOSE; // 开发环境默认显示详细级别
  }

  setLevel(level) {
    this.level = level;
    localStorage.setItem("ws_debug_level", level.toString());
    this.info(`日志级别已设置为: ${Object.keys(LOG_LEVELS)[level]}`);
  }

  setVerbose(enabled) {
    this.enableVerbose = enabled;
    localStorage.setItem("ws_debug_verbose", enabled.toString());
    this.info(`详细日志模式: ${enabled ? '开启' : '关闭'}`);
  }

  setPerformance(enabled) {
    this.enablePerformance = enabled;
    localStorage.setItem("ws_performance_logging", enabled.toString());
    this.info(`性能监控: ${enabled ? '开启' : '关闭'}`);
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS)[level];
    const prefix = `[${timestamp}] [${this.namespace}] [${levelName}] [${this.category}]`;

    return [prefix, message, ...args];
  }

  // 基础日志方法
  error(message, ...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(...this.formatMessage(LOG_LEVELS.ERROR, message, ...args));
      this.addToBuffer('ERROR', message, args);
    }
  }

  warn(message, ...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(...this.formatMessage(LOG_LEVELS.WARN, message, ...args));
      this.addToBuffer('WARN', message, args);
    }
  }

  info(message, ...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info(...this.formatMessage(LOG_LEVELS.INFO, message, ...args));
      this.addToBuffer('INFO', message, args);
    }
  }

  debug(message, ...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(...this.formatMessage(LOG_LEVELS.DEBUG, message, ...args));
      this.addToBuffer('DEBUG', message, args);
    }
  }

  verbose(message, ...args) {
    if (this.enableVerbose && this.level >= LOG_LEVELS.VERBOSE) {
      console.log(...this.formatMessage(LOG_LEVELS.VERBOSE, message, ...args));
      this.addToBuffer('VERBOSE', message, args);
    }
  }

  // 添加到内存缓冲区
  addToBuffer(level, message, args) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      namespace: this.namespace,
      category: this.category,
      message,
      args,
      userAgent: navigator.userAgent
    };
    
    this.logs.push(logEntry);
    
    // 限制缓冲区大小
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  // 性能监控方法
  performanceMark(name) {
    if (!this.enablePerformance) return;
    
    const mark = {
      name,
      timestamp: performance.now(),
      type: 'mark'
    };
    
    this.performanceMarks.set(name, mark);
    this.debug(`🎯 性能标记: ${name}`);
  }

  performanceMeasure(name, startMark, endMark) {
    if (!this.enablePerformance) return;
    
    try {
      const measure = performance.measure(name, startMark, endMark);
      this.info(`⏱️ 性能测量 [${name}]: ${measure.duration.toFixed(2)}ms`);
      
      // 清理标记
      this.performanceMarks.delete(startMark);
      this.performanceMarks.delete(endMark);
      
      return measure.duration;
    } catch (error) {
      this.warn(`性能测量失败: ${name}`, error);
      return null;
    }
  }

  // 自动性能测量装饰器
  withPerformance(name, fn) {
    return async (...args) => {
      this.performanceMark(`${name}_start`);
      
      try {
        const result = await fn(...args);
        this.performanceMark(`${name}_end`);
        this.performanceMeasure(name, `${name}_start`, `${name}_end`);
        return result;
      } catch (error) {
        this.performanceMark(`${name}_end`);
        this.performanceMeasure(name, `${name}_start`, `${name}_end`);
        throw error;
      }
    };
  }

  // WebSocket专用的简化日志方法
  wsConnect(tokenId) {
    this.info(`🔗 WebSocket连接: ${tokenId}`);
    this.addToBuffer('INFO', `WebSocket连接: ${tokenId}`, [], LOG_CATEGORIES.NETWORK);
  }

  wsDisconnect(tokenId, reason = "") {
    this.info(`🔌 WebSocket断开: ${tokenId}${reason ? " - " + reason : ""}`);
    this.addToBuffer('INFO', `WebSocket断开: ${tokenId}`, [reason], LOG_CATEGORIES.NETWORK);
  }

  wsError(tokenId, error) {
    this.error(`❌ WebSocket错误 [${tokenId}]:`, error);
    this.addToBuffer('ERROR', `WebSocket错误 [${tokenId}]`, [error], LOG_CATEGORIES.NETWORK);
  }

  wsMessage(tokenId, cmd, isReceived = false) {
    if (cmd === "_sys/ack") return; // 过滤心跳消息
    const direction = isReceived ? "📨" : "📤";
    this.debug(`${direction} [${tokenId}] ${cmd}`);
    this.addToBuffer('DEBUG', `${direction} [${tokenId}] ${cmd}`, [], LOG_CATEGORIES.NETWORK);
  }

  wsStatus(tokenId, status, details = "") {
    this.info(`📊 [${tokenId}] ${status}${details ? " - " + details : ""}`);
    this.addToBuffer('INFO', `[${tokenId}] ${status}`, [details], LOG_CATEGORIES.NETWORK);
  }

  // 连接管理专用日志
  connectionLock(tokenId, operation, acquired = true) {
    if (acquired) {
      this.debug(`🔐 获取连接锁: ${tokenId} (${operation})`);
    } else {
      this.debug(`🔓 释放连接锁: ${tokenId} (${operation})`);
    }
    this.addToBuffer('DEBUG', `${acquired ? '获取' : '释放'}连接锁: ${tokenId}`, [operation], LOG_CATEGORIES.SYSTEM);
  }

  // 游戏消息处理
  gameMessage(tokenId, cmd, hasBody = false) {
    if (cmd === "_sys/ack") return;
    this.debug(`🎮 [${tokenId}] ${cmd}${hasBody ? " ✓" : " ✗"}`);
    this.addToBuffer('DEBUG', `🎮 [${tokenId}] ${cmd}`, [hasBody], LOG_CATEGORIES.BUSINESS);
  }

  // 导出日志
  exportLogs(format = 'json') {
    const logs = this.logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toISOString()
    }));

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'text') {
      return logs.map(log => 
        `[${log.timestamp}] [${log.level}] [${log.namespace}] ${log.message}`
      ).join('\n');
    }
  }

  // 清空日志缓冲区
  clearLogs() {
    this.logs = [];
    this.performanceMarks.clear();
    this.info('日志缓冲区已清空');
  }

  // 获取日志统计信息
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      startTime: this.logs.length > 0 ? this.logs[0].timestamp : null,
      endTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }
}

// 创建命名空间的日志实例
export const createLogger = (namespace, category = LOG_CATEGORIES.SYSTEM) => 
  new Logger(namespace, category);

// 预定义的日志实例
export const wsLogger = createLogger("WS", LOG_CATEGORIES.NETWORK);
export const tokenLogger = createLogger("TOKEN", LOG_CATEGORIES.SECURITY);
export const gameLogger = createLogger("GAME", LOG_CATEGORIES.BUSINESS);
export const perfLogger = createLogger("PERF", LOG_CATEGORIES.PERFORMANCE);

// 全局日志控制函数
export const setGlobalLogLevel = (level) => {
  wsLogger.setLevel(level);
  tokenLogger.setLevel(level);
  gameLogger.setLevel(level);
  perfLogger.setLevel(level);
};

export const enableVerboseLogging = (enabled = true) => {
  wsLogger.setVerbose(enabled);
  tokenLogger.setVerbose(enabled);
  gameLogger.setVerbose(enabled);
  perfLogger.setVerbose(enabled);
};

export const enablePerformanceLogging = (enabled = true) => {
  wsLogger.setPerformance(enabled);
  tokenLogger.setPerformance(enabled);
  gameLogger.setPerformance(enabled);
  perfLogger.setPerformance(enabled);
};

// 全局日志管理器
class LogManager {
  constructor() {
    this.loggers = new Map([
      ['ws', wsLogger],
      ['token', tokenLogger],
      ['game', gameLogger],
      ['perf', perfLogger]
    ]);
  }

  getAllLogs() {
    const allLogs = [];
    for (const logger of this.loggers.values()) {
      allLogs.push(...logger.logs);
    }
    return allLogs.sort((a, b) => a.timestamp - b.timestamp);
  }

  exportAllLogs(format = 'json') {
    const logs = this.getAllLogs().map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toISOString()
    }));

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'text') {
      return logs.map(log => 
        `[${log.timestamp}] [${log.level}] [${log.namespace}] [${log.category}] ${log.message}`
      ).join('\n');
    }
  }

  clearAllLogs() {
    for (const logger of this.loggers.values()) {
      logger.clearLogs();
    }
  }

  getStats() {
    const stats = {
      totalLogs: 0,
      byLogger: {},
      byLevel: {},
      byCategory: {}
    };

    for (const [name, logger] of this.loggers.entries()) {
      const loggerStats = logger.getLogStats();
      stats.byLogger[name] = loggerStats;
      stats.totalLogs += loggerStats.total;
      
      Object.entries(loggerStats.byLevel).forEach(([level, count]) => {
        stats.byLevel[level] = (stats.byLevel[level] || 0) + count;
      });
      
      Object.entries(loggerStats.byCategory).forEach(([category, count]) => {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + count;
      });
    }

    return stats;
  }
}

export const logManager = new LogManager();

// 开发者调试工具
window.wsDebug = {
  setLevel: setGlobalLogLevel,
  enableVerbose: enableVerboseLogging,
  enablePerformance: enablePerformanceLogging,
  levels: LOG_LEVELS,
  categories: LOG_CATEGORIES,
  managers: {
    ws: wsLogger,
    token: tokenLogger,
    game: gameLogger,
    perf: perfLogger,
    global: logManager
  },
  // 快捷设置
  quiet: () => setGlobalLogLevel(LOG_LEVELS.WARN),
  normal: () => setGlobalLogLevel(LOG_LEVELS.INFO),
  debug: () => setGlobalLogLevel(LOG_LEVELS.DEBUG),
  verbose: () => {
    setGlobalLogLevel(LOG_LEVELS.VERBOSE);
    enableVerboseLogging(true);
  },
  // 性能监控快捷方式
  perf: {
    enable: () => enablePerformanceLogging(true),
    disable: () => enablePerformanceLogging(false),
    mark: (name) => perfLogger.performanceMark(name),
    measure: (name, start, end) => perfLogger.performanceMeasure(name, start, end)
  },
  // 日志导出
  export: {
    json: () => logManager.exportAllLogs('json'),
    text: () => logManager.exportAllLogs('text'),
    download: (filename = 'logs.json') => {
      const data = logManager.exportAllLogs('json');
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};

console.info("🔧 WebSocket调试工具已加载");
console.info("使用 wsDebug.verbose() 启用详细日志");
console.info("使用 wsDebug.perf.enable() 启用性能监控");
console.info("使用 wsDebug.export.download() 导出日志");
