import { useState, useEffect } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { TokenData } from "@/types/liquidity";
import { erc20Abi } from "viem";
import { ROUTER_CONTRACT_ADDRESS } from "@/constant/ABI/HyperIndexRouter";

export function useTokenApproval(
  token1Data: TokenData | null,
  token2Data: TokenData | null,
  amount1: string,
  amount2: string,
  userAddress?: string
) {
  const [needApprove, setNeedApprove] = useState({
    token1: false,
    token2: false,
  });
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // 检查 token1 授权
  const { data: allowance1 } = useReadContract({
    address:
      token1Data?.symbol !== "HSK"
        ? (token1Data?.address as `0x${string}`)
        : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && token1Data
        ? [userAddress as `0x${string}`, ROUTER_CONTRACT_ADDRESS]
        : undefined,
  });

  // 检查 token2 授权
  const { data: allowance2 } = useReadContract({
    address:
      token2Data?.symbol !== "HSK"
        ? (token2Data?.address as `0x${string}`)
        : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && token2Data
        ? [userAddress as `0x${string}`, ROUTER_CONTRACT_ADDRESS]
        : undefined,
  });

  // 检查是否需要授权
  useEffect(() => {
    if (!amount1 || !amount2) return;

    const amount1Big = BigInt(Math.floor(parseFloat(amount1) * 1e18));
    const amount2Big = BigInt(Math.floor(parseFloat(amount2) * 1e18));

    setNeedApprove({
      token1:
        token1Data?.symbol !== "HSK" &&
        allowance1 !== undefined &&
        allowance1 < amount1Big,
      token2:
        token2Data?.symbol !== "HSK" &&
        allowance2 !== undefined &&
        allowance2 < amount2Big,
    });
  }, [token1Data, token2Data, amount1, amount2, allowance1, allowance2]);

  // 处理授权
  const handleApprove = async (isToken1: boolean) => {
    const token = isToken1 ? token1Data : token2Data;
    if (!token || token.symbol === "HSK") return;

    try {
      await writeContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROUTER_CONTRACT_ADDRESS, BigInt(2) ** BigInt(256) - BigInt(1)],
      });
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  return {
    needApprove,
    handleApprove,
    isApproving: isPending,
    isApproveSuccess: isSuccess,
  };
}
