import { Browser, type Page } from "puppeteer-core";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendMessage = async (browser: Browser, url: string, message: string): Promise<any> => {
    const page = await browser.newPage();
    // 获取浏览器窗口的大小
    const dimensions = await page.evaluate(() => {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    });
    await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
    });
    // 导航到 LinkedIn 个人主页
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
    } catch (error) {
        // 这里报错是正常的
    }

    console.log('page loaded');

    const pageUrl = page.url();
    console.log('page url: ' + pageUrl)
    if (pageUrl.includes('linkedin.com/404/')) {
        return { 'success': false, 'error': 'pageNotFound' }
    }
    if (pageUrl.includes('authwall')) {
        return { 'success': false, 'error': 'authwall' }
    }

    // 判断是否已登录
    const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('.global-nav__me');
    });
    console.log('isLoggedIn: ' + isLoggedIn)

    if (!isLoggedIn) {
        return { 'success': false, 'error': 'loginRequired' }
    }

    await page.waitForFunction(() => {
        const button = document.querySelector('button[aria-label^="Message "]') as HTMLButtonElement | null;;
        return button && !button.disabled;
    }, { timeout: 10000 });
    console.log('message button available!')
    await page.evaluate(() => {
        const button = document.querySelector('button[aria-label^="Message "]') as HTMLElement | null;
        if (button) {
            button.click();
        }
    });
    if (url.includes('linkedin.com/in/')) {
        await messageForIndividual(page, message);
    } else if (url.includes('linkedin.com/company/')) {
        await messageForCompany(page, message);
    }

    // 等待消息发送
    try {
        await page.waitForNetworkIdle({ timeout: 20000 });
    } catch (error) {
        console.error('Message check Failed', error);
    }
    await page.close()
    return { 'success': true }
}

const messageForIndividual = async (page: Page, message: string) => {
    // 输入消息内容
    const selector = '.msg-form__contenteditable';
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    console.log('msg-form__contenteditable loaded')

    // 输入内容
    await page.focus(selector);
    console.log('msg-form__contenteditable focused')
    await page.click(selector);
    console.log('msg-form__contenteditable clicked')
    await page.keyboard.press('A'); // 删除所有内容
    delay(2000);
    await page.keyboard.press('Backspace'); // 删除所有内容
    console.log('msg-form__contenteditable cleared')
    await page.keyboard.press('Backspace');
    delay(2000);

    try {
        await page.type(selector, message, { delay: 100 });
        console.log('msg-form__contenteditable typed')
    } catch (error: any) {
        console.log('msg-form__contenteditable typed failed')
        for (const char of message) {
            await page.keyboard.sendCharacter(char); // 逐个发送字符
            delay(100);
        }
        //await page.keyboard.type(message, { delay: 100 }); // Types slower, like a user
        console.log('msg-form__contenteditable typed by keyboard')
    }

    delay(2000);

    // 模拟按下 Cmd + Enter（macOS）或 Ctrl + Enter（Windows）
    if (process.platform === 'darwin') { // macOS
        await page.keyboard.down('Meta'); // 按下 Cmd 键
    } else { // Windows 或 Linux
        await page.keyboard.down('Control'); // 按下 Ctrl 键
    }
    await page.keyboard.press('Enter'); // 按下 Enter 键
    if (process.platform === 'darwin') {
        await page.keyboard.up('Meta'); // 松开 Cmd 键
    } else {
        await page.keyboard.up('Control'); // 松开 Ctrl 键
    }
    console.log('Cmd/Ctrl + Enter pressed');

    delay(2000);
}

const messageForCompany = async (page: Page, message: string) => {
    await page.waitForSelector('#msg-shared-modals-msg-page-modal-presenter-conversation-topic', { visible: true, timeout: 5000 });
    await page.select('#msg-shared-modals-msg-page-modal-presenter-conversation-topic', 'Service request');
    await page.type('#org-message-page-modal-message', message);

    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(button => button.outerText === 'Send message' || button.outerText === '发消息');
        if (button) {
            button.click(); // 在浏览器上下文中执行点击
        }
    });
}