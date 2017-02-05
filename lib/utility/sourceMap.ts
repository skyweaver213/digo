/**
 * @file 源映射(Source Map)
 * @author xuld <xuld@vip.qq.com>
 */

/**
 * 表示一个源映射对象。
 * @see https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k
 * @see http://www.alloyteam.com/2014/01/source-map-version-3-introduction/
 */
export interface SourceMapObject {

    /**
     * 获取或设置当前源映射的版本号。
     */
    version: number;

    /**
     * 获取或设置生成文件的路径。
     */
    file?: string;

    /**
     * 获取或设置所有源文件的根路径。
     */
    sourceRoot?: string;

    /**
     * 获取或设置所有源文件路径。
     */
    sources: string[];

    /**
     * 获取或设置所有源文件内容。
     */
    sourcesContent?: string[];

    /**
     * 获取或设置所有名称。
     */
    names?: string[];

    /**
     * 获取或设置所有映射点。
     */
    mappings: string;

}

/**
 * 表示一个索引映射对象。
 */
export interface IndexMapObject {

    /**
     * 获取或设置当前索引映射的版本号。
     */
    version: number;

    /**
     * 获取或设置生成文件路径。
     */
    file?: string;

    /**
     * 获取或设置所有片段。
     */
    sections: {

        /**
         * 获取或设置当前片段在生成文件内的偏移位置。
         */
        offset: {

            /**
             * 获取或设置当前位置的行号(从 0 开始)。
             */
            line: number;

            /**
             * 获取或设置当前位置的列号(从 0 开始)。
             */
            column: number;

        };

        /**
         * 获取或设置当前片段的源映射地址。
         * @desc 同一个片段的 *url* 和 *map* 必须一个有值，另一个为空。
         */
        url?: string;

        /**
         * 获取或设置当前片段的源映射数据。
         * @desc 同一个片段的 *url* 和 *map* 必须一个有值，另一个为空。
         */
        map?: SourceMapObject | IndexMapObject;

    }[];

}

/**
 * 表示一个源映射生成器。
 */
export interface SourceMapGenerator {

    /**
     * 生成源映射对象。
     * @return 返回源映射对象。
     */
    toJSON(): SourceMapObject | IndexMapObject;

    /**
     * 生成源映射字符串。
     * @return 返回源映射字符串。
     */
    toString(): string;

}

/**
 * 表示一个源映射数据，可以是字符串、对象或生成器中的任意一种格式。
 */
export type SourceMapData = string | SourceMapObject | IndexMapObject | SourceMapGenerator;

/**
 * 将指定的源映射数据转为源映射字符串。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射字符串。
 */
export function toSourceMapString(sourceMapData: SourceMapData) {
    if (typeof sourceMapData === "string") {
        return sourceMapData;
    }
    return JSON.stringify(sourceMapData);
}

/**
 * 将指定的源映射数据转为源映射对象。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射对象。
 */
export function toSourceMapObject(sourceMapData: SourceMapData) {
    if (typeof sourceMapData === "string") {
        // 为防止 XSS，源数据可能包含 )]}' 前缀。
        // https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#
        sourceMapData = JSON.parse(sourceMapData.replace(/^\)]}'/, ""));
    } else if ((sourceMapData as SourceMapGenerator).toJSON) {
        sourceMapData = (sourceMapData as SourceMapGenerator).toJSON();
    }
    if ((sourceMapData as IndexMapObject).sections) {
        throw new TypeError("Indexed Map is not supported yet.");
    }
    if ((sourceMapData as SourceMapObject).version && (sourceMapData as SourceMapObject).version != 3) {
        throw new TypeError(`Source Map v${(sourceMapData as SourceMapObject).version} is not supported yet.`);
    }
    return sourceMapData as SourceMapObject;
}

/**
 * 将指定的源映射数据转为源映射构建器。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射构建器。
 */
export function toSourceMapBuilder(sourceMapData: SourceMapData) {
    if (sourceMapData instanceof SourceMapBuilder) {
        return sourceMapData;
    }
    return new SourceMapBuilder(sourceMapData);
}

/**
 * 表示一个源映射构建器。
 * @desc 源映射构建器提供了解析、读取、生成、合并源映射的功能。
 */
export class SourceMapBuilder implements SourceMapGenerator {

    // #region 属性

    /**
     * 获取当前源映射构建器支持的版本号。
     */
    get version() { return 3; }

    /**
     * 获取或设置生成文件的路径。
     */
    file?: string;

    /**
     * 获取或设置所有源文件的根路径。
     */
    sourceRoot?: string;

    /**
     * 获取或设置所有源文件路径。
     */
    readonly sources: string[] = [];

    /**
     * 获取或设置所有源文件内容。
     */
    readonly sourcesContent: string[] = [];

    /**
     * 获取或设置所有名称列表。
     */
    readonly names: string[] = [];

    /**
     * 获取或设置所有映射点。
     */
    readonly mappings: Mapping[][] = [];

    /**
     * 获取指定源文件路径的索引。
     * @param sourcePath 要获取的源文件路径。
     * @return 返回索引。如果找不到则返回 -1。
     */
    indexOfSource(sourcePath: string) {
        if (!this.sources.length) {
            return -1;
        }
        let sourceIndex = this.sources.indexOf(sourcePath);
        if (sourceIndex < 0) {
            sourcePath = sourcePath.toLowerCase();
            for (sourceIndex = this.sources.length; --sourceIndex >= 0;) {
                if (this.sources[sourceIndex].toLowerCase() == sourcePath) {
                    break;
                }
            }
        }
        return sourceIndex;
    }

    /**
     * 添加一个源文件。
     * @param sourcePath 要添加的源文件路径。
     * @return 返回源文件的索引。如果源文件路径为 undefined，则返回 undefined。
     */
    addSource(sourcePath: string) {
        let sourceIndex = this.indexOfSource(sourcePath);
        if (sourceIndex < 0) {
            this.sources[sourceIndex = this.sources.length] = sourcePath;
        }
        return sourceIndex;
    }

    /**
     * 添加一个名称。
     * @param name 要添加的名称。
     * @return 返回名称的索引。如果名称为 undefined，则返回 undefined。
     */
    addName(name: string) {
        let nameIndex = this.names.indexOf(name);
        if (nameIndex < 0) {
            this.names[nameIndex = this.names.length] = name;
        }
        return nameIndex;
    }

    /**
     * 获取指定源文件的内容。
     * @param source 要获取的源文件路径。
     * @return 返回源文件的内容。如果未指定指定源文件路径的内容，则返回 undefined。
     */
    getSourceContent(sourcePath: string) {
        const sourceIndex = this.indexOfSource(sourcePath);
        return sourceIndex < 0 ? undefined : this.sourcesContent[sourceIndex];
    }

    /**
     * 设置指定源文件的内容。
     * @param sourcePath 要设置的源文件路径。
     * @param sourceContent 要设置的源文件内容。
     */
    setSourceContent(sourcePath: string, sourceContent: string) {
        const sourceIndex = this.indexOfSource(sourcePath);
        if (sourceIndex >= 0) {
            this.sourcesContent[sourceIndex] = sourceContent;
        }
    }

    // #endregion

    // #region 解析和格式化

    /**
     * 初始化新的源映射构建器。
     * @param sourceMapData 要转换的源映射数据。
     */
    constructor(sourceMapData?: SourceMapData) {
        if (sourceMapData) {
            sourceMapData = toSourceMapObject(sourceMapData);
            if (sourceMapData.file) {
                this.file = sourceMapData.file;
            }
            if (sourceMapData.sourceRoot) {
                this.sourceRoot = sourceMapData.sourceRoot;
            }
            if (sourceMapData.sources) {
                this.sources.push(...sourceMapData.sources);
            }
            if (sourceMapData.sourcesContent) {
                this.sourcesContent.push(...sourceMapData.sourcesContent);
            }
            if (sourceMapData.names) {
                this.names.push(...sourceMapData.names);
            }
            if (sourceMapData.mappings) {
                const context = { index: 0 };
                let line = 0;
                let mappings: Mapping[] = this.mappings[0] = [];
                let prevColumn = 0;
                let prevSourceIndex = 0;
                let prevSourceLine = 0;
                let prevSourceColumn = 0;
                let prevNameIndex = 0;
                while (context.index < sourceMapData.mappings.length) {
                    let ch = sourceMapData.mappings.charCodeAt(context.index);
                    if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                        const mapping: Mapping = {
                            generatedColumn: prevColumn += decodeBase64Vlq(sourceMapData.mappings, context)
                        };
                        mappings.push(mapping);
                        if (context.index === sourceMapData.mappings.length) {
                            break;
                        }
                        ch = sourceMapData.mappings.charCodeAt(context.index);
                        if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                            mapping.sourceIndex = prevSourceIndex += decodeBase64Vlq(sourceMapData.mappings, context);
                            mapping.sourceLine = prevSourceLine += decodeBase64Vlq(sourceMapData.mappings, context);
                            mapping.sourceColumn = prevSourceColumn += decodeBase64Vlq(sourceMapData.mappings, context);
                            if (context.index === sourceMapData.mappings.length) {
                                break;
                            }
                            ch = sourceMapData.mappings.charCodeAt(context.index);
                            if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                                mapping.nameIndex = prevNameIndex += decodeBase64Vlq(sourceMapData.mappings, context);
                                if (context.index === sourceMapData.mappings.length) {
                                    break;
                                }
                                ch = sourceMapData.mappings.charCodeAt(context.index);
                            }
                        }
                    }
                    context.index++;
                    if (ch === 59/*;*/) {
                        this.mappings[++line] = mappings = [];
                        prevColumn = 0;
                    }
                }
            }
        }
    }

    /**
     * 生成源映射对象。
     * @return 返回源映射对象。
     */
    toJSON() {
        const result = {
            version: this.version
        } as SourceMapObject;
        if (this.file) {
            result.file = this.file;
        }
        if (this.sourceRoot) {
            result.sourceRoot = this.sourceRoot;
        }
        if (this.sources.length) {
            result.sources = this.sources;
        }
        if (this.names.length) {
            result.names = this.names;
        }
        if (this.mappings && this.mappings.length) {
            result.mappings = "";
            let prevSourceIndex = 0;
            let prevSourceLine = 0;
            let prevSourceColumn = 0;
            let prevNameIndex = 0;
            for (let i = 0; i < this.mappings.length; i++) {
                if (i > 0) {
                    result.mappings += ";";
                }
                const mappings = this.mappings[i];
                if (mappings) {
                    let prevColumn = 0;
                    for (let j = 0; j < mappings.length; j++) {
                        if (j > 0) {
                            result.mappings += ",";
                        }
                        const mapping = mappings[j];
                        result.mappings += encodeBase64Vlq(mapping.generatedColumn - prevColumn);
                        prevColumn = mapping.generatedColumn;
                        if (mapping.sourceIndex != undefined && mapping.sourceLine != undefined && mapping.sourceColumn != undefined) {
                            result.mappings += encodeBase64Vlq(mapping.sourceIndex - prevSourceIndex);
                            prevSourceIndex = mapping.sourceIndex;
                            result.mappings += encodeBase64Vlq(mapping.sourceLine - prevSourceLine);
                            prevSourceLine = mapping.sourceLine;
                            result.mappings += encodeBase64Vlq(mapping.sourceColumn - prevSourceColumn);
                            prevSourceColumn = mapping.sourceColumn;
                            if (mapping.nameIndex != undefined) {
                                result.mappings += encodeBase64Vlq(mapping.nameIndex - prevNameIndex);
                                prevNameIndex = mapping.nameIndex;
                            }
                        }
                    }
                }
            }
        }
        if (this.sourcesContent.length) {
            result.sourcesContent = this.sourcesContent;
        }
        return result;
    }

    /**
     * 生成源映射字符串。
     * @return 返回源映射字符串。
     */
    toString() { return JSON.stringify(this); }

    // #endregion

    // #region 处理

    /**
     * 获取生成文件中指定位置的源位置。
     * @param generatedLine 生成文件中的行号(从 0 开始)。
     * @param generatedColumn 生成文件中的列号(从 0 开始)。
     * @param alignColumn 是否计算列偏移。
     * @param alignLine 是否计算行偏移。
     * @return 返回包含源文件路径、内容、行列号等信息的源位置对象。
     */
    getSource(generatedLine: number, generatedColumn: number, alignColumn = true, alignLine = true) {

        // 搜索当前行指定列的映射。
        const mappings = this.mappings[generatedLine];
        if (mappings) {
            for (let i = mappings.length; --i >= 0;) {
                const mapping = mappings[i];
                if (generatedColumn >= mapping.generatedColumn) {
                    const result = { mapping } as SourceLocation;
                    if (mapping.sourceIndex != undefined) {
                        result.sourcePath = this.sources[mapping.sourceIndex];
                        result.line = mapping.sourceLine!;
                        result.column = mapping.sourceColumn! + (alignColumn ? generatedColumn - mapping.generatedColumn : 0);
                        if (mapping.nameIndex != undefined) {
                            result.name = this.names[mapping.nameIndex];
                        }
                    }
                    return result;
                }
            }
        }

        // 当前行不存在对应的映射，搜索上一行的映射信息。
        if (alignLine) {
            for (let i = generatedLine; --i >= 0;) {
                const mappings = this.mappings[i];
                if (mappings && mappings.length) {
                    const mapping = mappings[mappings.length - 1];
                    const result = { mapping } as SourceLocation;
                    if (mapping.sourceIndex != undefined) {
                        result.sourcePath = this.sources[mapping.sourceIndex];
                        result.line = mapping.sourceLine! + generatedLine - i;
                        result.column = alignColumn ? generatedColumn : 0;
                        if (mapping.nameIndex != undefined) {
                            result.name = this.names[mapping.nameIndex];
                        }
                    }
                    return result;
                }
            }
        }
        return {} as SourceLocation;
    }

    /**
     * 获取源文件中指定位置生成后的所有位置。
     * @param sourcePath 要获取的源文件路径。
     * @param sourceLine 源文件中的行号(从 0 开始)。
     * @param sourceColumn 源文件中的列号(从 0 开始)。
     * @param alignColumn 是否计算列偏移。
     * @return 返回所有生成文件中的行列信息。
     */
    getGenerated(sourcePath: string, sourceLine: number, sourceColumn: number, alignColumn = true) {
        const result: SourceLocation[] = [];
        const sourceIndex = this.indexOfSource(sourcePath);
        if (sourceIndex >= 0) {
            for (let i = 0; i < this.mappings.length; i++) {
                const mappings = this.mappings[i];
                if (mappings) {
                    for (let j = 0; j < mappings.length; j++) {
                        const mapping = mappings[j];
                        if (mapping.sourceIndex === sourceIndex &&
                            mapping.sourceLine === sourceLine &&
                            mapping.sourceColumn! <= sourceColumn) {
                            const generatedColumn = mapping.generatedColumn + sourceColumn - mapping.sourceColumn!;
                            if (j + 1 === mappings.length || generatedColumn < mappings[j + 1].generatedColumn) {
                                const loc = {
                                    mapping,
                                    sourcePath,
                                    line: i,
                                    column: alignColumn ? generatedColumn : mapping.generatedColumn
                                } as SourceLocation;
                                if (mapping.nameIndex != undefined) {
                                    loc.name = this.names[mapping.nameIndex];
                                }
                                result.push(loc);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * 添加一个映射点。
     * @param generatedLine 生成的行号(从 0 开始)。
     * @param generatedColumn 生成的列号(从 0 开始)。
     * @param sourcePath 映射的源文件路径。
     * @param sourceLine 映射的源文件行号(从 0 开始)。
     * @param sourceColumn 映射的源文件列号(从 0 开始)。
     * @param name 映射的名称。
     * @return 返回添加的映射点。
     */
    addMapping(generatedLine: number, generatedColumn: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, name?: string) {

        // 创建映射点。
        const mapping: Mapping = {
            generatedColumn: generatedColumn
        };
        if (sourcePath != undefined) {
            mapping.sourceIndex = this.addSource(sourcePath);
            mapping.sourceLine = sourceLine;
            mapping.sourceColumn = sourceColumn;
            if (name != undefined) {
                mapping.nameIndex = this.addName(name);
            }
        }

        // 插入排序：确保同一行内的所有映射点按生成列的顺序存储。
        const mappings = this.mappings[generatedLine];
        if (!mappings) {
            this.mappings[generatedLine] = [mapping];
        } else if (!mappings.length || generatedColumn >= mappings[mappings.length - 1].generatedColumn) {
            mappings.push(mapping);
        } else {
            for (let i = mappings.length; --i >= 0;) {
                if (generatedColumn >= mappings[i].generatedColumn) {
                    if (generatedColumn === mappings[i].generatedColumn) {
                        mappings[i] = mapping;
                    } else {
                        mappings.splice(i + 1, 0, mapping);
                    }
                    return mapping;
                }
            }
            mappings.unshift(mapping);
        }
        return mapping;
    }

    /**
     * 遍历所有映射点。
     * @param callback 遍历的回调函数。
     */
    eachMapping(callback: (generatedLine: number, generatedColumn: number, sourcePath: string | undefined, sourceContent: string | undefined, sourceLine: number | undefined, sourceColumn: number | undefined, name: string | undefined, mapping: Mapping) => void) {
        for (let i = 0; i < this.mappings.length; i++) {
            const mappings = this.mappings[i];
            if (mappings) {
                for (const mapping of mappings) {
                    callback(i, mapping.generatedColumn, mapping.sourceIndex == undefined ? undefined : this.sources[mapping.sourceIndex], mapping.sourceIndex == undefined ? undefined : this.sourcesContent[mapping.sourceIndex], mapping.sourceLine, mapping.sourceColumn, mapping.nameIndex == undefined ? undefined : this.names[mapping.nameIndex], mapping);
                }
            }
        }
    }

    /**
     * 应用指定的源映射并更新当前源映射。
     * @param other 要应用的源映射。
     * @desc
     * 假如有源文件 A，通过一次生成得到 B，其源映射记作 T。
     * 现在基于 B，通过第二次生成得到 C，其源映射记作 M。
     * 那么就需要调用 `M.applySourceMap(T)`，将 M 更新为 A 到 C 的源映射。
     */
    applySourceMap(other: SourceMapBuilder) {

        // 合并映射表的算法为：
        // 对于 M 中的每一条映射 p，如果 p.source 同 T.file，
        // 则将其源行列号更新为 T 中指定的源码和源行列号。

        // 只有源索引为 expectedSourceIndex 的映射才能基于 T 更新。
        const expectedSourceIndex = other.file != undefined ? this.indexOfSource(other.file) : 0;
        if (expectedSourceIndex < 0) {
            return;
        }
        this.sources.splice(expectedSourceIndex, 1);
        this.sourcesContent.splice(expectedSourceIndex, 1);

        for (const mappings of this.mappings) {
            if (mappings) {
                for (let i = 0; i < mappings.length; i++) {
                    const mapping = mappings[i];
                    if (mapping.sourceIndex != undefined && mapping.sourceIndex > expectedSourceIndex) {
                        mapping.sourceIndex--;
                        continue;
                    }
                    if (mapping.sourceIndex === expectedSourceIndex) {

                        // 下一个映射点。
                        const nextColumn = i + 1 < mappings.length && mappings[i + 1].generatedColumn || Infinity;

                        // 在 M 中 mapping.column 到 nextColumn 之间不存在其它映射。
                        // 但是在 T 中对应的区间则可能包含多个映射，这些映射要重新拷贝到 M。
                        if (other.mappings[mapping.sourceLine!]) {
                            for (const targetMapping of other.mappings[mapping.sourceLine!]) {
                                if (targetMapping.generatedColumn > mapping.sourceColumn!) {
                                    // 根据 T 中的列号反推 M 的索引：
                                    // mapping.column -> mapping.sourceColumn
                                    // ? -> targetMapping.column
                                    const column = mapping.generatedColumn + targetMapping.generatedColumn - mapping.sourceColumn!;

                                    // M 中已经指定了 column 的映射，忽略 T 的剩余映射。
                                    if (column >= nextColumn) {
                                        break;
                                    }

                                    // 拷贝 T 多余的映射点到 M。
                                    const m: Mapping = {
                                        generatedColumn: column,
                                    };
                                    if (targetMapping.sourceIndex != undefined) {
                                        m.sourceIndex = this.addSource(other.sources[targetMapping.sourceIndex]);
                                        m.sourceLine = targetMapping.sourceLine;
                                        m.sourceColumn = targetMapping.sourceColumn;
                                        if (targetMapping.nameIndex != undefined && targetMapping.nameIndex < other.names.length) {
                                            m.nameIndex = this.addName(other.names[targetMapping.nameIndex]!);
                                        }
                                    }
                                    mappings.splice(++i, 0, m);

                                }
                            }
                        }

                        // 更新当前映射信息。
                        const source = other.getSource(mapping.sourceLine!, mapping.sourceColumn!);
                        if (source.sourcePath != undefined) {
                            mapping.sourceIndex = this.addSource(source.sourcePath);
                            if (source.mapping!.sourceIndex! < other.sourcesContent.length) {
                                this.sources[mapping.sourceIndex] = other.sourcesContent[source.mapping!.sourceIndex!];
                            }
                            mapping.sourceLine = source.line;
                            mapping.sourceColumn = source.column;
                            if (source.name != undefined) {
                                mapping.nameIndex = this.addName(source.name);
                            }
                        } else {
                            delete mapping.sourceIndex;
                            delete mapping.sourceLine;
                            delete mapping.sourceColumn;
                            delete mapping.nameIndex;
                        }
                    }
                }
            }
        }

    }

    /**
     * 计算并填充所有行的映射点。
     * @param startLine 开始计算的行号(从 0 开始)。
     * @param endLine 结束计算的行号(从 0 开始)。
     * @desc
     * 由于源映射(版本 3)不支持根据上一行的映射自动推断下一行的映射。
     * 因此在生成源映射时必须手动插入每一行的映射点。
     * 此函数可以根据首行信息自动填充下一行的映射点。
     */
    computeLines(startLine = 0, endLine = this.mappings.length) {
        for (; startLine < endLine; startLine++) {
            const mappings = this.mappings[startLine] || (this.mappings[startLine] = []);
            if (!mappings[0] || mappings[0].generatedColumn > 0) {
                for (let line = startLine; --line >= 0;) {
                    const last = this.mappings[line] && this.mappings[line][0];
                    if (last) {
                        if (last.sourceIndex != undefined) {
                            mappings.unshift({
                                generatedColumn: 0,
                                sourceIndex: last.sourceIndex,
                                sourceLine: last.sourceLine! + startLine - line,
                                sourceColumn: 0
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    // #endregion

}

/**
 * 表示源映射中的一个映射点。
 */
export interface Mapping {

    /**
     * 获取当前生成的列号(从 0 开始)。
     */
    readonly generatedColumn: number;

    /**
     * 获取或设置当前映射点的源文件索引(从 0 开始)。
     */
    sourceIndex?: number;

    /**
     * 获取或设置当前映射点的源文件行号(从 0 开始)。
     */
    sourceLine?: number;

    /**
     * 获取或设置当前映射点的源文件列号(从 0 开始)。
     */
    sourceColumn?: number;

    /**
     * 获取或设置当前映射点的名称索引(从 0 开始)。
     */
    nameIndex?: number;

}

/**
 * 表示一个源位置。
 */
export interface SourceLocation {

    /**
     * 获取相关的映射点。
     */
    mapping?: Mapping;

    /**
     * 获取相关的源文件路径。
     */
    sourcePath?: string;

    /**
     * 获取相关的行号(从 0 开始)。
     */
    line?: number;

    /**
     * 获取相关的列号(从 0 开始)。
     */
    column?: number;

    /**
     * 获取相关的名称。
     */
    name?: string;

}

const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

/**
 * 编码一个 Base64-VLQ 值。
 * @param value 要计算的值。
 * @return 返回已编码的字符串。
 */
function encodeBase64Vlq(value: number) {
    let result = "";
    let vlq = value < 0 ? ((-value) << 1) + 1 : (value << 1);
    do {
        const digit = vlq & 31/*(1<<5)-1*/;
        vlq >>>= 5;
        result += base64Chars[vlq > 0 ? digit | 32/*1<<5*/ : digit];
    } while (vlq > 0);
    return result;
}

/**
 * 解码一个 Base64-VLQ 值。
 * @param value 要计算的值。
 * @param context 解码的上下文对象，存储当前需要解码的位置。解码结束后会更新为下一次需要解码的位置。
 * @return 返回已解码的数值。如果解析错误则返回 NaN。
 */
function decodeBase64Vlq(value: string, context: { index: number }) {
    let vlq = 0;
    let shift = 0;
    do {
        const ch = value.charCodeAt(context.index++);
        var digit = 65/*A*/ <= ch && ch <= 90/*Z*/ ? ch - 65/*A*/ : // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
            97/*a*/ <= ch && ch <= 122/*z*/ ? ch - 71/*'a' - 26*/ : // 26 - 51: abcdefghijklmnopqrstuvwxyz
                48/*0*/ <= ch && ch <= 57/*9*/ ? ch + 4/*'0' - 26*/ : // 52 - 61: 0123456789
                    ch === 43/*+*/ ? 62 : // 62: +
                        ch === 47/*/*/ ? 63 : // 63: /
                            NaN;
        vlq += ((digit & 31/*(1<<5)-1*/) << shift);
        shift += 5;
    } while (digit & 32/*1<<5*/);
    return vlq & 1 ? -(vlq >> 1) : vlq >> 1;
}

/**
 * 在指定内容插入(如果已存在则更新)一个 #sourceMappingURL 注释。
 * @param content 要插入或更新的内容。
 * @param sourceMapUrl 要插入或更新的源映射地址。如果地址为空则删除已存在的注释。
 * @param singleLineComment 插入时如果为 true 则使用单行注释，否则使用多行注释。
 * @return 返回已更新的内容。
 */
export function emitSourceMapUrl(content: string, sourceMapUrl: string | null, singleLineComment?: boolean) {
    let found = false;
    content = content.replace(/(?:\/\*(?:\s*\r?\n(?:\/\/)?)?(?:[#@]\ssourceMappingURL=([^\s'"]*))\s*\*\/|\/\/(?:[#@]\ssourceMappingURL=([^\s'"]*)))\s*/, (_, url1: string, url2: string) => {
        found = true;
        if (sourceMapUrl) {
            return url2 != null ? `//# sourceMappingURL=${sourceMapUrl}` : `/*# sourceMappingURL=${sourceMapUrl} */`;
        }
        return "";
    });
    if (!found && sourceMapUrl) {
        content = appendSourceMapUrl(content, sourceMapUrl, singleLineComment);
    }
    return content;
}

/**
 * 在指定内容末尾插入一个 #sourceMappingURL 注释。
 * @param content 要插入或更新的内容。
 * @param sourceMapUrl 要插入或更新的源映射地址。如果地址为空则删除已存在的注释。
 * @param singleLineComment 插入时如果为 true 则使用单行注释，否则使用多行注释。
 * @return 返回已更新的内容。
 */
export function appendSourceMapUrl(content: string, sourceMapUrl: string, singleLineComment?: boolean) {
    return content + (singleLineComment ? `\n//# sourceMappingURL=${sourceMapUrl}` : `\n/*# sourceMappingURL=${sourceMapUrl} */`);
}
