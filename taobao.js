const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
        //不使用无头chrome模式
        // executablePath: 'C:\\Users\\ThinkPad\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        executablePath: '/opt/google/chrome/',
        devtools:false,
    defaultViewport: { width: 1366, height: 768 }
  });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
  });


  let url = 'http://mjobh5.12582.cn/static/pages/pxpd/detail.html?isyyn=1&id=46010';
  await page.goto(url);

  // addLog(mobile, 'do-mobile');
  //跳转页面，去绑定
  await page.waitFor(10000);

  let points = await page.$eval('#myVideo', el => el.play());
  await page.waitFor(10000);


  await page.goto('https://world.taobao.com/markets/all/sea/register');

  let frame = page.frames()[1];
  await frame.waitForSelector('.nc_iconfont.btn_slide');

  const sliderElement = await frame.$('.slidetounlock');
  const slider = await sliderElement.boundingBox();

  const sliderHandle = await frame.$('.nc_iconfont.btn_slide');
  const handle = await sliderHandle.boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + slider.width, handle.y + handle.height / 2, {
    steps: 50
  });
  await page.mouse.up();

  await page.waitFor(3000);

  // success!

  await browser.close();
}

run()