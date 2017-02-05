/**
 * @file 写入器
 * @author xuld <xuld@vip.qq.com>
 */
import { Writable, WritableOptions } from "stream";
import { SourceMapBuilder, SourceMapData, SourceMapObject, toSourceMapBuilder } from "../utility/sourceMap";
import { File } from "./file";

/**
 * 表示一个写入器。
 */
export class Writer {

    // #region 基本属性

    /**
     * 获取当前写入的目标文件。
     */
    readonly file: File;

    /**
     * 是否只生成行信息。
     */
    readonly sourceMapLineMappingsOnly?: boolean;

    /**
     * 初始化新的写入器。
     * @param file 写入的目标文件。
     * @param options 写入的选项。
     */
    constructor(file: File, options?: WriterOptions) {
        this.file = file;
        if (options) {
            if (options.indentChar != null) {
                this.indentChar = options.indentChar;
            }
            if (options.sourceMapLineMappingsOnly != null) {
                this.sourceMapLineMappingsOnly = options.sourceMapLineMappingsOnly;
            }
        }
    }

    // #endregion

    // #region 缩进

    /**
     * 获取或设置当前使用的缩进字符。
     */
    indentChar = "\t";

    /**
     * 获取或设置当前使用的缩进字符串。
     */
    indentString = "";

    /**
     * 增加一个缩进。
     */
    indent() { this.indentString += this.indentChar; }

    /**
     * 减少一个缩进。
     */
    unindent() { this.indentString = this.indentString.substr(0, this.indentString.length - this.indentChar.length); }

    // #endregion

    // #region 写入

    /**
     * 获取最终生成的文本内容。
     */
    protected content = "";

    /**
     * 实现写入一段文本。
     * @param content 要写入的内容。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     * @param sourcePath 内容的源文件路径。
     * @param sourceLine 内容在源文件中的行号(从 0 开始)。
     * @param sourceColumn 内容在源文件中的列号(从 0 开始)。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     */
    write(content: string, startIndex?: number, endIndex?: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, sourceMap?: SourceMapData) {
        const ch = this.content.charCodeAt(this.content.length - 1);
        if (ch === 10/*\r*/ || ch === 13/*\r*/ || ch !== ch) {
            this.content += this.indentString;
        }
        if (startIndex! > 0 || endIndex! < content.length) {
            content = content.substring(startIndex! || 0, endIndex);
        }
        this.content += this.indentString ? content.replace(/\r\n?|\n/g, "$&" + this.indentString) : content;
    }

    /**
     * 写入一个文件的内容。
     * @param content 要写入的文件。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     */
    writeFile(file: File, startIndex?: number, endIndex?: number) {
        const loc = file.indexToLocation(startIndex || 0);
        this.write(file.content, startIndex, endIndex, file.srcPath, loc.line, loc.column, file.sourceMapBuilder);
    }

    /**
     * 返回当前生成的代码。
     * @return 返回完整的代码。
     */
    toString() { return this.content; }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() { this.file.content = this.content; }

    // #endregion

}

/**
 * 表示一个支持源映射的写入器。
 */
export class SourceMapWriter extends Writer {

    /**
     * 存储当前使用的源映射生成器。
     */
    private readonly sourceMapBuilder = new SourceMapBuilder();

    /**
     * 获取当前生成的源映射。
     */
    get sourceMap() {
        const result = this.sourceMapBuilder.toJSON();
        result.file = this.file.srcPath;
        return result;
    }

    /**
     * 存储当前写入的行号。
     */
    private currentLine = 0;

    /**
     * 存储当前写入的列号。
     */
    private currentColumn = 0;

    /**
     * 实现写入一段文本。
     * @param content 要写入的内容。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     * @param sourcePath 内容的源文件路径。
     * @param sourceLine 内容在源文件中的行号(从 0 开始)。
     * @param sourceColumn 内容在源文件中的列号(从 0 开始)。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     */
    write(content: string, startIndex?: number, endIndex?: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, sourceMap?: SourceMapData) {

        // 修复参数。
        startIndex = startIndex || 0;
        endIndex = endIndex || content.length;
        if (sourceMap) {
            sourceMap = toSourceMapBuilder(sourceMap);
        }

        const ch = this.content.charCodeAt(this.content.length - 1);
        if (ch === 10/*\n*/ || ch === 13/*\r*/ || ch !== ch) {
            this.content += this.indentString;
            this.currentColumn = this.indentString.length;
        }

        // 计算最后一个换行符位置。
        // 如果值为 startIndex - 1 说明 content 只有一行。
        let lastLineBreak = endIndex;
        while (--lastLineBreak >= startIndex) {
            const ch = content.charCodeAt(lastLineBreak);
            if (ch === 13 /*\r*/ || ch === 10 /*\n*/) {
                break;
            }
        }

        // 依次写入每个字符。
        let prevCharType: number | undefined;
        for (let i = startIndex; i < endIndex; i++) {
            this.content += content.charAt(i);

            // 换行：更新行列号以及添加映射。
            let ch = content.charCodeAt(i);
            if (ch === 13/*\r*/) {
                if (content.charCodeAt(i + 1) === 10 /*\n*/) {
                    i++;
                    this.content += "\n";
                }
                ch = 10;
            }
            if (ch === 10/*\n*/) {
                if (sourceLine !== undefined) {
                    sourceLine++;
                }
                sourceColumn = 0;
                this.currentLine++;
                if (this.indentString) {
                    this.content += this.indentString;
                    this.currentColumn = this.indentString.length;
                } else {
                    this.currentColumn = 0;
                }
            }

            // 重新计算字符类型。
            let currentCharType: number | undefined;
            if (!sourceMap && !this.sourceMapLineMappingsOnly) {
                if (ch >= 97/*a*/ && ch <= 122/*z*/ || ch >= 65/*A*/ && ch <= 90/*Z*/ || ch >= 48/*0*/ && ch <= 57/*9*/) {
                    currentCharType = 1;
                } else if (ch === 10/*\n*/ || ch === 13/*\r*/ || ch === 32/* */ || ch === 9/*\t*/) {
                    currentCharType = 2;
                } else {
                    currentCharType = 3;
                }
            }

            // 首次/换行/字符类型改变：添加映射点。
            if (ch === 10/*\n*/ || currentCharType !== prevCharType || i === startIndex) {

                // 映射 _currentLine,_currentColumn -> sourceLine,sourceColumn。
                const mappings = this.sourceMapBuilder.mappings[this.currentLine] || (this.sourceMapBuilder.mappings[this.currentLine] = []);
                if (mappings.length && mappings[mappings.length - 1].generatedColumn === this.currentColumn) {
                    mappings.pop();
                }
                mappings.push(sourcePath != undefined ? {
                    generatedColumn: this.currentColumn,
                    sourceIndex: this.sourceMapBuilder.addSource(sourcePath),
                    sourceLine: sourceLine,
                    sourceColumn: sourceColumn
                } : {
                        generatedColumn: this.currentColumn
                    });

                // 如果 content 本身存在映射，需要复制 content 在 sourceLine 的所有映射点。
                if (sourceMap && sourceLine != undefined && (sourceMap as SourceMapBuilder).mappings[sourceLine]) {
                    for (const mapping of (sourceMap as SourceMapBuilder).mappings[sourceLine]) {

                        // 第一行：忽略 sourceColumn 之前的映射。
                        if (i === startIndex && mapping.generatedColumn < sourceColumn!) {
                            continue;
                        }

                        // lastLineBreak < startIndex 表示只存在一行。
                        // 最后一行：忽略 content 存放后最新长度之后的映射。
                        if (lastLineBreak < startIndex) {
                            if (mapping.generatedColumn >= sourceColumn! + endIndex - startIndex) {
                                break;
                            }
                        } else if (i === lastLineBreak) {
                            if (mapping.generatedColumn >= endIndex - lastLineBreak) {
                                break;
                            }
                        }

                        // 复制源信息，但 mapping.column 更新为 newColumn。
                        const newColumn = mapping.generatedColumn - sourceColumn! + this.currentColumn;

                        // 之前已添加过当前行首的映射信息。
                        // 如果 srcSourceMap 已经包含了行首的映射信息，则覆盖之前的映射。
                        if (mappings.length && mappings[mappings.length - 1].generatedColumn === newColumn) {
                            mappings.pop();
                        }

                        // 复制一个映射点。
                        mappings.push({
                            generatedColumn: newColumn,
                            sourceIndex: mapping.sourceIndex == undefined ? undefined : this.sourceMapBuilder.addSource((sourceMap as SourceMapBuilder).sources[mapping.sourceIndex]),
                            sourceLine: mapping.sourceLine,
                            sourceColumn: mapping.sourceColumn,
                            nameIndex: mapping.nameIndex == undefined ? undefined : this.sourceMapBuilder.addName((sourceMap as SourceMapBuilder).names[mapping.nameIndex])
                        });

                    }
                }

            }

            if (ch !== 10) {
                this.currentColumn++;
                if (sourceColumn != undefined) {
                    sourceColumn++;
                }
            }
            prevCharType = currentCharType;

        }

    }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() {
        super.end();
        this.file.sourceMapData = this.sourceMapBuilder;
    }

}

/**
 * 表示写入器的配置。
 */
export interface WriterOptions {

    /**
     * 是否支持生成源映射。
     */
    sourceMap?: boolean;

    /**
     * 是否只生成行信息。
     */
    sourceMapLineMappingsOnly?: boolean;

    /**
     * 缩进字符。
     */
    indentChar?: string;

}

/**
 * 表示一个缓存流。
 */
export class BufferStream extends Writable {

    /**
     * 获取当前写入的目标文件。
     */
    readonly file: File;

    /**
     * 存储最终的缓存。
     */
    private buffer: Buffer;

    /**
     * 获取当前流的长度。
     */
    length = 0;

    /**
     * 获取当前流的容器大小。
     */
    get capacity() { return this.buffer.length; }

    /**
     * 初始化新的缓存流。
     * @param file 写入的目标文件。
     * @param options 原始写入配置。
     */
    constructor(file: File, options?: StreamOptions) {
        super(options);
        this.file = file;
        this.buffer = Buffer.allocUnsafe(options && options.capacity || 64 * 1024);
    }

    /**
     * 确保当前流可以存放指定长度的缓存。
     * @param length 要设置的新长度。
     */
    ensureCapacity(length) {
        if (length < this.buffer.length) {
            return;
        }
        length = Math.min(length, this.buffer.length * 2 - 1);
        const newBuffer = Buffer.allocUnsafe(length);
        this.buffer.copy(newBuffer, 0, 0, this.length);
        this.buffer = newBuffer;
    }

    /**
     * 底层实现写入操作。
     * @param chunk 要写入的缓存。
     * @param encoding 写入的编码。
     * @param callback 写入的回调。
     * @internal
     */
    _write(chunk: Buffer, encoding: string, callback: Function) {
        this.ensureCapacity(this.length + chunk.length);
        chunk.copy(this.buffer, this.length, 0);
        this.length += chunk.length;
        callback();
    }

    /**
     * 获取当前流的内容。
     * @param start 开始的位置。
     * @param end 结束的位置。
     * @return 返回复制的缓存对象。
     */
    toBuffer(start = 0, end = this.length) {
        start = Math.max(start, 0);
        end = Math.min(end, this.length);
        const result = Buffer.allocUnsafe(end - start);
        this.buffer.copy(result, 0, start, end);
        return result;
    }

    /**
     * 获取当前流的字符串形式。
     * @param start 开始的位置。
     * @param end 结束的位置。
     * @return 返回字符串。
     */
    toString(encoding?: string, start = 0, end = this.length) {
        return this.buffer.toString(encoding, Math.max(start, 0), Math.min(end, this.length));
    }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() { this.file.buffer = this.toBuffer(); }

}

/**
 * 表示流的配置。
 */
export interface StreamOptions extends WritableOptions {

    /**
     * 设置初始的缓存大小。
     */
    capacity?: number;

}
