import * as fs from 'fs';
import { parse } from 'yaml';

const yamlFile = fs.readFileSync('./config.yaml', 'utf8');

// 解析 YAML 文件
export const systemConfig = parse(yamlFile);
console.log('systemConfig: ', systemConfig)