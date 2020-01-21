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
            // "--disable-gpu",
            '--lang=zh_CN',
            // "--disable-gpu-program-cache",
            // '--disable-dev-shm-usage',
            // '--disable-setuid-sandbox',
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

    let url = 'http://mjobh5.12582.cn/static/pages/pxpd/detail.html?isyyn=1&id=46010';

    await page.goto(url, {timeout: 30000});
    // addLog(mobile, 'do-mobile');
    //跳转页面，去绑定
    await page.waitFor(10000);

    let points = await page.$eval('#myVideo', el => el.play());
    await page.waitFor(10000);

}

let mobile = '13758466647';
doTask(mobile);