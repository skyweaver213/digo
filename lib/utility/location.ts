/**
 * @file 行列号计算
 * @author xuld<xuld@vip.qq.com>
 */

/**
 * 表示一个行列位置。
 */
export interface Location {

    /**
     * 获取当前位置的行号(从 0 开始)。
     */
    line: number;

    /**
     * 获取当前位置的列号(从 0 开始)。
     */
    column: number;

}

/**
 * 计算指定索引对应的行列号。
 * @param value 要处理的字符串。
 * @param index 要计算的索引。
 * @param cache 如果提供一个缓存对象则存放一个索引数据以加速检索。
 * @return 返回对应的行列号。如果索引错误则返回 0,0 位置。
 */
export function indexToLocation(value: string, index: number, cache?: { index?: number[] }) {
    if (index > 0) {
        const indexObj = buildIndex(value, cache);
        let cursor = indexObj.cursor || 0;
        while (indexObj[cursor] <= index) cursor++;
        while (cursor >= indexObj.length || indexObj[cursor] > index) cursor--;
        indexObj.cursor = cursor;
        return { line: cursor, column: index - indexObj[cursor] } as Location;
    }
    return { line: 0, column: 0 } as Location;
}

/**
 * 计算指定行列号对应的索引。
 * @param value 要处理的字符串。
 * @param loc 要计算的行列号。
 * @param cache 如果提供一个缓存对象则存放一个索引数据以加速检索。
 * @return 返回对应的索引。如果行列号错误则返回 0。
 */
export function locationToIndex(value: string, location: Location, cache?: { index?: number[] }) {
    if (location.line < 0) {
        return 0;
    }
    const indexObj = buildIndex(value, cache);
    if (location.line < indexObj.length) {
        return Math.min(Math.max(0, indexObj[location.line] + location.column), value.length);
    }
    return value.length;
}

/**
 * 生成索引缓存对象。
 * @param value 要处理的字符串。
 * @param cache 已存在的缓存对象。
 * @return 返回包含每行第一个字符索引的数组。
 */
function buildIndex(value: string, cache?: { index?: number[] & { cursor?: number; } }) {
    if (cache && cache.index) {
        return cache.index;
    }
    const result = [0] as number[] & { cursor?: number; };
    for (let i = 0; i < value.length; i++) {
        let ch = value.charCodeAt(i);
        if (ch === 13/*\r*/) {
            if (value.charCodeAt(i + 1) === 10/*\n*/) {
                i++;
            }
            ch = 10;
        }
        if (ch === 10/*\n*/) {
            result.push(i + 1);
        }
    }
    if (cache) {
        cache.index = result;
    }
    return result;
}
