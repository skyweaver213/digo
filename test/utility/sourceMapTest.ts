import * as assert from "assert";
import * as sourceMap from "../../lib/utility/sourceMap";

export namespace sourceMapTest {

    const map = {
        version: 3,
        file: "example.js",
        sourceRoot: "sourceRoot",
        sources: [
            "source.js"
        ],
        sourcesContent: [
            "sourceContent"
        ],
        names: [
            "name"
        ],
        mappings: ";AAAAA,IAAA;;AAAA,MAAA,GAAS,SAAC,CAAD"
    };

    function clean(obj: sourceMap.SourceLocation | sourceMap.SourceLocation[]) {
        if (Array.isArray(obj)) {
            obj.forEach(clean);
        } else {
            delete obj.mapping;
            if (obj.name == undefined) {
                delete obj.name;
            }
        }
        return obj;
    }

    export function toSourceMapStringTest() {
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(map)), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(JSON.stringify(map))), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapObject(map))), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapBuilder(map))), map);
    }

    export function toSourceMapObjectTest() {
        assert.deepEqual(sourceMap.toSourceMapObject(map), map);
        assert.deepEqual(sourceMap.toSourceMapObject(JSON.stringify(map)), map);
        assert.deepEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapObject(map)), map);
        assert.deepEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapBuilder(map)), map);
        try { sourceMap.toSourceMapObject({ sections: [] } as any); } catch (e) { }
        try { sourceMap.toSourceMapObject({ version: 2 } as any); } catch (e) { }
    }

    export function toSourceMapBuilderTest() {
        assert.deepEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(JSON.stringify(map)).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapObject(map)).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapBuilder(map)).toJSON(), map);
    }

    export function addSourceTest() {
        const b = new sourceMap.SourceMapBuilder();
        assert.equal(b.addSource("foo"), 0);
        assert.deepEqual(b.sources, ["foo"]);
        assert.equal(b.addSource("goo"), 1);
        assert.deepEqual(b.sources, ["foo", "goo"]);
    }

    export function addNameTest() {
        const b = new sourceMap.SourceMapBuilder();
        assert.equal(b.addName("b"), 0);
        assert.deepEqual(b.names, ["b"]);
    }

    export function getSourceContentTest() {
        const b = new sourceMap.SourceMapBuilder();
        assert.equal(b.getSourceContent("b"), undefined);
        b.addSource("b");
        b.setSourceContent("b", "A");
        assert.equal(b.getSourceContent("b"), "A");
    }

    export function setSourceContentTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addSource("b");
        b.setSourceContent("b", "A");
        assert.deepEqual(b.sourcesContent, ["A"]);
        b.setSourceContent("b", "B");
        assert.deepEqual(b.sourcesContent, ["B"]);
    }

    export function parseTest() {
        new sourceMap.SourceMapBuilder({} as any);
        const b = new sourceMap.SourceMapBuilder(map);
        assert.equal(b.version, map.version);
        assert.equal(b.file, map.file);
        assert.equal(b.sourceRoot, map.sourceRoot);
        assert.deepEqual(b.sources, map.sources);
        assert.deepEqual(b.names, map.names);
        assert.deepEqual(b.mappings, [
            [],
            [
                { generatedColumn: 0, sourceIndex: 0, sourceLine: 0, sourceColumn: 0, nameIndex: 0 },
                { generatedColumn: 4, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 }
            ],
            [],
            [
                { generatedColumn: 0, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 },
                { generatedColumn: 6, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 },
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 0, sourceColumn: 9 },
                { generatedColumn: 18, sourceIndex: 0, sourceLine: 0, sourceColumn: 10 },
                { generatedColumn: 19, sourceIndex: 0, sourceLine: 0, sourceColumn: 9 }
            ]
        ]);

        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "A"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAAAAAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAA,AAAAA,AAAAAA,AAAAAAAAA,AAAAAAAA,,;;a,9,+,/,g,h"
        });
    }

    export function toJSONAndToStringTest() {
        new sourceMap.SourceMapBuilder().toJSON();
        assert.deepEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapBuilder(map).toString()), map);
        assert.deepEqual(JSON.parse(JSON.stringify(sourceMap.toSourceMapBuilder(map))), map);
        const a = new sourceMap.SourceMapBuilder();
        a.addMapping(10002, 1043433);
        const b = new sourceMap.SourceMapBuilder(a.toString());
        assert.equal(b.mappings[10002][0].generatedColumn, 1043433);
    }

    export function getSourceTest() {
        const b = sourceMap.toSourceMapBuilder(map);
        assert.deepEqual(clean(b.getSource(0, 0)), {});
        assert.deepEqual(clean(b.getSource(0, 1)), {});
        assert.deepEqual(clean(b.getSource(0, 2)), {});
        assert.deepEqual(clean(b.getSource(1, 0)), { sourcePath: "source.js", line: 0, column: 0, name: "name" });
        assert.deepEqual(clean(b.getSource(1, 1)), { sourcePath: "source.js", line: 0, column: 1, name: "name" });
        assert.deepEqual(clean(b.getSource(1, 2)), { sourcePath: "source.js", line: 0, column: 2, name: "name" });
        assert.deepEqual(clean(b.getSource(1, 3)), { sourcePath: "source.js", line: 0, column: 3, name: "name" });
        assert.deepEqual(clean(b.getSource(1, 4)), { sourcePath: "source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(1, 5)), { sourcePath: "source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(1, 6)), { sourcePath: "source.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(2, 0)), { sourcePath: "source.js", line: 1, column: 0 });
        assert.deepEqual(clean(b.getSource(2, 1)), { sourcePath: "source.js", line: 1, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 0)), { sourcePath: "source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(3, 1)), { sourcePath: "source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 5)), { sourcePath: "source.js", line: 0, column: 5 });
        assert.deepEqual(clean(b.getSource(3, 6)), { sourcePath: "source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(3, 7)), { sourcePath: "source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 8)), { sourcePath: "source.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(3, 9)), { sourcePath: "source.js", line: 0, column: 9 });
        assert.deepEqual(clean(b.getSource(3, 10)), { sourcePath: "source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 17)), { sourcePath: "source.js", line: 0, column: 17 });
        assert.deepEqual(clean(b.getSource(3, 18)), { sourcePath: "source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 19)), { sourcePath: "source.js", line: 0, column: 9 });
        assert.deepEqual(clean(b.getSource(3, 20)), { sourcePath: "source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 21)), { sourcePath: "source.js", line: 0, column: 11 });
        assert.deepEqual(clean(b.getSource(4, 0)), { sourcePath: "source.js", line: 1, column: 0 });
        assert.deepEqual(clean(b.getSource(4, 1)), { sourcePath: "source.js", line: 1, column: 1 });

        assert.deepEqual(clean(b.getSource(1, 21)), { sourcePath: "source.js", line: 0, column: 17 });
        assert.deepEqual(clean(b.getSource(3, 27)), { sourcePath: "source.js", line: 0, column: 17 });

    }

    export function getGeneratedTest() {
        const b = sourceMap.toSourceMapBuilder(map);
        assert.deepEqual(clean(b.getGenerated("source.js", 0, 0)), [
            { sourcePath: "source.js", line: 1, column: 0, name: "name" },
            { sourcePath: "source.js", line: 1, column: 4 },
            { sourcePath: "source.js", line: 3, column: 0 },
            { sourcePath: "source.js", line: 3, column: 6 },
        ]);
        assert.deepEqual(clean(b.getGenerated("source.js", 0, 17)), [
            { sourcePath: "source.js", line: 1, column: 21 },
            { sourcePath: "source.js", line: 3, column: 17 },
            { sourcePath: "source.js", line: 3, column: 27 },
        ]);
    }

    export function addMappingTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(0, 10, "foo.js", 1, 2);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 }
            ]
        ]);
        b.addMapping(0, 10, "foo.js", 1, 3);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ]
        ]);
        b.addMapping(0, 9, "foo.js", 1, 3);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ]
        ]);
        b.addMapping(1, 9, "foo.js", 1, 3, "name");
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 5, "foo.js", 1, 3, "name");
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 8, "foo.js", 2, 7);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { generatedColumn: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 6);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { generatedColumn: 6 },
                { generatedColumn: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 8);
        assert.deepEqual(b.mappings, [
            [
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { generatedColumn: 6 },
                { generatedColumn: 8 },
                { generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
    }

    export function eachMappdingTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(0, 10, "a.js", 1, 2);
        b.addMapping(0, 9, "a.js", 1, 3);
        const columns: number[] = [];
        b.eachMapping((generatedLine, generatedColumn) => {
            columns.push(generatedColumn);
        });
        assert.deepEqual(columns, [9, 10]);
    }

    export function applySourceMapTest() {
        const a = new sourceMap.SourceMapBuilder();
        a.addMapping(1, 1, "foo.js", 101, 99);
        a.addMapping(1, 6, "foo.js", 101, 103);
        a.addMapping(2, 0, "foo.js", 102, 0);
        const b = new sourceMap.SourceMapBuilder();
        b.file = "foo.js";
        b.addMapping(101, 101, "goo.js", 201, 202, "name");
        b.addMapping(101, 109, "goo.js", 201, 202);
        b.addMapping(102, 0, "goo.js", 301, 302, "name2");
        a.applySourceMap(b);
        assert.deepEqual(clean(a.getSource(1, 1)), {});
        assert.deepEqual(clean(a.getSource(1, 2)), {});
        assert.deepEqual(clean(a.getSource(1, 3)), { sourcePath: "goo.js", line: 201, column: 202, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 4)), { sourcePath: "goo.js", line: 201, column: 203, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 5)), { sourcePath: "goo.js", line: 201, column: 204, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 6)), { sourcePath: "goo.js", line: 201, column: 204, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 7)), { sourcePath: "goo.js", line: 201, column: 205, name: "name" });
        assert.deepEqual(clean(a.getSource(2, 0)), { sourcePath: "goo.js", line: 301, column: 302, name: "name2" });
        assert.deepEqual(clean(a.getSource(3, 0)), { sourcePath: "goo.js", line: 302, column: 0, name: "name2" });
        const c = new sourceMap.SourceMapBuilder();
        c.file = "path";
        a.applySourceMap(c);
        assert.deepEqual(clean(a.getSource(1, 1)), {});
        assert.deepEqual(clean(a.getSource(1, 2)), {});
        assert.deepEqual(clean(a.getSource(1, 3)), { sourcePath: "goo.js", line: 201, column: 202, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 4)), { sourcePath: "goo.js", line: 201, column: 203, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 5)), { sourcePath: "goo.js", line: 201, column: 204, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 6)), { sourcePath: "goo.js", line: 201, column: 204, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 7)), { sourcePath: "goo.js", line: 201, column: 205, name: "name" });
        assert.deepEqual(clean(a.getSource(2, 0)), { sourcePath: "goo.js", line: 301, column: 302, name: "name2" });
        assert.deepEqual(clean(a.getSource(3, 0)), { sourcePath: "goo.js", line: 302, column: 0, name: "name2" });
    }

    export function computeLinesTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(1, 1, "a.js", 101, 101);
        b.addMapping(3, 1, "a.js", 201, 201);
        assert.equal(b.mappings.length, 4);
        assert.equal(b.mappings[0], undefined);
        assert.deepEqual(b.mappings[1], [
            { generatedColumn: 1, sourceIndex: 0, sourceLine: 101, sourceColumn: 101 }
        ]);
        assert.equal(b.mappings[2], undefined);
        assert.deepEqual(b.mappings[3], [
            { generatedColumn: 1, sourceIndex: 0, sourceLine: 201, sourceColumn: 201 }
        ]);
        b.computeLines();
        assert.deepEqual(b.mappings[0], []);
        assert.deepEqual(b.mappings[2], [
            { generatedColumn: 0, sourceIndex: 0, sourceLine: 102, sourceColumn: 0 }
        ]);
        assert.deepEqual(b.mappings[3], [
            { generatedColumn: 0, sourceIndex: 0, sourceLine: 103, sourceColumn: 0 },
            { generatedColumn: 1, sourceIndex: 0, sourceLine: 201, sourceColumn: 201 }
        ]);
    }

    export function emitSourceMapUrlTest() {
        assert.equal(sourceMap.emitSourceMapUrl("", "a.js"), "\n/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("a", "a.js"), "a\n/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("a", "a.js", true), "a\n//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("/*# sourceMappingURL=b.js */", "a.js"), "/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("//# sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("//@ sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("//@ sourceMappingURL=b.js", ""), "");
    }

}
