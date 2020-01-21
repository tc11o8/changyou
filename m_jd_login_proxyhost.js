const  jd_code_verify=require("./jd_code_verify")
const redisClient = require("./middlewares/redis")
const liuguan_proxy=require("./liuguan_proxy");
const proxy_host=require("./config/proxy_host");

const puppeteer = require('puppeteer');
const cpuStat = require('cpu-stat');
const log4js = require('log4js');
const http = require('http');
const fs=require("fs");



let JD_LOGIN_TASK_KEY="JD_LOGIN_TASK_KEY";
let basePath = "/tmp/puppeteer/m_jd_login/";
let args = process.argv.slice(2);
let threadCount = parseInt(args[0]);
let testFlag=args[1];
console.log(testFlag);


let proxyHostArr=[];
const MAX_WSE = threadCount;  //启动几个浏览器
let WSE_LIST = []; //存储browserWSEndpoint列表
let taskDoingCount=0;

let sleepTime=1000*3;

const options = {
    appenders: {
        out: {
            type: "stdout",
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m%n",
                tokens: {
                    user( logEvent ) {
                        if ( logEvent.context.user ) {
                            return logEvent.context.user;
                        }
                        return "";
                    }
                }
            }
        },
        file: {
            type: "file",
            filename: "logs/access.log",
            maxLogSize: 10485760,
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m%n"
            },
            backups: 10,
            compress: true
        },
        cached_url: {
            type: "file",
            filename: "logs/cached_url.log",
            maxLogSize: 10485760,
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m%n"
            },
            backups: 10,
            compress: true
        }
    },
    categories: {
        "out": {
            appenders: [ "out" ],
            level: "info"
        },
        "cached_url":{
            appenders:["cached_url","out"],
            level:"info"
        },
        default: {
            appenders: [ "file","out" ],
            level: "info"
        }
    }
}
log4js.configure( options );

var log = log4js.getLogger( "file" );

var cached_url_log = log4js.getLogger( "cached_url" );




const init =async ()=>{
    for(let i=0;i<MAX_WSE;i++){
        let userDataDir = basePath + "userDataDir/" +i;
        const browser = await puppeteer.launch({
             //devtools:true,
             //headless:false,
            userDataDir: userDataDir,
            ignoreHTTPSErrors:true,
            args: [
                "--proxy-server="+proxy_host.host,
                '--no-sandbox',
                "--disable-gpu",
                "--lang=zh_CN",
                "--start-maximized",
                "--disable-gpu-program-cache",
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]});
        let browserWSEndpoint = await browser.wsEndpoint();
        let browserItem={
            browserWSEndpoint:browserWSEndpoint,
            userDataDir:userDataDir
        }

        WSE_LIST[i] = browserItem;
    }
    console.log(WSE_LIST);
    return WSE_LIST;
}



async function main() {
    await init();
    await setInterval(async () => {
        cpuStat.usagePercent(async function (err, percent, seconds) {
            if (err) {
                return log.info(err);
            }
            if (percent > 60) {
                // log.info("cpu " + percent + "%" + ",线程池剩余:" + WSE_LIST.length+ "线程执行数量:" + taskDoingCount);
                return;
            }
            await doTask();
        });
    }, 100);
};
main();




async function doTask( ) {
    /**
     *
     * 1、打开浏览器终端，如果打不开则退出
     * 2、获取任务，如果没有任务则退出
     * 3、打开新的proxy，如果为空则退出
     * 4、打开新的page，设置参数
     *
     */



    let browserItem = WSE_LIST.pop();
    if (browserItem == undefined) {
        return
    }


    let browser ;
    let page


    let task;
    try {
        browser = await puppeteer.connect({browserWSEndpoint:browserItem.browserWSEndpoint});




        taskDoingCount++;
        page = await browser.newPage();
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
            'name': 'test',
            'userAgent': mobileDevice.userAgent,
            'viewport': {
                'width': mobileDevice.width,
                'height': mobileDevice.height,
                'deviceScaleFactor': 1,
                'isMobile': true,
                'hasTouch': true,
                'isLandscape': false
            }
        });
        log.info(browserItem.userDataDir+": start browser")

        console.time(browserItem.userDataDir);



        const response = await page.goto(mobileDevice.taskUrl);
        page.on("response",async response=>{
            let url=await response.url();
            let text=await response.text();
            if(url.startsWith("https://jcap.m.jd.com/cgi-bin/api/check")){
                // log.info(text);
                let checkResult=JSON.parse(text);
                if(checkResult.code==0){
                    if(checkResult.tp==2){
                        //TODO 需要做验证码校验
                        verify_captcha(page,browserItem.userDataDir);
                    }
                }
            }
            else if(url.startsWith("https://jcap.m.jd.com/cgi-bin/api/refresh")){
                verify_captcha(page,browserItem.userDataDir);
            }
        });
        console.timeEnd(browserItem.userDataDir);

        for(let x=0;x<3;x++) {
            for (let i = 0; i < 100; i++) {
                task = await getTaskFromRedis();

                if (task != null) {
                    log.info(browserItem.userDataDir+"::"+task);
                    break;
                }
                await sleep(100);
            }
            if (task == null) {
                log.info("没有获取到任何任务");
                return;
            }
            await sleep(randomInt(100,2000))

            let i =0;
            while(true){
                i++;
                const img_loading_display = await page.evaluate(() => {
                    const img_loading = document.querySelector("div.img_loading");
                    if (img_loading) {
                        return img_loading.style.display;
                    } else {
                        return null;
                    }
                })

                log.info(browserItem.userDataDir+" after click:"+"img_loading.display " +img_loading_display);
                if(img_loading_display!=null&&img_loading_display!='none'&&i<100){
                    await sleep(100);
                }
                else{
                    break;
                }
            }
            // log.info(mobile);
            // await page.evaluate(() => {
            //     document.getElementById("username").value = "";
            //     document.getElementById("username").focus();
            //     document.querySelector("i.icon.icon-clear").click();
            //     document.getElementById("pwd").value = "";
            //     document.getElementById("pwd").focus();
            //     document.querySelector("i.icon.icon-clear.pwd-clear").click();
            // });
            // log.info(task.mobile+"clear");

            await page.click("#username","");
            for(let i=0;i<15;i++){
                await page.keyboard.press('Backspace');
            }
            await page.click("#pwd","");
            for(let i=0;i<15;i++){
                await page.keyboard.press('Backspace');
            }

            await page.type("#username", task.mobile + "", {delay: randomInt(30,40)});
            await page.type("#pwd", "888888", {delay: randomInt(30,40)});
            console.time("login" + task.mobile);

            //MLoginRegister_Login
            let btn=await page.waitForSelector("a.btn.J_ping");
            await sleep(100)
            await page.click("a.btn.J_ping");
            // log.info(task.mobile+"click");

            const domloginresponse = await page.waitForResponse("https://plogin.m.jd.com/cgi-bin/mm/domlogin");
            const text = await domloginresponse.text();
            log.info(browserItem.userDataDir+":"+task.mobile + ":" + text);
            let responseBody = JSON.parse(text);
            let errcode = responseBody.errcode;
            let result = -1;
            if (errcode == 7) {
                result = 0
            }
            else if (errcode == 6) {
                result = 1;
            }

            notify(task.notifyUrl, task.mobile, result);
            console.timeEnd("login" + task.mobile);
        }
    } catch (e) {
        log.error("open page error",e)
        if(task){
            try{
                notify(task.notifyUrl,task.mobile,-1);
            }catch (e) {

            }
        }
    }
    finally {
        if (page) {
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await page.close();
        }
        log.info(browserItem.userDataDir+" disconnect");
        await browser.disconnect();
        WSE_LIST.push(browserItem);
        log.info(browserItem.userDataDir+" disconnect"+WSE_LIST);

        taskDoingCount--;
    }
}

/**
 *
 * @param notifyUrl
 * @param mobile
 * @param result 0 表示没有注册，1表示已注册，-1表示失败，请重试
 * @returns {Promise<void>}
 */
async function notify(notifyUrl,mobile,result){
    try {

        if (notifyUrl && notifyUrl != "") {
            let url = notifyUrl + "?mobile=" + mobile + "&result=" + result;
            let req=http.get(url, function (res) {
                const {statusCode} = res;
                log.info(`[${url}] result is [${statusCode}]`)
            });
            req.on("error",(e)=>{
                log.error("",e)
            })
        } else {
            //
            log.info(notifyUrl + "?mobile=" + mobile + "&result=" + result);
        }
    }catch (e) {
        log.error("notify failed ",e)
    }

}

let btnClicked=false;
async function verify_captcha(page,userDateDir ) {

    let captcha_body_path=userDateDir+ "captcha_body.png";
    await page.waitForSelector("#captcha_modal")
        .then(async (captcha_body) => {
            while(true){
                const img_loading_display = await page.evaluate(() => {
                    const img_loading = document.querySelector("div.img_loading");
                    if (img_loading) {
                        return img_loading.style.display;
                    } else {
                        return null;
                    }
                })

                log.info(userDateDir+":"+"img_loading.display " +img_loading_display);
                if(img_loading_display!=null&&img_loading_display!='none'){
                    await sleep(100);
                }
                else{
                    break;
                }
            }

            log.info(userDateDir+"screenShot");
            await page.screenshot({
                path: captcha_body_path,
                clip:{
                    x:42,
                    y:311,
                    width:291,
                    height:233
                }
            });
            let captcha_body_buffer = fs.readFileSync(captcha_body_path);
            // log.info(captcha_body_buffer.toString("base64"));

            let result = await jd_code_verify(captcha_body_buffer.toString("base64"));
            // log.info(result);
            let xy = result.split(",");


            const rect = await page.evaluate(() => {
                const captcha_body = document.querySelector(".captcha_body");
                if (captcha_body) {
                    return {
                        x: captcha_body.getBoundingClientRect().x,
                        y: captcha_body.getBoundingClientRect().y
                    }
                } else {
                    return null;
                }
            })

            // log.info("==========" + (rect.x + parseInt(xy[0])) + "," + (rect.y + parseInt(xy[1])) + "================");
            await page.mouse.click(rect.x + parseInt(xy[0]) - 15, rect.y + parseInt(xy[1]) - 11, {delay: randomInt(500,1000)});
        }
    );


}
let mobileDevice={
    // taskUrl:'https://m.jd.com',
    taskUrl:'https://plogin.m.jd.com/user/login.action?appid=300&returnurl=https%3A%2F%2Fwqlogin2.jd.com%2Fpassport%2FLoginRedirect%3Fstate%3D1100113530596%26returnurl%3D%252F%252Fhome.m.jd.com%252FmyJd%252Fnewhome.action%253Fsceneval%253D2%2526ufc%253D1ccaca0a9090f1005f02ab5a22d3ad21%2526sid%253D8b83e31d87da7ed2a57ee75868b3e7ba&source=wq_passport',
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    width:375,
    height:812
}
let task=[];
let testMobile=13000000000
async function getTaskFromRedis(){
    if("test"===testFlag){
        return {
            mobile:testMobile++,
            notifyUrl:""
        }
    }


    let key=JD_LOGIN_TASK_KEY;
    let flag= await redisClient.lpop(key, function (err, value) {
        if(value!=null){
            log.info("redis value is "+value);
            task.push(JSON.parse(JSON.parse(value)));
            return task;
        }
    })
    if(flag){
        return task.pop();
    }
    return null;
}





let randomInt=function(min,max){
    return Math.floor(Math.random()*(max-min))+min;
}



function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
