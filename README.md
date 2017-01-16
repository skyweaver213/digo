digo
==============================
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]
[![Gitter chat][gitter-image]][gitter-url]

digo 是一个基于规则流程的自动化构建引擎。

您只需简单地定义一些构建的规则流程，立享自动化发布的快感。

通过插件，digo 可以为项目提供代码预编译、模块依赖打包、压缩优化等构建功能。

下载和安装
-------------------------------
```bash
$ npm install digo -g
```

> 如果安装失败，请[参考这里](https://github.com/digojs/digo/wiki/常见问题#安装失败)。

快速上手
-------------------------------
### 1. 在项目根目录下新建名为 `digofile.js` 的文件：
```js
var digo = require("digo");

exports.hello = function() {
    digo.src("*.txt")
        .pipe(function(file) { 
            file.content += "哈哈"; 
        })
        .dest("_out");
};
```

### 2. digo 一下:
```bash
$ digo hello
```
执行后项目内所有 `*.txt` 文件都会拷贝到 `_out` 目录，且末尾追加了“哈哈”。

> 如果执行报错[参考这里](https://github.com/digojs/digo/wiki/常见问题#执行失败)。

更多资料
-------------------------------
- [如何：使用 digo 构建 Web 前端项目](https://github.com/digojs/digo/wiki/如何使用%20digo%20构建%20Web%20前端项目)
- [如何：使用 digo 构建 Node + TypeScript 项目](https://github.com/digojs/digo/wiki/如何使用%20digo%20构建%20Node%20+%2TypeScript%2项目)
- [digofile.js 通用模板下载](https://github.com/digojs/digofiles#digofiles)
- [搜索插件](https://github.com/digojs/plugins#plugins)
- [API 文档](https://github.com/digojs/digo/wiki/API)：[digo.src](https://github.com/digojs/digo/wiki/API#digosrcpatterns)、[digo.watch](https://github.com/digojs/digo/wiki/API#digowatchtask)、[digo.then](https://github.com/digojs/digo/wiki/API#digothencallbacks)、[完整 API 文档](https://digojs.github.com/api)
- [digo vs gulp & webpack](https://github.com/digojs/digo/wiki/工具比较)
- [更多文档](https://github.com/digojs/digo/wiki)

支持我们
-------------------------------
社区支持始终是国内开源项目的硬伤。

我们忠心地希望得到您的支持，如果您觉得这个项目不错，请点击右上角的关注。

或者您还可以通过以下方式支持我们:

- [提交需求](https://github.com/digo/digo/issues/new)
- [报告 BUG](https://github.com/digo/digo/issues/new)
- [共享一个插件](https://github.com/digojs/digo/wiki/编写插件#共享你的插件)

[npm-url]: https://www.npmjs.com/package/digo
[npm-image]: https://img.shields.io/npm/v/digo.svg
[downloads-image]: https://img.shields.io/npm/dm/digo.svg
[downloads-url]: http://badge.fury.io/js/digo
[travis-url]: https://travis-ci.org/digojs/digo
[travis-image]: https://img.shields.io/travis/digojs/digo.svg
[coveralls-url]: https://coveralls.io/github/digojs/digo
[coveralls-image]: https://img.shields.io/coveralls/digojs/digo/master.svg
[gitter-url]: https://gitter.im/digojs/digo
[gitter-image]: https://img.shields.io/badge/gitter-digo%2Fdigo-brightgreen.svg
