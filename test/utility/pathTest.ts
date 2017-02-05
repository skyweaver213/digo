﻿import * as assert from "assert";
import * as np from "path";
import * as path from "../../lib/utility/path";

export namespace pathTest {

    export function resolvePathTest() {
        assert.equal(path.resolvePath(""), process.cwd());
        assert.equal(path.resolvePath("."), process.cwd());
        assert.equal(path.resolvePath("goo/.."), process.cwd());
        assert.equal(path.resolvePath(".foo"), process.cwd() + np.sep + ".foo");
        assert.equal(path.resolvePath("foo"), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("goo/../foo/goo.txt"), process.cwd() + np.sep + "foo" + np.sep + "goo.txt");

        assert.equal(path.resolvePath("./"), process.cwd());
        assert.equal(path.resolvePath("goo/../"), process.cwd());
        assert.equal(path.resolvePath(".foo/"), process.cwd() + np.sep + ".foo");
        assert.equal(path.resolvePath("foo/"), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("goo/../foo/goo.txt/"), process.cwd() + np.sep + "foo" + np.sep + "goo.txt");

        assert.equal(path.resolvePath("", ""), process.cwd());
        assert.equal(path.resolvePath("", "."), process.cwd());
        assert.equal(path.resolvePath("", "goo/.."), process.cwd());
        assert.equal(path.resolvePath("", ".foo"), process.cwd() + np.sep + ".foo");
        assert.equal(path.resolvePath("", "foo"), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("", "goo/../foo/goo.txt"), process.cwd() + np.sep + "foo" + np.sep + "goo.txt");

        assert.equal(path.resolvePath(".", ""), process.cwd());
        assert.equal(path.resolvePath(".", "."), process.cwd());
        assert.equal(path.resolvePath(".", "goo/.."), process.cwd());
        assert.equal(path.resolvePath(".", ".foo"), process.cwd() + np.sep + ".foo");
        assert.equal(path.resolvePath(".", "foo"), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath(".", "goo/../foo/goo.txt"), process.cwd() + np.sep + "foo" + np.sep + "goo.txt");

        assert.equal(path.resolvePath("./", ""), process.cwd());
        assert.equal(path.resolvePath("./", "."), process.cwd());
        assert.equal(path.resolvePath("./", "goo/.."), process.cwd());
        assert.equal(path.resolvePath("./", ".foo"), process.cwd() + np.sep + ".foo");
        assert.equal(path.resolvePath("./", "foo"), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("./", "goo/../foo/goo.txt"), process.cwd() + np.sep + "foo" + np.sep + "goo.txt");

        assert.equal(path.resolvePath("foo", ""), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("foo", "."), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("foo", ".."), process.cwd());
        assert.equal(path.resolvePath("foo", ".goo"), process.cwd() + np.sep + "foo" + np.sep + ".goo");
        assert.equal(path.resolvePath("foo", "goo"), process.cwd() + np.sep + "foo" + np.sep + "goo");
        assert.equal(path.resolvePath("foo", "../goo/hoo.txt"), process.cwd() + np.sep + "goo" + np.sep + "hoo.txt");

        assert.equal(path.resolvePath("foo/", ""), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("foo/", "."), process.cwd() + np.sep + "foo");
        assert.equal(path.resolvePath("foo/", ".."), process.cwd());
        assert.equal(path.resolvePath("foo/", ".goo"), process.cwd() + np.sep + "foo" + np.sep + ".goo");
        assert.equal(path.resolvePath("foo/", "goo"), process.cwd() + np.sep + "foo" + np.sep + "goo");
        assert.equal(path.resolvePath("foo/", "../goo/hoo.txt"), process.cwd() + np.sep + "goo" + np.sep + "hoo.txt");

        assert.equal(path.resolvePath("goo/../foo/goo", "../hoo/koo"), process.cwd() + np.sep + "foo" + np.sep + "hoo" + np.sep + "koo");
        assert.equal(path.resolvePath("goo/../foo/goo/", "../hoo/koo/"), process.cwd() + np.sep + "foo" + np.sep + "hoo" + np.sep + "koo");
        assert.equal(path.resolvePath("goo/../foo/goo.txt", "../hoo/koo.txt"), process.cwd() + np.sep + "foo" + np.sep + "hoo" + np.sep + "koo.txt");

        if (np.sep === "\\") {
            assert.equal(path.resolvePath("C:\\Windows\\System32", "b"), "C:\\Windows\\System32\\b");
            assert.equal(path.resolvePath("C:\\Windows\\System32\\", "b"), "C:\\Windows\\System32\\b");
            assert.equal(path.resolvePath("C:\\Windows/System32", "b\\d"), "C:\\Windows\\System32\\b\\d");
            assert.equal(path.resolvePath("C:\\Windows/System32", "../abc/d"), "C:\\Windows\\abc\\d");
            assert.equal(path.resolvePath("d:/root/", "c:/../a"), "c:\\a");
            assert.equal(path.resolvePath("d:\\a/b\\c/d", ""), "d:\\a\\b\\c\\d");
            assert.equal(path.resolvePath("c:/ignore", "c:/some/file"), "c:\\some\\file");
            assert.equal(path.resolvePath("\\\\server\\root", "relative\\"), "\\\\server\\root\\relative");
        }
    }

    export function relativePathTest() {
        assert.equal(path.relativePath("", ""), "");
        assert.equal(path.relativePath("", "."), "");
        assert.equal(path.relativePath("", ".."), "..");
        assert.equal(path.relativePath("", ".foo"), ".foo");
        assert.equal(path.relativePath("", "foo"), "foo");
        assert.equal(path.relativePath("", "../foo/goo.txt"), "../foo/goo.txt");

        assert.equal(path.relativePath(".", ""), "");
        assert.equal(path.relativePath(".", "."), "");
        assert.equal(path.relativePath(".", ".."), "..");
        assert.equal(path.relativePath(".", ".foo"), ".foo");
        assert.equal(path.relativePath(".", "foo"), "foo");
        assert.equal(path.relativePath(".", "../foo/goo.txt"), "../foo/goo.txt");

        assert.equal(path.relativePath(".", ""), "");
        assert.equal(path.relativePath(".", "./"), "");
        assert.equal(path.relativePath(".", "../"), "..");
        assert.equal(path.relativePath(".", ".foo/"), ".foo");
        assert.equal(path.relativePath(".", "foo/"), "foo");
        assert.equal(path.relativePath(".", "../foo/goo.txt/"), "../foo/goo.txt");

        assert.equal(path.relativePath("./", ""), "");
        assert.equal(path.relativePath("./", "./"), "");
        assert.equal(path.relativePath("./", "../"), "..");
        assert.equal(path.relativePath("./", ".foo/"), ".foo");
        assert.equal(path.relativePath("./", "foo/"), "foo");
        assert.equal(path.relativePath("./", "../foo/goo.txt/"), "../foo/goo.txt");

        assert.equal(path.relativePath("foo", "foo"), "");
        assert.equal(path.relativePath("foo", "foo2"), "../foo2");
        assert.equal(path.relativePath("foo", "../foo/goo"), "../../foo/goo");
        assert.equal(path.relativePath("foo/goo", "foo/goo"), "");
        assert.equal(path.relativePath("foo/goo", "foo/goo/hoo/koo.txt"), "hoo/koo.txt");

        assert.equal(path.relativePath("foo/", "foo"), "");
        assert.equal(path.relativePath("foo/", "foo2"), "../foo2");
        assert.equal(path.relativePath("foo/", "../foo/goo"), "../../foo/goo");
        assert.equal(path.relativePath("foo/goo/", "foo/goo"), "");
        assert.equal(path.relativePath("foo/goo/", "foo/goo/hoo/koo.txt"), "hoo/koo.txt");

        assert.equal(path.relativePath("foo/", "foo/"), "");
        assert.equal(path.relativePath("foo/", "foo2/"), "../foo2");
        assert.equal(path.relativePath("foo/", "../foo/goo/"), "../../foo/goo");
        assert.equal(path.relativePath("foo/goo/", "foo/goo/"), "");
        assert.equal(path.relativePath("foo/goo/", "foo/goo/hoo/koo.txt/"), "hoo/koo.txt");

        assert.equal(path.relativePath(np.resolve("foo/goo.txt")), "foo/goo.txt");
        assert.equal(path.relativePath(np.resolve("../foo/goo.txt")), "../foo/goo.txt");
        assert.equal(path.relativePath(process.cwd(), np.resolve("foo/goo.txt")), "foo/goo.txt");
    }

    export function normalizePathTest() {
        assert.equal(path.normalizePath(""), ".");
        assert.equal(path.normalizePath("."), ".");
        assert.equal(path.normalizePath("./"), "./");
        assert.equal(path.normalizePath(".foo"), ".foo");
        assert.equal(path.normalizePath(".."), "..");
        assert.equal(path.normalizePath("../"), "../");
        assert.equal(path.normalizePath("foo.js"), "foo.js");
        assert.equal(path.normalizePath("./foo.js"), "foo.js");
        assert.equal(path.normalizePath("/foo.js"), "/foo.js");
        assert.equal(path.normalizePath("foo/../goo.js"), "goo.js");
        assert.equal(path.normalizePath("/foo/../goo.js"), "/goo.js");
        assert.equal(path.normalizePath("**/*.js"), "**/*.js");
        assert.equal(path.normalizePath("./**/*.js"), "**/*.js");
        assert.equal(path.normalizePath("./fixtures///d/../b/c.js"), "fixtures/b/c.js");
        assert.equal(path.normalizePath("/foo/../../../bar"), "/bar");
        assert.equal(path.normalizePath("foo//goo//../koo"), "foo/koo");
        assert.equal(path.normalizePath("foo//goo//./koo"), "foo/goo/koo");
        assert.equal(path.normalizePath("foo//goo//."), "foo/goo");
        assert.equal(path.normalizePath("foo//goo//.//"), "foo/goo/");
        assert.equal(path.normalizePath("/a/b/c/../../../x/y/z"), "/x/y/z");
        assert.equal(path.normalizePath("a/b/c/../../../x/y/z"), "x/y/z");

        if (np.sep === "\\") {
            assert.equal(path.normalizePath("c:/../a/b/c"), "c:/a/b/c");
            assert.equal(path.normalizePath("c:../a/b/c"), "c:../a/b/c");
            assert.equal(path.normalizePath("C:\\Windows\\System32"), "C:/Windows/System32");
        }
    }

    export function isAbsolutePathTest() {
        assert.equal(path.isAbsolutePath("/"), true);
        assert.equal(path.isAbsolutePath("directory/directory"), false);
        assert.equal(path.isAbsolutePath("directory\directory"), false);
        assert.equal(path.isAbsolutePath("/home/foo"), true);
        assert.equal(path.isAbsolutePath("/home/foo/.."), true);
        assert.equal(path.isAbsolutePath("bar/"), false);
        assert.equal(path.isAbsolutePath("./baz"), false);

        if (np.sep === "\\") {
            assert.equal(path.isAbsolutePath("//"), true);
            assert.equal(path.isAbsolutePath("//server"), true);
            assert.equal(path.isAbsolutePath("//server/file"), true);
            assert.equal(path.isAbsolutePath("\\\\server\\file"), true);
            assert.equal(path.isAbsolutePath("\\\\server"), true);
            assert.equal(path.isAbsolutePath("\\\\"), true);
            assert.equal(path.isAbsolutePath("c"), false);
            assert.equal(path.isAbsolutePath("c:"), false);
            assert.equal(path.isAbsolutePath("c:\\"), true);
            assert.equal(path.isAbsolutePath("c:/"), true);
            assert.equal(path.isAbsolutePath("c://"), true);
            assert.equal(path.isAbsolutePath("C:/Users/"), true);
            assert.equal(path.isAbsolutePath("C:\\Users\\"), true);
        }
    }

    export function getDirTest() {
        assert.equal(path.getDir("."), ".");
        assert.equal(path.getDir("foo.txt"), ".");
        assert.equal(path.getDir(".foo"), ".");
        assert.equal(path.getDir(".foo/"), ".");
        assert.equal(path.getDir("foo/goo.txt"), "foo");
        assert.equal(path.getDir("../goo.txt"), "..");
        assert.equal(path.getDir("/user/root/foo.txt"), "/user/root");
        assert.equal(path.getDir("/user/root/foo"), "/user/root");
        assert.equal(path.getDir("/user/root/foo/"), "/user/root");
    }

    export function setDirTest() {
        assert.equal(path.setDir("/user/root/foo", ""), "foo");
        assert.equal(path.setDir("/user/root/foo", "."), "foo");
        assert.equal(path.setDir("/user/root/foo", "./"), "foo");
        assert.equal(path.setDir("/user/root/foo", "/"), np.sep + "foo");
        assert.equal(path.setDir("/user/root/foo.txt", "goo"), "goo" + np.sep + "foo.txt");
        assert.equal(path.setDir("/user/root/foo", "goo"), "goo" + np.sep + "foo");
        assert.equal(path.setDir("/user/root/foo", "goo/"), "goo" + np.sep + "foo");
    }

    export function getFileNameTest() {
        assert.equal(path.getFileName("/user/root/foo.txt"), "foo.txt");
        assert.equal(path.getFileName("/user/root/foo.txt", true), "foo.txt");
        assert.equal(path.getFileName("/user/root/foo.min.js"), "foo.min.js");
        assert.equal(path.getFileName("/user/root/foo"), "foo");
        assert.equal(path.getFileName("/user/root/foo/"), "foo");
        assert.equal(path.getFileName(""), "");
        assert.equal(path.getFileName("."), ".");
        assert.equal(path.getFileName(".."), "..");
        assert.equal(path.getFileName(".foo"), ".foo");
        assert.equal(path.getFileName("foo/.goo", false), ".goo");

        assert.equal(path.getFileName("/user/root/foo.txt", false), "foo");
        assert.equal(path.getFileName("/user/root/foo.min.js", false), "foo.min");
        assert.equal(path.getFileName("/user/root/foo", false), "foo");
        assert.equal(path.getFileName("/user/root/foo/", false), "foo");
        assert.equal(path.getFileName("", false), "");
        assert.equal(path.getFileName(".", false), ".");
        assert.equal(path.getFileName("..", false), "..");
        assert.equal(path.getFileName(".foo", false), ".foo");
        assert.equal(path.getFileName("foo/.goo", false), ".goo");
    }

    export function setFileNameTest() {
        assert.equal(path.setFileName("/user/root/foo.txt", "goo"), "/user/root/goo");
        assert.equal(path.setFileName("/user/root/foo.txt", "goo", true), "/user/root/goo");
        assert.equal(path.setFileName("/user/root/foo.min.js", "goo"), "/user/root/goo");
        assert.equal(path.setFileName("/user/root/foo", "goo"), "/user/root/goo");
        assert.equal(path.setFileName("/user/root/", "goo"), "/user/goo");
        assert.equal(path.setFileName("", "goo"), "goo");
        assert.equal(path.setFileName(".", "goo"), "goo");
        assert.equal(path.setFileName("..", "goo"), "goo");
        assert.equal(path.setFileName(".foo", "goo"), "goo");
        assert.equal(path.setFileName("foo/.foo", "goo"), "foo/goo");

        assert.equal(path.setFileName("/user/root/foo.txt", "goo", false), "/user/root/goo.txt");
        assert.equal(path.setFileName("/user/root/foo.min.js", "goo", false), "/user/root/goo.js");
        assert.equal(path.setFileName("/user/root/foo", "goo", false), "/user/root/goo");
        assert.equal(path.setFileName("/user/root/", "goo", false), "/user/goo");
        assert.equal(path.setFileName("", "goo", false), "goo");
        assert.equal(path.setFileName(".", "goo", false), "goo");
        assert.equal(path.setFileName("..", "goo", false), "goo");
        assert.equal(path.setFileName(".foo", "goo", false), "goo");
        assert.equal(path.setFileName("foo/.foo", "goo", false), "foo/goo");
    }

    export function prependFileNameTest() {
        assert.equal(path.prependFileName("/user/root/foo.txt", "prepend"), "/user/root/prependfoo.txt");
        assert.equal(path.prependFileName("/user/root/foo.min.js", "prepend"), "/user/root/prependfoo.min.js");
        assert.equal(path.prependFileName("/user/root/foo", "prepend"), "/user/root/prependfoo");
        assert.equal(path.prependFileName("/user/root/foo/", "prepend"), "/user/root/prependfoo");
        assert.equal(path.prependFileName(".goo", "prepend"), "prepend.goo");
        assert.equal(path.prependFileName("foo/.goo", "prepend"), "foo/prepend.goo");
    }

    export function appendFileNameTest() {
        assert.equal(path.appendFileName("/user/root/foo.txt", "append"), "/user/root/fooappend.txt");
        assert.equal(path.appendFileName("/user/root/foo.min.js", "append"), "/user/root/fooappend.min.js");
        assert.equal(path.appendFileName("/user/root/foo", "append"), "/user/root/fooappend");
        assert.equal(path.appendFileName("/user/root/foo/", "append"), "/user/root/fooappend");
        assert.equal(path.appendFileName(".goo", "append"), "append.goo");
        assert.equal(path.appendFileName("foo/.goo", "append"), "foo/append.goo");
    }

    export function getExtTest() {
        assert.equal(path.getExt("/user/root/foo"), "");
        assert.equal(path.getExt("/user/root/foo.txt"), ".txt");
        assert.equal(path.getExt("/user/root/foo.min.js"), ".js");
        assert.equal(path.getExt("/user/root/.foo"), "");
        assert.equal(path.getExt("/user/root/.foo/"), "");
    }

    export function setExtTest() {
        assert.equal(path.setExt("/user/root/foo.txt", ".jpg"), "/user/root/foo.jpg");
        assert.equal(path.setExt("/user/root/foo.txt", ""), "/user/root/foo");
        assert.equal(path.setExt("/user/root/foo", ".jpg"), "/user/root/foo.jpg");
        assert.equal(path.setExt("/user/root/foo", ""), "/user/root/foo");
        assert.equal(path.setExt("/user/root/.foo", ".txt"), "/user/root/.foo.txt");
        assert.equal(path.setExt("/user/root/.foo/", ".txt"), "/user/root/.foo/.txt");
    }

    export function pathEqualsTest() {
        assert.equal(path.pathEquals(null, null), true);
        assert.equal(path.pathEquals(null, "foo/goo/hoo"), false);
        assert.equal(path.pathEquals("foo/goo/hoo", null), false);
        assert.equal(path.pathEquals("foo/goo/hoo", "foo/goo/hoo2"), false);
        assert.equal(path.pathEquals("foo/goo/hoo", "foo/goo/hoo"), true);
    }

    export function inDirTest() {
        assert.equal(path.inDir(".", "."), true);
        assert.equal(path.inDir(".", "foo"), true);
        assert.equal(path.inDir(".", "foo/goo"), true);
        assert.equal(path.inDir(".", "../foo/goo"), false);

        assert.equal(path.inDir("..", ".."), true);
        assert.equal(path.inDir("..", "foo"), true);
        assert.equal(path.inDir("..", "foo/goo"), true);
        assert.equal(path.inDir("..", "../foo/goo"), true);

        assert.equal(path.inDir("/", "/"), true);
        assert.equal(path.inDir("/", "/foo"), true);
        assert.equal(path.inDir("/", "/foo/goo"), true);

        assert.equal(path.inDir("user/root/foo", "user/root/foo"), true);
        assert.equal(path.inDir("user/root/foo", "user/root/foo2"), false);
        assert.equal(path.inDir("user/root/foo", "user/root/foo/goo"), true);

        assert.equal(path.inDir("../foo", "../foo"), true);
        assert.equal(path.inDir("../foo", "../foo2"), false);
        assert.equal(path.inDir("../foo", "../foo/goo"), true);
        assert.equal(path.inDir("../foo", "."), false);
        assert.equal(path.inDir("../foo", ".."), false);

        assert.equal(path.inDir("/user/root", "/user/root"), true);
        assert.equal(path.inDir("/user/root", "/user/root/foo"), true);
        assert.equal(path.inDir("/user/root/foo.txt", "foo.txt"), false);
        assert.equal(path.inDir("/user/root/foo", "/user/root/foo2"), false);

        assert.equal(path.inDir("../..", "../foo/goo"), true);
        assert.equal(path.inDir("goo1/goo2/../foo", "goo1/goo2/../../foo"), false);
        assert.equal(path.inDir("goo1/goo2/../../foo", "goo1/goo2/.."), false);
        assert.equal(path.inDir("goo1/.", "goo1/.."), false);
        assert.equal(path.inDir("goo1/..", "goo1/."), true);
    }

    export function commonDirTest() {
        assert.equal(path.commonDir("", ""), np.resolve("."));
        assert.equal(path.commonDir("", "."), np.resolve("."));
        assert.equal(path.commonDir(".", "."), np.resolve("."));
        assert.equal(path.commonDir(".", "foo"), np.resolve("."));
        assert.equal(path.commonDir(".", "foo/goo"), np.resolve("."));
        assert.equal(path.commonDir("goo1/.", "goo1/.."), np.resolve("."));
        assert.equal(path.commonDir("goo1/.", "goo1/../foo/goo"), np.resolve("."));

        assert.equal(path.commonDir("goo1/..", "goo1/."), np.resolve("."));
        assert.equal(path.commonDir("goo1/..", "goo1/.."), np.resolve("."));
        assert.equal(path.commonDir("goo1/..", "goo1/foo"), np.resolve("."));
        assert.equal(path.commonDir("goo1/..", "goo1/foo/goo"), np.resolve("."));
        assert.equal(path.commonDir("goo1/..", "goo1/../foo/goo"), np.resolve("."));

        assert.equal(path.commonDir("foo/goo", "foo/goo2"), np.resolve("foo"));
        assert.equal(path.commonDir("foo/goo", "foo/goo/hoo"), np.resolve("foo/goo"));
        assert.equal(path.commonDir("foo/goo/hoo", "foo/goo/hoo2"), np.resolve("foo/goo"));

        assert.equal(path.commonDir("foo/goo/hoo", "foo/goo"), np.resolve("foo/goo"));
        assert.equal(path.commonDir("foo/goo/hoo", "foo2/goo/hoo"), np.resolve("."));
        assert.equal(path.commonDir("foo/goo/hoo", "foo/goo/hoo"), np.resolve("foo/goo/hoo"));

        assert.equal(path.commonDir("/", "/"), np.resolve("/"));
        assert.equal(path.commonDir("/foo/goo", "/foo/goo2"), np.resolve("/foo"));

        assert.equal(path.commonDir("goo/../foo", "goo/../foo2"), np.resolve("."));
        assert.equal(path.commonDir("goo/../foo", "goo/../foo/goo"), np.resolve("foo"));
        assert.equal(path.commonDir("goo/../foo", "goo/foo2/goo"), np.resolve("."));
        assert.equal(path.commonDir("goo/../foo", "goo/."), np.resolve("."));

        assert.equal(path.commonDir(null, ""), null);
        assert.equal(path.commonDir("", null), null);
        assert.equal(path.commonDir(null, null), null);

        if (np.sep === "\\") {
            assert.equal(path.commonDir("R:", "H:"), null);
        }

    }

}
