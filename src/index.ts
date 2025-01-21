import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import puppeteer, { Browser } from 'puppeteer-core'
import fs from 'fs'
import { sendMessage } from './message.js'
import { login } from './login.js';
import { readExcel, writeExcel } from './excel.js'
import { generateText } from './gemini.js';
import { logger } from 'hono/logger';
import { systemConfig } from './config.js'

const app = new Hono()
app.use("*", logger())

const browser: Browser = await puppeteer.launch({
  executablePath: systemConfig.chromePath, // 指定系统中的 Chrome 路径
  headless: false,
  defaultViewport: null, // 禁用默认视口大小
  args: ['--window-size=1280,800']
});

// const browser: Browser = await puppeteer.connect({
//   browserWSEndpoint: 'ws://localhost:3000'
// });

browser.on('targetcreated', (target) => {
  //console.log(`New target created: ${target.url()}`);
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

// 定义替换函数
function renderPrompt(template: string, data: Record<string, string>): string {
  return template.replace(/{(\w+)}/g, (_, key) => data[key] || '');
}

app.post('/process', async (c) => {
  const json = await c.req.json();
  const path = json.path;
  if (!browser) {
    return c.json({ 'success': false, 'error': 'browserNotStarted' })
  }
  if (!path) {
    return c.json({ 'success': false, 'error': 'urlRequired' })
  }
  const excelArray = await readExcel(path)
  const excelOutputs: any[] = []
  for (const item of excelArray) {
    console.log('------------------');
    try {
      await new Promise(resolve => setTimeout(resolve, Number(systemConfig.sendInterval)));
      console.log("record:", item);
      const prompt = renderPrompt(systemConfig.template.prompt!, item);
      console.log("prompt:", prompt);
      const llmResult = await generateText(prompt)
      console.log("llm output:", llmResult);
      const excelOutput = { ...item, ...llmResult }
      if (llmResult.is_valid && llmResult.is_online_store && item.linkedin) {
        const combinedObj = Object.assign({}, item, llmResult);
        const sendResult = await sendMessage(browser, item.linkedin, combinedObj)
        console.log('发送结果: ', sendResult);
        excelOutput.sendResult = sendResult.success ? 'success' : 'failed';
      } else {
        console.log('跳过发送: ', item);
        excelOutput.sendResult = 'skipped';
      }
      excelOutputs.push(excelOutput)
    } catch (error) {
      console.error(error);
      const excelOutput = { ...item }
      excelOutput.excelOutput = 'error'
      excelOutputs.push(excelOutput)
    }
  }
  const outputPath = `./result-${Date.now().toString()}.xlsx`;
  writeExcel(outputPath, excelOutputs)
  return c.json({ 'success': true, 'output': outputPath })
})

let port: number;
if (systemConfig.port) {
  port = Number(systemConfig.port)
} else {
  port = 3000
}

console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})

