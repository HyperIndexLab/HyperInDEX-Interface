export const version  = 'v2'
export const WHSK = process.env.NODE_ENV === "development" ? '0xCA8aAceEC5Db1e91B9Ed3a344bA026c4a2B3ebF6' : '0xB210D2120d57b758EE163cFfb43e73728c471Cf1'    // 定义 Uniswap V3 支持的费率
export const V3_FEE_TIERS = [500, 3000, 10000, 100];