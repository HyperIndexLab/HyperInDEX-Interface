import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitInfo, incrementRateLimit } from './rate-limit';

// 获取API密钥
const apiKey = process.env.OPEN_ROUTER_API_KEY;

// OpenRouter API的URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 基础系统提示
const BASE_SYSTEM_PROMPT = `You are an AI assistant for HyperIndex, a DeFi platform built on blockchain technology.

Key information about HyperIndex:
- HyperIndex is a decentralized exchange (DEX) platform
- It allows users to swap tokens, provide liquidity, and earn rewards
- HyperIndex uses HSK as its native token
- Users can create and manage liquidity pools
- The platform supports various blockchain wallets for connection

Your task is to be helpful, informative, and concise. Provide accurate information about blockchain concepts, DeFi, and HyperIndex features.
If you don't know the answer to a question, be honest and suggest where the user might find that information.

Respond in a friendly, professional manner and prioritize security best practices in your recommendations.`;

// 获取客户端IP地址
function getClientIp(req: NextRequest): string {
  // 尝试从Cloudflare或其他代理的头部信息获取IP
  const forwarded = req.headers.get('x-forwarded-for');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // 如果没有找到，返回一个默认值
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    // 获取客户端IP
    const clientIp = getClientIp(request);
    
    // 检查速率限制
    const rateLimitInfo = getRateLimitInfo(clientIp);
    
    // 如果已达到限制，返回429状态码
    if (rateLimitInfo.remaining <= 0) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          limit: rateLimitInfo.limit,
          reset: rateLimitInfo.resetAt.toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.floor(rateLimitInfo.resetAt.getTime() / 1000).toString()
          }
        }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { messages } = body;

    // 验证必需的请求数据
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // 确保有API密钥
    if (!apiKey) {
      console.error("OPEN_ROUTER_API_KEY is not defined");
      return NextResponse.json(
        { error: "OpenRouter API key is not configured" },
        { status: 500 }
      );
    }

    // 增加使用计数
    incrementRateLimit(clientIp);

    // 如果用户没有指定系统消息，添加默认的系统消息
    let hasSystemMessage = messages.some(m => m.role === 'system');
    
    const finalMessages = hasSystemMessage 
      ? messages 
      : [{ role: 'system', content: BASE_SYSTEM_PROMPT }, ...messages];

    // 准备发送给OpenRouter的请求
    const payload = {
      messages: finalMessages,
      model: "openai/gpt-3.5-turbo", // 默认模型，你可以根据需要更改
      max_tokens: 1000,
      temperature: 0.7,
      // OpenRouter特定的路由字段
      transforms: ["middle-out"], // 使用OpenRouter的中间输出功能
      route: "fallback" // 使用fallback路由策略
    };

    // 发送请求到OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://hyperindex.trade', // 你的网站URL
        'X-Title': 'HyperIndex Assistant' // 你的应用名称
      },
      body: JSON.stringify(payload)
    });

    // 检查响应
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API Error:", errorData);
      return NextResponse.json(
        { error: "Error from OpenRouter API", details: errorData },
        { status: response.status }
      );
    }

    // 返回OpenRouter的响应，并添加速率限制信息
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
        'X-RateLimit-Remaining': (rateLimitInfo.remaining - 1).toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitInfo.resetAt.getTime() / 1000).toString()
      }
    });
    
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 