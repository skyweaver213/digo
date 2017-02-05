/**
 * @file 查找文件
 * @author xuld <xuld@vip.qq.com>
 */
import { glob } from "../utility/glob";
import { Matcher, Pattern } from "../utility/matcher";
import { getDir, pathEquals } from "../utility/path";
import { asyncQueue } from "./async";
import { emit } from "./events";
import { File } from "./file";
import { FileList } from "./fileList";
import { getDisplayName, verbose } from "./logging";

/**
 * 获取全局匹配器。
 */
export var globalMatcher = new Matcher();

/**
 * 表示一个根文件列表。
 */
export class RootFileList extends FileList {

    /**
     * 获取或设置当前列表的根匹配器。
     */
    matcher = new Matcher();

    /**
     * 判断当前列表来源是否仅来自通配符。
     */
    globOnly = true;

    /**
     * 创建属于当前列表的文件。
     * @param path 要添加的文件对象。
     * @return 返回新建的文件对象。
     */
    createFile(path: string) {
        const base = this.matcher.base;
        return new File(path, pathEquals(path, base) ? getDir(base!) : base);
    }

}

/**
 * 筛选指定的文件并返回一个文件列表。
 * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
 * @return 返回一个文件列表对象。
 */
export function src(...patterns: (Pattern | File | FileList)[]) {
    const result = new RootFileList();
    asyncQueue.lock("RootFileList");
    setImmediate(() => {
        result.then(() => {
            asyncQueue.unlock("RootFileList");
        });
    });
    let pending = 1;
    for (const pattern of patterns) {
        if (pattern instanceof FileList) {
            result.globOnly = false;
            pending++;
            pattern.pipe({
                collect: false,
                add(file) {
                    setImmediate(() => {
                        result.add(file);
                    });
                },
                end() {
                    if (--pending < 1) {
                        setImmediate(() => {
                            result.end();
                        });
                    }
                }
            });
        } else if (pattern instanceof File) {
            result.globOnly = false;
            setImmediate(() => {
                result.add(pattern);
            });
        } else {
            result.matcher.add(pattern);
        }
    }
    if (result.matcher.patterns.length) {
        glob(result.matcher, {
            globalMatcher: globalMatcher,
            error: verbose,
            ignored(path, global) {
                verbose(global ? "Ignored globally: {path}" : "Ignored: {path}", { path: getDisplayName(path) });
            },
            walk(path, stats, entries) {
                emit("addDir", path, stats, entries);
            },
            file(path, stats) {
                result.add(result.createFile(path));
                emit("addFile", path, stats);
            },
            end() {
                if (--pending < 1) {
                    result.end();
                }
            }
        });
        emit("addList", result);
    } else {
        setImmediate(() => {
            if (--pending < 1) {
                result.end();
            }
        });
    }
    return result;
}
