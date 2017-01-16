/**
 * @file 进度条
 * @author xuld <xuld@vip.qq.com>
 */
import { ellipsisLog } from "./log";

/**
 * 存储当前的进度条样式。0 表示未显示，其它数值分别表示一个样式类型。
 */
var progressStyle = 0;

/**
 * 更新进度条内容。
 * @param message 要显示的信息。如果为空则清空进度条。
 */
export function updateProgress(message?: string | null) {

    // 清空进度条。
    if (!message) {
        progressStyle = 0;
        delete process.stdout.write;
        delete process.stderr.write;
        process.stdout.write("\u001b[0J");
        return;
    }

    // 更新滑块样式。
    let styleChar: string;
    switch (progressStyle) {
        case 1:
            styleChar = "-";
            progressStyle = 2;
            break;
        case 2:
            styleChar = "\\";
            progressStyle = 3;
            break;
        case 3:
            styleChar = "|";
            progressStyle = 4;
            break;
        case 4:
            styleChar = "|";
            progressStyle = 1;
            break;
        default:
            styleChar = "-";
            progressStyle = 2;
            process.stderr.write = process.stdout.write = function processBarWriteProxy() {
                (process.stdout as any).__proto__.write.call(process.stdout, "\u001b[0J");
                return this.__proto__.write.apply(this, arguments);
            };
            break;
    }
    (process.stdout as any).__proto__.write.call(process.stdout, ellipsisLog(`\u001b[0J\u001b[90m${styleChar}\u001b[39m ${message}\u001b[1G`));
}

export default updateProgress;