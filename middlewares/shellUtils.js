const shellUtil = require('shelljs');

async function exec(cmd) {
    let result;
    try {
        result = shellUtil.exec(cmd, {silent:true}).stdout;
    } catch(e) {
        console.log(`命令【${cmd}】, 执行异常: ${e.stack}`);
    }
    return result;
}

module.exports = exec;