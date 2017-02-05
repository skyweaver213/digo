import { readFile } from '../utility/fs';
/**
 * @file 服务器
 * @author xuld <xuld@vip.qq.com>
 */
import { EventEmitter } from "events";
import * as http from "http";
import * as nu from "url";
import { AsyncCallback } from "../utility/asyncQueue";
import { HttpServer } from "../utility/httpServer";
import { Matcher, Pattern } from "../utility/matcher";
import { getExt, resolvePath } from '../utility/path';
import { asyncQueue, then } from "./async";
import { off, on } from "./events";
import { File } from "./file";
import { error } from "./logging";
import { watch } from "./watch";

/**
 * 表示一个开发服务器。
 */
export class Server extends HttpServer {

    /**
     * 当服务器错误时执行。
     * @param e 当前发生的错误。
     */
    protected onError(e: NodeJS.ErrnoException) {
        if (e.code === "EADDRINUSE" || e.code === "EACCES") {
            const port = /:(\d+)/.exec(e.message);
            if (port) {
                error("Cannot start server: Port {port} is used by other programs.", { port: port[1] });
            } else {
                error(e);
            }
        } else {
            error(e);
        }
    }

    /**
     * 当被子类重写时负责处理所有请求。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     */
    protected processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const path = req.url!.replace(/?#.*$/, "");
        for (const handler of this.handlers) {
            if (handler.matcher.test(path) && handler.process(req, res) === false) {
                return;
            }
        }



    }

    /**
     * 向指定的请求写入文件。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     * @param data 相关的内容。
     */
    writeFile(req: http.IncomingMessage, res: http.ServerResponse, statusCode: number, path: string, data?: string | Buffer) {
        if (data === undefined) {
            readFile(path, (error, data) => {
                this.writeFile(req, res, statusCode, path, data);
            });
            return;
        }
        res.writeHead(statusCode, {
            "Content-Type": this.mimeTypes[getExt(path).toLowerCase()] || this.mimeTypes["*"],
            ...this.headers
        });
    }

    /**
     * 向指定的请求写入错误。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     */
    writeError(req: http.IncomingMessage, res: http.ServerResponse, statusCode: number, path?: string) {
        res.writeHead(statusCode, this.headers);
        res.end(`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${htmlEncode(path || req.url!)}</title>
        </head>
        <body>
            <pre>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${htmlEncode(path || req.url!)}</pre>
        </body>
        </html>`);
    }

    /**
     * 启动服务器。
     * @param options 相关的选项。
     */
    start(options: ServerOptions = {}) {
        this.root = resolvePath(options.root || "");
        this.handlers.length = 0;
        for (const glob in options.handlers!) {
            this.handlers.push({
                matcher: new Matcher(glob),
                process: this.handlers[glob]
            });
        }
        then(done => {
            this.listen(undefined, done);
        });
        if (options.task) {
            on("fileSave", this.setFile = this.setFile.bind(this));
            watch(options.task);
        }
    }

    /**
     * 关闭当前服务器。
     * @param callback 关闭的回调函数。
     */
    close(callback?: () => void) {
        off("fileSave", this.setFile);
        super.close(callback);
    }

    /**
     * 当文件更新后隐藏当前文件。
     */
    setFile(file: File) {
        if (file.destPath && file.loaded) {
            this.files[file.destPath] = file.data;
        }
    }

    /**
     * 存储所有文件的内容。
     */
    readonly files: { [path: string]: string | Buffer; } = { __proto__: null! };

    /**
     * 获取或设置当前服务器的物理根路径。
     */
    root: string;

    /**
     * 获取各扩展名的默认 MIME 类型。
     */
    mimeTypes: { [key: string]: string; } = {
        ".html": "text/html",
        ".htm": "text/html",
        ".css": "text/css",
        ".less": "text/css",
        ".js": "text/javascript",
        ".jsx": "text/javascript",
        ".txt": "text/plain",
        ".text": "text/plain",
        ".xml": "text/xml",
        ".json": "application/json",
        ".map": "application/json",

        ".bmp": "image/bmp",
        ".png": "image/png",
        ".jpg": "image/jpg",
        ".jpeg": "image/jpeg",
        ".jpe": "image/jpeg",
        ".gif": "image/gif",
        ".fax": "image/fax",
        ".jfif": "image/jpeg",
        ".webp": "image/webp",
        ".wbmp": "image/vnd.wap.wbmp",
        ".ico": "image/icon",

        ".eot": "application/vnd.ms-fontobject",
        ".woff": "application/x-font-woff",
        ".woff2": "application/font-woff",
        ".svg": "image/svg+xml",
        ".swf": "application/x-shockwave-flash",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".ttf": "application/octet-stream",
        ".cur": "application/octet-stream",
    };

    /**
     * 获取自动插入的 HTTP 头。
     */
    headers: { [key: string]: string; } = {
        Server: "digo"
    };

    /**
     * 获取默认首页。
     */
    defaultPages: { [key: string]: string; } = {};

    /**
     * 获取所有处理器。
     */
    handlers: { matcher: Matcher, process(req: http.ServerRequest, res: http.ServerResponse): boolean | void }[] = [];

}

/**
 * 表示服务器选项。
 */
export interface ServerOptions {

    /**
     * 所有文件的根目录。
     */
    root?: string;

    /**
     * 当前绑定的任务。
     */
    task?: AsyncCallback;

    /**
     * 所有处理器。
     */
    handlers?: { [glob: string]: ((req: http.ServerRequest, res: http.ServerResponse) => boolean | void) | string; };

    /**
     * 所有插件。
     */
    plugins?: (((server: Server) => void) | string)[];

}

/**
 * 获取或设置当前的开发服务器。
 */
export var server: Server | null = null;

/**
 * 启动开发服务器。
 * @param options 服务器配置。
 * @return 返回服务器对象。
 */
export function startServer(options: ServerOptions) {
    if (server) {
        server.close();
    }
    server = new Server();
    server.start(options);
    return server;
}

/**
 * 将对象的字符串表示形式转换为 HTML 编码的字符串，并返回编码的字符串。
 * @param value 要编码的字符串。
 * @returns 一个已编码的字符串。
 */
export function htmlEncode(value: string) {
    return value.replace(/[&><"]/g, m => ({
        "&": "&amp;",
        ">": "&gt;",
        "<": "&lt;",
        '"': "&quot;"
    })[m]);
};
