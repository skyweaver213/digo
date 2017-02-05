/**
 * @file HTTP 服务器
 * @author xuld <xuld@vip.qq.com>
 */
import { EventEmitter } from "events";
import * as http from "http";
import * as nu from "url";

/**
 * 表示一个 Http 服务器。
 */
export class HttpServer extends EventEmitter {

    /**
     * 存储底层 HTTP 服务器。
     */
    private _server = http.createServer(this.processRequest.bind(this))
        .on("listening", this.onStart.bind(this))
        .on("close", this.onStop.bind(this))
        .on("error", this.onError.bind(this));

    /**
     * 判断当前服务器是否正在监听。
     */
    get isListening() { return this._server.listening; }

    /**
     * 获取当前服务器的请求数。
     */
    get connectionCount() { return this._server.connections; }

    /**
     * 获取当前服务器的超时毫秒数。默认为 120000。
     */
    get timeout() { return this._server.timeout; }

    /**
     * 设置当前服务器的超时毫秒数。
     * @param value 要设置的毫秒数。
     */
    set timeout(value) { this._server.timeout = value; }

    /**
     * 获取当前服务器的主页地址。
     */
    get url() {
        const addr = this._server.address() || { address: "0.0.0.0", port: 80 };
        return `http://${addr.address === "0.0.0.0" || addr.address === "::" ? "localhost" : addr.address}${addr.port !== 80 ? ":" + addr.port : ""}${this.virtualPath}`;
    }

    /**
     * 获取当前服务器的虚拟路径。
     */
    virtualPath = "/";

    /**
     * 当服务器启动时回调。
     */
    protected onStart() {
        this.emit("start");
    }

    /**
     * 当服务器停止时回调。
     */
    protected onStop() {
        this.emit("stop");
    }

    /**
     * 当服务器错误时执行。
     * @param e 当前发生的错误。
     */
    protected onError(e: NodeJS.ErrnoException) {
        this.emit("error", e);
    }

    /**
     * 当被子类重写时负责处理所有请求。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     */
    protected processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        this.emit("request", req, res);
    }

    /**
     * 监听指定的地址。
     * @param url 要监听的地址。
     * @param callback 启动完成的回调函数。
     */
    listen(url = "http://0.0.0.0:8080/", callback?: () => void) {
        const urlObject = nu.parse(url);
        this.virtualPath = urlObject.path || this.virtualPath;
        this._server.listen(+urlObject.port! || 0, urlObject.hostname, callback);
    }

    /**
     * 关闭当前服务器。
     * @param callback 关闭的回调函数。
     */
    close(callback?: () => void) {
        this._server.close(callback);
    }

}
