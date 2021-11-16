import {
    PoolInfo,
    Staking,
    TokenBalance,
  } from "../types";
  
  import { Contract } from "web3-eth-contract";
  import { TokenHelper } from "./tokenHelper";
  import { getTokenData } from "../constants/coingecko";
  import { isEmpty } from "lodash";
  import { toDecimal } from "../utils";
  
  export class Masterchef {
    constructor(
      private readonly masterchef: Contract,
      private readonly helper: TokenHelper
    ) {}
  
    getPoolInfos = async () => {
    //   const rewardAddress = (
    //     await this.masterchef.methods.cake().call()
    //   ).toLowerCase();
    //   const rewardSymbol = await this.helper.getTokenSymbol(rewardAddress);
      const poolLength = parseInt(
        await this.masterchef.methods.poolLength().call()
      );
      const poolIds = [...Array(poolLength).keys()];
      const poolInfos = await Promise.all<any>(
        poolIds.map(async (pid: number) => {
          const pool = await this.masterchef.methods.poolInfo(pid).call();
          const lpAddress = pool.lpToken.toLowerCase();
          let tokenDecimals;
          try {
            tokenDecimals = await this.helper.getTokenDecimals(lpAddress);
          } catch {
            return null; // NOT Token
          }
          try {
            const pair = await this.helper.getTokenPair(lpAddress);
            const poolInfo = {
              id: pid,
              lpAddress,
              token0: pair.token0Address,
              token0Symbol: pair.token0Symbol,
              token1: pair.token1Address,
              token1Symbol: pair.token1Symbol,
            };
            return poolInfo;
          } catch {
            return null
            // const tokenSymbol = await this.helper.getTokenSymbol(lpAddress);
            // const poolInfo = {
            //   id: pid,
            //   tokenAddress: lpAddress,
            //   tokenSymbol,
            //   rewardAddress,
            //   rewardSymbol,
            // };
            // return poolInfo;
          }
        })
      );
      return poolInfos.filter((poolInfo) => !isEmpty(poolInfo));
    };
  
    getPoolInfoAll = async () => {
      const rewardAddress = (
        await this.masterchef.methods.cake().call()
      ).toLowerCase();
      const rewardSymbol = await this.helper.getTokenSymbol(rewardAddress);
      const rewardDecimals = await this.helper.getTokenDecimals(rewardAddress);
      const rewardLogo = getTokenData(rewardAddress).logo;
      const poolLength = parseInt(
        await this.masterchef.methods.poolLength().call()
      );
      const poolIds = [...Array(poolLength).keys()];
      const poolInfos = await Promise.all<any>(
        poolIds.map(async (pid: number) => {
          const pool = await this.masterchef.methods.poolInfo(pid).call();
          const lpAddress = pool.lpToken.toLowerCase();
          let tokenDecimals;
          try {
            tokenDecimals = await this.helper.getTokenDecimals(lpAddress);
          } catch {
            return null;
          }
          try {
            const pair = await this.helper.getTokenPair(lpAddress);
            const poolInfo = {
              poolId: pid,
              lpAddress,
              tokenDecimals,
              token0Address: pair.token0Address,
              token0Symbol: pair.token0Symbol,
              token0Decimals: pair.token0Decimals,
              token0Logo: getTokenData(pair.token0Address).logo,
              token1Address: pair.token1Address,
              token1Symbol: pair.token1Symbol,
              token1Decimals: pair.token1Decimals,
              token1Logo: getTokenData(pair.token1Address).logo,
              rewardAddress,
              rewardSymbol,
              rewardDecimals,
              rewardLogo,
              type: "lp",
            };
            return poolInfo;
          } catch {
            return null
            // const tokenSymbol = await this.helper.getTokenSymbol(lpAddress);
            // const poolInfo = {
            //   poolId: pid,
            //   tokenAddress: lpAddress,
            //   tokenSymbol,
            //   tokenDecimals,
            //   tokenLogo: getTokenData(lpAddress).logo,
            //   rewardAddress,
            //   rewardSymbol,
            //   rewardDecimals,
            //   rewardLogo,
            //   type: "single",
            // };
            // return poolInfo;
          }
        })
      );
      return poolInfos.filter((poolInfo) => !isEmpty(poolInfo));
    };
  
    async getStaking(poolInfos: PoolInfo[], address: string) {
      let stakingBalance: (PoolInfo & TokenBalance)[] = await Promise.all(
        poolInfos.map(async (poolInfo) => {
          const balance = await this.getStakingBalance(poolInfo, address);
          return { ...poolInfo, ...balance };
        })
      );
  
      stakingBalance = stakingBalance.filter(
        (staking) => staking.tokenBalance > 0
      );
  
      const position: Staking[] = await Promise.all(
        stakingBalance.map(async (staking) => {
          const reward = await this.getStakingReward(staking, address);
          const rewardPrice = await this.helper.getRewardPrice(staking);
          if (staking.type === "lp") {
            const underlying = await this.helper.getLPUnderlyingBalance(staking);
            const price = await this.helper.getLPStakingPrice(staking);
            return {
              ...staking,
              ...reward,
              ...rewardPrice,
              ...underlying,
              ...price,
            };
          }
          const price = await this.helper.getSingleStakingPrice(staking);
          return { ...staking, ...reward, ...rewardPrice, ...price };
        })
      );
      const stakingAll = position.map((staked) => {
        if (staked.type === "lp") {
          return {...{
            id: staked.poolId,
            lpAddress: staked.lpAddress,
            token0: staked.token0Address,
            token0Symbol: staked.token0Symbol,
            token1: staked.token1Address,
            token1Symbol: staked.token1Symbol,
            amount: staked.tokenBalance,
            reward: staked.rewardBalance
          }}
        }
      });
      return stakingAll;
    }
  
    async getStakingBalance(poolInfo: PoolInfo, address: string) {
      const user = await this.masterchef.methods
        .userInfo(poolInfo.poolId, address)
        .call();
      const staking = {
        tokenBalance: toDecimal(user.amount, poolInfo.tokenDecimals).toNumber(),
      };
      return staking;
    }
  
    async getStakingReward(poolInfo: PoolInfo, address: string) {
      const pendingReward = await this.masterchef.methods
        .pendingCake(poolInfo.poolId, address)
        .call();
      const reward = {
        rewardBalance: toDecimal(
          pendingReward,
          poolInfo.rewardDecimals
        ).toNumber(),
      };
      return reward;
    }
  }