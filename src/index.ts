import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import puppeteer, { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path';
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { sendMessage } from './message.js'
import { login } from './login.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
// 读取环境变量
// const username = process.env.USERNAME;
// const password = process.env.PASSWORD;

const app = new Hono()

const browser: Browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null, // 禁用默认视口大小
  args: ['--window-size=1280,800']
});

browser.on('targetcreated', (target) => {
  console.log(`New target created: ${target.url()}`);
});

// 读取保存的 Cookie
const cookiePath = './cookies.json'
if (fs.existsSync(cookiePath)) {
  const cookieString = fs.readFileSync(cookiePath, 'utf-8')
  const cookies = JSON.parse(cookieString).filter((cookie: any) => cookie.expires / 1000 > Date.now() / 1000);
  console.log('Cookies loaded from file, length: ', cookies.length);

  // 设置 Cookie 到当前页面
  await browser.setCookie(...cookies);
  console.log('Cookies set');
}

// app.post('/launch', async (c) => {
//   // 启动浏览器
//   browser = await puppeteer.launch({ headless: false }); // headless: false 可以看到浏览器操作
//   return c.json({ 'success': true })
// })

app.post('/close', async (c) => {
  if (!browser) {
    return c.json({ 'success': false, 'error': 'not' })
  }
  // 关闭浏览器
  await browser.close();
  return c.json({ 'success': true })
})

app.post('/login', async (c) => {
  if (!browser) {
    return c.json({ 'success': false, 'error': 'browserNotStarted' })
  }
  const json = await c.req.json();
  if (!json.username || !json.password) {
    return c.json({ 'success': false, 'error': 'usernameOrPasswordRequired' })
  }
  await login(browser, json.username, json.password);
  return c.json({ 'success': true })
})

app.post('/message', async (c) => {
  const json = await c.req.json()
  const url = json.url;
  const message = json.message;
  if (!browser) {
    return c.json({ 'success': false, 'error': 'browserNotStarted' })
  }
  if (!url) {
    return c.json({ 'success': false, 'error': 'urlRequired' })
  }
  if (!message) {
    return c.json({ 'success': false, 'error': 'messageRequired' })
  }
  let result
  try {
    result = await sendMessage(browser, url, message)
  } catch (error) {
    console.error(error);
    return c.json({ 'success': false, 'error': 'sendMessageFailed' })
  }
  return c.json(result);
})

let port: number;
if (process.env.PORT) {
  port = Number(process.env.PORT)
} else {
  port = 3000
}

console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})

