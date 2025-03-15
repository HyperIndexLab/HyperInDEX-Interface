"use client";

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSelector } from 'react-redux';
import { selectTokens } from '@/store/tokenListSlice';
import { getTokens, getPools, type Token as ExploreToken, type Pool } from '@/request/explore';
import { Token as StoreToken } from '@/store/tokenListSlice';

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

  // 分析函数：找出潜力最大的代币
  const analyzeBestToken = () => {
    // 合并两个来源的token数据并转换为统一类型
    const allTokens: TokenData[] = [
      ...storeTokens.map(t => t as unknown as TokenData), 
      ...exploreTokens.filter(t => 
        !storeTokens.some(st => st.address === t.address)
      ).map(t => t as unknown as TokenData)
    ];
    
    // 如果没有数据可分析，返回默认消息
    if (allTokens.length === 0) {
      return "I don't have enough data yet to analyze token potential. Please try again later when more market data is available.";
    }

    // 分析指标：交易量、价格变化、流动性池参与度
    // 根据实际数据计算得分
    let tokenScores = allTokens.map(token => {
      let score = 0;
      
      // 计算该代币参与了多少个流动性池
      const poolCount = explorePools.filter(pool => 
        pool.token0 === token.address || pool.token1 === token.address
      ).length;
      
      // 添加交易量得分，使用安全解析函数
      const volume = safeParseFloat(token.tradingVolume);
      score += volume;
      
      // 添加价格变化得分 (如果有)
      if (token.change24H && !token.change24H.includes('NaN')) {
        const change = safeParseFloat(token.change24H);
        // 正变化加分，负变化减分
        score += change;
      }
      
      // 流动性池参与度
      score += poolCount * 10; // 每个池加10分
      
      // 如果是原生或稳定币加分
      if (token.symbol === 'HUSDT' || (token.name && typeof token.name === 'string' && token.name.includes('Stable'))) {
        score += 20;
      }
      
      return {
        token,
        score,
        poolCount
      };
    });
    
    // 排序并取前三名
    tokenScores.sort((a, b) => b.score - a.score);
    const topTokens = tokenScores.slice(0, 3);
    
    // 生成分析报告
    let response = `Based on my analysis of current data, here are the tokens with the highest potential on HyperIndex:\n\n`;
    
    topTokens.forEach((item, index) => {
      const token = item.token;
      response += `**${index + 1}. ${token.symbol || 'Unknown'} (${token.name || 'Unknown Token'})**\n`;
      
      // 添加价格信息
      if (token.price && token.price !== '$0.00') {
        response += `- Current price: ${token.price}\n`;
      }
      
      // 添加24小时变化
      if (token.change24H && !token.change24H.includes('NaN')) {
        const change = token.change24H;
        response += `- 24h change: ${change}\n`;
      }
      
      // 添加交易量
      if (token.tradingVolume && token.tradingVolume !== '0') {
        response += `- Trading volume: ${token.tradingVolume}\n`;
      }
      
      // 添加流动性池信息
      response += `- Present in ${item.poolCount} liquidity pools\n`;
      
      // 添加简短分析
      response += `- ${getTokenAnalysis(token)}\n\n`;
    });
    
    // 添加建议
    response += `**Remember:** Token potential depends on many factors including project development, community growth, and market adoption. The above analysis is based on current on-chain metrics only.\n\nAlways conduct your own research before investing.`;
    
    return response;
  };
  
  // 获取代币分析
  const getTokenAnalysis = (token: any) => {
    const symbol = token.symbol?.toLowerCase() || '';
    
    if (symbol.includes('usdt') || symbol.includes('usdc')) {
      return "Stablecoins provide reduced volatility and are useful for preserving value during market fluctuations";
    } else if (symbol === 'fee') {
      return "May be used for protocol fee distribution, potentially beneficial as platform adoption grows";
    } else if (symbol === 'mint') {
      return "If used for creating new tokens, could gain value as the platform expands";
    } else if (symbol === 'basic') {
      return "Core token with fundamental utility in the ecosystem";
    } else {
      return "Shows potential based on current metrics and network position";
    }
  };

  // 分析函数：找出收益最好的流动性池
  const analyzeBestPool = () => {
    // 如果没有池数据可分析，返回默认消息
    if (explorePools.length === 0) {
      return "I don't have enough data yet to analyze pool returns. Please try again later when more market data is available.";
    }
    
    // 分析指标：TVL、APY、交易量、交易对组合
    // 根据实际数据计算得分
    let poolScores = explorePools.map(pool => {
      let score = 0;
      
      // 添加TVL得分，使用安全解析函数
      const tvl = safeParseFloat(pool.TVL);
      score += tvl * 2;
      
      // 添加APY得分
      score += pool.APY * 5;
      
      // 添加交易量得分
      score += pool.tradingVolume1D * 2;
      score += pool.tradingVolume30D * 0.5;
      
      // 分析交易对的特性
      const pairSymbols = pool.pairsName.split('/');
      
      // 如果包含稳定币，加分
      if (pairSymbols.some(s => s.includes('HUSDT') || s.includes('USDC'))) {
        score += 20; // 稳定币对通常更安全
      }
      
      // 如果包含原生代币对，加分
      if (pairSymbols.some(s => s === 'HSK')) {
        score += 15; // 原生代币通常流动性更好
      }
      
      return {
        pool,
        score
      };
    });
    
    // 排序并取前三名
    poolScores.sort((a, b) => b.score - a.score);
    const topPools = poolScores.slice(0, 3);
    
    // 生成分析报告
    let response = `Based on my analysis of current data, here are the liquidity pools with the best potential returns on HyperIndex:\n\n`;
    
    topPools.forEach((item, index) => {
      const pool = item.pool;
      response += `**${index + 1}. ${pool.pairsName} Pool**\n`;
      
      // 添加TVL信息
      response += `- Total Value Locked: ${pool.TVL}\n`;
      
      // 添加APY信息
      if (pool.APY > 0) {
        response += `- APY: ${pool.APY}%\n`;
      } else {
        response += `- APY: Data not available yet\n`;
      }
      
      // 添加交易量信息
      if (pool.tradingVolume1D > 0 || pool.tradingVolume30D > 0) {
        response += `- 24h Trading Volume: ${formatVolume(pool.tradingVolume1D)}\n`;
        response += `- 30d Trading Volume: ${formatVolume(pool.tradingVolume30D)}\n`;
      } else {
        response += `- Trading Volume: Data accumulating\n`;
      }
      
      // 添加简短分析
      response += `- ${getPoolAnalysis(pool)}\n\n`;
    });
    
    // 添加建议
    response += `**Important to remember:** Providing liquidity carries risks, including impermanent loss. Higher APY often comes with higher risk. The above analysis is based on current metrics only.\n\nMonitor your positions regularly and adjust your strategy as market conditions change.`;
    
    return response;
  };
  
  // 格式化交易量
  const formatVolume = (volume: number) => {
    if (volume === 0) return '$0.00';
    if (volume < 1000) return `$${volume.toFixed(2)}`;
    if (volume < 1000000) return `$${(volume/1000).toFixed(2)}K`;
    return `$${(volume/1000000).toFixed(2)}M`;
  };
  
  // 获取流动性池分析
  const getPoolAnalysis = (pool: Pool) => {
    const pairName = pool.pairsName.toLowerCase();
    
    if (pairName.includes('husdt') || pairName.includes('usdc')) {
      return "Pools with stablecoins typically experience less impermanent loss, making them safer options for liquidity providers";
    } else if (pairName.includes('hsk') || pairName.includes('whsk')) {
      return "Includes the chain's native token, which often receives additional incentives and tends to have higher trading volume";
    } else if (pairName.includes('fee')) {
      return "May receive special incentives if FEE token is used for protocol fee distribution";
    } else {
      return "Shows potential based on current metrics and token composition";
    }
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
        aiResponse = analyzeBestToken();
      } 
      // 检查是否是关于流动性池收益的问题
      else if ((lastMessage.toLowerCase().includes('pool') || lastMessage.toLowerCase().includes('liquidity')) && 
               (lastMessage.toLowerCase().includes('best') || lastMessage.toLowerCase().includes('return'))) {
        aiResponse = analyzeBestPool();
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
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
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