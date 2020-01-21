// 文件读取中间件
const fs = require('fs');
const S = require('string');
const moment = require("moment");
const request = require('request');

/**
 * 创建文件夹
 * @param file
 * @returns {Function}
 */
function mkdir(file) {
    return function (fn) {
        fs.mkdir(file, fn);
    }
}

/**
 * 写入文件
 * @param {*} file
 */
function writeFile(file, context) {
    return function (fn) {
        fs.writeFile(file, context, fn);
    }
}

/**
 * 追加数据
 * @param {*} file
 */
function appendFile(file, context) {
    return function (fn) {
        fs.appendFile(file, context, fn);
    }
}

/**
 * 读文件
 * @param {*} file
 */
function readFile(file) {
    return function (fn) {
        fs.readFile(file, fn);
    }
}

/**
 * kill进程
 * @param pids
 */
async function kill(pids) {
    if (pids) {
        var pid_str = '';
        for (var i in pids) {
            pid_str += pids[i] + ' ';
        }
        await exec('kill -9 ' + pid_str);
    }
}

/**
 * debug日志
 * @param {string} msg
 */
function debugLog(msg) {
    if (global.debug) {
        var d = new Date();
        global.logger.info(d.toTimeString() + ":" + JSON.stringify(msg) + "\r\n");
    }
}

/**
 * 判断是不是今天 {true:今天，false:不是今天}
 * @param time 历史时间
 */
function isNowDay(time, zeroNo = false) {
    if (zeroNo && !time) return false;
    var flag = false,
        old = moment(time).dayOfYear(),
        now = moment().dayOfYear();
    if (now == old) {
        flag = true;
    }
    return flag;
}

/**
 * 判断是不是本周  {true:本周，false:不是本周}
 * @param time 历史时间
 */
function isNowWeek(time) {
    var flag = false,
        old = moment(time).isoWeek(),
        now = moment().isoWeek();
    if (now == old) {
        flag = true;
    }
    return flag;
}

/**
 * 获取区间范围的随机值
 * @param {*} min 
 * @param {*} max 
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 获取区间范围的随机值
 * @param {*} min 
 * @param {*} max 
 */
function getRandomBetween(min, max) {
    return Number(Math.random() * (max - min) + min).toFixed(2);
}

/**
 * 还原特殊字符
 * @param context 已转义的特殊字符
 */
function restoreSpecialChar(context) {
    context = S(context).replaceAll('<003259>', '\\"').s;
    context = S(context).replaceAll('<003258>', '\\\\').s;
    return context;
}

/**
 * 清除特殊字符
 * @param context 
 */
function clearSpecialChar(context) {
    context = S(context).replaceAll('\"', '').s;
    context = S(context).replaceAll('\\', '').s;
    return context;
}

/**
 * http请求
 * @param {*} url 
 */
function http(type, url, form) {
    if (!url) return;
    form = form || {};
    return new Promise((resolve, reject)=>{
        switch(type) {
            case 'get':
                request.get({
                    url: url,
                    headers: {
                        "Content-type": "application/x-www-form-urlencoded"
                    },
                    form: form
                },
                function(error, response, body) {
                    if (error) global.loggerError.error(`请求地址：${url}, 异常：${error}`);
                    global.logger.info(`请求地址：${url}, 结果：${JSON.stringify(body)}`);
                    resolve(body);
                })
            break;
            case 'post':
                request.post({
                    url: url,
                    headers: {
                        "Content-type": "application/x-www-form-urlencoded"
                    },
                    form: form
                },
                function(error, response, body) {
                    if (error) global.loggerError.error(`请求地址：${url}, 异常：${error}`);
                    global.logger.info(`请求地址：${url}, 结果：${JSON.stringify(body)}`);
                    resolve(body);
                })
            break;
            default:
                request.post({
                    url: url,
                    headers: {
                        "Content-type": "application/x-www-form-urlencoded"
                    },
                    form: form
                },
                function(error, response, body) {
                    if (error) global.loggerError.error(`请求地址：${url}, 异常：${error}`);
                    global.logger.info(`请求地址：${url}, 结果：${JSON.stringify(body)}`);
                    resolve(body);
                })
        }
    });
}

module.exports = mkdir;
module.exports = writeFile;
module.exports = appendFile;
module.exports = readFile;
module.exports = kill;
module.exports = debugLog;
module.exports = isNowDay;
module.exports = isNowWeek;
module.exports = getRandomInt;
module.exports = getRandomBetween;
module.exports = restoreSpecialChar;
module.exports = clearSpecialChar;
module.exports = http;