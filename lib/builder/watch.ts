/**
 * @file 监听文件
 * @author xuld <xuld@vip.qq.com>
 */
import * as nfs from "fs";
import { formatDate } from "../utility/date";
import { FSWatcher } from "../utility/fsWatcher";
import { Matcher, Pattern } from "../utility/matcher";
import { AsyncCallback } from "../utility/asyncQueue";
import { on, off } from "./events";
import { then, asyncQueue } from "./async";
import { info, error, getDisplayName } from "./logging";
import { globalMatcher, RootFileList } from "./src";
import file = require("./file");
import logging = require("./logging");
import progress = require("./progress");

/**
 * 表示一个监听器。
 */
export class Watcher extends FSWatcher {

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹绝对路径。
     * @return 如果应忽略指定的路径则返回 true，否则返回 false。
     */
    ignored(path: string) { return !globalMatcher.test(path); }

    /**
     * 当监听到文件删除后执行。
     * @param path 相关的文件绝对路径。
     * @param lastWriteTime 最后修改时间。
     */
    protected onDelete(path: string, lastWriteTime: number) {
        this.addDelete(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{gray:now} {cyan:Deleted}: {file}(+{default:hidden})" : "{gray:now} {cyan:Deleted}: {file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onDelete(path, lastWriteTime);
    }

    /**
     * 当监听到文件创建后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 文件属性对象。
     */
    protected onCreate(path: string, stats: nfs.Stats) {
        this.addChange(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{gray:now} {cyan:Created}: {file}(+{default:hidden})" : "{gray:now} {cyan:Created}: {file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onCreate(path, stats);
    }

    /**
     * 当监听到文件改变后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 相关的文件属性对象。
     * @param lastWriteTime 最后修改时间。
     */
    protected onChange(path: string, stats: nfs.Stats, lastWriteTime: number) {
        this.addChange(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{gray:now} {cyan:Changed}: {file}(+{default:hidden})" : "{gray:now} {cyan:Changed}: {file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onChange(path, stats, lastWriteTime);
    }

    /**
     * 当监听发生错误后执行。
     * @param e 相关的错误对象。
     * @param path 相关的文件绝对路径。
     */
    protected onError(e: NodeJS.ErrnoException, path: string) {
        error(e);
        super.onError(e, path);
    }

    /**
     * 缓存所有已更新的文件。
     */
    private changed: string[] = [];

    /**
     * 缓存所有已删除的文件。
     */
    private deleted: string[] = [];

    /**
     * 存储所有模块的依赖关系。
     */
    private deps: { [path: string]: string[] } = { __proto__: null! };

    /**
     * 添加一个已更新的文件。
     * @param path 已更新的文件绝对路径。
     */
    private addChange(path: string) {
        if (this.changed.indexOf(path) >= 0) {
            return;
        }
        if (this.deleted.indexOf(path) >= 0) {
            this.deleted.splice(this.deleted.indexOf(path), 1);
        }
        this.changed.push(path);
        for (const key in this.deps) {
            if (this.deps[key].indexOf(path) >= 0) {
                this.addChange(key);
            }
        }
    }

    /**
     * 添加一个已删除的文件。
     * @param path 已删除的文件绝对路径。
     */
    private addDelete(path: string) {
        if (this.deleted.indexOf(path) >= 0) {
            return;
        }
        if (this.changed.indexOf(path) >= 0) {
            this.changed.splice(this.changed.indexOf(path), 1);
        }
        this.deleted.push(path);
        for (const key in this.deps) {
            if (this.deps[key].indexOf(path) >= 0) {
                this.addChange(key);
            }
        }
    }

    /**
     * 重新构建发生改变的文件。
     */
    private rebuild() {
        then(() => {
            this.reset();
            this.emit("rebuild", this.changed, this.deleted);
            for (const list of this.rootLists) {
                let added = false;
                for (const p of this.deleted) {
                    if (list.matcher.test(p)) {
                        added = true;
                        const f = list.createFile(p);
                        if (f.buildMode !== file.BuildMode.preview) {
                            f.buildMode = file.BuildMode.clean;
                            list.add(f);
                        }
                    }
                }
                for (const p of this.changed) {
                    if (list.matcher.test(p)) {
                        added = true;
                        list.add(list.createFile(p));
                    }
                }
                if (added) {
                    asyncQueue.lock("RootFileList");
                    list.end();
                }
            }
            this.deleted.length = this.changed.length = 0;
        });
    }

    /**
     * 清理生成器的状态。
     */
    private reset() {
        file.fileCount = logging.errorCount = logging.warningCount = 0;
        progress.taskCount = progress.doneTaskCount = 0;
    }

    /**
     * 获取所有根节点列表。
     */
    readonly rootLists: RootFileList[] = [];

    /**
     * 初始化新的监听器。
     * @param task 默认执行的任务名。
     */
    constructor(task: AsyncCallback) {
        super();
        const addList = (value: RootFileList) => {
            if (value.globOnly) {
                this.rootLists.push(value);
            }
        };
        const addFile = (path: string, stats: nfs.Stats) => {
            (this as any)._stats[path] = stats.mtime.getTime();
        };
        const addDir = (path: string, stats: nfs.Stats, entries: string) => {
            (this as any)._stats[path] = entries;
        };
        on("addList", addList);
        on("addFile", addFile);
        on("addDir", addDir);
        on("fileSave", this.updateDep = this.updateDep.bind(this));

        then(task.length ? done => {
            const result = task(done);
            off("addList", addList);
            return result;
        } : () => {
            const result = (task as Function)();
            off("addList", addList);
            return result;
        });

        then(() => {
            off("addFile", addFile);
            off("addDir", addDir);
            for (const list of this.rootLists) {
                addWatch(this, list.matcher);
            }
        });
    }

    /**
     * 更新文件的依赖项。
     * @param file 相关的文件。
     */
    updateDep(file: file.File) {
        if (file.srcPath) {
            if (file.deps) {
                this.deps[file.srcPath] = file.deps;
                for (const dep of file.deps) {
                    this.add(dep);
                }
            } else if (!file.errorCount) {
                delete this.deps[file.srcPath];
            }
        }
    }

    /**
     * 删除所有监听器。
     * @param callback 删除完成后的回调函数。
     */
    close(callback?: () => void) {
        off("fileSave", this.updateDep);
        super.close(callback);
    }

}

export interface Watcher {

    /**
     * 绑定一个重新生成事件。
     * @param changes 所有已更新需要重新生成的文件。
     * @param deletes 所有已删除需要重新生成的文件。
     */
    on(event: "rebuild", listener: (changes: string[], deletes: string[]) => void): this;

    /**
     * 绑定一个文件删除事件。
     * @param path 相关的文件绝对路径。
     * @param lastWriteTime 最后修改时间。
     */
    on(event: "delete", listener: (path: string, lastWriteTime: number) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param path 相关的文件夹绝对路径。
     * @param lastEntries 最后文件列表。
     */
    on(event: "deleteDir", listener: (path: string, lastEntries: string[]) => void): this;

    /**
     * 绑定一个文件创建事件。
     * @param path 相关的文件绝对路径。
     * @param stats 文件属性对象。
     */
    on(event: "create", listener: (path: string, stats: nfs.Stats) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param path 相关的文件夹绝对路径。
     * @param entries 文件列表。
     */
    on(event: "createDir", listener: (path: string, entries: string[]) => void): this;

    /**
     * 绑定一个文件改变事件。
     * @param path 相关的文件绝对路径。
     * @param stats 相关的文件属性对象。
     * @param lastWriteTime 最后修改时间。
     */
    on(event: "change", listener: (path: string, stats: nfs.Stats, lastWriteTime: number) => void): this;

    /**
     * 绑定一个错误事件。
     * @param error 相关的错误对象。
     * @param path 相关的文件绝对路径。
     */
    on(event: "error", listener: (error: NodeJS.ErrnoException, path: string) => void): this;

    /**
     * 绑定一个事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: string | symbol, listener: Function);

}

/**
 * 获取或设置当前使用的监听器。
 */
export var watcher: Watcher | null = null;

/**
 * 监听指定的文件并执行回调。
 * @param pattern 要监听的文件匹配器。匹配器可以是通配符、正则表达式、函数或以上组合的数组。
 * @param listener 要执行的任务函数。
 */
export function watch(pattern: Pattern, listener?: (event: "create" | "change" | "delete", path: string) => void): FSWatcher;

/**
 * 执行指定的任务并监听所有生成的文件。
 * @param task 要执行的任务函数。
 */
export function watch(task: AsyncCallback): Watcher;

export function watch(pattern: Pattern | AsyncCallback, listener?: (event: "create" | "change" | "delete", path: string) => void) {
    if (typeof listener === "function" || typeof pattern !== "function") {
        const matcher = new Matcher(pattern as Pattern);
        const result = new FSWatcher();
        result.ignored = path => !matcher.test(path) || !globalMatcher.test(path);
        if (typeof listener === "function") {
            result.on("delete", path => { listener("delete", path) });
            result.on("change", path => { listener("change", path) });
            result.on("create", path => { listener("create", path) });
        }
        result.on("error", error);
        addWatch(result, matcher);
        return result;
    }
    if (watcher) {
        watcher.close();
    }
    return watcher = new Watcher(pattern as AsyncCallback);
}

/**
 * 添加指定匹配器符合的文件夹。
 * @param watcher 要添加的监听器。
 * @param matcher 要添加的匹配器。
 */
function addWatch(watcher: FSWatcher, matcher: Matcher) {
    for (const pattern of (matcher.patterns.length ? matcher.patterns : [{
        base: process.cwd()
    }])) {
        asyncQueue.lock("watch " + pattern.base);
        watcher.add(pattern.base, () => {
            asyncQueue.unlock("watch " + pattern.base);
        });
    }
}
