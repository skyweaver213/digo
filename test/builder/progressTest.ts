import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import * as progress from "../../lib/builder/progress";

export namespace progressTest {

    export function progressTest() {
        consoleHelper.redirectOutput(() => {
            progress.end(progress.begin("foo..."));
        });
    }

}