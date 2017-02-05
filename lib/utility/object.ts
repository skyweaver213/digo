/**
 * @file 对象处理
 * @author xuld <xuld@vip.qq.com>
 */

/**
 * 设置一个对象的属性值。
 * @param obj 要修改的对象。
 * @param key 要设置的属性名。
 * @param value 要设置的属性值。
 * @return 返回已修改的对象。
 * @example setProperty({myKey: "oldValue"}, "myKey", "newValue")
 */
export function setProperty<T>(obj: T, key: keyof T, value: any) {
    return Object.defineProperty(obj, key, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    }) as T;
}

/**
 * 添加一个对象成员函数的回调函数。
 * @param obj 要修改的对象。
 * @param key 要添加的属性名。
 * @param callback 要添加的回调函数。
 * @example
 * var obj = { func: function() { console.log(1); } };
 * addCallback(obj, "func", function() { console.log(2); } )
 * obj.func(); // 输出 1, 2
 */
export function addCallback<T extends any>(obj: T, key: keyof T, callback: Function) {
    const oldFunc = obj[key] as Function;
    obj[key] = oldFunc ? function () {
        const oldResult = oldFunc.apply(this, arguments);
        const newResult = callback.apply(this, arguments);
        return oldResult !== undefined ? oldResult : newResult;
    } : callback;
}
