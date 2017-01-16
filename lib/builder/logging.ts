/**
 * @file 日志管理
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { resolvePath, relativePath } from "../utility/path";
import { formatLog, addLogColor, removeLogColor, ConsoleColor, formatSource } from "../utility/log";
import { emit } from "./events";

/**
 * 表示日志等级。
 */
export const enum LogLevel {

    /**
     * 详细信息。
     */
    verbose,

    /**
     * 普通日志。
     */
    log,

    /**
     * 信息日志。
     */
    info,

    /**
     * 成功日志。
     */
    success,

    /**
     * 失败日志。
     */
    failure,

    /**
     * 警告日志。
     */
    warning,

    /**
     * 错误日志。
     */
    error,

    /**
     * 致命错误日志。
     */
    fatal,

    /**
     * 无日志。
     */
    slient,

}

/**
 * 获取或设置允许输出的最低日志等级。
 */
export var logLevel = LogLevel.log;

/**
 * 获取或设置允许输出的最大日志长度。0 表示不限制。
 */
export var maxMessageLength = ((process.stdout as WriteStream).columns || 80) * 5;

/**
 * 获取或设置在控制台显示源内容的格式。如果设为 null 则不显示源内容。
 */
export var logSource = {

    /**
     * 最大显示的宽度。如果小于等于 0 则表示和控制台实际宽度的差。
     */
    width: 0,

    /**
     * 最大显示的高度。
     */
    height: 3,

    /**
     * 是否显示行号。
     */
    showLine: true,

    /**
     * 是否显示列号。
     */
    showColumn: true,

};

/**
 * 表示一条日志项。
 */
export class LogEntry {

    /**
     * 获取所属的插件名。
     */
    plugin?: string;

    /**
     * 获取日志信息。
     */
    message?: string;

    /**
     * 获取源文件名。
     */
    fileName?: string;

    /**
     * 获取开始行号(从 0 开始)。
     */
    startLine?: number;

    /**
     * 获取开始列号(从 0 开始)。
     */
    startColumn?: number;

    /**
     * 获取结束行号(从 0 开始)。
     */
    endLine?: number;

    /**
     * 获取结束列号(从 0 开始)。
     */
    endColumn?: number;

    /**
     * 获取原始错误对象。
     */
    error?: string | Object | Error;

    /**
     * 是否打印错误堆栈信息。
     */
    showStack?: boolean;

    /**
     * 获取源文件内容。
     */
    content?: string;

    /**
     * 获取发生错误的源。
     */
    source?: string;

    /**
     * 初始化新的日志项。
     * @param data 原始日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    constructor(data?: string | Error | LogEntry, args?: Object) {

        // 处理原始日志数据。
        if (typeof data === "string") {
            this.message = data;
        } else if (data == undefined) {
            this.message = String(data);
        } else if (data instanceof Error) {
            this.error = data;
            this.message = data.message;
        } else {
            Object.assign(this, data);
            if (this.message == undefined && this.error != undefined) {
                this.message = (this.error as Error).message || this.error.toString();
            }
        }

        // 格式化信息。
        this.message = format(this.message!, args);
        if (this.fileName) this.fileName = resolvePath(this.fileName);
    }

    /**
     * 获取当前日志数据的字符串形式。
     * @param colors 是否包含颜色信息。
     */
    toString(colors?: boolean) {

        let result = "";

        // 添加插件。
        if (this.plugin) {
            result += addLogColor(`[${this.plugin}]`, ConsoleColor.cyan);
        }

        // 添加路径。
        if (this.fileName) {
            result += getDisplayName(this.fileName);
            if (this.startLine != undefined) {
                result += "(" + (this.startLine + 1);
                if (this.startColumn != undefined) {
                    result += "," + (this.startColumn + 1);
                }
                result += ")";
            }
            result += ": ";
        }

        // 添加信息。
        if (this.message) {
            if (logLevel === LogLevel.verbose || this.plugin == undefined || maxMessageLength <= 0 || this.message.length < maxMessageLength) {
                result += this.message;
            } else {
                result += this.message.substring(0, maxMessageLength - 3) + addLogColor("...", ConsoleColor.gray);
            }
        }

        // 添加源信息。
        const source = logSource && (this.source != undefined ? this.source : this.content != undefined && this.startLine != undefined ? formatSource(this.content, logSource.width, logSource.height, logSource.showLine, logSource.showColumn, this.startLine, this.startColumn, this.endLine, this.endColumn) : undefined);
        if (source) {
            result += `\n\n${addLogColor(source, ConsoleColor.gray)}\n`;
        }

        // 添加堆栈信息。
        const errorStack = (this.showStack != undefined ? this.showStack : logLevel === LogLevel.verbose || this.fileName == undefined || this.startLine == undefined && this.source == undefined) && this.error && (this.error as Error).stack;
        if (errorStack) {
            result += `\n\n${addLogColor(errorStack, ConsoleColor.gray)}\n`;
        }

        // 去除颜色信息。
        if (!colors) {
            result = removeLogColor(result);
        }

        return result.replace(/\r\n?/g, "\n");
    }

}

/**
 * 获取或设置是否在控制台显示带颜色的文本。
 */
export var colors = (process.stdout as WriteStream).isTTY === true && !process.env["NODE_DISABLE_COLORS"];

/**
 * 获取或设置记录日志时的回调函数。
 * @param log 要记录的日志项。
 * @param level 要记录的日志等级。
 * @return 如果函数返回 false，则不在控制台输出当前日志。
 */
export var onLog = (log: LogEntry, level: LogLevel) => !emit("log", log, level);

/**
 * 获取累积的警告数。
 */
export var warningCount = 0;

/**
 * 获取累积的错误数。
 */
export var errorCount = 0;

/**
 * 记录一条日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @param level 要记录的日志等级。
 */
export function log(data: string | Error | LogEntry, args?: Object, level = LogLevel.log) {

    // 处理等级。
    switch (level) {
        case LogLevel.error:
        case LogLevel.fatal:
            errorCount++;
            break;
        case LogLevel.warning:
            warningCount++;
            break;
    }

    // 验证等级。
    if (level < logLevel) {
        return;
    }

    // 统一日志数据格式。
    if (!(data instanceof LogEntry)) {
        data = new LogEntry(data, args);
    }

    // 自定义打印日志。
    if (onLog && onLog(data, level) === false) {
        return;
    }

    // 格式化日志。
    const message = data.toString(colors);

    // 打印日志。
    switch (level) {
        case LogLevel.error:
            var prefix = `error ${errorCount}: `;
            if (colors) prefix = addLogColor(prefix, ConsoleColor.red);
            return console.error(prefix + message);
        case LogLevel.fatal:
            var prefix = `fatal error: `;
            if (colors) prefix = addLogColor(prefix, ConsoleColor.red);
            return console.error(prefix + message);
        case LogLevel.warning:
            var prefix = `warning ${warningCount}: `;
            if (colors) prefix = addLogColor(prefix, ConsoleColor.yellow);
            return console.warn(prefix + message);
        case LogLevel.info:
        case LogLevel.success:
        case LogLevel.failure:
            return console.info(message);
        default:
            return console.log(message);
    }

}

/**
 * 记录一条信息日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function info(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.info);
}

/**
 * 记录一条警告日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function warning(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.warning);
}

/**
 * 记录一条错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function error(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.error);
}

/**
 * 记录一条致命错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function fatal(data: string | Error | LogEntry, args?: Object) {
    log(data, args, LogLevel.fatal);
    process.exit(-1);
}

/**
 * 记录一条详细日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function verbose(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.verbose);
}

/**
 * 获取或设置所有消息的本地化版本。
 */
export var dict: { [message: string]: string } = { __proto__: null! };

/**
 * 格式化指定的日志信息。
 * @param message 要处理的日志信息。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回已格式化的消息。
 * @example format("abc{a}{b}", { a: 1, b: 2 }) // "abc1"
 * @example format("abc{0}{1}", [1, 2]) // "abc12"
 */
export function format(message: string, args?: Object) {
    if (!message) return "";
    message = dict[message] || message;
    if (args != undefined) message = formatLog(message, args);
    return message;
}

/**
 * 获取或设置是否显示完整路径。
 */
export var fullPath = false;

/**
 * 获取或设置在未显示完整路径时使用的基路径。
 */
export var displayRoot = process.cwd();

/**
 * 获取指定路径的友好显示名称。
 * @param path 要处理的路径。
 * @return 如果 *fullPath* 为 false 则返回基于 *cwd* 的相对路径，否则返回绝对路径。
 */
export function getDisplayName(path: string | null) {
    path = path || "";
    if (fullPath) {
        return resolvePath(path);
    }
    return relativePath(displayRoot, path) || ".";
}
