/**
 * @file 驱动程序
 * @author xuld <xuld@vip.qq.com>
 */
import { getDir, resolvePath, getExt } from "../utility/path";
import { formatHRTime, formatDate } from "../utility/date";
import { addRequirePath, resolveRequirePath } from "../utility/require";
import { AsyncCallback } from "../utility/asyncQueue";
import { getDisplayName, errorCount, warningCount, log, LogLevel, fatal } from "./logging";
import { begin, end } from "./progress";
import { then } from "./async";
import { plugin } from "./plugin";
import { buildMode, BuildMode, fileCount } from "./file";
import { watch, watcher } from "./watch";

/**
 * 是否允许直接载入全局安装的模块。
 */
export var requireGlobal = true;

/**
 * 所有支持的配置文件扩展名。
 */
export const extensions = {
    ".ts": ['ts-node/register', 'typescript-node/register', 'typescript-register', 'typescript-require'],
    '.coffee': ['coffee-script/register', 'coffee-script'],
    '.cjsx': ['node-cjsx/register']
};

/**
 * 载入配置文件。
 * @param path 要载入的配置文件路径。
 * @param updateCwd 是否更新当前工作目录。
 * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
 */
export function loadDigoFile(path: string, updateCwd = true) {
    path = resolvePath(path);
    const taskId = begin("Load: {digofile}", { digofile: getDisplayName(path) });
    const result: { [key: string]: Function; } = { __proto__: null! };
    try {
        if (requireGlobal) {
            addRequirePath(getDir(resolveRequirePath("digo") || resolvePath(__dirname, "../..")));
        }
        if (updateCwd !== false) {
            const dir = getDir(path);
            if (process.cwd() !== dir) {
                process.chdir(dir);
            }
        }
        const ext = getExt(path);
        if (!require.extensions[ext]) {
            if (ext in extensions) {
                let found = false;
                for (const name of extensions[ext]) {
                    try {
                        plugin(name);
                        found = true;
                        break;
                    } catch (e) {
                    }
                }
                if (!found) {
                    fatal("Cannot find compiler for '{digofile}'. Use 'npm install {module}' to install.", {
                        digofile: path,
                        module: extensions[ext][0]
                    });
                    return result;
                }
            } else {
                fatal("Cannot find compiler for '{digofile}'.", {
                    digofile: path
                });
                return result;
            }
        }
        const config = require(path);
        for (const key in config) {
            if (typeof config[key] === "function") {
                result[key] = config[key];
            }
        }
    } finally {
        end(taskId);
    }
    return result;
}

/**
 * 获取本次生成操作的开始时间。
 */
export var startTime: [number, number];

/**
 * 获取或设置是否在生成完成后报告结果。
 */
export var report = true;

/**
 * 执行一个任务。
 * @param task 要执行的任务。
 * @param taskName 任务名。
 * @param watchMode 是否以监听模式运行。
 */
export function run(task: AsyncCallback, taskName = task.name || "TASK", watchMode = false) {
    startTime = process.hrtime();
    const taskId = begin("Execute task: {task}", { task: taskName });
    if (watchMode) {
        watch(task);
    } else {
        then(task);
    }
    then(() => {
        end(taskId);
        if (report) {
            log(`{gray:now} {${watcher && watcher!.isWatching ? "cyan:Start Watching..." :
                buildMode === BuildMode.clean ? "cyan:Clean Completed!" :
                    buildMode === BuildMode.preview ? "cyan:Preview Completed!" :
                        fileCount === 0 ? "cyan:Done!" : errorCount > 0 ? "red:Build Completed!" : warningCount > 0 ? "yellow:Build Success!" : "green:Build Success!"
                }} (error: {${errorCount ? "red:" : ""}error}, warning: {${warningCount ? "yellow:" : ""}warning}, ${fileCount > 0 ? "file: {file}, " : ""}elapsed: {elapsed})`, {
                    error: errorCount,
                    warning: warningCount,
                    file: fileCount,
                    elapsed: formatHRTime(process.hrtime(startTime)),
                    now: formatDate(undefined, "[HH:mm:ss]")
                }, errorCount > 0 ? LogLevel.failure : LogLevel.success);
        }
    });
}
