export const version  = 'v2'
export const WHSK = process.env.BUILD_ENV !== 'production'
  ? '0xCA8aAceEC5Db1e91B9Ed3a344bA026c4a2B3ebF6'  // test 环境使用开发环境的地址
  : '0xB210D2120d57b758EE163cFfb43e73728c471Cf1'    // 生产环境地址
export const V3_FEE_TIERS = [100, 500, 3000, 10000];