/**
 * @file 文件系统
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as nfs from "fs";
import { md5, sha1 } from "./crypto";

/**
 * 表示文件或文件夹的属性对象。
 */
export type Stats = nfs.Stats;

/**
 * 获取文件或文件夹的属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param follow 如果为 true 则返回软链接引用的文件属性，否则返回软链接本身的属性。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStat(path: string, callback?: undefined, follow?: boolean, tryCount?: number): Stats;

/**
 * 获取文件或文件夹的属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param follow 如果为 true 则返回软链接引用的文件属性，否则返回软链接本身的属性。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStat(path: string, callback: (error: NodeJS.ErrnoException | null, stats: Stats) => void, follow?: boolean, tryCount?: number): undefined;

export function getStat(path: string, callback?: (error: NodeJS.ErrnoException | null, stats: Stats) => void, follow = true, tryCount = 3) {
    if (typeof callback === "function") {
        (follow ? nfs.stat : nfs.lstat)(path, (error, stats) => {
            if (!error || tryCount === 0 || error.code === "ENOENT") {
                callback(error, stats);
            } else {
                setTimeout(getStat, 7, path, callback, follow, tryCount - 1);
            }
        }); 0
    } else {
        try {
            return (follow ? nfs.statSync : nfs.lstatSync)(path);
        } catch (e) {
            if (tryCount === 0 || (e as NodeJS.ErrnoException).code === "ENOENT") {
                throw e;
            }
            return getStat(path, callback, follow, tryCount - 1);
        }
    }
}

/**
 * 判断是否存在指定的文件夹。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 如果指定的路径是文件夹则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsDir(path: string, callback?: undefined, tryCount?: number): boolean;

/**
 * 判断是否存在指定的文件夹。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 如果指定的路径是文件夹则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsDir(path: string, callback: (result: boolean) => void, tryCount?: number): void;

export function existsDir(path: string, callback?: (result: boolean) => void, tryCount = 3) {
    if (typeof callback === "function") {
        getStat(path, (error, stats) => callback(error ? false : stats.isDirectory()), false, tryCount);
    } else {
        try {
            return getStat(path, undefined, false, tryCount).isDirectory();
        } catch (e) {
            return false;
        }
    }
}

/**
 * 判断是否存在指定的文件。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 如果指定的路径是文件则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsFile(path: string, callback?: undefined, tryCount?: number): boolean;

/**
 * 判断是否存在指定的文件。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 如果指定的路径是文件则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsFile(path: string, callback: (result: boolean) => void, tryCount?: number): void;

export function existsFile(path: string, callback?: (result: boolean) => void, tryCount = 3) {
    if (typeof callback === "function") {
        getStat(path, (error, stats) => callback(error ? false : stats.isFile()), false, tryCount);
    } else {
        try {
            return getStat(path, undefined, false, tryCount).isFile();
        } catch (e) {
            return false;
        }
    }
}

/**
 * 创建指定的文件夹。
 * @param path 要创建的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function createDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.mkdir(path, 0o777 & ~process.umask(), error => {
            if (!error) {
                callback(null);
            } else if (error.code === "EEXIST") {
                existsDir(path, result => callback(result ? null : error), tryCount);
            } else if (tryCount === 0) {
                callback(error);
            } else if (error.code === "ENOENT") {
                ensureParentDir(path, () => createDir(path, callback, tryCount - 1), tryCount);
            } else {
                setTimeout(createDir, 7, path, callback, tryCount - 1);
            }
        });
    } else {
        try {
            nfs.mkdirSync(path, 0o777 & ~process.umask());
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "EEXIST") {
                if (existsDir(path, undefined, tryCount)) {
                    return;
                }
                throw e;
            }
            if (tryCount === 0) {
                throw e;
            }
            // FIXME: Win32: 如果路径中含非法字符，可能也会导致 ENOENT。
            // http://stackoverflow.com/questions/62771/how-do-i-check-if-a-given-string-is-a-legal-valid-file-name-under-windows/62888
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, tryCount);
                } catch (e2) {

                }
            }
            createDir(path, undefined, tryCount - 1);
        }
    }
}

/**
 * 确保已创建指定路径所在的文件夹。
 * @param path 要处理的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function ensureParentDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    createDir(np.dirname(path), callback, tryCount);
}

/**
 * 删除指定的文件夹。
 * @param path 要删除的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.rmdir(path, error => {
            if (!error || error.code === "ENOENT") {
                callback(null);
            } else if (tryCount === 0 || error.code === "ENOTDIR") {
                callback(error);
            } else if (error.code === "ENOTEMPTY" || error.code === "EEXIST") {
                cleanDir(path, () => deleteDir(path, callback, tryCount - 1), tryCount);
            } else {
                setTimeout(deleteDir, 7, path, callback, tryCount - 1);
            }
        });
    } else {
        try {
            nfs.rmdirSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }
            if (tryCount === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOTEMPTY" || (e as NodeJS.ErrnoException).code === "EEXIST") {
                cleanDir(path, undefined, tryCount);
            }
            deleteDir(path, undefined, tryCount - 1);
        }
    }
}

/**
 * 清空指定的文件夹。
 * @param path 要清空的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function cleanDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        getFiles(path, (error, entries) => {
            if (entries && entries.length) {
                let pending = entries.length;
                const done = (e: NodeJS.ErrnoException | null) => {
                    if (e && !error) {
                        error = e;
                    }
                    if (--pending < 1) {
                        callback(error);
                    }
                };
                for (const entry of entries) {
                    const child = np.join(path, entry);
                    getStat(child, (error, stats) => {
                        if (error) {
                            done(error);
                        } else if (stats.isDirectory()) {
                            deleteDir(child, done, tryCount);
                        } else {
                            deleteFile(child, done, tryCount);
                        }
                    }, false, tryCount);
                }
            } else {
                callback(error && error.code !== "ENOENT" ? error : null);
            }
        }, tryCount);
    } else {
        let error: NodeJS.ErrnoException | void;
        for (const entry of getFiles(path, undefined, tryCount)) {
            const child = np.join(path, entry);
            try {
                if (getStat(child, undefined, false, tryCount).isDirectory()) {
                    deleteDir(child, undefined, tryCount);
                } else {
                    deleteFile(child, undefined, tryCount);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
    }
}

/**
 * 如果父文件夹是空文件夹则删除。
 * @param path 要处理的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteParentDirIfEmpty(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    const parent = np.dirname(path);
    if (typeof callback === "function") {
        if (parent === path) {
            callback(null);
        } else {
            nfs.rmdir(parent, error => {
                if (!error) {
                    deleteParentDirIfEmpty(parent, callback, tryCount);
                } else {
                    switch (error.code) {
                        case "ENOTEMPTY":
                        case "ENOENT":
                        case "EEXIST":
                        case "EBUSY":
                            callback(null);
                            break;
                        default:
                            if (tryCount === 0) {
                                callback(error);
                            } else {
                                setTimeout(deleteParentDirIfEmpty, 7, path, callback, tryCount - 1);
                            }
                            break;
                    }
                }
            });
        }
    } else if (parent !== path) {
        try {
            nfs.rmdirSync(parent);
        } catch (e) {
            switch ((e as NodeJS.ErrnoException).code) {
                case "ENOTEMPTY":
                case "ENOENT":
                case "EEXIST":
                case "EBUSY":
                    break;
                default:
                    if (tryCount === 0) {
                        throw e;
                    }
                    deleteParentDirIfEmpty(path, undefined, tryCount - 1);
                    break;
            }
            return;
        }
        deleteParentDirIfEmpty(parent, undefined, tryCount);
    }

}

/**
 * 删除指定的文件。
 * @param path 要删除的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteFile(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.unlink(path, error => {
            if (!error || error.code === "ENOENT") {
                callback(null);
            } else if (tryCount === 0 || error.code === "EISDIR") {
                callback(error);
            } else {
                setTimeout(deleteFile, 7, path, callback, tryCount - 1);
            }
        });
    } else {
        try {
            nfs.unlinkSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }
            if (tryCount === 0 || (e as NodeJS.ErrnoException).code === "EISDIR") {
                throw e;
            }
            deleteFile(path, undefined, tryCount - 1);
        }
    }
}

/**
 * 读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function getFiles(path: string, callback?: undefined, tryCount?: number): string[];

/**
 * 读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function getFiles(path: string, callback: (error: NodeJS.ErrnoException | null, entries: string[]) => void, tryCount?: number): void;

export function getFiles(path: string, callback?: (error: NodeJS.ErrnoException | null, entries: string[]) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.readdir(path, (error, entries) => {
            if (!error || error.code === "ENOTDIR") {
                callback(error, entries);
                resolve();
            } else {
                switch (error.code) {
                    case "ENOENT":
                        callback(null, []);
                        resolve();
                        break;
                    case "EMFILE":
                    case "ENFILE":
                        delay(getFiles, [path, callback, tryCount]);
                        break;
                    default:
                        if (tryCount === 0) {
                            callback(error, null!);
                            resolve();
                        } else {
                            setTimeout(getFiles, 7, path, callback, tryCount - 1);
                        }
                        break;
                }
            }
        });
    } else {
        try {
            return nfs.readdirSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return [];
            }
            if (tryCount === 0 || (e as NodeJS.ErrnoException).code === "ENOTDIR") {
                throw e;
            }
            return getFiles(path, undefined, tryCount - 1);
        }
    }
}

/**
 * 深度遍历指定的文件或文件夹并执行回调。
 * @param path 要遍历的文件或文件夹路径。
 * @param options 遍历的选项。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function walk(path: string, options: WalkOptions, tryCount = 3) {
    if (options.end) {
        let pending = 0;
        const processFileOrDir = (path: string) => {
            pending++;
            if (options.stats) {
                let cache = options.stats[path];
                if (cache) {
                    if (Array.isArray(cache)) {
                        cache.push(statCallback);
                    } else {
                        statCallback(path, null, cache);
                    }
                } else {
                    options.stats[path] = cache = [statCallback];
                    getStat(path, (error, stats) => {
                        options.stats![path] = stats;
                        for (const func of cache as (typeof statCallback)[]) {
                            func(path, error, stats);
                        }
                    }, options.follow, tryCount);
                }
            } else {
                getStat(path, (error, stats) => statCallback(path, error, stats), options.follow, tryCount);
            }
        };
        const statCallback = (path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats) => {
            if (error) {
                options.error && options.error(error);
            } else if (stats.isFile()) {
                options.file && options.file(path, stats);
            } else if (stats.isDirectory()) {
                if (!options.dir || options.dir(path, stats) !== false) {
                    processDir(path, stats);
                }
            } else {
                options.other && options.other(path, stats);
            }
            if (--pending < 1) {
                options.end!();
            }
        };
        const processDir = (path: string, stats: nfs.Stats) => {
            pending++;
            if (options.entries) {
                let cache = options.entries[path];
                if (cache) {
                    if (typeof cache[0] === "function") {
                        (cache as (typeof getFilesCallback)[]).push(getFilesCallback);
                    } else {
                        getFilesCallback(path, null, stats, cache as string[]);
                    }
                } else {
                    options.entries[path] = cache = [getFilesCallback];
                    getFiles(path, (error, entries) => {
                        options.entries![path] = entries;
                        for (const func of cache as (typeof getFilesCallback)[]) {
                            func(path, error, stats, entries);
                        }
                    }, tryCount);
                }
            } else {
                getFiles(path, (error, entries) => getFilesCallback(path, error, stats, entries), tryCount);
            }
        };
        const getFilesCallback = (path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats, entries: string[]) => {
            if (error) {
                options.error && options.error(error);
            } else {
                if (!options.walk || options.walk(path, stats, entries) !== false) {
                    for (const entry of entries) {
                        processFileOrDir(np.join(path, entry));
                    }
                }
            }
            if (--pending < 1) {
                options.end!();
            }
        };
        processFileOrDir(path);
    } else {
        const processFileOrDir = (path: string) => {
            let stats: Stats;
            try {
                stats = getCache<Stats>(options.stats, path) || getStat(path, undefined, true, tryCount);
            } catch (e) {
                return options.error && options.error(e);
            }
            if (stats.isFile()) {
                options.file && options.file(path, stats);
            } else if (stats.isDirectory()) {
                if (!options.dir || options.dir(path, stats) !== false) {
                    processDir(path, stats);
                }
            } else {
                options.other && options.other(path, stats);
            }
        };
        const processDir = (path: string, stats: nfs.Stats) => {
            let entries: string[];
            try {
                entries = getCache<string[]>(options.entries, path) || getFiles(path, undefined, tryCount);
            } catch (e) {
                return options.error && options.error(e);
            }
            if (!options.walk || options.walk(path, stats, entries) !== false) {
                for (const entry of entries) {
                    processFileOrDir(np.join(path, entry));
                }
            }
        };
        const getCache = <T>(cacheObject: { [path: string]: void | T | Function[] } | undefined, path: string) => {
            if (cacheObject) {
                const cache = cacheObject[path];
                if (cache && (!Array.isArray(cache) || typeof cache[0] !== "function")) {
                    return cache as T;
                }
            }
        };
        processFileOrDir(path);
    }

}

/**
 * 表示遍历的选项。
 */
export interface WalkOptions {

    /**
     * 是否解析软链接。
     */
    follow?: boolean;

    /**
     * 所有文件属性的缓存对象。
     */
    stats?: { [path: string]: void | Stats | ((path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats) => void)[]; };

    /**
     * 所有文件列表的缓存对象。
     */
    entries?: { [path: string]: void | string[] | ((path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats, entries: string[]) => void)[] };

    /**
     * 在遍历文件夹前的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     * @param entries 当前文件夹下的所有项。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。
     */
    walk?(path: string, stats: nfs.Stats, entries?: string[]): boolean | void;

    /**
     * 处理一个文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    file?(path: string, stats: nfs.Stats): void;

    /**
     * 处理一个文件夹的回调函数。
     * @param path 当前文件夹的绝对路径。
     * @param stats 当前文件夹的属性对象。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。
     */
    dir?(path: string, stats: nfs.Stats): boolean | void;

    /**
     * 处理一个其它类型文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    other?(path: string, stats: nfs.Stats): void;

    /**
     * 处理错误的回调函数。
     * @param error 出现的错误对象。
     */
    error?(error: NodeJS.ErrnoException): void;

    /**
     * 遍历结束的回调函数。
     */
    end?(data?: any): void;

}

/**
 * 读取指定的文件内容。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFile(path: string, callback?: undefined, tryCount?: number): Buffer;

/**
 * 读取指定的文件内容。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFile(path: string, callback: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, tryCount?: number): void;

export function readFile(path: string, callback?: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.readFile(path, (error, buffer) => {
            if (!error || tryCount === 0 || error.code === "EISDIR") {
                callback(error, buffer);
                resolve();
            } else {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        delay(readFile, [path, callback, tryCount]);
                        break;
                    default:
                        setTimeout(readFile, 7, path, callback, tryCount - 1);
                        break;
                }
            }
        });
    } else {
        try {
            return nfs.readFileSync(path);
        } catch (e) {
            if (tryCount === 0 || (e as NodeJS.ErrnoException).code === "EISDIR") {
                throw e;
            }
            return readFile(path, undefined, tryCount - 1);
        }
    }
}

/**
 * 如果指定的文件存在则读取。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFileIf(path: string, callback?: undefined, tryCount?: number): Buffer;

/**
 * 如果指定的文件存在则读取。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFileIf(path: string, callback: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, tryCount?: number): void;

export function readFileIf(path: string, callback?: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, tryCount = 3) {
    if (typeof callback === "function") {
        readFile(path, (error, buffer) => {
            if (error && error.code === "ENOENT") {
                callback(null, Buffer.allocUnsafe(0));
            } else {
                callback(error, buffer);
            }
        });
    } else {
        try {
            return readFile(path, undefined, tryCount);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return Buffer.allocUnsafe(0);
            } else {
                throw e;
            }
        }
    }
}

/**
 * 写入指定的文件内容。
 * @param path 要写入的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function writeFile(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.writeFile(path, data, error => {
            if (!error || tryCount === 0 || error.code === "EISDIR") {
                callback(error);
                resolve();
            } else {
                switch (error.code) {
                    case "ENOENT":
                        ensureParentDir(path, () => writeFile(path, data, callback, tryCount - 1), tryCount);
                        break;
                    case "EMFILE":
                    case "ENFILE":
                        delay(writeFile, [path, data, callback, tryCount]);
                        break;
                    default:
                        setTimeout(writeFile, 7, path, data, callback, tryCount - 1);
                        break;
                }
            }
        });
    } else {
        try {
            nfs.writeFileSync(path, data);
        } catch (e) {
            if (tryCount === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, tryCount);
                } catch (e2) {

                }
            }
            writeFile(path, data, undefined, tryCount - 1);
        }
    }
}

/**
 * 如果指定的文件不存在则写入内容。
 * @param path 要写入的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function writeFileIf(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        getStat(path, error => {
            if (error && error.code === "ENOENT") {
                writeFile(path, data, callback, tryCount);
            } else {
                callback(error);
            }
        }, false, tryCount);
    } else {
        try {
            getStat(path, undefined, false, tryCount);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                writeFile(path, data, undefined, tryCount);
            } else {
                throw e;
            }
        }
    }
}

/**
 * 在指定文件末尾追加内容。
 * @param path 要创建的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function appendFile(path: string, data: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.appendFile(path, data, error => {
            if (!error || tryCount === 0 || error.code === "EISDIR") {
                callback(error);
                resolve();
            } else {
                switch (error.code) {
                    case "ENOENT":
                        ensureParentDir(path, () => appendFile(path, data, callback, tryCount - 1), tryCount);
                        break;
                    case "EMFILE":
                    case "ENFILE":
                        delay(appendFile, [path, data, callback, tryCount]);
                        break;
                    default:
                        setTimeout(appendFile, 7, path, data, callback, tryCount - 1);
                        break;
                }
            }
        });
    } else {
        try {
            nfs.appendFileSync(path, data);
        } catch (e) {
            if (tryCount === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, tryCount);
                } catch (e2) {

                }
            }
            appendFile(path, data, undefined, tryCount - 1);
        }
    }
}

/**
 * 复制指定的文件夹。
 * @param from 复制的源文件夹路径。
 * @param to 复制的目标文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        createDir(to, error => {
            if (error) {
                callback(error);
            } else {
                getFiles(from, (error, entries?) => {
                    if (error || !entries.length) {
                        callback(error);
                    } else {
                        let pending = entries.length;
                        const done = (e: NodeJS.ErrnoException) => {
                            if (e && !error) error = e;
                            if (--pending < 1) callback(error);
                        };
                        for (const entry of entries) {
                            const fromChild = np.join(from, entry);
                            getStat(fromChild, (error, stats) => {
                                if (error) {
                                    done(error);
                                } else {
                                    const toChild = np.join(to, entry);
                                    if (stats.isDirectory()) {
                                        copyDir(fromChild, toChild, done, tryCount);
                                    } else if (stats.isSymbolicLink()) {
                                        nfs.readlink(fromChild, (error, link) => {
                                            if (error) {
                                                done(error);
                                            } else {
                                                nfs.symlink(link, toChild, 'junction', done);
                                            }
                                        });
                                    } else {
                                        copyFile(fromChild, toChild, done, tryCount);
                                    }
                                }
                            }, false, tryCount);
                        }
                    }
                }, tryCount);
            }
        }, tryCount);
    } else {
        createDir(to, undefined, tryCount);
        let error: NodeJS.ErrnoException | undefined;
        for (const entry of getFiles(from, undefined, tryCount)) {
            const fromChild = np.join(from, entry);
            const toChild = np.join(to, entry);
            try {
                const stats = getStat(fromChild, undefined, false, tryCount);
                if (stats.isDirectory()) {
                    copyDir(fromChild, toChild, undefined, tryCount);
                } else if (stats.isSymbolicLink()) {
                    nfs.symlinkSync(nfs.readlinkSync(fromChild), toChild, 'junction');
                } else {
                    copyFile(fromChild, toChild, undefined, tryCount);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
    }
}

/**
 * 复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    let fdr: number | undefined;
    let fdw: number | undefined;
    if (typeof callback === "function") {
        const open = (path: string, read: boolean, tryCount = 3) => {
            nfs.open(path, read ? 'r' : 'w', 0o666, (error, fd) => {
                if (error) {
                    switch (error.code) {
                        case "EMFILE":
                        case "ENFILE":
                            delay(open, [path, read, tryCount]);
                            break;
                        case "ENOENT":
                            if (!read && tryCount > 0) {
                                ensureParentDir(path, () => open(path, read, tryCount - 1), tryCount);
                                break;
                            }
                        // 继续执行
                        default:
                            if (tryCount === 0) {
                                end(error);
                            } else {
                                setTimeout(open, 7, path, read, tryCount - 1);
                            }
                    }
                } else {
                    if (read) {
                        fdr = fd;
                    } else {
                        fdw = fd;
                    }
                    if (fdr !== undefined && fdw !== undefined) {
                        copy(Buffer.allocUnsafe(64 * 1024), 0, tryCount);
                    }
                    resolve();
                }
            });
        };
        const copy = (buffer: Buffer, pos: number, tryCount = 3) => {
            nfs.read(fdr!, buffer, 0, buffer.length, pos, (error, bytesRead, buffer) => {
                if (error) {
                    if (tryCount === 0) {
                        end(error);
                    } else {
                        setTimeout(copy, 7, buffer, pos, tryCount - 1);
                    }
                } else if (bytesRead === 0) {
                    end(error);
                } else {
                    nfs.write(fdw!, buffer, 0, bytesRead, (error, writen, buffer) => {
                        if (error) {
                            if (tryCount === 0) {
                                end(error);
                            } else {
                                setTimeout(copy, 7, buffer, pos, tryCount - 1);
                            }
                        } else if (writen < buffer.length) {
                            end(error);
                        } else {
                            copy(buffer, pos + writen, tryCount);
                        }
                    });
                }
            });
        };
        const end = (error: NodeJS.ErrnoException) => {
            if (fdw != undefined) {
                nfs.close(fdw, () => {
                    fdw = undefined;
                    if (fdr == undefined) {
                        callback(error);
                    }
                });
            }
            if (fdr != undefined) {
                nfs.close(fdr, () => {
                    fdr = undefined;
                    if (fdw == undefined) {
                        callback(error);
                    }
                });
            }
        };
        open(from, true, tryCount);
        open(to, false, tryCount);
    } else {
        try {
            fdr = nfs.openSync(from, 'r', 0o666);
            try {
                fdw = nfs.openSync(to, 'w', 0o666);
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
                    throw e;
                }
                ensureParentDir(to, undefined, tryCount);
                fdw = nfs.openSync(to, 'w', 0o666);
            }
            const buffer = Buffer.allocUnsafe(64 * 1024);
            let pos = 0;
            while (true) {
                const bytesRead = nfs.readSync(fdr, buffer, 0, buffer.length, pos);
                pos += nfs.writeSync(fdw, buffer, 0, bytesRead);
                if (bytesRead < buffer.length) break;
            }
        } catch (e) {
            if (tryCount === 0) {
                throw e;
            }
            return copyFile(from, to, undefined, tryCount - 1);
        } finally {
            if (fdw) nfs.closeSync(fdw);
            if (fdr) nfs.closeSync(fdr);
        }
    }
}

/**
 * 如果指定的目标文件不存在则复制。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyFileIf(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        getStat(to, error => {
            if (error && error.code === "ENOENT") {
                copyFile(from, to, callback, tryCount);
            } else {
                callback(error);
            }
        }, false, tryCount);
    } else {
        try {
            getStat(to, undefined, false, tryCount);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                copyFile(from, to, undefined, tryCount);
            } else {
                throw e;
            }
        }
    }
}

/**
 * 移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        createDir(to, error => {
            if (error) {
                callback(error);
            } else {
                getFiles(from, (error, entries?) => {
                    if (error || !entries.length) {
                        callback(error);
                    } else {
                        let pending = entries.length;
                        const done = (e: NodeJS.ErrnoException) => {
                            if (e && !error) error = e;
                            if (--pending < 1) {
                                deleteDir(from, (e?) => {
                                    if (e && !error) error = e;
                                    callback(error);
                                }, tryCount);
                            }
                        };
                        for (const entry of entries) {
                            const fromChild = np.join(from, entry);
                            getStat(fromChild, (error, stats) => {
                                if (error) {
                                    done(error);
                                } else {
                                    const toChild = np.join(to, entry);
                                    if (stats.isDirectory()) {
                                        moveDir(fromChild, toChild, done, tryCount);
                                    } else if (stats.isSymbolicLink()) {
                                        nfs.readlink(fromChild, (error, link?) => {
                                            if (error) {
                                                done(error);
                                            } else {
                                                nfs.symlink(link, toChild, 'junction', (error) => {
                                                    if (error) {
                                                        done(error);
                                                    } else {
                                                        deleteFile(fromChild, done, tryCount);
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        moveFile(fromChild, toChild, done, tryCount);
                                    }
                                }
                            }, false, tryCount);
                        }
                    }
                }, tryCount);
            }
        }, tryCount);
    } else {
        createDir(to, undefined, tryCount);
        let error: NodeJS.ErrnoException | void;
        for (const entry of getFiles(from, undefined, tryCount)) {
            const fromChild = np.join(from, entry);
            const toChild = np.join(to, entry);
            try {
                const stats = getStat(fromChild, undefined, false, tryCount);
                if (stats.isDirectory()) {
                    moveDir(fromChild, toChild, undefined, tryCount);
                } else if (stats.isSymbolicLink()) {
                    nfs.symlinkSync(nfs.readlinkSync(fromChild), toChild, 'junction');
                } else {
                    moveFile(fromChild, toChild, undefined, tryCount);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
        deleteDir(from, undefined, tryCount);
    }
}

/**
 * 移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, tryCount = 3) {
    if (typeof callback === "function") {
        nfs.rename(from, to, error => {
            if (!error) {
                callback(null);
            } else {
                copyFile(from, to, error => {
                    if (error) {
                        callback(error);
                    } else {
                        deleteFile(from, callback, tryCount);
                    }
                }, tryCount);
            }
        });
    } else {
        try {
            nfs.renameSync(from, to);
        } catch (e) {
            copyFile(from, to, undefined, tryCount);
            deleteFile(from, undefined, tryCount);
        }
    }
}

/**
 * 计算指定文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回校验码字符串。如果 *callback* 是函数则不返回。
 */
export function getChecksum(path: string, comparion?: FileComparion, callback?: undefined, stats?: nfs.Stats, buffer?: Buffer, tryCount?: number): string;

/**
 * 计算指定文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回校验码字符串。如果 *callback* 是函数则不返回。
 */
export function getChecksum(path: string, comparion: FileComparion, callback: (error: NodeJS.ErrnoException | null, result: string) => void, stats?: nfs.Stats, buffer?: Buffer, tryCount?: number): void;

export function getChecksum(path: string, comparion = FileComparion.default, callback?: (error: NodeJS.ErrnoException | null, result: string) => void, stats?: nfs.Stats, buffer?: Buffer, tryCount = 3) {
    const parts: string[] = [];
    if (comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) {
        if (!stats) {
            if (typeof callback === "function") {
                getStat(path, (error, stats) => {
                    if (error) {
                        callback(error, null!);
                    } else {
                        getChecksum(path, comparion, callback, stats, buffer, tryCount);
                    }
                }, true, tryCount);
                return;
            } else {
                stats = getStat(path, undefined, true, tryCount);
            }
        }
        if (comparion & FileComparion.createTime) {
            parts.push((+stats.birthtime).toString(36));
        }
        if (comparion & FileComparion.lastAccessTime) {
            parts.push((+stats.atime).toString(36));
        }
        if (comparion & FileComparion.lastChangeTime) {
            parts.push((+stats.ctime).toString(36));
        }
        if (comparion & FileComparion.lastWriteTime) {
            parts.push((+stats.mtime).toString(36));
        }
        if (comparion & FileComparion.size) {
            parts.push(stats.size.toString(36));
        }
    }
    if (comparion & (FileComparion.sha1 | FileComparion.md5 | FileComparion.data)) {
        if (!buffer) {
            if (typeof callback === "function") {
                readFile(path, (error, buffer) => {
                    if (error) {
                        callback(error, null!);
                    } else {
                        getChecksum(path, comparion, callback, stats, buffer, tryCount);
                    }
                }, tryCount);
                return;
            } else {
                buffer = readFile(path, undefined, tryCount);
            }
        }
        if (comparion & FileComparion.sha1) {
            parts.push(sha1(buffer));
        }
        if (comparion & FileComparion.md5) {
            parts.push(md5(buffer));
        }
        if (comparion & FileComparion.data) {
            parts.push(buffer.toString("base64"));
        }
    }
    const checksum = parts.join("|");
    if (typeof callback === "function") {
        callback(null, checksum);
    } else {
        return checksum;
    }
}

/**
 * 表示文件比较的算法。
 */
export const enum FileComparion {

    /**
     * 比较文件创建时间。
     */
    createTime = 1 << 0,

    /**
     * 比较最后访问时间。
     */
    lastAccessTime = 1 << 1,

    /**
     * 比较最后修改时间。
     */
    lastWriteTime = 1 << 2,

    /**
     * 比较最后修改时间。
     */
    lastChangeTime = 1 << 3,

    /**
     * 比较文件大小。
     */
    size = 1 << 4,

    /**
     * 比较 SHA1 值。
     */
    sha1 = 1 << 10,

    /**
     * 比较 MD5 值。
     */
    md5 = 1 << 11,

    /**
     * 比较文件数据。
     */
    data = 1 << 12,

    /**
     * 默认比较算法。
     */
    default = FileComparion.createTime | FileComparion.lastWriteTime | FileComparion.size,

}

/**
 * 表示一个调用参数。
 */
interface Arguments extends Array<any> {

    /**
     * 获取当前调用的函数。
     */
    callee?: Function;

    /**
     * 下一个延时调用。
     */
    next?: Arguments;

}

/**
 * 表示一个已延时的调用链表尾。
 */
var delayed: Arguments | undefined;

/**
 * 全局回调计时器。
 */
var timer: NodeJS.Timer | undefined;

/**
 * 延时执行指定的函数。
 * @param func 要执行的函数。
 * @param args 要执行的参数。
 */
function delay(func: Function, args: Arguments) {
    args.callee = func;
    const end = delayed;
    if (end) {
        args.next = end.next;
        end.next = delayed = args;
    } else {
        args.next = delayed = args;
    }
    // 如果直接调用原生的 fs 函数导致了文件打开过多，
    // 则可能不会执行已延时的函数，
    // 等待一段时间后强制重新执行。
    if (!timer) {
        timer = setTimeout(resolve, 7000);
    }
}

/**
 * 执行一个已延时的函数。
 */
function resolve() {
    if (delayed) {
        const head = delayed.next!;
        if (head === delayed) {
            delayed = undefined;
        } else {
            delayed.next = head.next;
        }
        head.callee!.apply(this, head);
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
    }
}
