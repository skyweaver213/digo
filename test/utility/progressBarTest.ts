import * as assert from "assert";
import updateProgress from "../../lib/utility/progressBar";
import * as consoleHelper from "../helper/consoleHelper";

export namespace progressBarTest {

    export function updateProgressTest() {
        consoleHelper.redirectOutput(outputs => {
            updateProgress("1");
            updateProgress("2");
            updateProgress("3");
            console.log("clear");
            updateProgress("4");
            updateProgress("5");
            updateProgress(null);
            console.log("clear2");
            assert.equal(outputs.length, 9);
        });
    }

}
