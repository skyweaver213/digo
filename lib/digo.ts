/**
 * @file digo: 基于规则流程的自动化构建引擎
 * @see https://github.com/digojs/digo
 */
export * from "./utility/date";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/matcher";
export * from "./utility/glob";
export * from "./utility/sourceMap";
export * from "./utility/location";
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
