'use strict';
const puppeteer = require('puppeteer');
const request = require('request');
const log4js = require('log4js');
const crypto = require('crypto');
const UUID = require('uuid');

let host = 'https://m.changyoyo.com/butler/mbrauthorization.htm?';
let secret = 'ae4101f5ec8f4e0a';
let serverUrl = 'http://114.55.185.124:8070/';
// 测试 畅游服务连接
// let serverUrl = 'http://172.27.83.63:8903/';
let channelSource = '02004342';
let merId = 'S1000478';
let basePath = "/tmp/changyou/";
let testFlag = 'false';

const updateUserUrl = serverUrl + "/user/updateUser";
const smsCodeUrl = serverUrl + "/user/getSmsCode?mobile=";
const addLogUrl = serverUrl + "/user/addLog?mobile=";
const bindMobileUrl = serverUrl + "/user/getBindMobile";
const exchangeScoreUrl = serverUrl + "/score/getExchangeScore?mobile=";
const MAX_WSE = 1;

let WSE_LIST = []; //存储browserWSEndpoint列表

let paramArray = [["channelSource", `${channelSource}`],
    ["jumpBack", "https%3a%2f%2fbaidu.com"],
    ["merId", `${merId}`],
    ["mobile", ""],
    ["uid", ""]];

const options = {
    appenders: {
        out: {
            type: "stdout",
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m%n",
                tokens: {
                    user(logEvent) {
                        if (logEvent.context.user) {
                            return logEvent.context.user;
                        }
                        return "";
                    }
                }
            }
        },
        log_file: {	//记录器2：输出到文件
            type: "file",
            filename: "logs/changyou2.log",
            maxLogSize: 10485760,
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m"
            },
            backups: 10,
            encoding: 'utf-8'
        },
        error_file: {//：记录器4：输出到error log
            type: "file",
            filename: "logs/changyou_error2.log",//您要写入日志文件的路径
            alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
            daysToKeep: 10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
            //compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m"
            },
            pattern: "yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
            encoding: 'utf-8'//default "utf-8"，文件的编码
        }
    },
    categories: {
        out: {
            appenders: ["out"],
            level: "info"
        },
        default: {
            appenders: ["log_file", "out"],
            level: "info"
        },
        error: {
            appenders: ['error_file'],
            level: 'error'
        }
    }
};

log4js.configure(options);
let logger = log4js.getLogger("default");
let loggerError = log4js.getLogger("error");


function createUrl(mobile) {
    let uid = UUID.v1();
    paramArray[4][1] = uid;
    paramArray[3][1] = mobile;

    let params = "";
    paramArray.forEach(function (item, index, array) {
        params += ("&" + item[0] + "=" + item[1])
    });
    params = params.substring(1);
    logger.info('params=' + params + ',mobile=' + mobile);
    let sign = crypto.createHash('md5').update(params + secret).digest("hex");
    let url = host + params + "&sign=" + sign;
    logger.info('url=' + url + ',mobile=' + mobile);
    return url;
}

async function doTask(mobile) {

    let browser = await puppeteer.launch({
        headless: false,
        //不使用无头chrome模式
        // executablePath: 'C:\\Users\\ThinkPad\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        devtools: false,
        ignoreHTTPSErrors: true,
        args: [
            // '--proxy-server='+proxy,
            // '--proxy-bypass-list=<-loopback>',
            '--no-sandbox',
            '-–user-data-dir',
            "--disable-gpu",
            '--lang=zh_CN',
            "--disable-gpu-program-cache",
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-zygote'
        ]
    });
    let page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
    await page.evaluateOnNewDocument(() => {
        delete navigator.__proto__.webdriver;
    });

    await page.evaluateOnNewDocument(() => {
        window.navigator.chrome = {
            runtime: {},
            getUserMedia: {},
        };
    });
    await page.emulate({
        'name': 'iPhone6',
        'userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
        'viewport': {
            'width': 375,
            'height': 667,
            'deviceScaleFactor': 1,
            'isMobile': true,
            'hasTouch': true,
            'isLandscape': false
        }
    });

    let url = createUrl(mobile);

    await page.goto(url, {timeout: 30000});
    // addLog(mobile, 'do-mobile');
    //跳转页面，去绑定
    await page.waitFor(5000);



    let currentUrl = page.url();
    logger.info('currentUrl=' + currentUrl + ',mobile=' + mobile);
    if (currentUrl.includes('exchange')) {
        // 如果是兑换页，则进行兑换
        logger.info('do-exchange,mobile=' + mobile);
        await doExchange(page, mobile, 0);
    } else {
        // 得到当前的畅游积分
        let points = await page.$eval('.points', el => el.textContent);
        let changYouScore = points.replace(",", "").replace(/[\r\n]/g,"").replace(" ","");

        changYouScore = Number(changYouScore);
        console.log("dd="+changYouScore+"=end");

        //检查去绑定是否存在
        let moveBind = await page.$eval('#CMCC_div .move-unbind', el => el.getAttribute('style').includes('block'));
        logger.info('moveBind=' + moveBind + ',mobile=' + mobile);
        //点击绑定
        await page.click('#CMCC_div');
        await page.waitFor(3000);
        if (moveBind) {
            let result = await doBind(page, mobile);
            if (result === 1) {
                await doExchange(page, mobile, changYouScore);
            }
        } else {
            await doExchange(page, mobile, changYouScore);
        }
    }
}

async function doBind(page, mobile) {
    logger.info('do-bind,mobile=' + mobile);
    //点击输入框
    await page.waitForSelector('.phone .ng-scope');
    await page.click('.phone .ng-scope');
    //输入手机号 等待显示输入号码页
    await page.waitFor(2000);
    logger.info('input mobile begin,mobile=' + mobile);
    //输入手机号
    await inputCode(page, mobile);
    logger.info('input mobile end,mobile=' + mobile);
    // 执行滑块认证
    await page.evaluate(() => success());
    logger.info('slider auth end,mobile=' + mobile);
    //点击发送短信验证码
    await page.click('.auth-code');
    logger.info('click send smsCode,mobile=' + mobile);
    await addLog(mobile, "click-send-smsCode-auth");

    await page.waitFor(1000);
    //点击确定
    page.click('.al_show a.overlayBtn');
    logger.info('click OK,mobile=' + mobile);
    await page.waitFor(1000);
    //点击短信验证码输入框
    page.click('.sms-code span');
    let smsCode;
    if (testFlag === 'test') {
        smsCode = '123456';
    } else {
        smsCode = await tryGetSmsCode(mobile);
        if (!smsCode) {
            logger.info('get smsCode failed mobile=' + mobile);
            await addLog(mobile, "get-smsCode-auth-failed");
            return 0;
        }
    }
    logger.info('smsCode=' + smsCode + ',mobile=' + mobile);
    await addLog(mobile, "get-smsCode-auth-success-" + smsCode);
    //输入短信验证码
    await inputCode(page, smsCode);
    await page.waitFor(500);
    //取消光标
    await page.click('.top h3 label');
    logger.info('click,mobile=' + mobile);
    await page.waitFor(500);
    //点击确定提交
    page.click('.content .btn');
    await page.waitFor(2000);

    let text = await page.$eval('.overlayDiv .info', el => el.textContent);
    logger.info('bind-result=' + text + ',mobile=' + mobile);
    //绑定成功
    if (!text.includes('成功')) {
        logger.info('bind-fail,mobile=' + mobile);
        await addLog(mobile, 'bind-fail');
        return 0;
    }

    //点击弹框中的确定
    page.click('.al_show a.overlayBtn');
    await page.waitFor(500);
    //绑定成功，更新状态到数据库  2已绑定
    await updateUserStatus(mobile, 2);

    logger.info('bind_success,mobile=' + mobile);
    return 1;
}

async function doExchange(page, mobile, changYouScore) {
    logger.info('doExchange,mobile=' + mobile);

    // await page.waitForSelector('#exchange', {timeout: 10000});
    // logger.info('waitForSelector#exchange');
    await page.waitFor(5000);

    logger.info('waitFor-3000,mobile=' + mobile);

    let canUsePoint = await page.$eval('.canUsePoint', el => el.textContent);
    logger.info('canUsePoint=' + canUsePoint + ',mobile=' + mobile);

    let ydScore = canUsePoint.split("：")[1].replace(",", "");
    logger.info('canUsePoint-number=' + ydScore + ',mobile=' + mobile);

    let needsChangYouScore = await getExchangeScore(mobile, ydScore, changYouScore);
    logger.info('needsChangYouScore=' + needsChangYouScore + ',mobile=' + mobile);
    if (needsChangYouScore === '-1') {
        await addLog(mobile, "no-changYouScore");
        return;
    }

    //输入需要兑换的畅游积分
    await page.$eval('#exchangepoints', el => el.value = '');
    await page.type('#exchangepoints', needsChangYouScore);
    await page.click('#ydbalance');

    let exchangepoints = await page.$eval('#exchangepoints', el => el.value);
    logger.info('exchangepoints=' + exchangepoints + ',mobile=' + mobile);

    let ydbalance = await page.$eval('#ydbalance', el => el.textContent);
    logger.info('ydbalance=' + ydbalance + ',mobile=' + mobile);
    // 更新移动积分和兑换的畅游积分
    await updateUserStatus(mobile, null, ydbalance, exchangepoints);

    // 触发兑换
    await page.tap('#exchange');
    await addLog(mobile, "send-smsCode-exchange");

    let smsCode;
    if (testFlag === 'test') {
        smsCode = '123456';
    } else {
        smsCode = await tryGetSmsCode(mobile);
        if (!smsCode) {
            logger.info('get-smsCode-exchange-failed,mobile=' + mobile);
            await addLog(mobile, "get-smsCode-exchange-failed");
            return;
        }
    }

    await addLog(mobile, "get-smsCode-exchange-success-" + smsCode);

    await page.click('#code');
    await page.type("#code", smsCode, {
        delay: 10
    });

    logger.info(`input exchange smsCode=${smsCode},mobile=${mobile}`);

    //检查兑换是否成功
    await page.waitFor(3000);
    //class="mui-toast-message"
    let nowUrl = page.url();
    logger.info('nowUrl=' + nowUrl + ',mobile=' + mobile);
    if (nowUrl.includes('exchange')) {
        logger.info('do-exchange-failed,mobile=' + mobile);
        await addLog(mobile, 'do-exchange-failed');
        return;
    }

    //绑定成功，更新状态到数据库  3已兑换
    await updateUserStatus(mobile, 3);

    logger.info('doExchange_success,mobile=' + mobile);
}

async function inputCode(page, code) {
    let numbers = await page.$$('.clearfix li');
    let codes = Array.from(code);
    for (let i = 0; i < codes.length; i++) {
        let m = codes[i];
        let n = parseInt(m);
        if (n != 0) {
            numbers[(n - 1)].click();
        } else {
            numbers[10].click();
        }
        await page.waitFor(100);
    }
}

//等待时间函数
function waitTime(delay) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
                try {
                    resolve(1)
                } catch (e) {
                    reject(0)
                }
            },
            delay);
    });
}

function updateUserStatus(mobile, status, score, changYouScore) {
    return new Promise((resolve, reject) => {
        let forms = {
            mobile: mobile
        };
        if (status) {
            forms["status"] = Number(status);
        }
        if (score) {
            forms["score"] = Number(score);
        }
        if (changYouScore) {
            forms["changYouScore"] = Number(changYouScore);
        }
        request.post({
                url: updateUserUrl,
                headers: {
                    "Content-type": "application/x-www-form-urlencoded"
                },
                form: forms
            },
            function (error, response, body) {
                if (error) loggerError.info('back-error=' + error.message);
                logger.info('back-response=' + body);
                resolve(body);
            })
    });
}

//http://172.27.83.63:8903/score/getClickTimes?mobile=13179010881&score=800
async function getExchangeScore(mobile, dyScore, hasChangYouScore) {
    let url = exchangeScoreUrl + mobile + '&dyScore=' + dyScore + '&hasChangYouScore=' + hasChangYouScore;
    logger.info('exchangeScoreUrl=' + exchangeScoreUrl + ',mobile=' + mobile + ',dyScore=' + dyScore + ',hasChangYouScore=' + hasChangYouScore);
    return await httpGet(url);
}

async function addLog(mobile, message) {
    let url = addLogUrl + mobile + '&message=' + message;
    return await httpGet(url);
}

async function tryGetSmsCode(mobile) {
    await waitTime(15000);
    let times = 0;
    while (times < 15) {
        logger.info('get_sms_code ' + times + ',mobile=' + mobile);
        let val = await httpGet(smsCodeUrl + mobile);
        // let val = await redis.get(key);
        logger.info('mobile=' + mobile + ',value=' + val + ',times=' + times);
        if (val) {
            return val;
        }
        await waitTime(3000);
        ++times;
    }
    return null;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        request.get({
                url: url,
                headers: {
                    "Content-type": "application/x-www-form-urlencoded"
                }
            },
            function (error, response, body) {
                if (error) {
                    logger.info('back-error=' + error.message);
                }
                logger.info('back-response=' + body);
                resolve(body);
            })
    });
}

let mobile = '13758466647';
doTask(mobile);