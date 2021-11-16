import "dotenv/config";

import { Masterchef } from "../services/masterchef";

import MasterChef from "../abi/MasterChef.json";
import { PriceService } from "../services/priceService";
import { TokenHelper } from "../services/tokenHelper";
import { Web3Service } from "../services/web3Service";
import bodyParser from "body-parser";
import express from "express";
import { PoolInfo } from "../types";

const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 3000;

const web3Service = new Web3Service();
const priceService = new PriceService();
const masterchefAddress = "0x73feaa1eE314F8c655E354234017bE2193C9E24E";
const contract = web3Service.getContract(MasterChef.abi, masterchefAddress);
const helper = new TokenHelper(web3Service, priceService);
const masterchef = new Masterchef(contract, helper);

app.get("/pancakeswap/pools", async (req, res) => {
  const pools = await masterchef.getPoolInfos();

  return res.json({ pools: pools});
});

app.get("/pancakeswap/:userId", async (req, res) => {
  const pools: PoolInfo[] = await Promise.all(
    (await masterchef.getPoolInfoAll()).map(async (poolInfo) => {
      return { ...poolInfo };
    })
  );
  const stakings = await masterchef.getStaking(pools, req.params.userId);

  return res.json({ user: stakings});
});

app.listen(port, () => {
  console.log(`Server is running at https://localhost:${port}`);
});
