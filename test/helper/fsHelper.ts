/**
 * @file 测试时使用的 IO 工具函数
 * @author xuld <xuld@vip.qq.com>
 */
import * as assert from "assert";
import * as np from "path";
import * as nfs from "fs";

/**
 * 获取当前工作目录。
 */
export const cwd = process.cwd();

/**
 * 获取用于测试的根文件夹。
 */
export const root = np.join(cwd, "_fs-test");

/**
 * 表示文件夹项。
 */
export interface DirEntries {
    [path: string]: string | DirEntries;
}

/**
 * 创建新的测试用文件项。
 * @param entries 初始的文件项。
 */
export function init(entries: DirEntries = {
    "dir1": {
        "sub1": {
            "f3.txt": "f3.txt",
            "f4.txt": "f4.txt"
        },
        "sub2": {
            "f5.txt": "f5.txt"
        },
        "sub3": {

        }
    },
    "dir2": {},
    "f1.txt": "f1.txt",
    "f2.txt": "f2.txt"
}) {
    remove(root);
    nfs.mkdirSync(root);
    process.chdir(root);
    create(entries);
}

/**
 * 删除测试用文件夹。
 */
export function uninit() {
    process.chdir(cwd);
    remove(root);
}

/**
 * 删除文件或文件夹。
 * @param path 要删除的文件或文件夹。
 */
export function remove(path: string) {
    try {
        nfs.readdirSync(path).forEach(name => remove(np.join(path, name)));
        nfs.rmdirSync(path);
    } catch (e) { }
    try {
        nfs.unlinkSync(path);
    } catch (e) { }
}

/**
 * 创建文件项。
 * @param entries 要创建的文件项。
 * @param dir 创建的根文件夹。默认为当前工作目录。
 */
export function create(entries: DirEntries, dir = process.cwd()) {
    for (const key in entries) {
        const entry = entries[key];
        const child = np.join(dir, key);
        if (typeof entry === "string") {
            nfs.writeFileSync(child, entry);
        } else {
            nfs.mkdirSync(child);
            create(entry, child);
        }
    }
}

/**
 * 判断当前文件是否包含指定的项。
 * @param entries 应包含的文件夹项。
 * @param dir 根文件夹。默认为当前工作目录。
 */
export function check(entries: DirEntries, dir = process.cwd()) {
    for (const key in entries) {
        const entry = entries[key];
        const child = np.join(dir, key);
        if (typeof entry === "string") {
            assert.equal(nfs.readFileSync(child, entries), entry);
        } else {
            try {
                assert.ok(nfs.statSync(child).isDirectory());
            } catch (e) {
                assert.ifError(e);
            }
            check(entry, child);
        }
    }
}

/**
 * 在模拟 IO 错误状态下执行函数。
 * @param func 要执行的函数。
 * @param codes 模拟的错误码。
 * @param count 模拟的错误次数。
 * @param syscalls 要模拟错误的系统调用函数(如 "readFileSync")。默认为所有函数。
 */
export function simulateIOErrors(func: (done: () => void) => void, codes = ["UNKNOWN", "EMFILE", "EBUSY"], count = 1, syscalls = [
    'access',
    'accessSync',
    'readFile',
    'readFileSync',
    'rename',
    'renameSync',
    'truncate',
    'truncateSync',
    'ftruncate',
    'ftruncateSync',
    'rmdir',
    'rmdirSync',
    'fdatasync',
    'fdatasyncSync',
    'fsync',
    'fsyncSync',
    'mkdir',
    'mkdirSync',
    'readdir',
    'readdirSync',
    'fstat',
    'lstat',
    'stat',
    'fstatSync',
    'lstatSync',
    'statSync',
    'readlink',
    'readlinkSync',
    'writeFile',
    'writeFileSync',
    'symlink',
    'symlinkSync',
    'link',
    'linkSync',
    'unlink',
    'unlinkSync',
    'fchmod',
    'fchmodSync',
    'chmod',
    'chmodSync',
    'fchown',
    'fchownSync',
    'chown',
    'chownSync',
    'utimes',
    'utimesSync',
    'futimes',
    'futimesSync',
    'realpathSync',
    'realpath',
    'mkdtemp',
    'mkdtempSync'
]) {
    const fsBackup = {};
    for (const syscall of syscalls) {
        fsBackup[syscall] = nfs[syscall];
        let c = -1;
        nfs[syscall] = function () {
            if (++c < count) {
                const error = new Error("Simulated IO Errors") as NodeJS.ErrnoException;
                error.code = codes && codes[c] || "UNKNOWN";
                if (typeof arguments[arguments.length - 1] === "function") {
                    return arguments[arguments.length - 1](error);
                } else {
                    throw error;
                }
            }
            return fsBackup[syscall].apply(this, arguments);
        };
    }
    const restore = () => {
        for (const syscall in fsBackup) {
            nfs[syscall] = fsBackup[syscall];
        }
    };
    if (func.length <= 0) {
        try {
            return (func as Function)();
        } finally {
            restore();
        }
    } else {
        try {
            return func(restore);
        } catch (e) {
            restore();
            throw e;
        }
    }
}
