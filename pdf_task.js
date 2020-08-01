const puppeteer = require('puppeteer');
const request = require('request');
const log4js = require('log4js');

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
            filename: "logs/wxpdf.log",
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
            filename: "logs/wxpdf_error.log",//您要写入日志文件的路径
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
let basePath = "/tmp/wxpdf/";
let WSE_LIST = []; //存储browserWSEndpoint列表
let taskUrl = "http://localhost:9100/pdf/get";
let MAX_WSE = 2;

const init = async () => {
    for (let i = 0; i < MAX_WSE; i++) {
        let userDataDir = basePath + "userDataDir/" + i;
        const browser = await puppeteer.launch({
            //devtools:true,
            //headless:false,
            headless: true,
            devtools: false,
            userDataDir: userDataDir,
            executablePath: '../chrome-win/chrome.exe',
            args: [
                // '--proxy-server='+proxy,
                // '--proxy-bypass-list=<-loopback>',
                '--no-sandbox',
                "--lang=zh_CN",
                '--disable-setuid-sandbox'
            ]
        });
        let browserWSEndpoint = await browser.wsEndpoint();
        let browserItem = {
            browserWSEndpoint: browserWSEndpoint,
            userDataDir: userDataDir
        };

        WSE_LIST[i] = browserItem;
    }
    logger.info(WSE_LIST);
    return WSE_LIST;
};

async function main() {
    await init();
    await doTask();
    // await setInterval(async () => {
    //     await doTask();
    // }, 5000);
}

async function doTask() {
    //先获取可用的浏览器
    let browserItem = WSE_LIST.pop();
    if (browserItem == undefined) {
        logger.info("no_get_chrome");
        return;
    }

    //然后获取要绑定的手机号
    let mpUrl = await httpGet(taskUrl);
    if (!mpUrl) {
        logger.info("no_get_mpUrl");
        WSE_LIST.push(browserItem);
        return;
    }

    let browser;
    let page;
    try {

        logger.info('get-mpUrl=' + mpUrl);
        logger.info('get-mpUrl-name=' + mpUrl.substring(27));

        browser = await puppeteer.connect({browserWSEndpoint: browserItem.browserWSEndpoint});
        page = await browser.newPage();
        // await page.setDefaultNavigationTimeout(30000);

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

        console.log(mpUrl);

        await page.goto(mpUrl, {
            waitUntil: 'networkidle0',
            timeout: 20000
        });

        //networkIdleTimeout: 15000参数代表当前页面网络处于idle状态
        // 至少15秒时导航完毕，避免导出的截图数据不全。
        console.log('start print pdf');
        await page.waitFor(10000);

        await autoScroll(page);

        let pdfFile = basePath + "/file/" + mpUrl.substring(27);

        await page.pdf({path: pdfFile});
        console.log("end_print,mpUrl=" + mpUrl);

    } catch (e) {
        logger.error("do_task_error,mpUrl=" + mpUrl, e);
    } finally {
        if (page) {
            try {
                const client = await page.target().createCDPSession();
                await client.send('Network.clearBrowserCookies');
                await page.close();
            } catch (e) {
                logger.error("close_page_error,mpUrl=" + mpUrl, e);
            }
        }
        logger.info(browserItem.userDataDir + " disconnect,mpUrl=" + mpUrl);
        // 断开浏览器连接
        if (browser) {
            await browser.disconnect();
        }

        WSE_LIST.push(browserItem);
        logger.info(browserItem.userDataDir + " disconnect" + WSE_LIST + ",mobile=" + mobile);
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
                    logger.info('httpGet-error=' + error.message);
                }
                logger.info('httpGet-response=' + body);
                resolve(body);
            })
    });
}

async function autoScroll(page) {
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            //滚动的总高度
            let totalHeight = 0;
            //每次向下滚动的高度 100 px
            let distance = 100;
            let timer = setInterval(() => {
                //页面的高度 包含滚动高度
                let scrollHeight = document.body.scrollHeight;
                //滚动条向下滚动 distance
                window.scrollBy(0, distance);
                totalHeight += distance;
                //当滚动的总高度 大于 页面高度 说明滚到底了。也就是说到滚动条滚到底时，以上还会继续累加，直到超过页面高度
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        })
    });
}

main();

// let mpUrl = "https://mp.weixin.qq.com/s/77AjVpduhvgdLLKhjNoRxw";
// console.log(mpUrl.substring(27));
