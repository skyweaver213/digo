/**
 * @file 文件
 * @author xuld <xuld@vip.qq.com>
 */
import { Stats } from "fs";
import { base64Uri, bufferToString, stringToBuffer } from "../utility/encode";
import { copyFile, deleteFile, deleteParentDirIfEmpty, existsFile, getStat, readFile, writeFile } from "../utility/fs";
import { indexToLocation, Location, locationToIndex } from "../utility/location";
import { match, Pattern } from "../utility/matcher";
import { setProperty } from "../utility/object";
import { getDir, getExt, normalizePath, pathEquals, relativePath, resolvePath, setDir, setExt } from "../utility/path";
import { appendSourceMapUrl, SourceMapBuilder, SourceMapData, SourceMapObject, toSourceMapBuilder, toSourceMapObject } from "../utility/sourceMap";
import { emit } from "./events";
import { format, getDisplayName, log, LogEntry, LogLevel } from "./logging";
import { begin, end } from "./progress";
import { BufferStream, SourceMapWriter, StreamOptions, Writer, WriterOptions } from "./writer";

/**
 * 表示一个文件。
 */
export class File {

    // #region 路径

    /**
     * 获取当前文件的初始物理路径。如果当前文件是动态创建的则返回 undefined。
     */
    initalPath?: string;

    /**
     * 判断当前文件是否是生成的。
     */
    get generated() { return this.initalPath == undefined; }

    /**
     * 判断当前文件是否实际存在。
     */
    get exists() { return !this.generated && existsFile(this.initalPath!); }

    /**
     * 获取或设置当前文件的基路径。
     */
    base?: string;

    /**
     * 获取或设置当前文件的名称。名称是相对于基路径的相对路径，路径以 / 为分隔符。
     */
    name?: string;

    /**
     * 初始化新的文件。
     * @param path 文件的初始路径。
     * @param base 文件的基路径。
     */
    constructor(path?: string | null, base?: string | null) {
        if (base != undefined) {
            this.base = resolvePath(base);
        }
        if (path != undefined) {
            this.path = this.initalPath = resolvePath(path);
        }
    }

    /**
     * 获取当前文件的源绝对路径。
     */
    get srcPath() { return this.initalPath || resolvePath("<generated>"); }

    /**
     * 获取当前文件的目标绝对路径。
     */
    get destPath() { return this.path || this.srcPath; }

    /**
     * 获取当前文件的绝对路径。如果未设置保存路径则返回 undefined。
     */
    get path() { return this.name == undefined ? undefined : resolvePath(this.base || "", this.name); }

    /**
     * 设置当前文件的绝对路径。
     */
    set path(value) {
        this.name = value == undefined ? undefined : relativePath(this.base || "", value);
        // 生成文件默认将第一次设置的路径作为源路径。
        if (this.generated && this.srcPath == resolvePath("<generated>")) {
            setProperty(this, "srcPath", this.path);
        }
    }

    /**
     * 获取当前文件的源文件夹绝对路径。
     */
    get srcDir() { return getDir(this.srcPath); }

    /**
     * 获取当前文件的目标文件夹绝对路径。
     */
    get destDir() { return getDir(this.destPath); }

    /**
     * 获取当前文件的文件夹绝对路径。
     */
    get dir() { return this.path == undefined ? undefined : getDir(this.path); }

    /**
     * 设置当前文件的文件夹绝对路径。
     */
    set dir(value) { this.path = value == undefined ? undefined : setDir(this.destPath, value); }

    /**
     * 获取当前文件的源扩展名。
     */
    get srcExt() { return getExt(this.srcPath); }

    /**
     * 获取当前文件的目标扩展名。
     */
    get destExt() { return getExt(this.destPath); }

    /**
     * 获取当前文件的扩展名。
     */
    get ext() { return this.name == undefined ? undefined : getExt(this.name); }

    /**
     * 设置当前文件的扩展名。
     */
    set ext(value) { this.name = setExt(this.name || "", value || ""); }

    /**
     * 获取当前文件的字符串形式。
     */
    toString() { return getDisplayName(this.srcPath); }

    /**
     * 提供直接查看当前文件对象的方法。
     */
    protected inspect() { return `File ${this.srcPath}`; }

    // #endregion

    // #region 内容

    /**
     * 存储当前文件的源二进制内容。
     */
    private _srcBuffer: Buffer;

    /**
     * 存储当前文件的源文本内容。
     */
    private _srcContent: string;

    /**
     * 获取当前文件的源二进制内容。
     */
    get srcBuffer() {
        if (this._srcBuffer == undefined) {
            if (this._srcContent == undefined) {
                if (!this.generated && this.buildMode !== BuildMode.clean) {
                    const taskId = begin("Read: {file}", { file: this.toString() });
                    try {
                        this._srcBuffer = readFile(this.initalPath!);
                    } catch (e) {
                        this._srcBuffer = Buffer.allocUnsafe(0);
                        this.error({
                            error: e,
                            showStack: false
                        });
                    } finally {
                        end(taskId);
                    }
                } else {
                    this._srcBuffer = Buffer.allocUnsafe(0);
                }
            } else {
                this._srcBuffer = stringToBuffer(this._srcContent, this.encoding);
            }
        }
        return this._srcBuffer;
    }

    /**
     * 获取当前文件的源文本内容。
     */
    get srcContent() {
        if (this._srcContent == undefined) {
            this._srcContent = bufferToString(this.srcBuffer, this.encoding);
        }
        return this._srcContent;
    }

    /**
     * 存储当前文件的目标二进制内容。
     */
    private _destBuffer: Buffer;

    /**
     * 存储当前文件的目标文本内容。
     */
    private _destContent: string;

    /**
     * 获取当前文件的目标二进制内容。
     */
    get destBuffer() { return this.buffer; }

    /**
     * 获取当前文件的目标文本内容。
     */
    get destContent() { return this.content; }

    /**
     * 获取当前文件的最终保存二进制内容。
     */
    get buffer() {
        if (this._destBuffer != undefined) {
            return this._destBuffer;
        }
        if (this._destContent != undefined) {
            return this._destBuffer = stringToBuffer(this._destContent, this.encoding);
        }
        return this.srcBuffer;
    }

    /**
     * 设置当前文件的最终保存二进制内容。
     */
    set buffer(value) {
        this._destBuffer = value;
        delete this._destContent;
        this.setModified();
    }

    /**
     * 获取当前文件的最终保存文本内容。
     */
    get content() {
        if (this._destContent != undefined) {
            return this._destContent;
        }
        if (this._destBuffer != undefined) {
            return this._destContent = bufferToString(this._destBuffer, this.encoding);
        }
        return this.srcContent;
    }

    /**
     * 设置当前文件的最终保存文本内容。
     */
    set content(value) {
        this._destContent = value;
        delete this._destBuffer;
        this.setModified();
    }

    /**
     * 获取当前文件的最终内容。
     */
    get data() { return this._destContent != undefined ? this._destContent : this.buffer; }

    /**
     * 设置当前文件的最终内容。
     */
    set data(value) {
        if (typeof value === "string") {
            this.content = value;
        } else {
            this.buffer = value;
        }
    }

    /**
     * 判断当前文件是否已修改。
     */
    get modified() { return this._destContent != undefined || this._destBuffer != undefined; }

    /**
     * 获取读写当前文件使用的编码。
     */
    get encoding() { return typeof encoding === "function" ? encoding(this) : encoding; }

    /**
     * 设置读写当前文件使用的编码。
     */
    set encoding(value) { setProperty(this, "encoding", value); }

    /**
     * 标记当前文件已被修改。
     */
    private setModified() { delete this.index; }

    /**
     * 存储当前文件的每行第一个字符的索引值。
     */
    private index: number[];

    /**
     * 计算指定索引对应的行列号。
     * @param index 要检查的索引。
     * @return 返回对应的行列号。
     */
    indexToLocation(index: number) { return indexToLocation(this.content, index, this.index || (this.index = [])); }

    /**
     * 计算指定行列号对应的索引。
     * @param location 要检查的行列号。
     * @return 返回对应的索引。
     */
    locationToIndex(location: Location) { return locationToIndex(this.content, location, this.index || (this.index = [])); }

    // #endregion

    // #region 源映射

    /**
     * 判断当前文件是否需要生成源映射。
     */
    get sourceMap() { return typeof sourceMap === "function" ? sourceMap(this) : sourceMap; }

    /**
     * 设置当前文件是否需要生成源映射。
     */
    set sourceMap(value) { setProperty(this, "sourceMap", value); }

    /**
     * 获取当前文件的源映射保存路径。
     */
    get sourceMapPath() { return sourceMapPath ? sourceMapPath(this) : this.destPath + ".map"; }

    /**
     * 设置当前文件的源映射保存路径。
     */
    set sourceMapPath(value) { setProperty(this, "sourceMapPath", value); }

    /**
     * 获取当前文件的源映射保存文件夹。
     */
    get sourceMapDir() { return getDir(this.sourceMapPath); }

    /**
     * 设置当前文件的源映射保存文件夹。
     */
    set sourceMapDir(value) { this.sourceMapPath = setDir(this.sourceMapPath, value); }

    /**
     * 判断是否在源文件插入 #SourceMappingURL。
     */
    get sourceMapEmit() { return typeof sourceMapEmit === "function" ? sourceMapEmit(this) : sourceMapEmit; }

    /**
     * 设置是否在源文件插入 #SourceMappingURL。
     */
    set sourceMapEmit(value) { setProperty(this, "sourceMapEmit", value); }

    /**
     * 判断是否内联源映射到源文件。
     * @desc 仅当 sourceMapEmit 为 true 时有效。
     */
    get sourceMapInline() { return typeof sourceMapInline === "function" ? sourceMapInline(this) : sourceMapInline; }

    /**
     * 设置是否内联源映射到源文件。
     * @desc 仅当 sourceMapEmit 为 true 时有效。
     */
    set sourceMapInline(value) { setProperty(this, "sourceMapInline", value); }

    /**
     * 获取在源文件引用源映射的地址。
     * @desc 仅当 sourceMapEmit 为 true 时有效。
     */
    get sourceMapUrl() { return sourceMapUrl ? sourceMapUrl(this) : relativePath(this.destDir, this.sourceMapPath); }

    /**
     * 设置在源文件引用源映射的地址。
     * @desc 仅当 sourceMapEmit 为 true 时有效。
     */
    set sourceMapUrl(value) { setProperty(this, "sourceMapInline", value); }

    /**
     * 判断是否在源映射插入 file 段。
     */
    get sourceMapIncludeFile() { return typeof sourceMapIncludeFile === "function" ? sourceMapIncludeFile(this) : sourceMapIncludeFile; }

    /**
     * 设置是否在源映射插入 file 段。
     */
    set sourceMapIncludeFile(value) { setProperty(this, "sourceMapIncludeFile", value); }

    /**
     * 获取源映射中的 sourceRoot 内容。
     */
    get sourceMapRoot() { return typeof sourceMapRoot === "function" ? sourceMapRoot(this) : sourceMapRoot; }

    /**
     * 设置源映射中的 sourceRoot 内容。
     */
    set sourceMapRoot(value) { setProperty(this, "sourceMapRoot", value); }

    /**
     * 判断是否在源映射插入 sourcesContent 段。
     */
    get sourceMapIncludeSourcesContent() { return typeof sourceMapIncludeSourcesContent === "function" ? sourceMapIncludeSourcesContent(this) : sourceMapIncludeSourcesContent; }

    /**
     * 设置是否在源映射插入 sourcesContent 段。
     */
    set sourceMapIncludeSourcesContent(value) { setProperty(this, "sourceMapIncludeSourcesContent", value); }

    /**
     * 判断是否在源映射插入 names 段。
     */
    get sourceMapIncludeNames() { return typeof sourceMapIncludeNames === "function" ? sourceMapIncludeNames(this) : sourceMapIncludeNames; }

    /**
     * 设置是否在源映射插入 names 段。
     */
    set sourceMapIncludeNames(value) { setProperty(this, "sourceMapIncludeNames", value); }

    /**
     * 获取或设置当前文件的源映射数据。
     * @return 如果不存在源映射数据则返回 undefined。
     */
    sourceMapData: SourceMapData;

    /**
     * 获取当前文件的源映射构建器。
     * @return 如果不存在源映射数据则返回 undefined。
     */
    get sourceMapBuilder() {
        if (!this.sourceMapData) {
            return;
        }
        const sourceMapBuilder = toSourceMapBuilder(this.sourceMapData);
        sourceMapBuilder.file = this.srcPath;
        return this.sourceMapData = sourceMapBuilder;
    }

    /**
     * 合并指定的源映射。如果当前文件已经存在源映射则进行合并。
     * @param sourceMapData 要应用的源映射。
     */
    applySourceMap(sourceMapData: SourceMapData) {
        if (sourceMapData) {
            const sourceMapBuilder = this.sourceMapBuilder;
            if (sourceMapBuilder) {
                (this.sourceMapData = toSourceMapBuilder(sourceMapData)).applySourceMap(sourceMapBuilder);
            } else {
                this.sourceMapData = sourceMapData;
            }
        }
    }

    /**
     * 获取当前文件的源映射对象。
     * @return 如果不存在源映射数据则返回 undefined。
     */
    get sourceMapObject() {
        if (!this.sourceMapData) {
            return;
        }
        const sourceMapObject = toSourceMapObject(this.sourceMapData);

        // 生成最终的 sourceMap 数据。
        const result = {
            version: sourceMapObject.version || 3
        } as SourceMapObject;

        // file。
        if (this.sourceMapIncludeFile) {
            result.file = relativePath(getDir(this.sourceMapPath), this.destPath);
        }

        // sourceRoot。
        const sourceRoot = this.sourceMapRoot || sourceMapObject.sourceRoot;
        if (sourceRoot) {
            result.sourceRoot = sourceRoot;
        }

        // sources。
        if (sourceMapObject.sources) {
            result.sources = [];
            for (let i = 0; i < sourceMapObject.sources.length; i++) {
                result.sources[i] = sourceMapSource ?
                    sourceMapSource(sourceMapObject.sources[i], this) :
                    sourceRoot ?
                        sourceRoot === "file:///" ?
                            normalizePath(sourceMapObject.sources[i]) :
                            relativePath(sourceMapObject.sources[i]) :
                        relativePath(this.sourceMapDir, sourceMapObject.sources[i]);
            }

            // sourcesContent。
            if (this.sourceMapIncludeSourcesContent) {
                result.sourcesContent = [];
                for (let i = 0; i < sourceMapObject.sources.length; i++) {
                    result.sourcesContent[i] = sourceMapSourceContent ?
                        sourceMapSourceContent(sourceMapObject.sources[i], this) :
                        sourceMapObject.sourcesContent ?
                            sourceMapObject.sourcesContent[i] :
                            (sourceMapObject.sources[i] === this.initalPath ? this.srcContent : bufferToString(readFile(sourceMapObject.sources[i]), typeof encoding === "function" ? encoding(new File(sourceMapObject.sources[i])) : encoding));
                }
            }
        }

        // names。
        if (this.sourceMapIncludeNames && sourceMapObject.names && sourceMapObject.names.length) {
            result.names = sourceMapObject.names;
        }

        // mappings。
        result.mappings = sourceMapObject.mappings || "";

        // 验证源映射。
        if (onSourceMapValidate) {
            onSourceMapValidate(result, this);
        }

        return result;
    }

    /**
     * 获取当前文件的源映射字符串。
     */
    get sourceMapString() { return JSON.stringify(this.sourceMapObject); }

    // #endregion

    // #region 读写

    /**
     * 获取或设置当前文件的生成模式。
     */
    buildMode = buildMode;

    /**
     * 判断当前文件是否已载入。
     */
    get loaded() {
        return this.generated || this._destContent != undefined || this._destBuffer != undefined || this._srcBuffer != undefined || this._srcContent != undefined || this.buildMode === BuildMode.clean;
    }

    /**
     * 载入当前文件内容。
     * @param callback 异步操作完成后的回调函数。
     */
    load(callback?: (error: NodeJS.ErrnoException | null, file: File) => void) {
        if (this.loaded) {
            callback && callback(null, this);
        } else {
            const taskId = begin("Read: {file}", { file: this.toString() });
            readFile(this.initalPath!, (error, data) => {
                if (error) {
                    this.error({
                        error: error,
                        showStack: false
                    });
                }
                end(taskId);
                this._srcBuffer = data || Buffer.allocUnsafe(0);
                callback && callback(error, this);
            });
        }
    }

    /**
     * 保存当前文件到指定路径。
     * @param dir 要保存的目标文件夹路径。如果为空则保存到当前文件夹。
     * @param callback 异步操作完成后的回调函数。
     */
    save(dir?: string, callback?: (error: NodeJS.ErrnoException | null, file: File) => void) {

        // 更新基路径。
        if (dir != undefined) {
            this.base = resolvePath(dir);
        }

        // 验证文件。
        if (onFileValidate && onFileValidate(this) === false) {
            callback && callback(null, this);
            return;
        }

        // 验证路径。
        const savePath = this.path;
        if (savePath == undefined) {
            callback && callback(null, this);
            return;
        }
        const sourceMapEmit = this.sourceMap && this.sourceMapData && this.sourceMapEmit;
        const modified = this.modified || sourceMapEmit;
        if (!this.generated && pathEquals(this.initalPath!, savePath)) {

            // 文件未修改，跳过保存。
            if (!modified) {
                callback && callback(null, this);
                return;
            }

            // 不允许覆盖源文件。
            if (!this.overwrite) {
                this.error("Cannot overwrite source file. Use '--overwrite' to force saving.");
                callback && callback(null, this);
                return;
            }

        }

        const sourceMapPath = this.sourceMap && this.sourceMapData && !this.sourceMapInline && this.sourceMapPath;

        if (saveFile) {
            if (sourceMapPath) {
                saveFile(sourceMapPath, this.buildMode === BuildMode.clean ? null : stringToBuffer(this.sourceMapString));
            }
            if (this.buildMode === BuildMode.clean) {
                saveFile(savePath, null);
            } else if (sourceMapEmit) {
                saveFile(savePath, stringToBuffer(appendSourceMapUrl(this.content, this.sourceMapInline ? base64Uri("application/json", this.sourceMapString) : this.sourceMapUrl, /\.js$/i.test(this.name!))));
                callback && callback(null, this);
            } else if (this.loaded) {
                saveFile(savePath, this.buffer);
                callback && callback(null, this);
            } else {
                this.load(error => {
                    if (!error) {
                        saveFile!(savePath, this.buffer);
                    }
                    callback && callback(error, this);
                });
            }
        } else {
            let taskId: string;
            const args = { file: this.toString() };
            let firstError: NodeJS.ErrnoException;
            let pending = 1;
            const done = (error: NodeJS.ErrnoException | null) => {
                if (error) {
                    this.error({
                        showStack: false,
                        error: error
                    });
                }
                firstError = firstError || error;
                if (--pending < 1) {
                    end(taskId);
                    if (!firstError) {
                        fileCount++;
                        if (onFileSave) {
                            onFileSave(this);
                        }
                    }
                    callback && callback(firstError, this);
                }
            };
            switch (this.buildMode) {
                // 生成文件。
                case BuildMode.build:
                case BuildMode.watch:
                case BuildMode.server:
                    if (sourceMapEmit) {
                        taskId = begin("Save: {file}", args);
                        writeFile(savePath, stringToBuffer(appendSourceMapUrl(this.content, this.sourceMapInline ? base64Uri("application/json", this.sourceMapString) : this.sourceMapUrl, /\.js$/i.test(this.name!)), this.encoding), done);
                    } else {
                        taskId = begin(modified ? "Save: {file}" : "Copy: {file}", args);
                        if (this.loaded) {
                            writeFile(savePath, this.buffer, done);
                        } else {
                            copyFile(this.initalPath!, savePath, done);
                        }
                    }
                    if (sourceMapPath) {
                        pending++;
                        writeFile(sourceMapPath, this.sourceMapString, done);
                    }
                    break;
                // 清理文件。
                case BuildMode.clean:
                    taskId = begin("Clean: {file}", args);
                    deleteFile(savePath, error => {
                        if (error) {
                            done(error.code === "EPERM" ? null : error);
                        } else {
                            deleteParentDirIfEmpty(savePath, done);
                        }
                    });
                    if (sourceMapPath) {
                        pending++;
                        deleteFile(sourceMapPath, error => {
                            if (error) {
                                done(error.code === "EPERM" ? null : error);
                            } else {
                                deleteParentDirIfEmpty(sourceMapPath, done);
                            }
                        });
                    }
                    break;
                // 预览文件。
                default:
                    taskId = begin("Preview Save: {file}", args);
                    done(null);
                    break;
            }
        }
    }

    /**
     * 删除当前源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     * @param callback 异步操作完成后的回调函数。如果为空则为同步模式。
     */
    delete(deleteDir = true, callback?: (error: NodeJS.ErrnoException | null, file: File) => void) {
        // 验证路径。
        if (this.generated) {
            callback && callback(null, this);
            return;
        }
        // 如果删除了源文件则允许覆盖写入。
        this.overwrite = true;
        let taskId: string;
        const args = { file: this.toString() };
        const done = (error: NodeJS.ErrnoException | null) => {
            if (error) {
                this.error({
                    error: error,
                    showStack: false
                });
            }
            end(taskId);
            if (!error) {
                fileCount++;
                if (onFileDelete) {
                    onFileDelete(this);
                }
            }
            callback && callback(error, this);
        };

        // 预览模式不写入硬盘。
        if (this.buildMode === BuildMode.preview) {
            taskId = begin("Preview Delete: {file}", args);
            done(null);
            return;
        }

        // 删除文件。
        taskId = begin("Delete: {file} ", args);
        deleteFile(this.initalPath!, error => {
            if (error) {
                done(error);
            } else if (deleteDir !== false) {
                deleteParentDirIfEmpty(this.initalPath!, done);
            } else {
                done(null);
            }
        });
    }

    /**
     * 获取是否允许覆盖源文件。
     */
    get overwrite() { return typeof overwrite === "function" ? overwrite(this) : overwrite; }

    /**
     * 设置是否允许覆盖源文件。
     */
    set overwrite(value) { setProperty(this, "overwrite", value); }

    // #endregion

    // #region 日志

    /**
     * 获取当前文件累积的错误数。
     */
    errorCount = 0;

    /**
     * 获取当前文件累积的警告数。
     */
    warningCount = 0;

    /**
     * 记录一条和当前文件相关的日志。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     * @param level 要记录的日志等级。
     */
    log(data?: string | Error | FileLogEntry, args?: Object, level = LogLevel.log) {
        if (!(data instanceof LogEntry)) {
            data = new FileLogEntry(this, data, args);
        }
        if (onFileLog && onFileLog(this, data, level) === false) {
            return this;
        }
        switch (level) {
            case LogLevel.error:
            case LogLevel.fatal:
                this.errorCount++;
                break;
            case LogLevel.warning:
                this.warningCount++;
                break;
        }
        log(data, undefined, level);
        return this;
    }

    /**
     * 记录生成当前文件时出现的错误。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    error(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.error); }

    /**
     * 记录生成当前文件时出现的警告。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    warning(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.warning); }

    /**
     * 记录生成当前文件时的详细信息。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    verbose(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.verbose); }

    // #endregion

    // #region 依赖

    /**
     * 获取当前文件已添加的依赖。
     */
    deps: string[];

    /**
     * 添加当前文件的依赖。
     * @param path 相关的路径。
     * @param source 当前依赖的来源。
     */
    dep(path: string | string[], source?: LogEntry) {
        if (Array.isArray(path)) {
            for (const p of path) {
                this.dep(p, source);
            }
        } else if (typeof path === "string") {
            path = resolvePath(path);
            if (onFileDep && onFileDep(this, path, source) === false) {
                return;
            }
            this.deps = this.deps || [];
            this.deps.push(path);
        }
    }

    /**
     * 获取当前文件已添加的引用。
     */
    refs: string[];

    /**
     * 添加当前文件的引用项。
     * @param path 相关的路径。
     * @param source 当前引用的来源。
     */
    ref(path: string | string[], source?: LogEntry) {
        if (Array.isArray(path)) {
            for (const p of path) {
                this.ref(p, source);
            }
        } else if (typeof path === "string") {
            path = resolvePath(path);
            if (onFileRef && onFileRef(this, path, source) === false) {
                return;
            }
            this.refs = this.refs || [];
            this.refs.push(path);
        }
    }

    // #endregion

    // #region 写入器

    /**
     * 创建一个文本写入器。
     * @param options 写入器的配置。
     */
    createWriter(options?: WriterOptions) {
        return (options && options.sourceMap != undefined ? options.sourceMap : this.sourceMap) ? new SourceMapWriter(this, options) : new Writer(this, options);
    }

    /**
     * 创建一个二进制写入流。
     * @param options 写入流的配置。
     */
    createStream(options?: StreamOptions) {
        return new BufferStream(this, options);
    }

    // #endregion

    // #region 构建

    /**
     * 创建当前文件的副本。
     * @return 返回新文件对象。
     */
    clone() {
        const result: File = {
            __proto__: (this as any).__proto__
        } as any;
        for (const key in this as File) {
            if (this.hasOwnProperty(key)) {
                let value = this[key];
                if (value instanceof Buffer) {
                    value = new Buffer(value.length);
                    this[key].copy(value);
                } else if (Array.isArray(value)) {
                    value = value.slice(0);
                }
                result[key] = value;
            }
        }
        return result;
    }

    // #endregion

    // #region 工具

    /**
     * 获取当前文件的属性对象。
     */
    get stats() { return this.generated ? null : getStat(this.initalPath!); }

    /**
     * 测试当前文件名是否匹配指定的匹配器。
     * @param matcher 要测试通配符、正则表达式、函数或以上的匹配器组成的数组。
     * @return 如果匹配则返回 true，否则返回 false。
     */
    match(matcher: Pattern) { return match(this.destPath, matcher); }

    /**
     * 解析当前文件内的地址所表示的实际地址。
     * @param url 要解析的地址。如 `../a.js?a=1`。
     * @return 返回解析好的绝对地址。
     */
    resolve(url: string) { return resolvePath(this.srcDir, url); }

    /**
     * 获取在当前文件内引用指定地址或文件所使用的相对地址。
     * @param url 要解析的地址或文件。
     * @return 返回解析好的相对地址。
     */
    relative(url: string | File) { return relativePath(this.destDir, url instanceof File ? url.destPath : url); }

    // #endregion

}

/**
 * 表示生成模式。
 */
export const enum BuildMode {

    /**
     * 生成模式。
     */
    build,

    /**
     * 清理模式。
     */
    clean,

    /**
     * 预览模式。
     */
    preview,

    /**
     * 监听模式。
     */
    watch,

    /**
     * 服务器模式。
     */
    server,

}

/**
 * 获取或设置文件的生成模式。
 */
export var buildMode = BuildMode.build;

/**
 * 获取或设置读写文件使用的默认编码。
 */
export var encoding: string | ((file: File) => string) = "utf-8";

/**
 * 获取或设置是否允许覆盖源文件。
 */
export var overwrite: boolean | ((file: File) => boolean) = false;

/**
 * 获取或设置是否启用源映射。
 */
export var sourceMap: boolean | ((file: File) => boolean) = false;

/**
 * 获取或设置用于计算每个文件的源映射路径的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射的绝对路径。
 */
export var sourceMapPath: null | ((file: File) => string) = null;

/**
 * 获取或设置用于计算每个文件的源映射地址的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射地址。
 */
export var sourceMapUrl: null | ((file: File) => string) = null;

/**
 * 获取或设置用于计算源映射中指定源文件地址的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件地址。
 */
export var sourceMapSource: null | ((source: string, file: File) => string) = null;

/**
 * 获取或设置用于计算源映射中指定源文件内容的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件内容。
 */
export var sourceMapSourceContent: null | ((source: string, file: File) => string) = null;

/**
 * 获取或设置是否在源文件中内联源映射。
 */
export var sourceMapInline: boolean | ((file: File) => boolean) = false;

/**
 * 获取或设置是否在源文件追加对源映射的引用注释。
 */
export var sourceMapEmit: boolean | ((file: File) => boolean) = true;

/**
 * 获取或设置源映射中引用源的跟地址。
 */
export var sourceMapRoot: string | ((file: File) => string) = "";

/**
 * 获取或设置是否在源映射插入 sourcesContent 段。
 */
export var sourceMapIncludeSourcesContent: boolean | ((file: File) => boolean) = false;

/**
 * 获取或设置是否在源映射插入 file 段。
 */
export var sourceMapIncludeFile: boolean | ((file: File) => boolean) = true;

/**
 * 获取或设置是否在源映射插入 names 段。
 */
export var sourceMapIncludeNames: boolean | ((file: File) => boolean) = true;

/**
 * 获取或设置生成文件源映射的回调函数。
 * @param sourceMap 当前的源映射对象。
 * @param file 当前相关的文件。
 */
export var onSourceMapValidate = (sourceMap: SourceMapObject, file: File) => { emit("sourceMapValidate", sourceMap, file); };

/**
 * 获取或设置即将保存文件时的回调函数。
 * @param file 当前相关的文件。
 * @return 如果函数返回 false，则不保存此文件。
 */
export var onFileValidate = (file: File): boolean | void => { emit("fileValidate", file); };

/**
 * 获取或设置保存文件后的回调函数。
 * @param file 当前相关的文件。
 */
export var onFileSave = (file: File) => { emit("fileSave", file); };

/**
 * 获取或设置当删除文件后的回调函数。
 * @param file 当前相关的文件。
 */
export var onFileDelete = (file: File) => { emit("fileDelete", file); };

/**
 * 获取或设置在虚拟保存文件的回调函数。
 * @param path 当前写入的文件路径。
 * @param buffer 当前写入的文件内容。
 */
export var saveFile: null | ((path: string, buffer: Buffer | null) => void) = null;

/**
 * 获取已处理的文件数。
 */
export var fileCount = 0;

/**
 * 获取或设置是否允许系统使用源映射信息。
 */
export var evalSourceMap = true;

/**
 * 表示处理文件时产生的日志项。
 */
export class FileLogEntry extends LogEntry {

    /**
     * 获取源文件对象。
     */
    file?: File;

    /**
     * 获取是否允许执行源映射。
     */
    evalSourceMap?: boolean;

    /**
     * 初始化新的日志项。
     * @param file 当前正在生成的文件。
     * @param data 要处理的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    constructor(file: File, data?: string | Error | LogEntry, args?: Object) {
        super(data, args);

        // 统一文件对象。
        if (!this.file) {
            this.file = this.fileName != undefined && !file.generated && !pathEquals(this.fileName, file.initalPath!) ? new File(this.fileName, file.base) : file;
        }

        // 执行源映射：找到真正的位置。
        let fromSource = false;
        if (this.file.sourceMapData && evalSourceMap && this.evalSourceMap !== false && this.startLine != undefined) {
            fromSource = true;
            const sourceMapBuilder = this.file.sourceMapBuilder!;
            const startSource = sourceMapBuilder.getSource(this.startLine, this.startColumn || 0, false);
            if (startSource.sourcePath != undefined && (this.file.generated || !pathEquals(this.file.initalPath!, startSource.sourcePath))) {
                this.file = new File(startSource.sourcePath, file.base);
            }
            this.startLine = startSource.line;
            this.startColumn = startSource.column;

            if (this.endLine != undefined) {
                const endSource = sourceMapBuilder.getSource(this.endLine, this.endColumn || 0, false);
                if (endSource.sourcePath != undefined && pathEquals(this.fileName!, endSource.sourcePath)) {
                    this.endLine = endSource.line;
                    this.endColumn = endSource.column;
                } else {
                    delete this.endLine;
                    delete this.endColumn;
                }
            }
        }

        // 从文件提取信息。
        this.fileName = this.file.srcPath;
        if (this.content === undefined && this.startLine != undefined) {
            this.content = fromSource ? (this as FileLogEntry).file!.srcContent : (this as FileLogEntry).file!.content;
        }

    }

}

/**
 * 获取或设置处理文件时产生日志的回调函数。
 * @param log 要记录的日志项。
 * @param level 要记录的日志等级。
 * @param file 当前正在生成的文件。
 * @return 如果函数返回 false，则忽略当前日志。
 */
export var onFileLog = (file: File, log: FileLogEntry, level: LogLevel): boolean | void => { emit("fileLog", file, log, level); };

/**
 * 获取或设置处理文件时发现依赖的回调函数。
 * @param file 当前正在生成的文件。
 * @param path 要依赖的文件路径。
 * @param source 要依赖的文件路径。
 * @return 如果函数返回 false，则忽略当前依赖。
 */
export var onFileDep = (file: File, path: string, source?: LogEntry): boolean | void => { emit("fileDep", file, path, source); };

/**
 * 获取或设置处理文件时发现引用的回调函数。
 * @param file 当前正在生成的文件。
 * @param path 要引用的文件路径。
 * @param source 要引用的文件路径。
 * @return 如果函数返回 false，则忽略当前引用。
 */
export var onFileRef = (file: File, path: string, source?: LogEntry): boolean | void => { emit("fileRef", file, path, source); };
