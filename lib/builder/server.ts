/**
 * @file 服务器
 * @author xuld <xuld@vip.qq.com>
 */
import { EventEmitter } from "events";
import * as http from "http";
import * as nu from "url";
import { stringToBuffer } from "../utility/encode";
import { AsyncCallback } from "../utility/asyncQueue";
import { HttpServer } from "../utility/httpServer";
import { Matcher, Pattern } from "../utility/matcher";
import { getExt, resolvePath, inDir, relativePath, pathEquals } from '../utility/path';
import { readFile, getStat, readDir } from '../utility/fs';
import { asyncQueue, then } from "./async";
import { off, on } from "./events";
import * as file from "./file";
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
     * 是否允许服务器跨域。
     */
    crossOrigin = true;

    getCoressOriginHeaders(req: http.IncomingMessage) {
        return {
            "Access-Control-Allow-Origin": req.headers["Origin"] || "*",
            "Access-Control-Allow-Methods": req.headers["Access-Control-Request-Method"] || "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": req.headers["Access-Control-Request-Headers"] || "X-Requested-With"
        };
    }

    /**
     * 当被子类重写时负责处理所有请求。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     */
    protected processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        if (this.crossOrigin && req.method === "OPTIONS") {
            res.writeHead(200, this.getCoressOriginHeaders(req));
            res.end();
            return;
        }

        const queryIndex = req.url!.search(/[#\?]/);
        const url = queryIndex < 0 ? req.url! : req.url!.substr(0, queryIndex);
        for (const handler of this.handlers) {
            if (handler.matcher.test(url) && handler.process(req, res) === false) {
                return;
            }
        }

        const path = this.urlToPath(url);
        if (path === null) {
            this.writeError(req, res, 400, url);
            return;
        }

        getStat(path, (error, stats) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this.writeError(req, res, 404, path);
                } else if (error.code === "EPERM") {
                    this.writeError(req, res, 403, path);
                } else {
                    this.writeError(req, res, 400, path);
                }
            } else if (stats.isDirectory()) {
                // 修复 /path/to 为 /path/to/
                if (url.charCodeAt(url.length - 1) !== 47/*/*/) {
                    const newUrl = url + "/" + (queryIndex > 0 ? req.url!.substr(queryIndex) : "");
                    res.writeHead(302, {
                        Location: newUrl,
                        ...(this.crossOrigin ? this.getCoressOriginHeaders(req) : {}),
                        ...this.headers
                    });
                    res.end(`Object Moved To <a herf="${newUrl}">${newUrl}</a>`);
                } else {
                    const checkDefaultPage = (index: number) => {
                        if (index < this.defaultPages.length) {
                            const defaultPage = path + this.defaultPages[index];
                            readFile(defaultPage, (error, data) => {
                                if (error) {
                                    if (error.code === "ENOENT") {
                                        checkDefaultPage(index + 1);
                                    } else {
                                        this.writeFile(req, res, 400, defaultPage);
                                    }
                                } else {
                                    this.writeFile(req, res, 200, defaultPage, data);
                                }
                            });
                        } else {
                            this.writeDir(req, res, path);
                        }
                    };
                    checkDefaultPage(0);
                }
            } else {
                this.writeFile(req, res, 200, path);
            }
        });
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
        // const preset = this.files[path.toLowerCase()];
        // if (preset !== undefined) {
        //     data = preset;
        // } else
        if (data === undefined) {
            readFile(path, (error, data) => {
                this.writeFile(req, res, statusCode, path, data);
            });
            return;
        }
        if (typeof data === "string") {
            data = stringToBuffer(data);
        }
        res.writeHead(statusCode, {
            "Content-Type": this.mimeTypes[getExt(path).toLowerCase()] || this.mimeTypes["*"],
            "Content-Length": data.length,
            ...(this.crossOrigin ? this.getCoressOriginHeaders(req) : {}),
            ...this.headers
        });
        res.end(data);
    }

    /**
     * 向指定的请求写入目录。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     * @param data 相关的内容。
     */
    writeDir(req: http.IncomingMessage, res: http.ServerResponse, path: string) {
        readDir(path, (error, entries) => {
            if (error) {
                this.writeError(req, res, 400, path);
            } else {
                let pending = entries.length;
                const dirs: string[] = [];
                const files: string[] = [];
                const done = () => {

                    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${encodeHTML(path)}</title>
    <style>
        body {
            font-family: Courier New;
            line-height: 135%;
        }
        ul {
            list-style: none;
        }
    </style>
</head>
<body>
    <h1>${encodeHTML(path)}</h1>
    <ul>`;
                    if (!pathEquals(path, this.root)) {
                        html += `       <li><a href="../">../</a></li>\n`;
                    }

                    dirs.sort();
                    for (const dir of dirs) {
                        html += `       <li><a href="${dir}/">${dir}/</a></li>\n`;
                    }

                    files.sort();
                    for (const file of files) {
                        html += `       <li><a href="${file}">${file}</a></li>\n`;
                    }

                    html += `
    </ul>
</body>
</html>`;

                    const buffer = stringToBuffer(html);

                    res.writeHead(200, {
                        "Content-Type": "text/html",
                        "Content-Length": buffer.length,
                        ...(this.crossOrigin ? this.getCoressOriginHeaders(req) : {}),
                        ...this.headers
                    });

                    res.end(buffer);
                };
                if (pending) {
                    for (const entry of entries) {
                        getStat(path + "/" + entry, (error, stats) => {
                            if (!error && stats.isDirectory()) {
                                dirs.push(entry);
                            } else {
                                files.push(entry);
                            }
                            if (--pending < 1) {
                                done();
                            }
                        });
                    }
                } else {
                    done();
                }
            }
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
            <title>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${encodeHTML(path || req.url!)}</title>
        </head>
        <body>
            <pre>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${encodeHTML(path || req.url!)}</pre>
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
            (file as any).saveFile = this.saveFile.bind(this);
            watch(options.task);
        }
    }

    /**
     * 关闭当前服务器。
     * @param callback 关闭的回调函数。
     */
    close(callback?: () => void) {
        delete (file as any).saveFile;
        super.close(callback);
    }

    /**
     * 存储所有文件的内容。
     */
    readonly files: { [path: string]: Buffer; } = { __proto__: null! };

    /**
     * 当文件更新后隐藏当前文件。
     * @param path 当前写入的文件路径。
     * @param buffer 当前写入的文件内容。
     */
    saveFile(path: string, buffer: Buffer | null) {
        if (buffer === null) {
            delete this.files[path];
        } else {
            this.files[path] = buffer;
        }
    }

    /**
     * 获取或设置当前服务器的物理根路径。
     */
    root: string;

    /**
     * 将指定的物理路径转为网址。
     * @param path 要转换的物理路径。
     * @return 返回网址。如果转换失败则返回 null。
     */
    pathToUrl(path: string) {
        if (!inDir(this.root, path)) {
            return "";
        }
        path = relativePath(this.root, path);
        if (path == ".") path = "";
        return this.url + path;
    }

    /**
     * 将指定的地址转为物理路径。
     * @param url 要转换的网址。
     * @return 返回物理路径。如果转换失败则返回 null。
     */
    urlToPath(url: string) {
        if (!url.toLowerCase().startsWith(this.virtualPath.toLowerCase())) {
            return null;
        }
        return resolvePath(this.root, url.substr(this.virtualPath.length));
    }

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
        Server: "digo-dev-server/0.1"
    };

    /**
     * 获取默认首页。
     */
    defaultPages: string[] = [];

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
export function encodeHTML(value: string) {
    return value.replace(/[&><"]/g, m => ({
        "&": "&amp;",
        ">": "&gt;",
        "<": "&lt;",
        '"': "&quot;"
    })[m]);
};
