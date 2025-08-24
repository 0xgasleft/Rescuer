require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: process.env.RPC
      }
    },
    ethereum: {
      url: process.env.RPC,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
