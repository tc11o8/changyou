
const cp = require('child_process');
const path = require("path");
const exec = require('./shellUtils');
const isWindow = require('./osUtils');
const debugLog = require('./tools');
const UUID = require('uuid');

let worker = {};
let cbobj = {};
/**
 * 子进程管理器
 *  @param name;       // 子进程路径
 *  @param unique;     // 是否唯一
 *  @param message;    // 消息
 *  @param callback;   //返回函数
 */
class ProcessMgr {

    constructor() {}

    async reset() {
        worker = {};
        cbobj = {};
    }

    async init(name, unique = true, callback = function(){}, message = {}, logger) {
        this.name = path.resolve(__dirname, `../${name}.js`);
        this.message = message;
        this.unique = unique;
        this.callback = callback;
        this.logger = logger;
        await this.start();
    }

    async kill(pid) {
        try {
            var count = await exec(`ps -ef|grep '${pid}' | grep -v grep -c`);
            if (count > 0) {
                // 杀死进程
                await exec(`ps -ef|grep '${pid}' | grep -v grep | awk '{print $2}' | xargs kill -9`);
                // 清理缓存
                if (worker[pid]) delete worker[pid];
                if (cbobj[pid]) delete cbobj[pid];
            }
        } catch(e) {
            this.logger.info('子进程kill异常=', e.stack);
        }
    }

    /**
     * 如果只能开启一个子进程,需要先杀死,再启动
     * @returns {Promise<void>}
     */
    async isok() {
        if (this.unique) {
            var count = await exec(`ps -ef|grep '${this.name}' | grep -v grep -c`);
            if (count > 0) {
                // 杀死进程
                await exec(`ps -ef|grep '${this.name}' | grep -v grep | awk '{print $2}' | xargs kill -9`);
                // 重复校验
                await this.isok();
            }
        }
    }

    /**
     * 启动子进程
     * @returns {Promise<void>}
     */
    async start() {
        if (!isWindow()) await this.isok();
        // 开启子进程
        const n = cp.fork(this.name, {execArgv:[]});
        worker[n.pid] = this.name;
        cbobj[n.pid] = this.callback;

        // 监听子进程exit事件,如果有退出,马上重启
        var _self = this;
        n.on('exit', function () {
            console.log('子进程 [' + worker[n.pid] + '] [' + n.pid + '] exited');
            // 重启子进程
            var path = worker[n.pid];
            if (path) {
                return _self.start();
            }
        });
        debugLog(worker);

        // 给子进程发送消息
        n.send(this.message);

        // 父进程接收消息
        n.on('message', (m) => {
            m.pid = n.pid;
            cbobj[n.pid](m);
        });
    }
}

let processMgr = new ProcessMgr();
module.exports = processMgr;
