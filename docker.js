const exec = require('./middlewares/shellUtils');
const config = require('./config');
const log4js = require('log4js');

// 初始化日志
log4js.configure(config.log);
let logger = log4js.getLogger(config.logcate);
let loggerError = log4js.getLogger('error');
global.debug = config.debug;
global.logger = logger;
global.dlen = 0;

/**
 * 容器管理类
 */
class DockerManager {
    /**
     * 启动容器
     */
    async start() {
        // 启动任务
        const cmd = `sudo docker run -e validWaitTimes=${config.validWaitTimes} -e top=${config.top} -e left=${config.left} -e width=${config.width} -e times=${config.times} -e smsTimes=${config.smsTimes} -e active=${process.env.active} -e secret=${config.secret} -e channelSource=${config.channelSource} -e merId=${config.merId} -e host=${config.host} -e imgAddress=${config.imgAddress} -e serverUrl=${config.serverUrl} -d -v /opt/changyouauth:/opt/logs ${config.image}`;
        logger.info(`执行启动命令: ${cmd}`);
        const container_id = await exec(cmd);
        logger.info(`容器ID: ${container_id}`);
    }

    /**
     * 删除容器
     */
    async kill() {
        const cmd = 'sudo docker kill `sudo docker ps -a -q`';
        logger.info(`执行kill命令: ${cmd}`);
        await exec(cmd);
    }

    /**
     * 回收容器
     */
    async recovery() {
        const cmd = 'sudo docker rm -v `sudo docker ps -a -q`';
        logger.info(`执行回收命令: ${cmd}`);
        await exec(cmd);
    }

    async check() {
        const cmd = `sudo docker ps | grep ${config.image} | grep -v grep -c`;
        logger.info(`执行检查命令: ${cmd}`);
        global.dlen = await exec(cmd);
        logger.info(`检查结果: ${global.dlen}`);
    }
}

process.on('message', async(m) => {
    if (process.env.active == 'prod' || process.env.active == 'test') {
        let dockerManager = new DockerManager();
        await dockerManager.kill();
        await dockerManager.recovery();
        setInterval(async ()=>{
            try {
                if (global.dlen >= config.dlen) return;
                await dockerManager.start();
                global.dlen ++;
            } catch(e) {
                loggerError.error(`打开容器异常：${e.stack}`)
            }
        }, 10000);

        // 定时检查容器数量
        setInterval(async ()=>{
            try {
                await dockerManager.check();
            } catch(e) {
                loggerError.error(`检查容器数量异常：${e.stack}`)
            }
        }, 60000);
    }
});
