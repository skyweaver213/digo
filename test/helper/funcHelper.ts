/**
 * @file 测试时使用的调用工具函数
 * @author xuld@vip.qq.com
 */
import * as assert from "assert";

/**
 * 返回一个函数，仅在指定的执行次数调用原函数。
 * @param func 要执行的函数。
 * @param count 总执行的次数。
 */
export function skip(func: Function, count: number) {
    return function () {
        if (--count < 1) {
            assert.ok(count === 0, "skip(): Max call count exceeds.");
            return func.apply(this, arguments);
        }
    };
}

/**
 * 返回一个函数，根据执行的次数分别调用对应索引的函数。
 * @param funcs 要执行的所有函数。
 */
export function step(...funcs: Function[]) {
    let count = -1;
    return function () {
        count++;
        assert.ok(funcs[count], "step(): Max call count exceeds.");
        return funcs[count].apply(this, arguments);
    };
}
