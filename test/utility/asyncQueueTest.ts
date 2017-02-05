import * as assert from "assert";
import AsyncQueue from "../../lib/utility/asyncQueue";

export namespace asyncQueueTest {

    export function lockTest(done: MochaDone) {
        let c = 0;
        const q = new AsyncQueue();
        q.lock();
        setTimeout(() => {
            q.unlock();
        }, 5);
        q.enqueue(done => {
            assert.equal(++c, 1);
            setTimeout(done, 7);
        });
        q.enqueue(() => {
            assert.equal(++c, 2);
        });
        q.enqueue(() => {
            assert.equal(++c, 3);
            done();
        });
        q.lock();
        setTimeout(() => {
            q.unlock();
        }, 8);
    }

    export function enqueueTest(done: MochaDone) {
        let c = 0;
        const q = new AsyncQueue();
        q.enqueue(done => {
            assert.equal(++c, 1);
            setTimeout(done, 7);
        });
        q.enqueue(() => {
            assert.equal(++c, 2);
        });
        q.enqueue(() => new Promise(resolver => setTimeout(resolver, 5)));
        q.enqueue(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    export function promiseTest(done: MochaDone) {
        const q = new AsyncQueue();
        let c = 0;
        q.enqueue(done => {
            setTimeout(() => {
                assert.equal(++c, 1);
                done();
            }, 7);
        });
        q.promise().then(() => {
            assert.equal(++c, 2);
            done();
        });
    }

}
