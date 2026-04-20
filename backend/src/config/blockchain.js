const Web3 = require('web3');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

class BlockchainConfig {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.adminAccount = process.env.ADMIN_PRIVATE_KEY;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize Web3
      this.web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL);
      
      // Check connection
      const networkId = await this.web3.eth.net.getId();
      const accounts = await this.web3.eth.getAccounts();
      
      console.log(`🔗 Connected to blockchain - Network ID: ${networkId}`);
      console.log(`👛 Available accounts: ${accounts.length}`);
      
      // Load contract ABI
      const contractABIPath = path.join(__dirname, '../../build/contracts/MUSTElection.json');
      let contractABI;
      
      if (fs.existsSync(contractABIPath)) {
        const contractJson = JSON.parse(fs.readFileSync(contractABIPath, 'utf8'));
        contractABI = contractJson.abi;
        this.contractAddress = this.contractAddress || contractJson.networks[networkId]?.address;
      } else {
        // Fallback minimal ABI for testing
        contractABI = this.getMinimalABI();
      }
      
      // Initialize contract
      if (this.contractAddress && this.contractAddress !== '0xYourDeployedContractAddressHere') {
        this.contract = new this.web3.eth.Contract(contractABI, this.contractAddress);
        console.log(`📜 Contract loaded at: ${this.contractAddress}`);
      } else {
        console.warn('⚠️  Contract address not configured. Blockchain features disabled.');
      }
      
      // Setup admin wallet
      if (this.adminAccount && this.adminAccount !== '0xyourprivatekeyfromganache') {
        this.adminWallet = this.web3.eth.accounts.privateKeyToAccount(this.adminAccount);
        this.web3.eth.accounts.wallet.add(this.adminWallet);
        console.log(`🔐 Admin wallet loaded: ${this.adminWallet.address}`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Blockchain initialization failed:', error.message);
      this.initialized = false;
    }
  }

  getMinimalABI() {
    return [
      {
        "inputs": [],
        "name": "getTotalVotes",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "voters",
        "outputs": [
          {"internalType": "bool", "name": "isRegistered", "type": "bool"},
          {"internalType": "bool", "name": "hasVoted", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
  }

  async getContract() {
    if (!this.initialized) await this.initialize();
    return this.contract;
  }

  async getWeb3() {
    if (!this.initialized) await this.initialize();
    return this.web3;
  }

  async getGasPrice() {
    if (!this.initialized) await this.initialize();
    return await this.web3.eth.getGasPrice();
  }

  async getTransactionReceipt(txHash) {
    if (!this.initialized) await this.initialize();
    return await this.web3.eth.getTransactionReceipt(txHash);
  }

  async estimateGas(tx) {
    if (!this.initialized) await this.initialize();
    return await this.web3.eth.estimateGas(tx);
  }
}

module.exports = new BlockchainConfig();