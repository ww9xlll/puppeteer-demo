import * as XLSX from 'xlsx';
import * as fs from 'fs';

export const readExcel = async (filePath: string): Promise<any[]> => {
    // 读取 Excel 文件
    const fileBuffer = fs.readFileSync(filePath);
    // 解析 Excel 文件
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    // 获取第一个工作表的名字
    const sheetName = workbook.SheetNames[0];
    // 获取第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    // 将工作表转换为 JSON 格式
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    // 输出解析后的数据
    // 将 JSON 数据转换为以表头为键的对象数组
    const header = jsonData[0]; // 第一行是表头
    const data = jsonData.slice(1); // 剩余行是数据
    const result = data.map((row: any[]) => {
        const obj: Record<string, any> = {};
        header.forEach((key: string, index: number) => {
            obj[key] = row[index]; // 将每一列的值映射到对应的表头键
        });
        return obj;
    });
    return result;
};

export const writeExcel = async (filePath: string, data: any[]): Promise<void> => {
    // 将数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    // 将工作表添加到工作簿中
    XLSX.utils.book_append_sheet(workbook, worksheet);
    // 将工作簿保存为 Excel 文件
    XLSX.writeFile(workbook, filePath);
};