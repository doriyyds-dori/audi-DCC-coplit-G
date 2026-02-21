
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { DOJO_SYSTEM_INSTRUCTION } from "../constants";

// Lazy initialization of the Google GenAI client
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please ensure it is configured in your environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// Module-level variable to maintain the state of the active Dojo chat session
let dojoChat: Chat | null = null;

/**
 * 结构化生成 AMS 记录，全面适配异常与正常通话结果
 */
export const generateSummaryEnhancement = async (data: any): Promise<{profile: string, record: string, plan: string}> => {
  try {
    const ai = getAI();
    const prompt = `
      你是一个奥迪DCC中心的高级CRM专家。请根据以下通话原始数据生成标准的【AMS系统记录】。
      
      上下文信息:
      - 客户基础: ${data.name}${data.gender}, 咨询车型: ${data.series}
      - 通话轨迹日志: 
      ${data.logs}
      
      关键判定结果: 
      ${data.outcome === 'APPOINTED' ? '【成功邀约】客户已同意大致的进店时间' : 
        data.outcome === 'UNDECIDED' ? '【待定】客户暂时无法确定进店时间或表示再看看' : 
        '【异常/未接通】通话未正常进行或被异常中断'}

      生成要求:
      1. profile: 客户画像。提取核心需求、性格标签、购买意向等级。如果是异常状态，注明具体异常原因。
      2. record: 通话总结。概括沟通的核心痛点、异议点及处理结果。
      3. plan: 跟进计划。必须具体！若是“已约”，计划应包含发送定位和提醒；若是“待定”，应包含下一次尝试触达的时间建议。

      请直接返回 JSON 格式，不要有任何 Markdown 标记。
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profile: { type: Type.STRING },
            record: { type: Type.STRING },
            plan: { type: Type.STRING }
          },
          required: ["profile", "record", "plan"]
        }
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error) {
    console.error("AMS Generation Error:", error);
    return {
      profile: "无法获取画像",
      record: "AI 整理失败，请参考操作轨迹日志进行手动整理。",
      plan: "建议尽快补录下一步动作。"
    };
  }
};

/**
 * 初始化 AI 陪练会话 (陈先生角色扮演)
 */
export const startDojoSession = async (): Promise<string> => {
  try {
    const ai = getAI();
    // Use gemini-3-pro-preview for complex reasoning and creative roleplay tasks
    dojoChat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: DOJO_SYSTEM_INSTRUCTION,
      },
    });
    // Trigger the initial response from the model to start the simulation
    const response = await dojoChat.sendMessage({ message: "你好，你是陈先生。请开始我们的对话。" });
    return response.text || "你好。";
  } catch (error) {
    console.error("Dojo Session Start Error:", error);
    return "AI 陪练暂时离线，请重试。";
  }
};

/**
 * 发送用户输入并获取陪练回复
 */
export const sendDojoMessage = async (message: string): Promise<string> => {
  try {
    // If session doesn't exist, try to start a new one
    if (!dojoChat) {
      await startDojoSession();
    }
    if (!dojoChat) throw new Error("Failed to initialize chat");

    const response = await dojoChat.sendMessage({ message });
    return response.text || "我不清楚你在说什么。";
  } catch (error) {
    console.error("Dojo Message Error:", error);
    return "通信失败，请检查连接。";
  }
};
