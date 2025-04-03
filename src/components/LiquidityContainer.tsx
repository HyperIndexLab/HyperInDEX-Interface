"use client";

import React, { useState, useEffect } from "react";
import TokenModal from "./TokenModal";
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { WHSK } from "@/constant/value";
import {
  ROUTER_CONTRACT_ADDRESS,
  ROUTER_ABI,
} from "@/constant/ABI/HyperIndexRouter";
import { useLiquidityPool } from "@/hooks/useLiquidityPool";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { StepIndicator } from "./StepIndicator";

import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { fetchTokenList, selectTokens } from "@/store/tokenListSlice";
import { AppDispatch } from "@/store";
import { getPools, Pool } from "@/request/explore";
import { formatTokenBalance } from "@/utils/formatTokenBalance";
import { estimateAndCheckGas } from "@/utils";
import { useToast } from "@/components/ToastContext";

interface LiquidityContainerProps {
  token1?: string;
  token2?: string;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  balance?: string;
  decimals?: string | null;
}

const DEFAULT_HSK_TOKEN: TokenData = {
  symbol: "HSK",
  name: "HyperSwap Token",
  address: WHSK,
  icon_url: "/img/HSK-LOGO.png",
  decimals: "18",
};

const getDefaultTokenIcon = (tokenData: TokenData | null) => {
  if (!tokenData) return "/img/HSK-LOGO.png";
  
  // 如果是 HSK，使用 HSK 图标
  if (tokenData.symbol === "HSK") {
    return "/img/HSK-LOGO.png";
  }
  
  // 其他 ERC20 代币使用通用图标
  return "https://hyperindex.4everland.store/index-coin.jpg";
};

const LiquidityContainer: React.FC<LiquidityContainerProps> = ({
  token1 = "HSK",
  token2 = "Select token",
}) => {
  const tokens = useSelector(selectTokens);
  const dispatch = useDispatch<AppDispatch>();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"token1" | "token2">("token1");
  const { address: userAddress } = useAccount();
  const [token1Data, setToken1Data] = useState<TokenData | null>(null);
  const [token2Data, setToken2Data] = useState<TokenData | null>(null);
  const [step, setStep] = useState(1);
  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [isPending, setIsPending] = useState(false);
  const {
    writeContract,
    isPending: isWritePending,
    isSuccess: isWriteSuccess,
    isError: isWriteError,
    error: writeError,
  } = useWriteContract();
  const { toast } = useToast();


  const { 
    data: hskBalance,
  } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress,
    },
  });


  // 同样为 token1Balance 添加 refetch
  const { 
    data: token1Balance, 
  } = useBalance({
    address: userAddress,
    token: token1Data?.symbol !== 'HSK' ? token1Data?.address as `0x${string}` : undefined,
    query: {
      enabled: !!userAddress && !!token1Data && token1Data.symbol !== 'HSK',
    },
  });


  const { data: token2Balance } = useBalance({
    address: userAddress,
    token: token2Data?.symbol !== 'HSK' ? token2Data?.address as `0x${string}` : undefined,
    query: {
      enabled: !!userAddress && !!token2Data && token2Data.symbol !== 'HSK',
    },
  });

  // 获取池子的详细数据
  const [poolData, setPoolData] = useState<Pool[]>([]);
  // Custom hooks
  const { isFirstProvider, poolInfo, refreshPool, isLoading } =
    useLiquidityPool(token1Data, token2Data);

  const { needApprove, handleApprove, isApproving, isApproveSuccess } = useTokenApproval(
    token1Data,
    token2Data,
    amount1,
    amount2,
    userAddress
  );

  useEffect(() => {
    if (!token1Data && token1 === "HSK") {
      setToken1Data(DEFAULT_HSK_TOKEN);
    }
  }, [token1, token1Data]);

  // 必须要获取一下池子的详细数据，池子中token0，token1是什么。
  // 合约拿到的数据是[0,1]
  // 用户前端是可以切换token的，所以当token0，1的数据改变的时候。需要判断合约返回的数据哪一个是0，哪一个是1
  useEffect(() => {
    getPools().then(res => {
      setPoolData(res);
    });
  }, []);

   // 需要拉取一下tokenList，才能获取到token1和token2的详细数据
   useEffect(() => {
    dispatch(fetchTokenList());
  }, [dispatch]);

  
   // 根据url中的参数设置初始化的token
   useEffect(() => {
    if (tokens.length === 0) {
      return;
    }
    tokens.forEach(token => {
      if (token.address === token1) {
        const tokenData: TokenData = {
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address,
          icon_url: token.icon_url,
          decimals: token.decimals,
        };
        setToken1Data(tokenData);
      }
      if (token.address === token2) {
        const tokenData: TokenData = {
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address,
          icon_url: token.icon_url,
          decimals: token.decimals,
        };
        setToken2Data(tokenData);
      }
    });
  }, [tokens, token1, token2]);

  // // 获取池子信息
  // const { data: pairInfo } = useReadContract({
  //   address: poolInfo?.pairAddress as `0x${string}`,
  //   abi: PAIR_ABI,
  //   functionName: "getReserves",
  // });

  // // 获取 totalSupply
  // const { data: totalSupply } = useReadContract({
  //   address: poolInfo?.pairAddress as `0x${string}`,
  //   abi: PAIR_ABI,
  //   functionName: "totalSupply",
  // });

  // 判断是否可以继续
  const canContinue = token1Data && token2Data;

  // 修改 handleAmountChange 函数
  const handleAmountChange = (value: string, isToken1: boolean) => {
    if (isFirstProvider) {
      if (isToken1) {
        setAmount1(value);
      } else {
        setAmount2(value);
      }
    } else if (poolInfo) {
      const amount = parseFloat(value);

      const pool = poolData.find(pool => pool.pairsAddress === poolInfo.pairAddress);
      // 检查用户选择的代币顺序是否与池子一致
      const isOrderMatched = token1Data?.address === pool?.token0;

      if (isToken1) {
        setAmount1(value);
        if (amount > 0) {
          const token1Decimals = Number(token1Data?.decimals || '18');
          const token2Decimals = Number(token2Data?.decimals || '18');
          
          // 将 reserve 转换为实际数值
          const reserve0 = Number(poolInfo.reserve0) / Math.pow(10, isOrderMatched ? token1Decimals : token2Decimals);
          const reserve1 = Number(poolInfo.reserve1) / Math.pow(10, isOrderMatched ? token2Decimals : token1Decimals);
          
          const ratio = isOrderMatched
            ? reserve1 / reserve0
            : reserve0 / reserve1;
         
          // 根据代币小数位数调整计算结果
          const adjustedAmount = amount * ratio;
          // 将结果格式化为指定小数位数
          const formattedAmount = adjustedAmount.toFixed(Number(token2Data?.decimals || 18));
          setAmount2(formattedAmount);
        } else {
          setAmount2("");
        }
      } else {
        setAmount2(value);
        if (amount > 0) {
          const token1Decimals = Number(token1Data?.decimals || '18');
          const token2Decimals = Number(token2Data?.decimals || '18');
          
          // 将 reserve 转换为实际数值
          const reserve0 = Number(poolInfo.reserve0) / Math.pow(10, isOrderMatched ? token1Decimals : token2Decimals);
          const reserve1 = Number(poolInfo.reserve1) / Math.pow(10, isOrderMatched ? token2Decimals : token1Decimals);
          
          const ratio = isOrderMatched
            ? reserve0 / reserve1
            : reserve1 / reserve0;
          
          // 根据代币小数位数调整计算结果
          const adjustedAmount = amount * ratio;
          // 将结果格式化为指定小数位数
          const formattedAmount = adjustedAmount.toFixed(Number(token1Data?.decimals || 18));
          setAmount1(formattedAmount);
        } else {
          setAmount1("");
        }
      }
    }
  };

  // 计算池子份额
  const calculatePoolShare = () => {
    if (!amount1 || !amount2) return "0.00";
    
    // 如果是第一个流动性提供者
    if (isFirstProvider) {
      return "100.00";
    }
    
    // 如果已有流动性池
    if (poolInfo && poolInfo.totalSupply) {
      const amount1Big = BigInt(Math.floor(parseFloat(amount1) * 1e18));
      const totalSupply = poolInfo.totalSupply;
      if (totalSupply === BigInt(0)) return "0.00";
      
      const share = Number(
        (amount1Big * BigInt(100)) / (totalSupply + amount1Big)
      );
      return share.toFixed(2);
    }
    
    return "0.00";
  };

  // 修改 handleSupply 函数
  const handleSupply = async () => {
    if (!token1Data || !token2Data || !amount1 || !amount2 || !userAddress)
      return;

    try {
      setIsPending(true);

      // 根据代币的小数位数计算金额
      const token1Decimals = Number(token1Data.decimals || '18');
      const token2Decimals = Number(token2Data.decimals || '18');
      
      const amount1Big = BigInt(Math.floor(parseFloat(amount1) * Math.pow(10, token1Decimals)));
      const amount2Big = BigInt(Math.floor(parseFloat(amount2) * Math.pow(10, token2Decimals)));

      // 计算最小接收数量
      const minAmount1 = (amount1Big * BigInt(99)) / BigInt(100);
      const minAmount2 = (amount2Big * BigInt(99)) / BigInt(100);

      // 判断是否包含 HSK
      const isToken1HSK = token1Data.symbol === "HSK";
      const isToken2HSK = token2Data.symbol === "HSK";

      if (isToken1HSK || isToken2HSK) {
        // 如果其中一个是 HSK，使用 addLiquidityETH
        const tokenAddress = isToken1HSK
          ? token2Data.address
          : token1Data.address; // 不需要转换为 WHSK
        const tokenAmount = isToken1HSK ? amount2Big : amount1Big;
        const ethAmount = isToken1HSK ? amount1Big : amount2Big;
        const minTokenAmount = isToken1HSK ? minAmount2 : minAmount1;
        const minEthAmount = isToken1HSK ? minAmount1 : minAmount2;

        await writeContract({
          address: ROUTER_CONTRACT_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "addLiquidityETH",
          args: [
            tokenAddress,
            tokenAmount,
            minTokenAmount,
            minEthAmount,
            userAddress,
            BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
          ],
          value: ethAmount,
        });
      } else {
        // 如果都不是 HSK，使用 addLiquidity
        await writeContract({
          address: ROUTER_CONTRACT_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            token1Data.address,
            token2Data.address,
            amount1Big,
            amount2Big,
            minAmount1,
            minAmount2,
            userAddress,
            BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
          ],
        });
      }
    } catch (error) {
      console.error("Supply failed:", error);
      setIsPending(false);
      toast({
        type: 'error',
        message: 'Failed to add liquidity. Please try again.',
        isAutoClose: true
      });
    }
  };

  // 修改交易成功的监听
  useEffect(() => {
    if (isWriteSuccess && !isWritePending) {
      setTimeout(() => {
        refreshPool();
        setAmount1("");
        setAmount2("");
        setStep(1);
        setIsPending(false);
        toast({
          type: 'success',
          message: 'Successfully added liquidity!',
          isAutoClose: true
        });   
      }, 3000);
    }


    if (isWriteError && writeError) {
      setIsPending(false);
      let errorMessage = "add liquidity failed, please try again.";
      
      // 尝试从错误对象中提取更具体的错误信息
      if (typeof writeError === 'object' && writeError !== null) {
        if ('message' in writeError) {
          const message = (writeError as any).message?.toLowerCase();
          errorMessage = `error: ${message}`; 

          if (message.includes("insufficient funds")) {
            errorMessage = "insufficient funds, please ensure you have enough tokens and gas fees.";
          } else if (message.includes("user rejected")) {
            errorMessage = "user rejected the transaction.";
          } else if (message.includes("deadline")) {
            errorMessage = "transaction deadline, please try again.";
          } else if (message.includes("slippage")) {
            errorMessage = "slippage too high, please adjust the slippage tolerance or reduce the transaction amount.";
          }
        }
      }
      
      toast({
        type: 'error',
        message: errorMessage,
        isAutoClose: false
      });
    }

  }, [isWriteSuccess, isWritePending]);

  // 添加一个清除 step2 数据的函数
  const clearStep2Data = () => {
    setAmount1("");
    setAmount2("");
    setIsPending(false);
  };

  // 添加 useEffect 来监听授权成功
  useEffect(() => {
    if (isApproveSuccess) {
      // 如果授权成功，刷新授权状态
      toast({
        type: 'success',
        message: 'Token approved successfully!',
        isAutoClose: true
      });
    }
  }, [isApproveSuccess]);

  // 渲染步骤 2 的内容
  const renderStep2 = () => {
    // 计算价格和份额
    let price1 = "0", price2 = "0";
    let token0Symbol = token1Data?.symbol || "";
    let token1Symbol = token2Data?.symbol || "";

    if (isFirstProvider) {
      // 如果是第一个流动性提供者，使用输入值计算价格
      if (amount1 && amount2 && parseFloat(amount1) > 0 && parseFloat(amount2) > 0) {
        price1 = (parseFloat(amount2) / parseFloat(amount1)).toFixed(6);
        price2 = (parseFloat(amount1) / parseFloat(amount2)).toFixed(6);
      }
    } else if (poolInfo) {
      const pool = poolData.find(pool => pool.pairsAddress === poolInfo.pairAddress);
     
      if (pool) {
        // 确定代币在池子中的顺序
        if (token1Data?.address === pool.token0) {
          token0Symbol = token1Data.symbol || "";
          token1Symbol = token2Data?.symbol || "";
          const token0Decimals = Number(token1Data?.decimals || '18');
          const token1Decimals = Number(token2Data?.decimals || '18');
          
          // 将 reserve 转换为实际数值
          const reserve0 = Number(poolInfo.reserve0) / Math.pow(10, token0Decimals);
          const reserve1 = Number(poolInfo.reserve1) / Math.pow(10, token1Decimals);

          
          price1 = (reserve1 / reserve0).toFixed(6);
          price2 = (reserve0 / reserve1).toFixed(6);
        } else {
          token0Symbol = token2Data?.symbol || "";
          token1Symbol = token1Data?.symbol || "";
          const token0Decimals = Number(token2Data?.decimals || '18');
          const token1Decimals = Number(token1Data?.decimals || '18');
          
          // 将 reserve 转换为实际数值
          const reserve0 = Number(poolInfo.reserve0) / Math.pow(10, token0Decimals);
          const reserve1 = Number(poolInfo.reserve1) / Math.pow(10, token1Decimals);
          
          price1 = (reserve0 / reserve1).toFixed(6);
          price2 = (reserve1 / reserve0).toFixed(6);
        }
      }
    }

    const formatPrice = (price: string) => {
      return parseFloat(price).toString();
    };

    const poolShare = calculatePoolShare();

    // 检查是否需要授权
    const needsApproval = needApprove.token1 || needApprove.token2;
    const isButtonDisabled = !amount1 || !amount2 || isPending || isWritePending || isApproving;

    // 获取按钮文本
    const getButtonText = () => {
      if (isPending || isWritePending) return "Processing...";
      if (isApproving) return "Approving...";
      if (needApprove.token1) return `Approve ${token1Data?.symbol}`;
      if (needApprove.token2) return `Approve ${token2Data?.symbol}`;
      return "Supply";
    };

    // 处理按钮点击
    const handleButtonClick = async () => {
      const canProceed = await estimateAndCheckGas(hskBalance);
      if (!canProceed) {
        toast({
          type: 'error',
          message: 'Insufficient gas, please deposit HSK first',
          isAutoClose: true
        });
        return;
      }
      if (needsApproval) {
        // 如果需要授权，先处理授权
        await handleApprove(needApprove.token1);
      } else {
        // 如果不需要授权，直接供应
        await handleSupply();
      }
    };

    return (
      <div className="bg-base-200/30 backdrop-blur-sm rounded-3xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            className="p-2 hover:bg-base-300/50 rounded-full"
            onClick={() => {
              setStep(1);
              clearStep2Data(); // 返回时清除数据
            }}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <h2 className="text-md font-normal">Add Liquidity</h2>
          <div className="w-10 h-10 rounded-full bg-base-300/50"></div>
        </div>

        {/* Token Inputs */}
        <div className="space-y-4">
          {/* First Token Input */}
          <div className="bg-base-200 rounded-3xl p-6">
            <div className="text-md mb-2">Input</div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                min="0"
                className="input input-ghost w-[60%] text-2xl focus:outline-none px-4 
                  [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100
                  [&::-webkit-inner-spin-button]:bg-base-300 [&::-webkit-outer-spin-button]:bg-base-300
                  [&::-webkit-inner-spin-button]:h-full [&::-webkit-outer-spin-button]:h-full
                  [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0
                  [&::-webkit-inner-spin-button]:rounded-r-lg [&::-webkit-outer-spin-button]:rounded-r-lg"
                placeholder="0"
                value={amount1}
                onChange={(e) => handleAmountChange(e.target.value, true)}
              />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-base-300">
                <Image
                  src={token1Data?.icon_url || getDefaultTokenIcon(token1Data)}
                  alt={token1Data?.symbol || "Token"}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full"
                  unoptimized
                />
                <span className="text-md">{token1Data?.symbol}</span>
              </div>
            </div>
            {/* 显示 token1Balance */}
            <div className="flex justify-end items-center mt-2">
              <span className="text-sm text-base-content/60">
                Balance: {token1Balance ? formatTokenBalance(token1Balance.value.toString(), token1Data?.decimals || '18') : '0'} {token1Data ? token1Data.symbol : token1}
              </span>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center py-2">
            <PlusIcon className="w-5 h-5 text-base-content/60" />
          </div>

          {/* Second Token Input */}
          <div className="bg-base-200 rounded-3xl p-6">
            <div className="text-md mb-2">Input</div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                min="0"
                className="input input-ghost w-[60%] text-2xl focus:outline-none px-4 
                  [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100
                  [&::-webkit-inner-spin-button]:bg-base-300 [&::-webkit-outer-spin-button]:bg-base-300
                  [&::-webkit-inner-spin-button]:h-full [&::-webkit-outer-spin-button]:h-full
                  [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0
                  [&::-webkit-inner-spin-button]:rounded-r-lg [&::-webkit-outer-spin-button]:rounded-r-lg"
                placeholder="0"
                value={amount2}
                onChange={(e) => handleAmountChange(e.target.value, false)}
              />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-base-300">
                <Image
                  src={token2Data?.icon_url || getDefaultTokenIcon(token2Data)}
                  alt={token2Data?.symbol || "Token"}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full"
                  unoptimized
                />
                <span className="text-md">{token2Data?.symbol}</span>
              </div>
            </div>
            {/* 显示 token2Balance */}
            <div className="flex justify-end items-center mt-2">
            <span className="text-sm text-base-content/60">
              Balance: {token2Balance ? formatTokenBalance(token2Balance.value.toString(), token2Data?.decimals || '18') : '0'} {token2Data ? token2Data.symbol : token2}
            </span>
          </div>
          </div>
        </div>

        {/* Price and Pool Share Info */}
        <div className="mt-6 bg-base-200 rounded-3xl p-6">
          <h3 className="text-lg mb-4">Prices and pool share</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg mb-2">{formatPrice(price1)}</div>
              <div className="text-sm text-base-content/60">
                {token1Symbol} per {token0Symbol}
              </div>
            </div>
            <div>
              <div className="text-lg mb-2">{formatPrice(price2)}</div>
              <div className="text-sm text-base-content/60">
                {token0Symbol} per {token1Symbol}
              </div>
            </div>
            <div>
              <div className="text-lg mb-2">{poolShare}%</div>
              <div className="text-sm text-base-content/60">Share of Pool</div>
            </div>
          </div>
        </div>

        {/* Supply Button */}
        <button
          className={`w-full rounded-lg py-4 text-xl mt-6 ${
            isButtonDisabled
              ? "bg-primary/50 cursor-not-allowed"
              : "bg-primary/90 hover:bg-primary"
          } text-primary-content`}
          onClick={handleButtonClick}
          disabled={isButtonDisabled}
        >
          {getButtonText()}
        </button>
      </div>
    );
  };

  // 更新按钮显示
  const renderTokenButton = (type: "token1" | "token2") => {
    const tokenData = type === "token1" ? token1Data : token2Data;
    const defaultText = type === "token1" ? token1 : token2;

    return (
      <button
        className="w-full bg-base-300/50 hover:bg-base-300/70 rounded-full py-4 px-6 
          flex justify-between items-center transition-all border border-transparent 
          hover:border-base-content/10"
        onClick={() => {
          setModalType(type);
          setShowModal(true);
        }}
      >
        {tokenData ? (
          <div className="flex items-center gap-3">
            <Image
              src={tokenData.icon_url || getDefaultTokenIcon(tokenData)}
              alt={tokenData.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
              unoptimized
            />
            <span className="text-lg font-normal">{tokenData.symbol}</span>
          </div>
        ) : (
          <span className="text-lg font-normal">{defaultText}</span>
        )}
        <ChevronDownIcon className="w-6 h-6 text-base-content/60" />
      </button>
    );
  };

  return (
    <div className="w-full max-w-[860px] px-4 sm:px-6 lg:px-0">
      <div className="flex w-full flex-col lg:flex-row gap-8">
        <div className="hidden lg:block w-[360px] flex-shrink-0">
          <StepIndicator currentStep={step} />
        </div>
        <div className="flex-1">
          {step === 1 ? (
            /* Step 1 Content */
            <div className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-3">Select Pair</h2>

                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-sm rounded-xl bg-[#1c1d22] hover:bg-[#2c2d33] border border-white/5">
                    <span>V2 Position</span>
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-[#1c1d22] rounded-xl w-40 border border-white/5">
                    <li><a href="/liquidity/v3" className="text-base-content/60 hover:bg-[#2c2d33] rounded-lg">V3 Position</a></li>
                  </ul>
                </div>
              </div>
              <p className="text-md text-base-content/60 mb-8">
                Select a pair of tokens you want to provide liquidity for.
              </p>

              {/* Token Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {renderTokenButton("token1")}
                {renderTokenButton("token2")}
              </div>

              {/* Fee Tier */}
              <div>
                <h3 className="text-xl font-bold text-base-content/60 mb-3">
                  Fee Tier
                </h3>
                <p className="text-md mb-8">
                  The pool earns 0.3% of all trades proportional to their share
                  of the pool.
                </p>

                {/* Loading or First Provider Message */}
                {canContinue && (isLoading || isFirstProvider) && (
                  <div className="mb-8 bg-base-100 px-4 py-2 rounded-lg">
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading loading-spinner loading-md"></div>
                        <span className="ml-2">Checking pool status...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-[#98E5CE] text-lg font-normal mb-2">
                          You are the first liquidity provider.
                        </p>
                        <p className="text-[#E5E7EB] text-md font-normal mb-4">
                          The ratio of tokens you add will set the price of this
                          pool.Once you are happy with the rate click supply to
                          review.
                        </p>
                      </>
                    )}
                  </div>
                )}

                <button
                  className={`w-full rounded-full py-4 text-lg font-normal transition-all
                    ${
                      canContinue && !isLoading
                        ? "bg-primary/90 hover:bg-primary text-primary-content"
                        : "bg-base-300/50 text-base-content/40 cursor-not-allowed"
                    }`}
                  disabled={!canContinue || isLoading}
                  onClick={() => canContinue && !isLoading && setStep(2)}
                >
                  {isLoading ? "Checking..." : "Continue"}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2 Content */
            renderStep2()
          )}
        </div>
      </div>

      {/* Token Modal */}
      {showModal && (
        <TokenModal
          address={userAddress || ""}
          onClose={() => setShowModal(false)}
          onSelectToken={(token) => {
            if (modalType === "token1") {
              setToken1Data(token);
            } else {
              setToken2Data(token);
            }
            setShowModal(false);
          }}
          type={modalType}
          selectedToken={modalType === "token2" ? token1Data : token2Data}
        />
      )}
    </div>
  );
};

export default LiquidityContainer;