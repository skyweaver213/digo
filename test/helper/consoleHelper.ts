/**
 * @file 测试时使用的控制台工具函数
 * @author xuld@vip.qq.com
 */

/**
 * 在拦截控制台输出的模式下执行函数。
 * @param func 要执行的函数。
 */
export function redirectOutput(func: (outputs: string[], done: () => void) => any) {
    const outputs: string[] = [];
    const oldStdoutWrite = (process.stdout as any).__proto__.write;
    const oldStdErrorWrite = (process.stderr as any).__proto__.write;
    (process.stderr as any).__proto__.write = (process.stdout as any).__proto__.write = function (buffer, cb1?, cb2?) {
        if (buffer && buffer.length) {
            outputs.push(buffer.toString());
        }
        if (typeof cb1 === "function") {
            cb1();
        }
        if (typeof cb2 === "function") {
            cb2();
        }
        return true;
    };
    const restore = () => {
        (process.stdout as any).__proto__.write = oldStdoutWrite;
        (process.stderr as any).__proto__.write = oldStdErrorWrite;
    };
    if (func.length <= 1) {
        try {
            return (func as Function)(outputs);
        } finally {
            restore();
        }
    } else {
        try {
            return func(outputs, restore);
        } catch (e) {
            restore();
            throw e;
        }
    }
}
