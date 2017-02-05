/**
 * @file 匹配器
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import { commonDir, relativePath } from "./path";

/**
 * 表示一个匹配器。
 */
export class Matcher {

    /**
     * 获取所有已编译的模式列表。
     */
    patterns: CompiledPattern[] = [];

    /**
     * 获取当前匹配器的忽略匹配器。如果不存在则返回 undefined。
     */
    ignoreMatcher?: Matcher;

    /**
     * 初始化新的匹配器。
     * @param pattern 要添加的匹配模式。
     * @param cwd 模式的根路径。默认当前当前工作目录。
     */
    constructor(pattern?: Pattern, cwd?: string) {
        if (pattern != undefined) {
            this.add(pattern, cwd);
        }
    }

    /**
     * 添加一个匹配模式。
     * @param pattern 要添加的匹配模式。
     * @param cwd 模式的根路径。默认当前当前工作目录。
     */
    add(pattern: Pattern, cwd?: string) {
        if (typeof pattern === "string") {
            if (pattern.charCodeAt(0) === 33/*!*/) {
                (this.ignoreMatcher || (this.ignoreMatcher = new Matcher())).patterns.push(globToRegExp(pattern.substr(1), np.resolve(cwd || "")));
            } else {
                this.patterns.push(globToRegExp(pattern, np.resolve(cwd || "")));
            }
        } else if (Array.isArray(pattern)) {
            for (const p of pattern) {
                this.add(p, cwd);
            }
        } else if (pattern instanceof RegExp) {
            this.patterns.push({
                base: np.resolve(cwd || ""),
                test(path) {
                    return pattern.test(relativePath(this.base, path));
                }
            });
        } else if (typeof pattern === "function") {
            this.patterns.push({
                base: np.resolve(cwd || ""),
                test: pattern
            });
        } else if (pattern instanceof Matcher) {
            this.patterns.push(...pattern.patterns);
            if (pattern.ignoreMatcher) {
                (this.ignoreMatcher || (this.ignoreMatcher = new Matcher())).add(pattern.ignoreMatcher, cwd);
            }
        }
    }

    /**
     * 添加一个忽略模式。
     * @param pattern 要添加的模式。
     * @param cwd 模式的根路径。默认当前当前工作目录。
     */
    addIgnore(pattern: Pattern, cwd?: string) {
        (this.ignoreMatcher || (this.ignoreMatcher = new Matcher())).add(pattern, cwd);
    }

    /**
     * 测试指定的绝对路径是否符合当前匹配器。
     * @param path 要测试的绝对路径。
     * @return 如果匹配任意一个已添加的模式且未被忽略则返回 true，否则返回 false。
     */
    test(path: string) {
        for (const pattern of this.patterns) {
            if (pattern.test(path)) {
                if (this.ignoreMatcher && this.ignoreMatcher.test(path)) {
                    return false;
                }
                return true;
            }
        }
        // 无匹配器默认认为是全匹配。
        if (!this.patterns.length) {
            if (this.ignoreMatcher && this.ignoreMatcher.test(path)) {
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 获取所有模式的公共基路径。
     * @return 返回基路径。如果无法获取获取则返回 null。
     */
    get base() {
        if (!this.patterns.length) {
            return null;
        }
        let result: string | null = this.patterns[0].base;
        for (let i = 1; i < this.patterns.length; i++) {
            result = commonDir(result, this.patterns[i].base);
        }
        return result;
    }

}

/**
 * 测试指定的内容是否符合指定的模式。
 * @param value 要测试的内容。
 * @param pattern 要测试的匹配模式。
 * @param cwd 模式的根路径。默认当前当前工作目录。
 * @return 如果匹配则返回 true，否则返回 false。
 */
export function match(value: string, pattern: Pattern, cwd?: string) {
    return new Matcher(pattern, cwd).test(np.resolve(value));
}

export default Matcher;

/**
 * 表示一个模式。可以是通配符、正则表达式、测试函数或以上模式组成的数组。
 * @desc
 * ##### 通配符
 * 通配符的语法和 [`.gitignore`](https://git-scm.com/docs/gitignore) 相同。
 *
 * 通配符中可以使用以下特殊字符：
 *
 * - `*`: 匹配任意个 / 以外的字符。
 * - `**`:匹配任意个字符。
 * - `?`: 匹配一个 / 以外的字符。
 * - `[abc]`: 匹配括号中的任一个字符。
 * - `[^abc]`: 匹配括号中的任一个字符以外的字符。
 * - `\`: 表示转义字符。如 `\[`。
 *
 * 在通配符前面加 `!`，表示忽略匹配的项。
 * 注意如果忽略了父文件夹，出于性能考虑，无法重新包含其中的子文件。
 *
 * 如果通配符以 `/` 结尾，表示只匹配文件夹。
 *
 * 关于 `*` 和 `**` 的区别：
 *
 * - `*` 只匹配一层目录。比如 `usr/*\/foo.js` 匹配 `usr/dir/foo.js`，但不匹配 `usr/foo.js`，也不匹配 `usr/dir/sub/foo.js`。
 * - `**` 则匹配任意层目录(包括没有)。比如 `usr/**\/foo.js` 既匹配 `usr/dir/foo.js`，也匹配 `usr/foo.js` 和 `usr/dir/sub/foo.js`。
 * - 特殊情况：如果通配符不含 /(末尾除外)，则两者意义相同：都表示匹配任意层目录。比如 `*.js` 既匹配 `foo.js` 也匹配 `usr/foo.js`。如果希望只匹配当前目录下的文件，应该写成 `./*.js`。
 *
 * 绝对或相对路径可以直接作通配符使用：
 *
 * - 直接使用文件夹名，如 `foo/www` 等效于 `foo/www/**`。
 * - 路径名中不含 `/`，如 `www` 等效于：`**\/www/**`。
 * - 要匹配当前目录下的某个文件夹下所有文件，使用 `./www`。
 *
 * ##### 正则表达式
 * 复杂的匹配规则可以使用正则表达式。
 * 测试的源是一个固定以 / 为分隔符的相对路径。
 *
 * ##### 自定义函数
 * 函数接收一个绝对路径为参数，如果函数返回 true 表示匹配该路径。
 * ```js
 * function match(path) {
 *     return path.endsWith(".js");
 * }
 * ```
 */
export type Pattern = string | RegExp | ((path: string) => boolean) | any[] | Matcher | null;

/**
 * 表示一个已编译的模式。
 */
export interface CompiledPattern {

    /**
     * 获取当前模式基路径。
     */
    base: string;

    /**
     * 测试当前模式是否匹配指定的路径。
     * @param path 要测试的绝对路径。
     * @return 如果匹配则返回 true，否则返回 false。
     */
    test(path: string): boolean;

}

const compiledPatterns: { [pattern: string]: CompiledPattern } = { __proto__: null! };

const escapedSep = escapeRegExp(np.sep);

/**
 * 将指定的通配符转为等价的正则表达式。
 * @param pattern 要处理的通配符。
 * @param cwd 模式的根路径。
 * @return 返回已编译的正则表达式。
 */
function globToRegExp(pattern: string, cwd: string) {
    const cacheKey = `${cwd}>${pattern}`;
    const compiledPattern = compiledPatterns[cacheKey];
    if (compiledPattern) {
        return compiledPattern;
    }

    // 处理绝对路径。
    if (np.isAbsolute(pattern)) {
        cwd = "";
        if (np.sep === "\\") {
            pattern = pattern.replace(/\\/g, "/");
        }
    }

    // 格式化通配符。
    let glob = np.posix.normalize(pattern);
    if (glob.length <= 2 && (glob === "./" || glob === ".")) {
        glob = "";
    }

    // 判断是否存在 /。
    const hasSlash = !glob || pattern.lastIndexOf("/", pattern.length - 2) >= 0;
    const hasSlashPostfix = pattern.charCodeAt(pattern.length - 1) === 47/*/*/;

    // 预处理 ../ 前缀。
    const match = /^(?:\.\.\/)+/.exec(glob);
    if (match) {
        cwd = np.join(cwd, match[0]).slice(0, -1);
        glob = glob.substr(match[0].length);
    }

    // 转为正则表达式。
    const regex = `${hasSlash ? `^${escapeRegExp(cwd)}${cwd && !cwd.endsWith(np.sep) ? escapedSep : ""}` : `(?:^|${escapedSep})`}${glob.replace(/\\.|\[(?:\\.|[^\\\]])+\]|\*\*\/?|[*?\-+.^|\\{}()[\]/]/g, (all: string, index: number) => {
        switch (all.charCodeAt(0)) {
            case 47/*/*/:
                return escapedSep;
            case 42/***/:
                return all.length > 2 ? `(.*${escapedSep})?` : all.length > 1 ? "(.*)" : `([^${escapedSep}]*)`;
            case 63/*?*/:
                return `([^${escapedSep}])`;
            case 92/*\*/:
                return index === pattern.length - 1 ? " " : escapeRegExp(all.charAt(1));
            case 91/*[*/:
                if (all.length > 2) {
                    index = all.charCodeAt(1) === 94/*^*/ ? 2 : 1;
                    return (index === 1 ? "[" : "[^") + escapeRegExp(all.slice(index, -1)) + "]";
                }
            // fall through
            default:
                return "\\" + all;
        }
    })}${hasSlashPostfix ? "" : `(?:$|${escapedSep})`}`;

    // 计算基路径。
    // 提取 "foo/goo/*.js" 中的 "foo/goo" 部分。
    if (hasSlash) {
        let right: number;
        const firstGlob = glob.search(/[*?\\]|\[.+\]/);
        if (firstGlob >= 0) {
            right = glob.lastIndexOf("/", firstGlob);
        } else {
            right = glob.length;
            if (hasSlashPostfix) {
                right--;
            }
        }
        if (right > 0) {
            cwd = np.join(cwd, glob.substring(0, right));
        }
    }

    // 生成正则表达式。
    const result = compiledPatterns[cacheKey] = new RegExp(regex, np.sep === "\\" ? "i" : "") as any as typeof compiledPatterns[""];
    result.base = cwd;
    return result;
}

/**
 * 编码字符串里的正则表达式特殊字符。
 * @param pattern 要处理的通配符。
 * @return 返回处理后的模式字符串。
 */
function escapeRegExp(pattern: string) {
    return pattern.replace(/[-+.^$?*|\\{}()[\]]/g, "\\$&");
}
