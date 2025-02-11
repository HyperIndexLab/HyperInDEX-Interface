"use client";

import React, { useState, useEffect } from "react";
import TokenModal from "./TokenModal";
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { PAIR_ABI } from "@/constant/ABI/HyperIndexPair";
import { WHSK } from "@/constant/value";
import { erc20Abi } from "viem";
import {
  ROUTER_CONTRACT_ADDRESS,
  ROUTER_ABI,
} from "@/constant/ABI/HyperIndexRouter";
import { useLiquidityPool } from "@/hooks/useLiquidityPool";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { StepIndicator } from "./StepIndicator";
import { toast } from "react-toastify";

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

const LiquidityContainer: React.FC<LiquidityContainerProps> = ({
  token1 = "HSK",
  token2 = "Select token",
}) => {
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
  } = useWriteContract();

  // Custom hooks
  const { isFirstProvider, poolInfo, refreshPool, isLoading } =
    useLiquidityPool(token1Data, token2Data);

  const { needApprove, handleApprove, isApproving } = useTokenApproval(
    token1Data,
    token2Data,
    amount1,
    amount2
  );

  const { data: allowance1 } = useReadContract({
    address:
      token1Data?.symbol !== "HSK"
        ? (token1Data?.address as `0x${string}`)
        : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && token1Data
        ? [userAddress, ROUTER_CONTRACT_ADDRESS]
        : undefined,
  });

  const { data: allowance2 } = useReadContract({
    address:
      token2Data?.symbol !== "HSK"
        ? (token2Data?.address as `0x${string}`)
        : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && token2Data
        ? [userAddress, ROUTER_CONTRACT_ADDRESS]
        : undefined,
  });

  useEffect(() => {
    console.log(allowance1, allowance2);
  }, [allowance1, allowance2]);

  useEffect(() => {
    if (!token1Data && token1 === "HSK") {
      setToken1Data(DEFAULT_HSK_TOKEN);
    }
  }, [token1]);

  // 获取池子信息
  const { data: pairInfo } = useReadContract({
    address: poolInfo?.pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "getReserves",
  });

  // 获取 totalSupply
  const { data: totalSupply } = useReadContract({
    address: poolInfo?.pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "totalSupply",
  });

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

      if (isToken1) {
        setAmount1(value);
        if (amount > 0) {
          const hskPerBlack =
            Number(poolInfo.reserve0) / Number(poolInfo.reserve1);
          setAmount2((amount * hskPerBlack).toString()); // 使用乘法
        } else {
          setAmount2("");
        }
      } else {
        setAmount2(value);
        if (amount > 0) {
          const blackPerHsk =
            Number(poolInfo.reserve1) / Number(poolInfo.reserve0);
          setAmount1((amount * blackPerHsk).toString()); // 使用乘法
        } else {
          setAmount1("");
        }
      }
    }
  };

  // 计算池子份额
  const calculatePoolShare = () => {
    if (!poolInfo || !amount1 || !amount2) return "0.00";
    if (isFirstProvider) return "100.00";

    const amount1Big = BigInt(Math.floor(parseFloat(amount1) * 1e18));
    const totalSupply = poolInfo.totalSupply;
    const share = Number(
      (amount1Big * BigInt(100)) / (totalSupply + amount1Big)
    );
    return share.toFixed(2);
  };

  // 修改 handleSupply 函数
  const handleSupply = async () => {
    if (!token1Data || !token2Data || !amount1 || !amount2 || !userAddress)
      return;

    try {
      setIsPending(true);

      const amount1Big = BigInt(Math.floor(parseFloat(amount1) * 1e18));
      const amount2Big = BigInt(Math.floor(parseFloat(amount2) * 1e18));

      // 直接计算最小接收数量
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
      toast.error("Failed to add liquidity. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
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
        toast.success("Successfully added liquidity!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      }, 3000);
    }
  }, [isWriteSuccess, isWritePending]);

  // 添加一个清除 step2 数据的函数
  const clearStep2Data = () => {
    setAmount1("");
    setAmount2("");
    setIsPending(false);
  };

  // 渲染输入框
  const renderAmountInput = (isToken1: boolean) => {
    const token = isToken1 ? token1Data : token2Data;
    const amount = isToken1 ? amount1 : amount2;

    return (
      <div className="bg-base-300/50 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-base-content/60">Input</span>
          <span className="text-sm text-base-content/60">
            Balance: {token?.balance || "0"}
          </span>
        </div>
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
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value, isToken1)}
          />
          <div className="flex items-center gap-2">
            <img src={token?.icon_url || ""} className="w-6 h-6 rounded-full" />
            <span>{token?.symbol}</span>
          </div>
        </div>
      </div>
    );
  };

  // 渲染价格和份额信息
  const renderPriceInfo = () => {
    let price1 = "0",
      price2 = "0";

    if (isFirstProvider) {
      // 首个提供者的情况，使用输入值计算
      price1 =
        amount1 && amount2
          ? (parseFloat(amount2) / parseFloat(amount1)).toFixed(6)
          : "0";
      price2 =
        amount1 && amount2
          ? (parseFloat(amount1) / parseFloat(amount2)).toFixed(6)
          : "0";
    } else if (poolInfo) {
      // 使用池子储备计算实际汇率
      // 确保 token1 是 HSK
      if (token1Data?.symbol === "HSK") {
        price1 = (
          Number(poolInfo.reserve1) / Number(poolInfo.reserve0)
        ).toFixed(6);
        price2 = (
          Number(poolInfo.reserve0) / Number(poolInfo.reserve1)
        ).toFixed(6);
      } else {
        price1 = (
          Number(poolInfo.reserve0) / Number(poolInfo.reserve1)
        ).toFixed(6);
        price2 = (
          Number(poolInfo.reserve1) / Number(poolInfo.reserve0)
        ).toFixed(6);
      }
    }

    const poolShare = calculatePoolShare();

    return (
      <div className="bg-base-300/50 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span>Price</span>
          <div className="text-right">
            <div>
              1 {token1Data?.symbol} = {price1} {token2Data?.symbol}
            </div>
            <div>
              1 {token2Data?.symbol} = {price2} {token1Data?.symbol}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span>Share of Pool</span>
          <span>{poolShare}%</span>
        </div>
      </div>
    );
  };

  // 渲染步骤 2 的内容
  const renderStep2 = () => {
    // 计算价格和份额
    const price1 = poolInfo
      ? (Number(poolInfo.reserve1) / Number(poolInfo.reserve0)).toFixed(6)
      : "0";
    const price2 = poolInfo
      ? (Number(poolInfo.reserve0) / Number(poolInfo.reserve1)).toFixed(6)
      : "0";
    const poolShare = calculatePoolShare();

    // 检查是否需要授权
    const needsApproval = needApprove.token1 || needApprove.token2;
    const isButtonDisabled =
      !amount1 || !amount2 || isPending || isWritePending;

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
                <img
                  src={token1Data?.icon_url || ""}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-md">{token1Data?.symbol}</span>
              </div>
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
                <img
                  src={token2Data?.icon_url || ""}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-md">{token2Data?.symbol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price and Pool Share Info */}
        <div className="mt-6 bg-base-200 rounded-3xl p-6">
          <h3 className="text-lg mb-4">Prices and pool share</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg mb-2">{price1}</div>
              <div className="text-sm text-base-content/60">
                {token2Data?.symbol} per {token1Data?.symbol}
              </div>
            </div>
            <div>
              <div className="text-lg mb-2">{price2}</div>
              <div className="text-sm text-base-content/60">
                {token1Data?.symbol} per {token2Data?.symbol}
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
          onClick={() =>
            needsApproval ? handleApprove(needApprove.token1) : handleSupply()
          }
          disabled={isButtonDisabled}
        >
          {isPending || isWritePending
            ? "Processing..."
            : needApprove.token1
            ? `Approve ${token1Data?.symbol}`
            : needApprove.token2
            ? `Approve ${token2Data?.symbol}`
            : "Supply"}
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
            <img
              src={tokenData.icon_url || "/img/HSK-LOGO.png"}
              alt={tokenData.name}
              className="w-8 h-8 rounded-full"
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
              <h2 className="text-xl font-bold mb-3">Select Pair</h2>
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
