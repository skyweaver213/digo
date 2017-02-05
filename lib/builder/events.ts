/**
 * @file 事件
 * @author xuld <xuld@vip.qq.com>
 */
import { EventEmitter } from "events";

/**
 * 获取全局事件处理器。
 */
export const events = new EventEmitter();

/**
 * 绑定一个事件。
 * @param event 要绑定的事件名。
 * @param listener 要绑定的事件监听器。
 */
export function on(event: string | symbol, listener: Function) {
    events.addListener(event, listener);
}

/**
 * 解绑一个或多个事件。
 * @param event 要解绑的事件名。如果不传递则解绑所有事件。
 * @param listener 要解绑的事件监听器。如果不传递则解绑所有监听器。
 */
export function off(event?: string | symbol, listener?: Function) {
    if (listener) {
        events.removeListener(event!, listener);
    } else if (event) {
        events.removeAllListeners(event);
    } else {
        for (const event of events.eventNames()) {
            events.removeAllListeners(event);
        }
    }
}

/**
 * 触发一个事件。
 * @param event 要触发的事件名。
 * @param args 传递给监听器的参数列表。
 */
export function emit(event: string | symbol, ...args: any[]) {
    events.emit(event, ...args);
}
