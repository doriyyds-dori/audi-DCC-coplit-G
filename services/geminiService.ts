
import { GoogleGenAI, Chat } from "@google/genai";
import { DOJO_SYSTEM_INSTRUCTION } from '../constants';

// Initialize the API client according to instructions.
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

export const startDojoSession = async (): Promise<string> => {
  try {
    // Using 'gemini-3-pro-preview' for complex reasoning/roleplay tasks as per model selection guidelines.
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: DOJO_SYSTEM_INSTRUCTION,
        temperature: 0.9, // Higher temperature for more natural/varied persona responses
      },
    });

    // Start the conversation
    const response = await chatSession.sendMessage({ 
        message: "喂？是奥迪展厅吗？我看到你们E5的广告了。" 
    });
    // Accessing .text as a property on GenerateContentResponse.
    return response.text || "喂？";
  } catch (error) {
    console.error("Failed to start Dojo session:", error);
    return "系统错误：无法连接到 AI 陪练。请检查您的 API Key。";
  }
};

export const sendDojoMessage = async (userMessage: string): Promise<string> => {
  if (!chatSession) {
    return "错误：会话未开始。";
  }
  try {
    const response = await chatSession.sendMessage({ message: userMessage });
    // Accessing .text as a property on GenerateContentResponse.
    return response.text || "...";
  } catch (error) {
    console.error("Dojo message failed:", error);
    return "通话中断 (网络错误)。";
  }
};

export const generateSummaryEnhancement = async (jsonString: string): Promise<string> => {
  try {
    const prompt = `
      你是一个专业的汽车CRM数据专员。请根据提供的JSON数据（包含客户基础信息、需求画像、通话操作日志），生成一段标准的【电话邀约跟进记录】。

      输入数据:
      ${jsonString}

      请严格按照以下格式输出（不要包含JSON格式，直接输出文本）：

      【客户画像】
      客户：[电话] [性别] 
      意向车系：[车系]
      需求标签：[将需求画像整合成短句，如“增购/家庭出游/有小孩”]

      【沟通摘要】
      [根据日志中的“开场”、“介绍”、“异议处理”等操作，总结沟通了哪些核心卖点，以及客户的关注点]

      【后续计划】
      [根据日志中是否有“敲定时间”或“加微”动作，判断下一步计划。若无明确动作，默认为“持续跟进”]
    `;
    
    // Using 'gemini-3-flash-preview' for basic text tasks like summarization.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Accessing .text as a property on GenerateContentResponse.
    return response.text || "生成记录失败";
  } catch (error) {
    console.warn("Summary enhancement failed, returning raw log", error);
    return "AI 服务暂时不可用，请手动整理日志。";
  }
};
