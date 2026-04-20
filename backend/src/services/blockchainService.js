const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL);
      
      // Load contract ABI
      const contractPath = path.join(__dirname, '../../build/contracts/MUSTElection.json');
      if (fs.existsSync(contractPath)) {
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        this.contractABI = contractJson.abi;
      }
      
      this.initialized = true;
      console.log('Blockchain service initialized');
    } catch (error) {
      console.error('Blockchain service initialization failed:', error);
      throw error;
    }
  }

  async deployElectionContract(title, description, durationDays) {
    await this.initialize();
    
    // For development, return mock address
    if (process.env.NODE_ENV === 'development') {
      return `0x${Math.random().toString(36).substring(2, 42)}`;
    }
    
    // Production deployment logic
    const accounts = await this.web3.eth.getAccounts();
    const contract = new this.web3.eth.Contract(this.contractABI);
    
    const deployTx = contract.deploy({
      data: '0x' + fs.readFileSync(path.join(__dirname, '../../build/contracts/MUSTElection.bin'), 'utf8'),
      arguments: [title, description, durationDays]
    });
    
    const deployedContract = await deployTx.send({
      from: accounts[0],
      gas: parseInt(process.env.GAS_LIMIT) || 8000000
    });
    
    return deployedContract.options.address;
  }

  async authorizeVoter(contractAddress, voterAddress, registrationNumber) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MOCK] Authorized voter: ${voterAddress} (${registrationNumber})`);
      return { success: true, mock: true };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const accounts = await this.web3.eth.getAccounts();
    
    const tx = await contract.methods.authorizeVoter(voterAddress, registrationNumber)
      .send({ from: accounts[0], gas: 200000 });
    
    return { success: true, transactionHash: tx.transactionHash };
  }

  async castVote(contractAddress, candidateId, voterAddress, privateKey) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MOCK] Vote cast: ${voterAddress} -> Candidate ${candidateId}`);
      return { 
        success: true, 
        transactionHash: `0x${Math.random().toString(36).substring(2, 66)}`,
        blockNumber: Math.floor(Math.random() * 1000000)
      };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    
    const tx = await contract.methods.vote(candidateId)
      .send({ from: account.address, gas: 200000 });
    
    return {
      success: true,
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber
    };
  }

  async getElectionStats(contractAddress) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      return {
        totalVoters: 1250,
        totalVotes: 1089,
        isActive: true,
        endTime: Date.now() + 86400000
      };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    
    const [totalVoters, totalVotes, isActive, endTime] = await Promise.all([
      contract.methods.getTotalVoters().call(),
      contract.methods.getTotalVotes().call(),
      contract.methods.electionActive().call(),
      contract.methods.electionEndTime().call()
    ]);
    
    return {
      totalVoters: parseInt(totalVoters),
      totalVotes: parseInt(totalVotes),
      isActive,
      endTime: parseInt(endTime) * 1000
    };
  }

  async getCandidateVotes(contractAddress, candidateId) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      return Math.floor(Math.random() * 500);
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const candidate = await contract.methods.candidates(candidateId).call();
    return parseInt(candidate.voteCount);
  }

  async getResults(contractAddress) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      return [
        { id: 1, name: "John Doe", voteCount: 450, isWinner: true },
        { id: 2, name: "Jane Smith", voteCount: 380, isWinner: false },
        { id: 3, name: "Mike Johnson", voteCount: 259, isWinner: false }
      ];
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const candidatesCount = await contract.methods.getCandidatesCount().call();
    const results = [];
    
    for (let i = 1; i <= candidatesCount; i++) {
      const candidate = await contract.methods.candidates(i).call();
      results.push({
        id: i,
        name: candidate.name,
        voteCount: parseInt(candidate.voteCount),
        isWinner: candidate.isWinner || false
      });
    }
    
    return results;
  }

  async startElection(contractAddress) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MOCK] Election started: ${contractAddress}`);
      return { success: true };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const accounts = await this.web3.eth.getAccounts();
    
    const tx = await contract.methods.startElection()
      .send({ from: accounts[0], gas: 500000 });
    
    return { success: true, transactionHash: tx.transactionHash };
  }

  async endElection(contractAddress) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MOCK] Election ended: ${contractAddress}`);
      return { success: true };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const accounts = await this.web3.eth.getAccounts();
    
    const tx = await contract.methods.endElection()
      .send({ from: accounts[0], gas: 500000 });
    
    return { success: true, transactionHash: tx.transactionHash };
  }

  async verifyVote(contractAddress, voterAddress) {
    await this.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      return { hasVoted: false };
    }
    
    const contract = new this.web3.eth.Contract(this.contractABI, contractAddress);
    const voter = await contract.methods.voters(voterAddress).call();
    
    return {
      hasVoted: voter.hasVoted,
      votedCandidateId: parseInt(voter.votedCandidateId),
      votedAt: parseInt(voter.votedAt) * 1000
    };
  }
}

module.exports = new BlockchainService();