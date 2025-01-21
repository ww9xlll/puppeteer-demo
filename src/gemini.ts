import { DynamicRetrievalMode, GoogleGenerativeAI } from "@google/generative-ai";
import { systemConfig } from './config.js'

const genAI = new GoogleGenerativeAI(systemConfig.google.apiKey);

const googleSearrch = {
    googleSearchRetrieval: {
        dynamicRetrievalConfig: {
            mode: DynamicRetrievalMode.MODE_DYNAMIC,
            dynamicThreshold: 1,
        },
    },
};

export const generateText = async (prompt: string): Promise<any> => {
    console.log('googleSearrchEnabled: ', systemConfig.google.searchEnable)
    const model = genAI.getGenerativeModel({ model: systemConfig.google.model! });
    const result = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [{
                    text: prompt
                }]
            }
        ],
        tools: systemConfig.google.searchEnable ? [googleSearrch] : [],
        generationConfig: {
            responseMimeType: "application/json",
        }
    })
    return JSON.parse(result.response.candidates![0].content.parts[0].text!);
}