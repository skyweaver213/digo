
exports.build = function () {
    return exports.compile() && exports.test();
};

exports.compile = function () {
    return exec("tsc -p tsconfig.json");
};

exports.watch = function () {
    return exec("tsc -p tsconfig.json -w");
};

exports.test = function () {
    var file = openedFile()
        .replace(/^lib\/(.*)\.ts$/, "_build/test/$1Test.js")
        .replace(/^test\/(.*)Test\.ts$/, "_build/test/$1Test.js");
    if (!/^_build\/test\//.test(file)) {
        file = "_build/test/**/*Test.js";
    }
    require("source-map-support/register");
    process.argv = [process.argv[0], process.argv[1], file, "--cwd", "test", "--ui", "exports", "--colors", "--no-timeouts", "--full-trace"];
    require("mocha/bin/_mocha");
    return true;
};

exports.coverage = function () {
    return exports.compile() && exec("istanbul cover --dir _coverage node_modules/mocha/bin/_mocha _build/test/**/*Test.js -- --cwd test --ui exports --colors");
};

exports.coveralls = function () {
    return exec("istanbul cover --report lcovonly --dir _coverage node_modules/mocha/bin/_mocha _build/test/**/*Test.js -- --cwd test --ui exports") &&
        exec("coveralls < ./_coverage/lcov.info") &&
        del("_coverage");
};

exports.dist = function () {
    del("_dist");
    var tsconfig = require("./tsconfig");
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.sourceMap = false;
    tsconfig.compilerOptions.outDir = "_dist";
    tsconfig.compilerOptions.declaration = true;
    tsconfig.exclude = tsconfig.exclude || [];
    tsconfig.exclude.push("test");

    var fs = require("fs");
    fs.writeFileSync("_tsconfig_dist.json", JSON.stringify(tsconfig));
    try {
        if (!exec("tsc -p _tsconfig_dist.json")) {
            return false;
        }
        del("_dist/bin/digo.d.ts");
        del("_dist/lib/digo.js");
    } finally {
        del("_tsconfig_dist.json");
    }

    var package = JSON.parse(fs.readFileSync("package.json"));
    package.bin.digo = package.bin.digo.replace("_build/", "");
    package.main = package.main.replace("_build/", "");
    package.typings = package.typings.replace(".ts", ".d.ts");
    delete package.scripts;
    delete package.engines.npm;
    delete package.dependencies["@types/node"];
    delete package.dependencies["@types/mocha"];
    delete package.dependencies["typescript"];
    delete package.devDependencies;
    fs.writeFileSync("_dist/package.json", JSON.stringify(package, null, 2));

    copy("README.md", "_dist/README.md");
    copy("LICENSE", "_dist/LICENSE");

    require("./_dist/");
    return true;
};

exports.install = function () {
    return exports.dist() && exec("npm install . -g", { cwd: "_dist" });
};

exports.publish = function () {
    if (exports.dist()) {
        exec("npm publish", { cwd: "_dist" });
        var fs = require("fs");
        var package = JSON.parse(fs.readFileSync("package.json"));
        package.version = package.version.replace(/(\d+\.\d+\.)(\d+)/, function (_, prefix, postfix) {
            return prefix + (+postfix + 1);
        });
        fs.writeFileSync("package.json", JSON.stringify(package, null, 2));
    }
};

exports.doc = function () {
    exec("typedoc . --mode file --out _doc -p tsconfig.json --excludeNotExported --excludePrivate --ignoreCompilerErrors --exclude **/node_modules --excludeExternals --exclude **/test/**/*");
};

exports.clean = function () {
    del("_build");
    del("_coverage");
    del("_dist");
    del("_doc");
};

exports.default = exports.build;

function exec(command, options) {
    command = command.replace(/^tsc\b/g, "node node_modules/typescript/bin/tsc")
        .replace(/^mocha\b/g, "node node_modules/mocha/bin/mocha.js")
        .replace(/^istanbul\b/g, "node node_modules/istanbul/lib/cli.js")
        .replace(/^coveralls\b/g, "node node_modules/coveralls/bin/coveralls.js")
        .replace(/^typedoc\b/g, "node node_modules/typedoc/bin/typedoc")
        .replace(/^node\b/g, '"' + process.execPath + '"')
        .replace(/\bnode_modules\/(\S+)/g, function (all, modulePath) {
            return '"' + require.resolve(modulePath) + '"';
        });
    try {
        require("child_process").execSync(command, options);
    } catch (e) {
        if (e.stdout && e.stdout.length) {
            console.log(e.stdout.toString().trim());
        }
        if (e.stderr && e.stderr.length) {
            console.error(e.stderr.toString().trim());
        }
        return e.status === 0;
    }
    return true;
}

function openedFile() {
    var file = process.argv[3];
    return file ? require("path").relative("", file).replace(/\\/g, "/") : "";
}

function copy(from, to) {
    var fs = require("fs");
    fs.writeFileSync(to, fs.readFileSync(from));
}

function del(path) {
    var fs = require("fs");
    try {
        fs.unlinkSync(path);
    } catch (e) { }
    try {
        fs.readdirSync(path).forEach(name => {
            del(path + "/" + name);
        });
    } catch (e) { }
    try {
        fs.rmdirSync(path);
    } catch (e) { }
}

if (process.mainModule === module) {
    exports[process.argv[2] || "default"]();
}
