/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import * as fs from "fs";
import * as np from "path";
import { inDir, getDir } from "./path";

/**
 * 表示一个文件系统监听器。
 */
export class FSWatcher {

    // #region 对外接口

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    protected isIgnored(path: string) {
        return /(?:\..*\.sw[px]|\~|\.subl\w*\.tmp|~.*\.tmp)$/i.test(path);
    }

    /**
     * 当监听到文件删除后执行。
     * @param paths 相关的路径。
     */
    protected onDelete(paths: string[]) { }

    /**
     * 当监听到文件改变后执行。
     * @param paths 相关的路径。
     * @param stats 文件的属性对象。
     */
    protected onChange(paths: string[], stats: fs.Stats[]) { }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    protected onError(error: NodeJS.ErrnoException, path: string) { throw error; }

    /**
     * 初始化新的监听器。
     * @param options 初始化的选项。
     */
    constructor(options?: FSWatcherOptions) {
        Object.assign(this, options);
    }

    // #endregion

    // #region 添加和删除

    /**
     * 存储所有原生监听器对象。
     */
    private _watchers: { [path: string]: fs.FSWatcher; } = { __proto__: null };

    /**
     * 判断当前监听器是否正在监听。
     */
    get isWatching() {
        for (const path in this._watchers) {
            return true;
        }
        return false;
    }

    /**
     * 添加要监听的文件或文件夹。
     * @param path 要添加的文件或文件夹路径或文件列表。
     * @param callback 操作完成后的回调函数。
     * @param cache 缓存对象。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     * @param entries 当前文件夹内的所有项。提供此参数可避免重新查询。
     */
    add(path: string, callback?: (error: NodeJS.ErrnoException, path: string) => void, cache?: { [path: string]: number | string[]; }) {
        path = np.resolve(path);

        const cacheReady = (error: NodeJS.ErrnoException) => {
            if (this.watchOptions.recursive) {
                for (const key in this._watchers) {
                    // 如果已经监听的父文件夹，则不重复监听。
                    if (inDir(key, path)) {
                        return callback && callback.call(this, null, path);
                    }
                    // 如果已经监听了子文件夹，则替换之。
                    if (inDir(path, key)) {
                        this.removeNativeWatcher(key);
                    }
                }

                try {
                    this.createNativeWatcher(path, (event, name) => {

                        // 如果系统未提供文件名则忽略。
                        if (!name) return;

                        // 计算实际的文件名。
                        name = np.join(path, (name instanceof Buffer ? name : Buffer.from(name)).toString());

                        // 应用忽略路径。
                        if (this.isIgnored(name)) {
                            return;
                        }

                        this._handleWatchChange(event, name);
                    });
                } catch (e) {
                    error = e;
                }
            } else {
                for (const key in this._fsCache) {
                    if (!(key in this._watchers) && !(getDir(key) in this._watchers) && inDir(path, key)) {
                        this.createNativeWatcher(key, (event) => {
                            this._handleWatchChange(event, key);
                        });
                    }
                }
            }
            callback.call(this, error, path);
        };
        if (cache) {
            Object.assign(this._fsCache, cache);
            cacheReady(null);
        } else {
            this._initCache(path, {
                pending: 0,
                error: null,
                callback: cacheReady
            });
        }
        return this;
    }

    /**
     * 删除指定路径的监听器。
     * @param path 要删除的文件或文件夹路径。
     */
    remove(path: string) {
        path = np.resolve(path);
        if (this.watchOptions.recursive) {
            if (path in this._watchers) {
                this.removeNativeWatcher(path);
            }
        } else {
            for (const key in this._watchers) {
                if (inDir(path, key)) {
                    this.removeNativeWatcher(key);
                }
            }
        }
        return this;
    }

    /**
     * 关闭所有监听器。
     */
    close() {
        for (const path in this._watchers) {
            this.removeNativeWatcher(path);
        }
        if (this._emitPendingChangesTimer) {
            clearTimeout(this._emitPendingChangesTimer);
            this._emitPendingChangesTimer = null;
        }

        // 删除所有事件。
        delete this.onChange;
        delete this.onDelete;
        delete this.onError;

        return this;
    }

    /**
     * 传递给原生监听器的选项。
     */
    watchOptions = {

        /**
         * 是否持久监听。如果设为 false 则在监听到一次改动后立即退出监听。
         */
        persistent: true,

        /**
         * 是否使用原生的递归监听支持。
         */
        recursive: parseFloat(process.version.slice(1)) >= 4.5 && (process.platform === "win32" || process.platform === "darwin"),

        /**
         * 默认文件名编码。
         */
        encoding: "buffer",

    };

    /**
     * 创建原生监听器。
     * @param path 要监听的文件或文件夹绝对路径。
     * @param callback 监听回调函数。
     * @return 返回原生监听器。
     */
    private createNativeWatcher(path: string, callback: (event: "rename" | "change", filename: string | Buffer) => void) {
        return this._watchers[path] = fs.watch(path, this.watchOptions, callback).on("error", (error: NodeJS.ErrnoException) => {
            // Windows 下，删除文件夹可能引发 EPERM 错误。
            if (error.code === "EPERM") {
                return;
            }
            this.onError(error, path);
        });
    }

    /**
     * 删除原生监听器。
     * @param path 要删除监听的文件或文件夹绝对路径。
     */
    private removeNativeWatcher(path: string) {
        this._watchers[path].close();
        delete this._watchers[path];
    }

    // #endregion

    // #region 底层监听

    /**
     * 延时回调的毫秒数。
     */
    delay = 107;

    /**
     * 存储所有已挂起的发生改变的路径。
     */
    private _pendingChanges: string[] = [];

    /**
     * 存储等待触发更改事件的计时器。
     */
    private _emitPendingChangesTimer: NodeJS.Timer;

    /**
     * 处理监听更改事件。
     * @param event 发生事件的名称。
     * @param path 发生改变的文件或文件夹绝对路径。
     */
    private _handleWatchChange(event: "rename" | "change" | "retry", path: string) {

        // 不重复处理相同路径。
        if (this._pendingChanges.indexOf(path) >= 0) {
            return;
        }
        this._pendingChanges.push(path);

        // 启动计时器。
        if (this._emitPendingChangesTimer) {
            return;
        }
        this._emitPendingChangesTimer = setTimeout(FSWatcher._emitPendingChanges, this.delay, this);
    }

    /**
     * 提交所有已挂起的更改文件的更改事件。
     * @param watcher 目标监听器。
     */
    private static _emitPendingChanges(watcher: FSWatcher) {
        watcher._emitPendingChangesTimer = null;
        for (const pendingChange of watcher._pendingChanges) {
            watcher._updateCache(pendingChange);
        }
    }

    /**
     * 存储所有状态对象缓存。如果值为数组表示是文件夹，为数字表示文件最后修改时间。
     */
    private _fsCache: { [path: string]: string[] | number } = { __proto__: null };

    /**
     * 正在更新的文件数。
     */
    private _updatePending = 0;

    /**
     * 存储所有已删除的文件路径。
     */
    private _deletes: string[];

    /**
     * 存储所有已改变的文件路径。
     */
    private _changes: string[];

    /**
     * 存储所有已改变的文件属性。
     */
    private _changeStats: fs.Stats[];

    /**
     * 更新指定的缓存项。
     * @param path 要删除的文件或文件夹路径。
     * @param stats 要更新的文件属性对象。
     */
    private _updateCache(path: string, stats?: fs.Stats) {
        if (!stats) {
            this._updatePending++;
            fs.stat(path, (error, stats) => {
                if (error) {
                    if (error.code === "ENOENT") {
                        this._removeCache(path);
                    } else {
                        this.onError(error, path);
                    }
                } else {
                    this._updateCache(path, stats);
                }
                if (--this._updatePending > 0) return;
                this._emitChanges();
            });
        } else if (stats.isFile()) {
            const prevCache = this._fsCache[path];
            if (typeof prevCache !== "number" || prevCache !== +stats.mtime) {
                this._changes = this._changes || [];
                this._changeStats = this._changeStats || [];
                this._changes.push(path);
                this._changeStats.push(stats);
            }
            this._fsCache[path] = +stats.mtime;
        } else if (stats.isDirectory()) {
            const prevCache = this._fsCache[path];
            if (typeof prevCache === "number") {
                this._deletes = this._deletes || [];
                this._deletes.push(path);
            }
            this._updatePending++;
            fs.readdir(path, (error, entries) => {
                if (error) {
                    if (error.code === "EMFILE" || error.code === "ENFILE") {
                        this._handleWatchChange("retry", path);
                    } else if (error.code === "ENOENT") {
                        this._removeCache(path);
                    } else {
                        this.onError(error, path);
                    }
                } else {
                    this._fsCache[path] = entries;

                    // 查找已删除的路径。
                    if (typeof prevCache === "object") {
                        for (const entry in prevCache) {
                            if (entries.indexOf(entry) < 0) {
                                this._removeCache(np.join(path, entry));
                            }
                        }
                    }

                    // 更新当前文件夹下的所有项。
                    for (const entry in entries) {
                        this._updateCache(np.join(path, entry));
                    }
                }
                if (--this._updatePending > 0) return;
                this._emitChanges();
            });
        }
    }

    /**
     * 删除指定的缓存项。
     * @param path 要删除的文件或文件夹路径。
     */
    private _removeCache(path: string) {
        const prevCache = this._fsCache[path];
        if (typeof prevCache === "number") {
            this._deletes = this._deletes || [];
            this._deletes.push(path);
            delete this._fsCache[path];
        } else if (prevCache) {
            for (const entry of prevCache) {
                this._removeCache(np.join(path, entry));
            }
            delete this._fsCache[path];
        }
    }

    /**
     * 提交更改事件。
     */
    private _emitChanges() {
        if (this._deletes) {
            this.onDelete(this._deletes);
            delete this._deletes;
        }
        if (this._changes) {
            this.onChange(this._changes, this._changeStats);
            delete this._changes;
        }
    }

    /**
     * 添加一个文件或文件夹到监听列表。
     * @param path 要添加的文件绝对路径。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     * @param context 上下文对象。
     */
    private _initCache(path: string, context: { pending: number; error: NodeJS.ErrnoException; callback(error: NodeJS.ErrnoException): void }, stats?: fs.Stats, entries?: string[]) {
        if (!stats) {
            if (context) context.pending++;
            fs.stat(path, (error, stats) => {
                if (error) {
                    this.onError(error, path);
                    context.error = context.error || error;
                    if (--context.pending > 0) return;
                    context.callback(context.error);
                } else {
                    this._initCache(path, context, stats, entries);
                }
            });
        } else if (stats.isFile()) {
            this._fsCache[path] = +stats.mtime;
            if (--context.pending > 0) return;
            context.callback(context.error);
        } else if (stats.isDirectory()) {
            if (!entries) {
                fs.readdir(path, (error, entries) => {
                    if (error) {
                        if (error.code === "EMFILE" || error.code === "ENFILE") {
                            setTimeout(() => {
                                this._initCache(path, context, stats, entries);
                            }, this.delay);
                        } else {
                            this.onError(error, path);
                            context.error = context.error || error;
                            if (--context.pending > 0) return;
                            context.callback(context.error);
                        }
                    } else {
                        this._initCache(path, context, stats, entries);
                    }
                });
            } else {
                this._fsCache[path] = entries;
                for (const entry in entries) {
                    this._initCache(np.join(path, entry), context);
                }
                if (--context.pending > 0) return;
                context.callback(context.error);
            }
        }
    }

    // #endregion

}

/**
 * 表示文件系统监听器配置。
 */
export interface FSWatcherOptions {

    /**
     * 延时回调的毫秒数。
     */
    delay?: number;

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    isIgnored?(path: string): boolean;

    /**
     * 当监听到文件改变后执行。
     * @param path 相关的路径。
     * @param stats 文件的属性对象。
     */
    onChange?(paths: string[], stats: fs.Stats[]): void;

    /**
     * 当监听到文件或文件夹删除后执行。
     * @param path 相关的路径。
     */
    onDelete?(paths: string[]): void;

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    onError?(error: NodeJS.ErrnoException, path: string);

}
