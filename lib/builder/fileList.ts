/**
 * @file 文件列表
 * @author xuld <xuld@vip.qq.com>
 */
import { Matcher, Pattern } from "../utility/matcher";
import { BuildMode, File } from "./file";
import { plugin } from "./plugin";
import { begin, end } from "./progress";

/**
 * 表示一个文件列表。
 */
export class FileList {

    // #region 链表

    /**
     * 获取上一级列表。
     */
    prev: FileList;

    /**
     * 获取下一级列表。
     */
    next: FileList;

    /**
     * 获取当前列表的根列表。
     */
    get root() {
        let result: FileList = this;
        while (result.prev) {
            result = result.prev;
        }
        return result;
    }

    /**
     * 获取当前列表的最终结果列表。
     */
    get result() {
        let result: FileList = this;
        while (result.next) {
            result = result.next;
        }
        return result;
    }

    /**
     * 判断当前列表是否包含指定的子级列表。
     * @param child 要判断的列表。
     * @return 如果包含则返回 true，否则返回 false。
     */
    private hasNext(child: FileList) {
        if (!this.prev || this === child) {
            return true;
        }
        for (let list: FileList = this; list = list.next;) {
            if (list.prev === this && list.hasNext(child)) {
                return true;
            }
        }
        return false;
    }

    // #endregion

    // #region 处理器

    /**
     * 获取当前列表的处理器。
     */
    processor: Processor<any> = emptyObject;

    /**
     * 获取当前列表的处理器选项。
     */
    processorOptions: any = emptyObject;

    /**
     * 向当前列表添加一个文件。
     * @param file 要添加的文件。
     * @param root 文件所属的根列表。
     */
    add(file: File, root: FileList = this) {
        if (!root.hasNext(this)) {
            return;
        }
        this._before();
        this._pending++;
        if (this.processor.load && !file.loaded) {
            file.load((error, file) => {
                this._onLoad(file, root);
            });
        } else {
            this._onLoad(file, root);
        }
    }

    /**
     * 通知当前列表所有文件已添加。
     */
    end() {
        this._before();
        if (this.processor.after) {
            this.processor.after(this.processorOptions, this);
        }
        this._after();
    }

    /**
     * 检查是否可触发 before 事件。
     */
    private _before() {
        if (!this._adding) {
            this._adding = true;
            this._pending++;
            if (this.processor.before) {
                this.processor.before(this.processorOptions, this);
            }
        }
    }

    /**
     * 存储是否正在添加文件。
     */
    private _adding = false;

    /**
     * 存储当前列表的等待任务数。
     */
    private _pending = 0;

    /**
     * 如果处理器含 `end` 则用于收集所有文件。
     */
    private files: File[];

    /**
     * 当文件已载入后执行。
     * @param file 要添加的文件。
     * @param root 文件所属的根列表。
     */
    private _onLoad(file: File, root: FileList) {
        if (this.processor.add) {
            const taskId = this.processor.name && begin("{cyan:processor}: {file}", {
                processor: this.processor.name,
                file: file.toString()
            });
            if (this.processor.add.length <= 2) {
                const add = (this.processor.add as Function)(file, this.processorOptions);
                taskId && end(taskId);
                this._onAdd(file, root, add);
            } else {
                this.processor.add(file, this.processorOptions, add => {
                    taskId && end(taskId);
                    this._onAdd(file, root, add);
                }, this.next || new FileList(), root);
            }
        } else {
            this._onAdd(file, root);
        }
    }

    /**
     * 当文件已添加后执行。
     * @param file 要添加的文件。
     * @param root 文件所属的根列表。
     * @param add 是否添加文件。
     */
    private _onAdd(file: File, root: FileList, add?: boolean | void) {
        if (this.processor.collect) {
            this.files = this.files || [];
            let index: number;
            if (file.generated) {
                index = this.files.length;
            } else {
                for (index = 0; index < this.files.length; index++) {
                    if (this.files[index].initalPath === file.initalPath) {
                        break;
                    }
                }
            }
            if (file.buildMode === BuildMode.clean) {
                this.files.splice(index, 1);
            } else {
                this.files[index] = file.clone();
            }
        }
        let next = this.next;
        if (next) {
            if (typeof add === "boolean" ? add === false : this.processor.collect) {
                while (next && this.hasNext(next)) {
                    next = next.next;
                }
            }
            if (next) {
                next.add(file, root);
            }
        }
        this._after();
    }

    /**
     * 检查是否可触发 end 事件。
     */
    private _after() {
        if (--this._pending < 1) {
            if (this.processor.end) {
                if (this.processor.collect) {
                    this.files = this.files || [];
                    const taskId = this.processor.name && begin("{cyan:processor}: {count} file(s)", {
                        processor: this.processor.name,
                        count: this.files.length
                    });
                    const onEnd = () => {
                        taskId && end(taskId);
                        for (let i = this.files.length; --i >= 0;) {
                            if (this.files[i].generated) {
                                this.files.splice(i, 1);
                            }
                        }
                        this._onEnd();
                    };
                    if (this.processor.end.length <= 3) {
                        (this.processor.end as Function)(this.files, this.processorOptions, this.next || new FileList());
                        onEnd();
                    } else {
                        this.processor.end(this.files, this.processorOptions, this.next || new FileList(), onEnd);
                    }
                } else {
                    if (this.processor.end.length <= 3) {
                        (this.processor.end as Function)(undefined, this.processorOptions, this.next || new FileList());
                        this._onEnd();
                    } else {
                        this.processor.end(undefined!, this.processorOptions, this.next || new FileList(), () => {
                            this._onEnd();
                        });
                    }
                }
            } else {
                this._onEnd();
            }
        }
    }

    /**
     * 当所有文件已添加时执行。
     */
    private _onEnd() {
        this._pending = 0;
        this._adding = false;
        this.next && this.next.end();
    }

    // #endregion

    // #region 对外接口

    /**
     * 将当前列表所有文件传递给指定的处理器。
     * @param processor 要传递的目标处理器。
     * @param options 供处理器使用的只读配置对象。
     * @return 返回用于接收处理后文件的文件列表。
     * @example
     * list.pipe((file) => file.content += "1");
     * list.pipe((file, options, done) => done());
     */
    pipe<T>(processor: string | Processor<T>["add"] | Processor<T>, options: T = emptyObject) {
        if (typeof processor === "string") {
            processor = plugin(processor) as Processor<T>["add"] | Processor<T>;
        }
        if (typeof processor === "function") {
            processor = {
                name: processor.name,
                load: true,
                add: processor
            };
        } else if (processor == undefined) {
            processor = emptyObject as Processor<T>;
        }
        if (processor.init) {
            const t = processor.init(options, this);
            if (t !== undefined) {
                options = t;
            }
        }
        if (processor.collect == undefined && processor.end && processor.end.length > 0) {
            processor.collect = true;
        }
        const result = new FileList();
        result.processor = processor;
        result.processorOptions = options;
        result.prev = this;
        return this.result.next = result;
    }

    /**
     * 设置当前列表完成后的回调函数。
     * @param callback 要执行的回调函数。
     * @return 返回用于接收处理后文件的文件列表。
     */
    then(callback: (done: () => void) => void) {
        return this.pipe({
            collect: false,
            end(files, options, dest, done) {
                if (callback.length) {
                    callback(done);
                } else {
                    process.nextTick(() => {
                        (callback as Function)();
                        done();
                    });
                }
            }
        });
    }

    /**
     * 筛选当前文件列表并返回一个新的文件列表。
     * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上模式组合的数组。
     * @return 返回已筛选的文件列表。
     */
    src(...patterns: Pattern[]) {
        return this.pipe({
            add(file, matcher) {
                return file.path != undefined && matcher.test(file.path);
            }
        }, new Matcher(patterns));
    }

    /**
     * 将所有文件移动到指定的文件夹。
     * @param dir 要保存的目标文件文件夹。如果为空则保存到原文件夹。
     * @return 返回用于接收处理后文件的文件列表。
     */
    dest(dir?: string | ((file: File) => string)) {
        return this.pipe({
            add(file, dir, done) {
                file.save(typeof dir === "function" ? dir(file) : dir, (error, file) => {
                    if (error) {
                        file.error(error);
                    }
                    done();
                });
            }
        }, dir);
    }

    /**
     * 删除所有源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     * @return 返回用于接收处理后文件的文件列表。
     */
    delete(deleteDir?: boolean) {
        return this.pipe({
            add(file, deleteDir, done) {
                file.delete(deleteDir, (error, file) => {
                    if (error) {
                        file.error(error);
                    }
                    done();
                });
            }
        }, deleteDir);
    }

    /**
     * 创建当前列表所有文件的副本。
     * @return 返回用于接收处理后文件的文件列表。
     */
    clone() {
        return this.pipe({
            add(file, options, done, result) {
                result.add(file.clone());
                done(false);
            }
        });
    }

    // #endregion

}

const emptyObject: any = Object.freeze({});

/**
 * 表示一个处理器。
 */
export interface Processor<T> {

    /**
     * 当前处理器的名字。
     */
    name?: string;

    /**
     * 初始化处理器选项。
     * @param options 传递给处理器的只读选项。
     * @param result 结果列表。
     * @return 返回更新后的选项。
     */
    init?(options: T, result: FileList): any;

    /**
     * 在添加第一个文件前执行。
     * @param options 传递给处理器的只读选项。
     * @param result 结果列表。
     */
    before?(options: T, result: FileList): void;

    /**
     * 如果为 true 则执行处理器前会首先载入文件内容。
     */
    load?: boolean;

    /**
     * 当添加一个文件后执行。
     * @param file 要处理的文件。
     * @param options 传递给处理器的只读选项。
     * @param done 指示异步操作完成的回调函数。如果未声明此参数则表示当前处理器是同步执行的。如果函数的第一个参数为 false 则不再继续处理此文件。
     * @param result 结果列表。
     * @param root 当前文件的来源列表。
     * @return 如果函数返回 false 则不再继续处理此文件。
     */
    add?(file: File, options: T, done: (result?: boolean | void) => void, result: FileList, root: FileList): boolean | void;

    /**
     * 当所有文件添加完成后执行。
     * @param options 传递给处理器的只读选项。
     * @param result 结果列表。
     */
    after?(options: T, result: FileList): void;

    /**
     * 是否收集文件列表。
     */
    collect?: boolean;

    /**
     * 当所有文件添加完成并已处理后执行。
     * @param files 要处理的文件列表。仅当 `collect` 为 true 时有值。
     * @param options 传递给处理器的只读选项。
     * @param result 结果列表。
     * @param done 指示异步操作完成的回调函数。如果未声明此参数则表示当前处理器是同步执行的。
     */
    end?(files: File[], options: T, result: FileList, done: () => void): void;

}
