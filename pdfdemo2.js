const puppeteer = require('puppeteer');

(async () => {

    const browser = await puppeteer.launch({
        headless: true,
        //不使用无头chrome模式
        // executablePath: 'C:\\Users\\ThinkPad\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        // executablePath: '/opt/google/chrome/',
        executablePath: '../chrome-win/chrome.exe',
        devtools: false,
        defaultViewport: {width: 1366, height: 768}
    });

    const page = await browser.newPage();

    // await page.emulate({
    //     'name': 'iPhone6',
    //     'userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    //     'viewport': {
    //         'width': 375,
    //         'height': 667,
    //         'deviceScaleFactor': 1,
    //         'isMobile': true,
    //         'hasTouch': true,
    //         'isLandscape': false
    //     }
    // });

    // let url = "https://mp.weixin.qq.com/s/-Aw8NGZrvBgiRD17_jEwaQ";
    // let url = "https://mp.weixin.qq.com/s/QrJ4lZUTxpHHwPrKjil2YA";
    let url = "https://mp.weixin.qq.com/s/OAnQiBsTS3DpU-yKJDyEPQ";
    // await page.goto(url, {timeout: 30000});
    await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 260000
    });
    //networkIdleTimeout: 15000参数代表当前页面网络处于idle状态
    // 至少15秒时导航完毕，避免导出的截图数据不全。
    console.log('start print img');
    await page.waitFor(15000);

    await autoScroll(page)
    // await page.waitFor(5000);

    // let imgPath = 'd:/img/' + new Date().getTime() + '.jpg';
    // const element = await page.$("div.rich_media_wrp");
    // await element.screenshot({
    //     path: imgPath
    // });

    await page.pdf({path: 'example125.pdf',});

    console.log('wait 15 second');

    //跳转页面，去绑定
    console.log('wait 15 second');
    await page.waitFor(15000);
    await browser.close();
})();

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
