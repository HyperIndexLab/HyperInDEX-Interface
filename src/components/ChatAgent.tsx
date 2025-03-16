"use client";

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSelector } from 'react-redux';
import { selectTokens } from '@/store/tokenListSlice';
import { getTokens, getPools, type Token as ExploreToken, type Pool } from '@/request/explore';

// 预定义问题选项
const QUICK_QUESTIONS = [
  { id: 'q1', text: 'What is HyperIndex?' },
  { id: 'q2', text: 'How do liquidity pools work?' },
  { id: 'q3', text: 'How to connect my wallet?' },
  { id: 'q4', text: 'What is impermanent loss?' },
  { id: 'q5', text: 'Which token has the highest potential on HyperIndex?' },
  { id: 'q6', text: 'Which liquidity pool offers the best returns?' }
];

// 消息类型定义
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  role?: 'user' | 'assistant' | 'system'; // 添加role属性用于API通信
}

// API响应类型
interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
      role: 'assistant';
    };
    index: number;
  }[];
}

// 定义统一的TokenData接口，兼容两种数据源的类型
interface TokenData {
  symbol?: string | null;
  name?: string | null;
  address: string;
  price?: string;
  tradingVolume?: string | number;
  change24H?: string;
  FDV?: string;
  decimals?: string | number | null;
  icon_url?: string | null;
}

// 添加一个安全的解析函数，处理各种格式的值
const safeParseFloat = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^0-9.-]+/g, '') || '0');
  }
  return 0;
};

// 修改格式化价格的函数，正确处理科学计数法
const formatPrice = (priceString: string | undefined): number => {
  if (!priceString) return 0;
  
  // 检查是否为 NaN
  if (priceString.includes('NaN') || priceString === 'undefined') {
    return 0;
  }
  
  try {
    // 处理科学计数法格式，包括可能有空格的情况如 "1.71 e-6"
    if (priceString.includes('e-') || priceString.includes('E-')) {
      
      // 移除美元符号
      const cleanString = priceString.replace('$', '');
      
      // 转换科学计数法为普通数字
      const floatValue = parseFloat(cleanString);
      
      // 检查是否为 NaN
      if (isNaN(floatValue)) {
        return 0;
      }
      
      return floatValue;
    }
    
    // 移除美元符号和其他非数字字符（保留小数点和负号）
    const numericValue = priceString.replace(/[^\d.-]/g, '');
    
    // 普通数字处理
    const floatValue = parseFloat(numericValue);
    
    // 检查是否为 NaN
    if (isNaN(floatValue)) {
      return 0;
    }
    
    return floatValue;
  } catch (error) {
    console.error('Error formatting price:', error);
    return 0; // 任何解析错误都返回零
  }
}

// 添加一个专门处理TVL值的函数
const parseTVL = (tvlString: string): number => {
  if (!tvlString || typeof tvlString !== 'string') return 0;
  
  // 移除美元符号和空格
  const cleanValue = tvlString.replace(/[$\s]/g, '');
  
  // 处理K后缀 (千)
  if (cleanValue.endsWith('K')) {
    return parseFloat(cleanValue.replace('K', '')) * 1000;
  }
  
  // 处理M后缀 (百万)
  if (cleanValue.endsWith('M')) {
    return parseFloat(cleanValue.replace('M', '')) * 1000000;
  }
  
  // 处理B后缀 (十亿)
  if (cleanValue.endsWith('B')) {
    return parseFloat(cleanValue.replace('B', '')) * 1000000000;
  }
  
  return parseFloat(cleanValue || '0');
};

// 修正函数来处理大整数格式的交易量，使用 decimals
const extractNumericValue = (volumeString: string | number | undefined, decimals?: string | number | null): number => {
  if (!volumeString) return 0;
  
  // 确定要使用的 decimals 值
  let decimalPlaces = 18; // 默认值
  if (decimals !== undefined && decimals !== null) {
    // 如果提供了 decimals，尝试转换为数字
    const parsedDecimals = parseInt(String(decimals), 10);
    if (!isNaN(parsedDecimals)) {
      decimalPlaces = parsedDecimals;
    }
  }
  
  try {
    // 如果已经是数字类型
    if (typeof volumeString === 'number') {
      return volumeString / (10 ** decimalPlaces);
    }
    
    // 处理字符串格式
    if (typeof volumeString === 'string') {
      // 移除所有非数字字符
      const cleanedString = volumeString.replace(/[^\d.-]/g, '');
      
      // 将字符串转换为数字并除以 10^decimals
      const numericValue = parseFloat(cleanedString) / (10 ** decimalPlaces);
      
      // 检查是否为有效数字
      if (isNaN(numericValue)) {
        return 0;
      }
      
      return numericValue;
    }
  } catch (error) {
    console.error('Error processing volume:', error);
  }
  
  return 0;
};

const ChatAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI assistant. How can I help you with HyperIndex today?',
      sender: 'agent',
      timestamp: new Date(),
      role: 'assistant'
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 获取Redux中的token数据
  const storeTokens = useSelector(selectTokens);
  
  // 本地缓存API数据
  const [exploreTokens, setExploreTokens] = useState<ExploreToken[]>([]);
  const [explorePools, setExplorePools] = useState<Pool[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // 获取API数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 只有在打开聊天窗口或选择相关问题时才加载数据
        if (isOpen || !dataLoaded) {
          const [tokensData, poolsData] = await Promise.all([
            getTokens(),
            getPools()
          ]);
          
          setExploreTokens(tokensData);
          setExplorePools(poolsData);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isOpen, dataLoaded]);

  // 抽象的AI请求函数
  const requestAIAnalysis = async (prompt: string, systemPrompt: string = '') => {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices[0].message.content;
  };

  // 分析函数：找出潜力最大的代币
  const analyzeBestToken = async () => {
    // 合并两个来源的token数据并转换为统一类型
    const allTokens: TokenData[] = [
      ...storeTokens.map(t => {
        // storeTokens 中没有 price 字段，我们需要从 exploreTokens 中查找匹配的代币
        const matchingExploreToken = exploreTokens.find(et => et.address === t.address);
        
        return {
          ...t,
          // 如果在 exploreTokens 中找到匹配的代币，使用其价格；否则默认为 '0'
          price: matchingExploreToken?.price || '0',
        } as unknown as TokenData
      }), 
      ...exploreTokens.filter(t => 
        !storeTokens.some(st => st.address === t.address)
      ).map(t => {
        return {
          ...t,
          price: t.price || '0', // 确保 price 字段存在
        } as unknown as TokenData
      })
    ];
    
    // 如果没有数据可分析，返回默认消息
    if (allTokens.length === 0) {
      return "I don't have enough data yet to analyze token potential. Please try again later when more market data is available.";
    }

    // 分析指标：交易量、价格变化、流动性池参与度
    // 根据实际数据计算得分
    const tokenScores = allTokens.map(token => {
      let score = 0;
      
      // 计算该代币参与了多少个流动性池
      const poolCount = explorePools.filter(pool => 
        pool.token0 === token.address || pool.token1 === token.address
      ).length;
      
      // 添加交易量与价格相乘的得分，使用安全解析函数和 decimals
      const volume = extractNumericValue(token.tradingVolume, token.decimals);
      const price = formatPrice(token.price?.replace('$', '') || '0');
      
      // 交易量与价格相乘，但需要归一化处理，避免数值过大
      // 使用对数函数来压缩大数值
      const volumeValue = volume * price;
      const volumeScore = Math.log10(volumeValue + 1) * 10; // +1 避免对数为负
      score += volumeScore;
      
      // 添加价格变化得分 (如果有)，使用归一化处理
      if (token.change24H && !token.change24H.includes('NaN')) {
        const change = safeParseFloat(token.change24H);
        
        // 归一化处理价格变化
        // 使用 sigmoid 函数将任何范围的变化值映射到一个合理的范围
        // 这样极端的价格变化不会过度影响总分
        const normalizedChange = 20 * (2 / (1 + Math.exp(-0.1 * change)) - 1);
        
        score += normalizedChange;
      }
      
      // 流动性池参与度 - 根据交易量调整权重
      // 如果交易量很低，则参与度的权重下降
      const poolWeight = 15; // 默认权重
      
      score += poolCount * poolWeight;
      
      // 如果是原生或稳定币加分
      if (token.symbol === 'HUSDT' || (token.name && typeof token.name === 'string' && token.name.includes('Stable'))) {
        score += 20;
      }
      
      return {
        token,
        score,
        poolCount,
        volumeValue, // 保存计算后的交易量价值，用于显示
        poolWeight // 保存池权重，用于调试
      };
    });
    
    // 排序并取前十名
    tokenScores.sort((a, b) => b.score - a.score);
    const topTokens = tokenScores.slice(0, 10);
    
    // 准备发送给AI的数据
    const tokenData = topTokens.map((item, index) => {
      const token = item.token;
      return {
        rank: index + 1,
        symbol: token.symbol || 'Unknown',
        name: token.name || 'Unknown Token',
        price: token.price ? formatPrice(token.price) : 0,
        change24H: token.change24H && !token.change24H.includes('NaN') ? token.change24H : 'N/A',
        tradingVolume: token.tradingVolume || '0',
        volumeValue: item.volumeValue,
        poolCount: item.poolCount,
        score: item.score
      };
    });
    
    const systemPrompt = `You are a cryptocurrency analyst specializing in token evaluation. 
                         You will analyze token data and provide insights on their potential.
                         Format your response as a professional analysis report with markdown formatting.`;
                         
    const userPrompt = `Based on the following token data from HyperIndex, analyze the top 3-5 tokens with the highest potential.
                           The tokens are already ranked by a scoring algorithm that considers trading volume, price changes, and liquidity pool participation.
                           
                           Token Data: ${JSON.stringify(tokenData, null, 2)}
                           
                           Please provide:
                           1. A brief introduction
                           2. Analysis of the top 3-5 tokens with their key metrics (price, 24h change, trading volume, liquidity pools)
                           3. A short explanation of why each token shows potential
                           4. A conclusion with general investment advice
                           
                           Format the response with proper markdown, including bold headers and bullet points.`;
    
    return await requestAIAnalysis(userPrompt, systemPrompt);
  };


  // 分析函数：找出收益最好的流动性池
  const analyzeBestPool = async () => {
    // 如果没有池数据可分析，返回默认消息
    if (explorePools.length === 0) {
      return "I don't have enough data yet to analyze pool returns. Please try again later when more market data is available.";
    }

    // 计算每个池子的综合得分
    const poolScores = explorePools.map(pool => {
      let score = 0;
      
      // TVL得分 (占比较高)
      const tvl = parseTVL(pool.TVL);
      if (tvl > 1000000) score += 50;
      else if (tvl > 500000) score += 40;
      else if (tvl > 100000) score += 30;
      else if (tvl > 10000) score += 20;
      else if (tvl > 1000) score += 10;
      
      // APY得分
      if (pool.APY > 100) score += 25;
      else if (pool.APY > 50) score += 20;
      else if (pool.APY > 20) score += 15;
      else if (pool.APY > 10) score += 10;
      else if (pool.APY > 0) score += 5;
      
      // 交易量得分
      if (pool.tradingVolume1D > 10000) score += 15;
      else if (pool.tradingVolume1D > 5000) score += 10;
      else if (pool.tradingVolume1D > 1000) score += 5;
      
      // 稳定币池加分（通常风险较低）
      if (pool.pairsName.toLowerCase().includes('husdt') || 
          pool.pairsName.toLowerCase().includes('usdc')) {
        score += 10;
      }
      
      return {
        pool,
        score
      };
    });
    
    // 按综合得分排序
    poolScores.sort((a, b) => b.score - a.score);
    
    // 取前十名
    const topPools = poolScores.slice(0, 10);
    
    // 准备发送给AI的数据
    const poolData = topPools.map((item, index) => {
      const pool = item.pool;
      return {
        rank: index + 1,
        pairsName: pool.pairsName,
        TVL: pool.TVL,
        APY: pool.APY,
        tradingVolume1D: formatVolume(pool.tradingVolume1D),
        tradingVolume30D: formatVolume(pool.tradingVolume30D),
        hasStablecoin: pool.pairsName.toLowerCase().includes('husdt') || pool.pairsName.toLowerCase().includes('usdc'),
        hasNativeToken: pool.pairsName.toLowerCase().includes('hsk') || pool.pairsName.toLowerCase().includes('whsk'),
        hasFeeToken: pool.pairsName.toLowerCase().includes('fee'),
        score: item.score
      };
    });
    
    const systemPrompt = `You are a DeFi analyst specializing in liquidity pool evaluation.
                         You will analyze pool data and provide insights on their potential returns.
                         Format your response as a professional analysis report with markdown formatting.`;
                         
    const userPrompt = `Based on the following liquidity pool data from HyperIndex, analyze the top 3-5 pools with the best potential returns.
                           The pools are already ranked by a scoring algorithm that considers TVL, APY, and trading volume.
                           
                           Pool Data: ${JSON.stringify(poolData, null, 2)}
                           
                           Please provide:
                           1. A brief introduction
                           2. Analysis of the top 3-5 pools with their key metrics (TVL, APY, trading volume)
                           3. A short explanation of why each pool shows potential
                           4. A conclusion with general advice about liquidity provision and risks
                           
                           Format the response with proper markdown, including bold headers and bullet points.`;
    
    return await requestAIAnalysis(userPrompt, systemPrompt);
  };

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 当聊天打开时自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 当用户发送第一条消息后，隐藏快速问题选项
  useEffect(() => {
    if (messages.length > 1) {
      setShowQuickQuestions(false);
    }
  }, [messages]);

  // 处理快速问题选择
  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    handleSendMessage(question);
  };

  // 处理发送按钮点击
  const handleSendButtonClick = () => {
    if (inputValue.trim() !== '' && !isTyping) {
      handleSendMessage();
    }
  };

  // 打开/关闭聊天窗口
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // 当重新打开聊天时，如果只有一条初始消息，则显示快速问题
    if (!isOpen && messages.length <= 1) {
      setShowQuickQuestions(true);
    }
  };

  // 转换消息格式用于API请求
  const formatMessagesForAPI = (msgs: Message[]) => {
    return msgs
      .filter(msg => msg.sender !== 'system') // 过滤掉系统消息
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
  };

  // 从API获取回复
  const getAIResponse = async (msgs: Message[]) => {
    try {
      setIsTyping(true);
      setIsError(false);
      
      // 检查特殊问题并提供自定义回答
      const lastMessage = msgs[msgs.length - 1].content;
      let aiResponse: string | null = null;
      
      // 检查是否是关于代币潜力的问题
      if (lastMessage.toLowerCase().includes('token') && 
          (lastMessage.toLowerCase().includes('potential') || lastMessage.toLowerCase().includes('highest'))) {
        aiResponse = await analyzeBestToken();
      } 
      // 检查是否是关于流动性池收益的问题
      else if ((lastMessage.toLowerCase().includes('pool') || lastMessage.toLowerCase().includes('liquidity')) && 
               (lastMessage.toLowerCase().includes('best') || lastMessage.toLowerCase().includes('return'))) {
        aiResponse = await analyzeBestPool();
      }
      
      // 如果是特殊问题，使用自定义回答
      if (aiResponse) {
        const newAIMessage: Message = {
          id: Date.now().toString(),
          content: aiResponse,
          sender: 'agent',
          role: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, newAIMessage]);
        setIsTyping(false);
        return;
      }
      
      // 否则，使用标准API回答
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formatMessagesForAPI(msgs),
        }),
      });

      // 获取速率限制信息
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (!response.ok) {
        if (response.status === 429) {
          // 处理速率限制错误
          const errorData = await response.json();
          let resetDate = new Date();
          if (rateLimitReset) {
            resetDate = new Date(parseInt(rateLimitReset) * 1000);
          } else if (errorData.reset) {
            resetDate = new Date(errorData.reset);
          }
          
          const resetTime = resetDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
          const resetDay = resetDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
          });
          
          throw new Error(`Daily message limit reached. You can send more messages after ${resetTime} on ${resetDay}.`);
        }
        throw new Error(`API responded with status ${response.status}`);
      }

      const data: ChatCompletionResponse = await response.json();
      const apiAiResponse = data.choices[0].message.content;

      // 创建新的AI消息
      const newAIMessage: Message = {
        id: Date.now().toString(),
        content: apiAiResponse,
        sender: 'agent',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newAIMessage]);
      
      // 如果剩余次数只有1次，提示用户
      if (rateLimitRemaining === '1') {
        setTimeout(() => {
          const warningMessage: Message = {
            id: `warning-${Date.now()}`,
            content: "⚠️ You have reached your last message for today. Please come back tomorrow for more assistance.",
            sender: 'agent',
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, warningMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsError(true);
      
      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: error instanceof Error ? error.message : "Sorry, I'm having trouble connecting. Please try again later.",
        sender: 'agent',
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 发送消息的主要逻辑
  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || inputValue;
    if (messageToSend.trim() === '' || isTyping) return;

    // 添加用户消息
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: 'user',
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');
    
    // 获取AI回复
    await getAIResponse(updatedMessages);
  };

  // 处理按键事件 (Enter键发送消息)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendButtonClick();
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 重试上一条消息
  const retryLastMessage = async () => {
    if (messages.length < 2 || isTyping) return;
    
    // 移除最后一条AI消息（如果最后一条是错误消息）
    if (messages[messages.length - 1].sender === 'agent') {
      const updatedMessages = messages.slice(0, -1);
      setMessages(updatedMessages);
      await getAIResponse(updatedMessages);
    }
  };

  // 格式化交易量
  const formatVolume = (volume: number) => {
    if (volume === 0) return '$0.00';
    if (volume < 1000) return `$${volume.toFixed(2)}`;
    if (volume < 1000000) return `$${(volume/1000).toFixed(2)}K`;
    return `$${(volume/1000000).toFixed(2)}M`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 聊天按钮 */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105"
          aria-label="Open chat"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="bg-[#1E2029] rounded-2xl shadow-2xl flex flex-col w-80 sm:w-96 h-[500px] transition-all duration-300 border border-gray-800 overflow-hidden animate-fadeIn">
          {/* 聊天头部 */}
          <div className="bg-gradient-to-r from-primary to-purple-700 p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                <Image 
                  src="https://hyperindex.4everland.store/index-coin.jpg" 
                  alt="HyperIndex Logo" 
                  width={32} 
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-white">HyperIndex AI Assistant</h3>
                <p className="text-xs text-white/70">Always here to help</p>
              </div>
            </div>
            <button 
              onClick={toggleChat}
              className="hover:bg-white/10 rounded-full p-2 transition-colors"
              aria-label="Close chat"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 聊天消息区域 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#1E2029] to-[#23242F]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'agent' && (
                  <div className="w-8 h-8 rounded-full bg-purple-700/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <Image 
                      src="https://hyperindex.4everland.store/index-coin.jpg" 
                      alt="HyperIndex Logo" 
                      width={24} 
                      height={24}
                      className="rounded-full"
                      unoptimized
                    />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-md ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white rounded-tr-none'
                      : message.content.includes("trouble connecting")
                        ? 'bg-red-900/30 text-gray-100 rounded-tl-none border border-red-800/50'
                        : 'bg-[#2A2D39] text-gray-100 rounded-tl-none'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="markdown-content text-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // 自定义渲染组件
                          p: ({children, ...props}: any) => <p className="mb-2 last:mb-0" {...props}>{children}</p>,
                          a: ({children, ...props}: any) => <a className="text-blue-300 hover:underline" {...props}>{children}</a>,
                          ul: ({children, ...props}: any) => <ul className="list-disc pl-5 mb-2" {...props}>{children}</ul>,
                          ol: ({children, ...props}: any) => <ol className="list-decimal pl-5 mb-2" {...props}>{children}</ol>,
                          li: ({children, ...props}: any) => <li className="mb-1" {...props}>{children}</li>,
                          h1: ({children, ...props}: any) => <h1 className="text-xl font-bold mb-2" {...props}>{children}</h1>,
                          h2: ({children, ...props}: any) => <h2 className="text-lg font-bold mb-2" {...props}>{children}</h2>,
                          h3: ({children, ...props}: any) => <h3 className="text-md font-bold mb-2" {...props}>{children}</h3>,
                          code: ({children, inline, ...props}: any) => 
                            inline 
                              ? <code className="bg-gray-700/50 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
                              : <code className="block bg-gray-700/50 p-2 rounded text-xs my-2 overflow-auto" {...props}>{children}</code>,
                          pre: ({children, ...props}: any) => <pre className="my-2" {...props}>{children}</pre>
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p className="text-xs mt-1 opacity-70 text-right">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                
                {message.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex-shrink-0 flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            
            {/* 快速问题选项 */}
            {showQuickQuestions && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2 text-center">Choose a question or type your own:</p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => handleQuickQuestion(question.text)}
                      className="bg-[#2A2D39] hover:bg-[#353745] text-left px-4 py-3 rounded-xl text-sm text-gray-200 transition-colors border border-gray-700/30"
                    >
                      {question.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 错误重试按钮 */}
            {isError && !isTyping && (
              <div className="flex justify-center">
                <button 
                  onClick={retryLastMessage}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-3 rounded-full"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* 正在输入提示 */}
            {isTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-700/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="https://hyperindex.4everland.store/index-coin.jpg" 
                    alt="HyperIndex Logo" 
                    width={24} 
                    height={24}
                    className="rounded-full"
                    unoptimized
                  />
                </div>
                <div className="bg-[#2A2D39] text-gray-100 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%] shadow-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 聊天输入区域 */}
          <div className="p-4 border-t border-gray-800 bg-[#23242F]">
            <div className="flex items-center gap-2 bg-[#2A2D39] rounded-xl p-1 pl-4 focus-within:ring-2 focus-within:ring-primary/40">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="bg-transparent border-none flex-1 resize-none focus:outline-none text-gray-200 py-2 max-h-20 text-sm"
                rows={1}
                disabled={isTyping}
              />
              <button
                onClick={handleSendButtonClick}
                disabled={inputValue.trim() === '' || isTyping}
                className={`p-3 rounded-xl transition-colors ${
                  inputValue.trim() === '' || isTyping
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90'
                }`}
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Powered by HyperIndex AI
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 添加动画到 globals.css
export default ChatAgent; 