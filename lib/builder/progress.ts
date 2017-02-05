/**
 * @file 进度条管理
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { formatDate } from "../utility/date";
import { addLogColor, ConsoleColor } from "../utility/log";
import { updateProgress } from "../utility/progressBar";
import { format, logLevel, LogLevel, verbose } from "./logging";

/**
 * 获取或设置是否在控制台显示进度条。
 */
export var progress = (process.stdout as WriteStream).isTTY === true;

/**
 * 获取所有任务数。
 */
export var taskCount = 0;

/**
 * 获取所有已完成的任务数。
 */
export var doneTaskCount = 0;

/**
 * 记录将开始执行指定的任务。
 * @param task 任务内容。
 * @param args 格式化参数。*task* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回任务序号。
 */
export function begin(task: string, args?: Object) {
    taskCount++;
    task = format(task, args);
    if (logLevel === LogLevel.verbose) {
        verbose("{gray:now} Starting: {default:task}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            task: task
        });
    } else if (progress) {
        updateProgress(`${addLogColor(`(${doneTaskCount}/${taskCount})`, ConsoleColor.cyan)} ${task}`);
    }
    return task;
}

/**
 * 记录已执行指定的任务。
 * @param taskId 要结束的任务序号。
 */
export function end(taskId: string) {
    doneTaskCount++;
    if (logLevel === LogLevel.verbose) {
        verbose("{gray:now} Finished: {default:task}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            task: taskId
        });
    } else if (progress && doneTaskCount === taskCount) {
        updateProgress(null);
    }
}
