// truffle-config.js
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 8000000,
      gasPrice: 20000000000
    }
  },
  
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  
  contracts_directory: "./contracts",
  contracts_build_directory: "./build/contracts",
  migrations_directory: "./migrations",
  
  mocha: {
    timeout: 100000
  }
};