/**
 * @file 查找文件
 * @author xuld <xuld@vip.qq.com>
 */
import { Matcher, Pattern } from "../utility/matcher";
import { glob } from "../utility/glob";
import { pathEquals, getDir } from "../utility/path";
import { emit } from "./events";
import { verbose, getDisplayName } from "./logging";
import { asyncQueue } from "./async";
import { FileList } from "./fileList";
import { File } from "./file";

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
        return new File(path, pathEquals(path, base) ? getDir(base!) : base!);
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
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern instanceof FileList) {
            result.globOnly = false;
            pending++;
            pattern.pipe({
                collect: false,
                add(file) {
                    result.add(file);
                },
                end() {
                    if (--pending < 1) {
                        result.end();
                    }
                }
            });
        } else if (pattern instanceof File) {
            result.globOnly = false;
            result.add(pattern);
        } else {
            result.matcher.add(pattern);
        }
    }
    if (result.matcher.patterns.length) {
        glob(result.matcher, {
            globalMatcher: globalMatcher,
            error: verbose,
            ignored(path, global) {
                verbose(global ? "Global Ignored: {path}" : "Ignored: {path}", { path: getDisplayName(path) });
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
