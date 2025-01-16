import type { Browser } from "puppeteer";
import fs from 'fs'

export const login = async (browser: Browser, username: string, password: string) => {
    const page = await browser.newPage();
    // 如果没有登录，则自动登录
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    console.log('logint page loaded')
    // 输入用户名和密码
    await page.type('#username', username);
    await page.type('#password', password);
    // 点击登录按钮
    await page.click('button[type="submit"]');
    console.log('logint submited')
    // 等待导航完成
    await page.waitForSelector('.global-nav__me', { visible: true });
    console.log('login success')

    // 获取当前页面的 Cookie
    const cookies = await browser.cookies();
    console.log('Cookies retrieved');

    // 将 Cookie 保存到本地文件
    fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved to cookies.json');

    await page.close()
    console.log('login page closed')
}