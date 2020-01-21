'use strict';
const puppeteer = require('puppeteer');
const log4js = require('log4js');
const request = require('request');
const exec = require('./middlewares/shellUtils');
const nowNum = require('./middlewares/TimeMode');

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
let getIpUrl = "http://api.ipproxy.info:8422/api/getIp?type=1&num=1&pid=&unbindTime=900&cid=&orderId=O19050709452361455547&time=1567683376&sign=91e0624c578e233af40800633dbdd678&noDuplicate=0&dataType=1&lineSeparator=0&singleIp=0";

let hasDoneNum = 0;
let WSE_LIST = [];
let URL_1 = 'http://mjobh5.12582.cn/static/pages/pxpd/detail.html?isyyn=1&id=46010';
let URL_2 = 'http://mjobh5.12582.cn/static/pages/pxpd/detail.html?isyyn=1&id=73478';
let lastTime = new Date().getTime();
let totalTaskNum = 300;

async function main() {
    WSE_LIST.push({});
    await setInterval(async () => {
        await doTask();
    }, 10000);

    setInterval(async () => {
        try {
            logger.info(`start check kill_chrome`);
            let nowTime = new Date().getTime();
            if (nowTime - lastTime > 60 * 1000 * 3) {
                //超时3分钟了
                const cmd = `sudo sh kill_chrome.sh`;
                logger.info(`exec kill_chrome` + cmd);
                let count = await exec(cmd);
                logger.info(`kill_chrome,result=` + count);
            }
        } catch (e) {
            logger.info(`kill_chrome_error=${e.stack}`)
        }
    }, 30000);
}

async function doTask() {

    //检查是否是新的一天
    let nowDate = new Date();
    let hour = nowDate.getHours();
    let minutes = nowDate.getMinutes();
    if (hour === 0 && minutes === 0) {
        // 重置hasDoneNum
        hasDoneNum = 0;
        logger.info(`reset_hasDoneNum=0`);
        return;
    }

    if (hasDoneNum > totalTaskNum) {
        lastTime = new Date().getTime();
        logger.info("hasDoneNum=" + hasDoneNum);
        return;
    }

    //计算当前需要做的任务量
    let need = nowNum(totalTaskNum);
    if (hasDoneNum > need) {
        logger.info("cannot_do_task, need=" + need + ",hasDoneNum=" + hasDoneNum);
        return;
    }

    logger.info("do_task, need=" + need + ",hasDoneNum=" + hasDoneNum);

    //先获取可用的浏览器
    let browserItem = WSE_LIST.pop();
    if (browserItem == undefined) {
        logger.info("no_get_chrome_from_video");
        return;
    }

    //开始计时
    lastTime = new Date().getTime();

    let browser;
    let page;
    try {
        let proxy = await httpGet(getIpUrl);
        logger.info("proxy=" + proxy);

        browser = await puppeteer.launch({
            headless: false,
            // 不使用无头chrome模式
            // executablePath: 'C:\\Users\\ThinkPad\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
            executablePath: '/opt/google/chrome/google-chrome',
            devtools: false,
            args: [
                '--proxy-server=' + proxy,
                '--proxy-bypass-list=<-loopback>',
                '--no-sandbox',
                "--lang=zh_CN"
            ]
        });
        page = await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
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

        let url = URL_1;
        let r = Math.random();
        if (r > 0.5) {
            url = URL_2;
        }

        await page.goto(url);

        // addLog(mobile, 'do-mobile');
        //跳转页面，去绑定
        await page.waitFor(10000);
        logger.info('wait-for 1000');

        await page.$eval('#myVideo', el => el.play());
        logger.info('click-video');

        await page.waitFor(5000);
        let imgPath = '/tmp/mjobVideo/' + new Date().getTime() + '.jpg';
        await page.screenshot({path: imgPath, fullPage: true});
        logger.info('save-img');

        let plus = getRandomNum(100, 8000);
        let dur = 60000 + plus;
        await page.waitFor(dur);
        hasDoneNum += 1;
        logger.info('close_browser,hasDoneNum=' + hasDoneNum);

    } catch (e) {
        logger.error("do_video_error", e);
    } finally {
        if (page) {
            try {
                const client = await page.target().createCDPSession();
                await client.send('Network.clearBrowserCookies');
                await page.close();
            } catch (e) {
                logger.error("close_page_error", e);
            }
        }
        // 断开浏览器连接
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                logger.error("close_browser_error", e);
            }
        }
        WSE_LIST.push({});
        // 重新计时
        lastTime = new Date().getTime();
    }
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

function getRandomNum(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    return (Min + Math.round(Rand * Range));
}

main();

// for (let i = 0; i < 10; i++) {
//     let dd = getRandomNum(100, 1000);
//     console.log(dd);
// }

// let dd = nowNum(800);
// console.log(dd);



