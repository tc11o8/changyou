'use strict';
const puppeteer = require('puppeteer');
const request = require('request');
const config = require('./config');
const log4js = require('log4js');
const crypto = require('crypto');
const UUID = require('uuid');
const liuguan_proxy = require("./middlewares/liuguan_proxy");
const http = require('./middlewares/tools');
const cp = require('child_process');

const updateUserUrl = config.serverUrl + "user/updateUser";
const smsCodeUrl = config.serverUrl + "user/getSmsCode?mobile=";
const addLogUrl = config.serverUrl + "user/addLog?mobile=";
const clickTimesUrl = config.serverUrl + "score/getClickTimes?mobile=";
const host = config.host;
const secret = config.secret;

process.on('message', async (data) => {
    // 初始化日志
    log4js.configure(config.log);
    global.debug = config.debug;
    global.logger = log4js.getLogger(config.logcate);
    global.loggerError = log4js.getLogger('error');
    global.scanlen = 0;

    await openProcess();
    global.logger.info(`开始执行任务，手机号: ${data.mobile}`);
    await doTask(data.mobile);
});

let paramArray = [["channelSource", `${config.channelSource}`],
    ["jumpBack", "https%3a%2f%2fbaidu.com"],
    ["merId", `${config.merId}`],
    ["mobile", ""],
    ["uid", ""]];

/**
 * 开启子进程
 */
async function openProcess() {
    cp.exec('node timer.js', function (error, stdout, stderr) {
        if (error) {
            global.loggerError.error(`Error message: ${error.message}, Error code: ${error.code}, Signal received: ${error.signal}`);
        }
        // 如果超过限制时间,退出进程
        if (stdout == 1) {
            global.logger.info('timer over, close the process!');
            global.browser.close();
            process.send({task: false});
        }
    });
}

function createUrl(mobile) {

    let uid = UUID.v1();
    paramArray[4][1] = uid;
    paramArray[3][1] = mobile;

    let params = "";
    paramArray.forEach(function (item, index, array) {
        params += ("&" + item[0] + "=" + item[1])
    });
    params = params.substring(1);
    global.logger.info('params=' + params + ',mobile=' + mobile);
    let sign = crypto.createHash('md5').update(params + secret).digest("hex");
    let url = host + params + "&sign=" + sign;
    global.logger.info('url=' + url + ',mobile=' + mobile);
    return url;
}

let proxyHostArr = [];

let getProxyHost = async function () {
    let proxyHost = proxyHostArr.pop();
    if (proxyHost) {
        return proxyHost;
    }
    try {
        let res = await liuguan_proxy();
        console.info('proxy=' + res);
        let proxyHostData = res.split("\n");
        proxyHostData.forEach((host) => {
            if (host.indexOf(":") > 0)
                proxyHostArr.push(host);
        });
        return proxyHostArr.pop();
    } catch (e) {
        global.loggerError.error(`获取代理异常: ${e.message}`);
        return undefined;
    }
}


async function doTask(mobile) {

    // let proxy = await getProxyHost();
    // if (proxy===undefined||proxy.indexOf(":") <0) {
    //     return;
    // }

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
    global.logger.info('do-mobile=' + mobile);
    global.browser = browser;

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
        // 'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36',
        'userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
        // 'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
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

    try {
        await page.goto(url, {timeout: 15000});
    } catch (e) {
        global.loggerError.error(`当前步骤：请求页面超时，重新开启任务: ${e.message}, 手机号=${mobile}`);
        await browser.close();
        return await doTask(mobile);
    }
    await addLog(mobile, 'do-mobile');
    //跳转页面，去绑定
    await page.waitFor(2000);

    let currentUrl = page.url();
    global.logger.info('currentUrl=' + currentUrl + ',mobile=' + mobile);

    if (currentUrl.includes('exchange')) {
        global.logger.info('do-exchange,mobile=' + mobile);
        await doExchange(page, mobile);
    } else {
        //检查去绑定是否存在
        let moveBind = await page.$eval('#CMCC_div .move-unbind', el => el.getAttribute('style').includes('block'));
        global.logger.info('moveBind=' + moveBind + ',mobile=' + mobile);
        //点击绑定
        await page.waitForSelector('#CMCC_div');
        await page.click('#CMCC_div');
        await page.waitFor(3000);
        if (moveBind) {
            await doBind(page, mobile);
            await doExchange(page, mobile);
        } else {
            await doExchange(page, mobile);
        }
    }

    await page.waitFor(1000);
    await browser.close();
}

async function doBind(page, mobile) {
    global.logger.info('do-bind,mobile=' + mobile);
    //点击输入框
    await page.waitForSelector('.phone .ng-scope');
    await page.click('.phone .ng-scope');
    //输入手机号 等待显示输入号码页
    await page.waitFor(2000);
    global.logger.info('input mobile begin,mobile=' + mobile);
    //输入手机号
    await inputCode(page, mobile);
    global.logger.info('input mobile end,mobile=' + mobile);
    // 执行滑块认证
    await page.evaluate(() => success());
    global.logger.info('slider auth end,mobile=' + mobile);
    //点击发送短信验证码
    await page.click('.auth-code');
    global.logger.info('click send smsCode,mobile=' + mobile);
    await addLog(mobile, "click-send-smsCode-auth");

    await page.waitFor(1000);
    //点击确定
    page.click('.al_show a.overlayBtn');
    global.logger.info('click OK,mobile=' + mobile);
    await page.waitFor(1000);
    //点击短信验证码输入框
    page.click('.sms-code span');
    let smsCode;
    if (process.env.active == 'test') {
        smsCode = '123456';
    } else {
        // let key = "SMS:" + mobile + "changyou";
        smsCode = await tryGetSmsCode(mobile);
        if (!smsCode) {
            global.logger.info('get smsCode failed mobile=' + mobile);
            await addLog(mobile, "get-smsCode-auth-failed");
            return await fail(browser);
        }
    }
    global.logger.info('smsCode=' + smsCode + ',mobile=' + mobile);
    await addLog(mobile, "get-smsCode-auth-success-" + smsCode);
    //输入短信验证码
    await inputCode(page, smsCode);
    await page.waitFor(500);
    //取消光标
    await page.click('.top h3 label');
    global.logger.info('click,mobile=' + mobile);
    await page.waitFor(500);
    //点击确定提交
    page.click('.content .btn');
    await page.waitFor(2000);

    let text = await page.$eval('.overlayDiv .info', el => el.textContent);
    global.logger.info('bind-result=' + text + ',mobile=' + mobile);
    //绑定成功
    if (!text.includes('成功')) {
        global.logger.info('bind-fail,mobile=' + mobile);
        await addLog(mobile, 'bind-fail');
        return await fail(browser);
    }

    //点击弹框中的确定
    page.click('.al_show a.overlayBtn');
    await page.waitFor(500);
    //绑定成功，更新状态到数据库  2已绑定
    await updateUserStatus(mobile, 2);

    global.logger.info('bind_success,mobile=' + mobile);
}

async function doExchange(page, mobile) {
    global.logger.info('doExchange,mobile=' + mobile);

    // await page.waitForSelector('#exchange', {timeout: 10000});
    // global.logger.info('waitForSelector#exchange');
    await page.waitFor(5000);

    global.logger.info('waitFor-3000,mobile=' + mobile);

    let canUsePoint = await page.$eval('.canUsePoint', el => el.textContent);
    global.logger.info('canUsePoint=' + canUsePoint + ',mobile=' + mobile);

    let score = canUsePoint.split("：")[1].replace(",", "");
    global.logger.info('canUsePoint-number=' + score + ',mobile=' + mobile);

    let clickTimes = await getClickTimes(mobile, score);
    global.logger.info('clickTimes=' + clickTimes + ',mobile=' + mobile);

    clickTimes = Number(clickTimes);
    if (clickTimes < 0) {
        global.logger.info('no_enough_score,mobile=' + mobile);
        await addLog(mobile, "no_enough_score="+score);
        return await fail(browser);
    }

    // 点击 + 号 N次
    for (let i = 0; i < clickTimes; i++) {
        await page.tap('#add');
    }

    let exchangepoints = await page.$eval('#exchangepoints', el => el.value);
    global.logger.info('exchangepoints=' + exchangepoints + ',mobile=' + mobile);

    let ydbalance = await page.$eval('#ydbalance', el => el.textContent);
    global.logger.info('ydbalance=' + ydbalance + ',mobile=' + mobile);
    // 更新状态 2绑定
    await updateUserStatus(mobile, 2, ydbalance, exchangepoints);

    // 触发兑换
    await page.tap('#exchange');
    await addLog(mobile, "send-smsCode-exchange");

    let smsCode;
    if (process.env.active == 'test') {
        smsCode = '123456';
    } else {
        // let key = "SMS:" + mobile + "changyou";
        smsCode = await tryGetSmsCode(mobile);
        if (!smsCode) {
            global.logger.info('get smsCode2 failed mobile=' + mobile);
            await addLog(mobile, "get-smsCode-exchange-failed");
            return await fail(browser);
        }
    }

    await addLog(mobile, "get-smsCode-exchange-success-" + smsCode);

    await page.click('#code');
    await page.type("#code", smsCode, {
        delay: 10
    });

    global.logger.info(`input exchange smsCode=${smsCode},mobile=${mobile}`);

    //检查兑换是否成功
    await page.waitFor(3000);
    // let t1 = new Date().getTime();
    // await page.screenshot({ path: '/tmp/img/'+mobile+t1+'.jpg', fullPage: true });
    // try {
    //     let message = await page.$eval('.mui-toast-message', el => el.textContent);
    //     await addLog(mobile, 'exchange-message=' + message);
    //     global.logger.info('exchange-message=' + message + ',mobile=' + mobile);
    // } catch (e) {
    //     await addLog(mobile, 'no-exchange-message');
    //     global.logger.info('no-exchange-message,mobile=' + mobile);
    // }

    //class="mui-toast-message"
    let nowUrl = page.url();
    global.logger.info('nowUrl=' + nowUrl + ',mobile=' + mobile);
    if (nowUrl.includes('exchange')) {
        global.logger.info('do-exchange-failed,mobile=' + mobile);
        await addLog(mobile, 'do-exchange-failed');
        return await fail(browser);
    }

    //绑定成功，更新状态到数据库  3已兑换
    await updateUserStatus(mobile, 3);

    global.logger.info('doExchange_success,mobile=' + mobile);
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
            mobile: mobile,
            status: status
        };
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
                if (error) global.loggerError.info('back-error=' + error.message);
                global.logger.info('back-response=' + body);
                resolve(body);
            })
    });
}

//http://172.27.83.63:8903/score/getClickTimes?mobile=13179010881&score=800
async function getClickTimes(mobile, score) {
    let url = clickTimesUrl + mobile + '&score=' + score;
    global.logger.info('clickUrl=' + clickTimesUrl + ',mobile=' + mobile);
    return await http('get', url);
}

async function addLog(mobile, message) {
    let url = addLogUrl + mobile + '&message=' + message;
    return await http('get', url);
}

async function tryGetSmsCode(mobile) {
    await waitTime(10000);
    let times = 0;
    while (times < 12) {
        global.logger.info('get_sms_code ' + times + ',mobile=' + mobile);
        let val = await http('get', smsCodeUrl + mobile);
        // let val = await redis.get(key);
        global.logger.info('mobile=' + mobile + ',value=' + val + ',times=' + times);
        if (val) {
            return val;
        }
        await waitTime(5000);
        ++times;
    }
    return null;
}

/**
 * 本次请求失败，关闭浏览器
 * @param {} browser
 */
async function fail(browser) {
    process.send({task: false});
    return await browser.close();
}