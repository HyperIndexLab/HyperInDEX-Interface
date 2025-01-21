export const formatTokenBalance = (value: string, decimals: string | null) => {
  if (!decimals) return value;
  const decimalNum = parseInt(decimals);
  
  // 将value转换为BigInt以处理大数
  const valueBigInt = BigInt(value);
  const divisor = BigInt(10 ** decimalNum);
  
  // 计算整数部分和小数部分
  const integerPart = valueBigInt / divisor;
  const fractionalPart = valueBigInt % divisor;
  
  // 格式化小数部分，补齐前导零
  let fractionalStr = fractionalPart.toString().padStart(decimalNum, '0');
  
  // 移除末尾的0
  fractionalStr = fractionalStr.replace(/0+$/, '');
  
  // 如果小数部分超过4位，截取到4位
  if (fractionalStr.length > 4) {
    fractionalStr = fractionalStr.slice(0, 4);
  }
  
  // 如果小数部分为空，只返回整数部分
  return fractionalStr ? `${integerPart}.${fractionalStr}` : `${integerPart}`;
}; 