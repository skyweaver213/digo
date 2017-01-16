/**
 * @file digo: 基于规则流程的自动化构建引擎
 * @author xuld <xuld@vip.qq.com>
 */
export * from "./utility/object";
export * from "./utility/date";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/fsWatcher";
export * from "./utility/matcher";
export * from "./utility/glob";
export * from "./utility/queue";
export * from "./utility/asyncQueue";
export * from "./utility/log";
export * from "./utility/progressBar";
export * from "./utility/sourceMap";
export * from "./utility/location";
export * from "./utility/require";
export * from "./utility/commandLine";

export * from "./builder/events";
export * from "./builder/logging";
export * from "./builder/progress";
export * from "./builder/async";
export * from "./builder/plugin";
export * from "./builder/exec";
export * from "./builder/file";
export * from "./builder/writer";
export * from "./builder/fileList";
export * from "./builder/src";
export * from "./builder/watch";
export * from "./builder/run";
export * from "./builder/config";

import * as _digo from "./index";
declare global {
    var digo: typeof _digo;
}

(global as any).digo = exports;

// 重写默认的 __export 函数以便可以重新导出数据。
function __export(module) {
    for (const key in module) {
        if (!exports.hasOwnProperty(key)) {
            if (typeof module[key] === "function") {
                exports[key] = module[key];
            } else {
                Object.defineProperty(exports, key, {
                    get() { return module[key]; },
                    set(value) { return module[key] = value; }
                });
            }
        }
    }
    if (module.__esModule && 'default' in module) {
        delete exports.default;
    }
}
