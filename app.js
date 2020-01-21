const config = require('./config');
const log4js = require('log4js');
const processMgr = require('./middlewares/processManager');
// const redis = require("./middlewares/redis");
const exec = require('./middlewares/shellUtils');
const http = require('./middlewares/tools');

// 初始化日志
log4js.configure(config.log);
let logger = log4js.getLogger(config.logcate);
global.logger = logger;
global.loggerError = log4js.getLogger('error');
global.plen = 0;
// const bindQueueSizeUrl = config.serverUrl + "/user/getBindQueueSize";
// const bindMobileUrl = config.serverUrl + "/user/getBindMobile";

class App {
    /**
     * 开启子进程
     */
    async openProcess(mobile) {
        const begin = Date.now();
        // 开启子进程,执行破解
        await processMgr.init('process', false, async function(data){
            if (data) {
                logger.info(`pid=${data.pid}, task=${data.task}, spend=${Date.now() - begin}`);
            }
            // 干掉完成任务的子进程
            await processMgr.kill(data.pid);
            await app.check();
        }, {'mobile': mobile}, logger);
    }

    /**
     * 开启容器,执行授权任务
     */
    async openAuthDocker() {
        // 开启子进程,容器授权
        await processMgr.init('docker', true, async function(data){}, {}, logger);
    }

    /**
     * 检查模拟器数量
     */
    async check() {
        const cmd = `ps -ef|grep '${config.checkchrom}'|grep -v grep -c`;
        logger.info(`执行检查命令: ${cmd}`);
        global.plen = await exec(cmd);
        logger.info(`检查结果: ${global.plen}`);
    }

    /**
     * kill模拟器
     */
    async kill() {
        // kill模拟器
        let cmd = `ps -ef|grep '${config.checkchrom}' | grep -v grep | awk '{print $2}' | xargs kill -9`;
        logger.info(`执行kill命令: ${cmd}`);
        await exec(cmd);

        // kill计时器
        cmd = `ps -ef|grep 'node timer.js' | grep -v grep | awk '{print $2}' | xargs kill -9`;
        logger.info(`执行kill命令: ${cmd}`);
        await exec(cmd);
    }
}

let app = new App();
app.openAuthDocker();
app.kill();

// 开启任务
// setInterval(async ()=>{
//     try {
//         if (global.plen >= config.plen) return;
//         const len = await http('get', bindQueueSizeUrl);
//         if (len > 0) {
//             logger.info(`手机号数量: ${len}`);
//             // 执行任务
//             let mobile = await http('get', bindMobileUrl);
//             if (!mobile) return;
//             logger.info(`获取到手机号: ${mobile}`);
//             await app.openProcess(mobile);
//             global.plen ++;
//         } else {
//             logger.info('没有可用的手机号');
//         }
//     } catch(e) {
//         logger.info(`打开子进程异常：${e.stack}`)
//     }
// }, 1000);

// 定时检查模拟器数量
setInterval(async ()=>{
    try {
        await app.check();
    } catch(e) {
        logger.info(`检查模拟器数量异常：${e.stack}`)
    }
}, 60000);



