import * as assert from "assert";
import * as np from "path";
import * as matcher from "../../lib/utility/matcher";

export namespace matcherTest {

    export function matchTest() {
        assert.equal(matcher.match("foo.js", null), true);
        assert.equal(matcher.match("foo", "foo"), true);
        assert.equal(matcher.match("myfoo", "foo"), false);
        assert.equal(matcher.match("foo", "foo.js"), false);
        assert.equal(matcher.match("foo/goo2", "foo/goo"), false);
        assert.equal(matcher.match("foo.js", "foo.js"), true);
        assert.equal(matcher.match("path/to/foo.js", "path/to/*.js"), true);
        assert.equal(matcher.match("path/to/foo.css", "path/to/*.js"), false);
        assert.equal(matcher.match("path/to.js", "path/to/*.js"), false);
        assert.equal(matcher.match("path/to/foo/goo.js", "path/to/*.js"), false);
        assert.equal(matcher.match("root/path/to/foo.js", "./root/path/to/*.js"), true);
        assert.equal(matcher.match("root/path/toa/foo.js", "./root/path/to/*.js"), false);
        assert.equal(matcher.match("foo.js", "./*.js"), true);
        assert.equal(matcher.match("foo/goo.js", "./*.js"), false);
        assert.equal(matcher.match("foo.js", "*.js"), true);
        assert.equal(matcher.match("goo/foo.js", "*.js"), true);
        assert.equal(matcher.match("foo/goo/.js", "*.js"), true);
        assert.equal(matcher.match("foo/goo/.js", "**/*.js"), true);
        assert.equal(matcher.match("foo/goo/.js", "f**o/*.js"), true);
        assert.equal(matcher.match(".js", "**/*.js"), true);
        assert.equal(matcher.match("path/a", "path/?"), true);
        assert.equal(matcher.match("path/ab", "path/?"), false);
        assert.equal(matcher.match("path/a", "path/[ab]"), true);
        assert.equal(matcher.match("path/b", "path/[ab]"), true);
        assert.equal(matcher.match("path/ab", "path/[ab]"), false);
        assert.equal(matcher.match("path/a", "path/[^ab]"), false);
        assert.equal(matcher.match("path/b", "path/[^ab]"), false);
        assert.equal(matcher.match("path/c", "path/[^ab]"), true);
        assert.equal(matcher.match("path/", "path/*"), false);
        assert.equal(matcher.match("path/foo", "path/*"), true);
        assert.equal(matcher.match("path/foo", "path/foo*"), true);
        assert.equal(matcher.match("path/abcd", "path/a*"), true);
        assert.equal(matcher.match("path/foo/goo", "path/foo/"), true);
        assert.equal(matcher.match("path/foo/goo", "path/*/"), true);
        assert.equal(matcher.match("path/foo", "path/*/"), false);
        assert.equal(matcher.match("path/foo", "path/*"), true);
        assert.equal(matcher.match("path/foo/", "path/foo/"), false);
        assert.equal(matcher.match("path/", "path/**/*"), false);
        assert.equal(matcher.match("path/foo", "path/**/*"), true);
        assert.equal(matcher.match("path/subdir/foo.js", "path/**/subdir/foo.*"), true);
        assert.equal(matcher.match("path/foo/subdir/foo.js", "path/**/subdir/foo.*"), true);
        assert.equal(matcher.match("path/foo/subdir/foo1.js", "path/**/subdir/foo.*"), false);
        assert.equal(matcher.match("path/foo/subdir/foo", "path/**/subdir/foo.*"), false);
        assert.equal(matcher.match("path/foo/foo2/subdir/foo.txt", "path/**/subdir/foo.*"), true);
        assert.equal(matcher.match("path/foo/foo2/subdir/foo", "path/**/subdir/foo.*"), false);
        assert.equal(matcher.match("path/foo/foo2/subdir/foo.txt", "./path/**/subdir/foo.*"), true);
        assert.equal(matcher.match("path/foo/foo2/subdir/foo.txt", "./path/**/subdir/foo.*"), true);
        assert.equal(matcher.match("../path/foo/foo2/subdir/foo.txt", "../path/**/subdir/foo.*"), true);

        assert.equal(matcher.match("../path/foo/foo2/subdir/Foo.txt", ["../path/**/subdir/foo.*", "!foo.txt"]), false);
        assert.equal(matcher.match("foo.js", file => true), true);
        assert.equal(matcher.match("foo.js", ["!foo.js", file => true]), false);
        assert.equal(matcher.match("foo.js", file => false), false);
        assert.equal(matcher.match("foo.js", "./foo.js"), true);
        assert.equal(matcher.match("foo.js", "./*.js"), true);
        assert.equal(matcher.match("[.js", "[.js"), true);
        assert.equal(matcher.match("foo.js", null), true);

        assert.equal(matcher.match("foo.js", /foo\.js/), true);
        assert.equal(matcher.match("goo.js", new matcher.Matcher(["!goo.js", /foo\.js/])), false);
        const m = new matcher.Matcher(/foo\.js/);
        m.addIgnore("goo.js");
        assert.equal(matcher.match("goo.js", m), false);
        assert.equal(matcher.match("foo", new matcher.Matcher(null)), true);
        assert.equal(matcher.match("foo", null), true);

        assert.equal(matcher.match("foo", "./"), true);
        if (np.sep === "\\") {
            assert.equal(matcher.match("E:\foo", "E:\\foo"), true);
            assert.equal(matcher.match("E:\foo\goo.txt", "E:\\foo"), true);
            assert.equal(matcher.match("E:\foo\goo.txt", "E:\\foo\\*"), true);
        } else {
            assert.equal(matcher.match("/user/local", "/user/local"), true);
            assert.equal(matcher.match("/user/local/file.txt", "/user/local"), true);
            assert.equal(matcher.match("/user/local/file.txt", "/user/local/*"), true);
        }
    }

    export function baseTest() {
        assert.equal(new matcher.Matcher().base, null);
        assert.equal(new matcher.Matcher("foo").base, np.resolve("."));
        assert.equal(new matcher.Matcher("./foo").base, np.resolve("foo"));
        assert.equal(new matcher.Matcher("path/to/*.js").base, np.resolve("path/to"));
        assert.equal(new matcher.Matcher("./root/path/to/*.js").base, np.resolve("root/path/to"));
        assert.equal(new matcher.Matcher("./*.js").base, np.resolve("."));
        assert.equal(new matcher.Matcher("*.js").base, np.resolve("."));
        assert.equal(new matcher.Matcher("**/*.js").base, np.resolve("."));
        assert.equal(new matcher.Matcher("path/?").base, np.resolve("path/"));
        assert.equal(new matcher.Matcher("path/foo[ab]").base, np.resolve("path/"));
        assert.equal(new matcher.Matcher("path/*").base, np.resolve("path/"));
        assert.equal(new matcher.Matcher("path/foo*").base, np.resolve("path/"));
        assert.equal(new matcher.Matcher("path/**/*").base, np.resolve("path/"));
        assert.equal(new matcher.Matcher("path/**/subdir/foo.*").base, np.resolve("path"));
        assert.equal(new matcher.Matcher("foo/").base, np.resolve("."));
        assert.equal(new matcher.Matcher(["foo/goo", "foo/foo"]).base, np.resolve("foo"));
        assert.equal(new matcher.Matcher(["foo/**/*.js", "foo/**/*.css"]).base, np.resolve("foo"));
        assert.equal(new matcher.Matcher(/foo/).base, np.resolve(""));
        assert.equal(new matcher.Matcher(["foo/", "!foo/"]).base, np.resolve("."));
        assert.equal(new matcher.Matcher(["../foo/**/*.js", "foo/**/*.css"], "root").base, np.resolve("."));
        assert.equal(new matcher.Matcher(["../foo/**/*.js", /foo/], "root").base, np.resolve("."));
        assert.equal(new matcher.Matcher("./").base, np.resolve("."));
        assert.equal(new matcher.Matcher(".").base, np.resolve("."));
        assert.equal(new matcher.Matcher("").base, np.resolve("."));
    }

}
