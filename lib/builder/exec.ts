/**
 * @file 执行命令
 * @author xuld <xuld@vip.qq.com>
 */
import * as childProcess from "child_process";
import { bufferToString } from "../utility/encode";
import { log, info, error } from "./logging";
import { begin, end } from "./progress";
import { asyncQueue } from "./async";

/**
 * 同步执行一个命令。
 * @param command 要执行的命令。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @return 返回程序的输出内容。
 */
export function exec(command: string, options?: ExecOptions): childProcess.SpawnSyncReturns<string>;

/**
 * 异步执行一个命令。
 * @param command 要执行的命令。命令行参数以空格隔开。
 * @param callback 异步执行完成的回调函数。
 * @return 返回启动的子进程。
 */
export function exec(command: string, callback: (status: null | number) => void): childProcess.ChildProcess;

/**
 * 异步执行一个命令。
 * @param command 要执行的命令。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @param callback 异步执行完成的回调函数。
 * @return 返回启动的子进程。
 */
export function exec(command: string, options: ExecOptions, callback: (status: null | number) => void): childProcess.ChildProcess;

/**
 * 执行一个命令。
 * @param command 要执行的命令。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @param callback 异步执行完成的回调函数。如果为空则以同步模式执行。
 * @return 如果是异步模式则返回启动的子进程。否则返回程序的退出码。
 */
export function exec(command: string, options?: ExecOptions, callback?: (status: number, stdout: string, stderr: string) => void) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    options = options || {};
    if (options.shell == undefined) {
        options.shell = true;
    }
    // 修复 Windows 上编码问题。
    let file = command;
    let args = options.args;
    let needDetectEncoding = false;
    if (process.platform === 'win32' && options.shell === true) {
        file = process.env.comspec || "cmd.exe";
        args = ['/u', '/d', '/s', '/c', '"' + command + (args ? ' ' + args.join(' ') : '') + '"'];
        options.shell = false;
        (options as any).windowsVerbatimArguments = true;
        needDetectEncoding = true;
    }
    if (!options.encoding) {
        // 设置为 null 表示返回缓存本身。
        // https://github.com/nodejs/node/issues/6930
        options.encoding = null as any;
    }
    const report = (code: number, stdout: string, stderr: string) => {
        if ((options as ExecOptions).slient !== true) {
            if (stdout) {
                log(stdout);
            }
            if (stderr) {
                info(stderr);
            }
        }
        if (code !== 0) {
            error("The command '{command}' exited with code {code}.", { command: command, code: code });
        }
    };
    const taskId = begin(command);
    if (typeof callback === "function") {
        asyncQueue.lock(command);
        return childProcess.execFile(file, args || [], options, (e, stdout, stderr) => {
            end(taskId);
            const code = e ? (e as any).code as number : 0;
            stdout = toString(stdout, needDetectEncoding);
            stderr = toString(stderr, needDetectEncoding);
            report(code, stdout, stderr);
            (callback as any)(code, stdout, stderr);
            asyncQueue.unlock(taskId);
        });
    } else {
        const spawnResult: childProcess.SpawnSyncReturns<string | Buffer> = childProcess.spawnSync(file, args || [], options);
        end(taskId);
        spawnResult.stdout = toString(spawnResult.stdout, needDetectEncoding);
        spawnResult.stderr = toString(spawnResult.stderr, needDetectEncoding);
        report(spawnResult.status, spawnResult.stdout, spawnResult.stderr);
        return spawnResult;
    }
}

/**
 * 表示执行的选项。
 */
export interface ExecOptions extends childProcess.SpawnSyncOptions {

    /**
     * 是否向控制台输出内容。
     */
    slient?: boolean;

    /**
     * 命令行参数。
     */
    args?: string[];

}

function toString(buffer: Buffer | string, needDetectEncoding: boolean) {
    if (buffer instanceof Buffer) {
        buffer = bufferToString(buffer, needDetectEncoding ? detectEncoding(buffer) : undefined);
    }
    return buffer.replace(/(?:\r\n|\r|\n)$/, "");
}

function detectEncoding(buffer: Buffer) {
    for (let i = 1; i < buffer.length; i += 2) {
        if (buffer[i] === 0) {
            return 'utf16le';
        }
    }
    return 'utf8';
}
