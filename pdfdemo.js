const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        //不使用无头chrome模式
        // executablePath: 'C:\\Users\\ThinkPad\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        // executablePath: '/opt/google/chrome/',
        devtools: false,
        defaultViewport: {width: 1366, height: 768}
    });
    // const page = await browser.newPage();
    const page = await browser.newPage();
    let url = "https://mp.weixin.qq.com/s/-Aw8NGZrvBgiRD17_jEwaQ";
    // await page.goto(url);
    await page.goto(url, {timeout: 30000});
    // addLog(mobile, 'do-mobile');
    //跳转页面，去绑定
    console.log('wait 15 second');
    await page.waitFor(15000);

    try {
        console.log('start pdf print');
        await page.pdf({path: 'example.pdf',});

    } catch (e) {
        console.log(e);
    }
    console.log('done');

    await browser.close();
})();