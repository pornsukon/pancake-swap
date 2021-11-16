import BigNumber from "bignumber.js";

export const toDecimal = (wei: any, decimals: number) =>
  new BigNumber(wei).dividedBy(new BigNumber(`1e${decimals}`));
