const blockchainService = require('../services/blockchainService');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');

// Get contract information
exports.getContractInfo = async (req, res) => {
  try {
    const { electionId } = req.query;
    
    if (electionId) {
      const election = await Election.findByPk(electionId);
      if (!election) {
        return res.status(404).json({ error: 'Election not found' });
      }
      
      const stats = await blockchainService.getElectionStats(election.contract_address);
      
      res.json({
        contract_address: election.contract_address,
        election_title: election.title,
        ...stats
      });
    } else {
      res.json({
        network: process.env.BLOCKCHAIN_RPC_URL,
        chain_id: process.env.CHAIN_ID || '1337',
        default_contract: process.env.CONTRACT_ADDRESS
      });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get contract info' });
  }
};

// Get election statistics from blockchain
exports.getElectionStats = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    const stats = await blockchainService.getElectionStats(election.contract_address);
    
    res.json({
      election_id: election.id,
      contract_address: election.contract_address,
      ...stats
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blockchain stats' });
  }
};

// Verify a vote transaction
exports.verifyVote = async (req, res) => {
  try {
    const { transactionHash } = req.params;
    
    const web3 = await blockchainService.getWeb3();
    const receipt = await web3.eth.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Check if vote exists in database
    const vote = await Vote.findOne({ where: { transaction_hash: transactionHash } });
    
    res.json({
      transaction_hash: transactionHash,
      block_number: receipt.blockNumber,
      status: receipt.status ? 'success' : 'failed',
      gas_used: receipt.gasUsed,
      confirmed: vote ? true : false,
      verification_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify vote' });
  }
};

// Deploy new contract
exports.deployContract = async (req, res) => {
  try {
    const { title, description, durationDays } = req.body;
    
    const contractAddress = await blockchainService.deployElectionContract(title, description, durationDays);
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DEPLOY_CONTRACT',
      details: { contractAddress, title, durationDays },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Contract deployed successfully',
      contract_address: contractAddress
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to deploy contract' });
  }
};

// Sync votes from blockchain to database
exports.syncVotesFromBlockchain = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.body;
    
    const election = await Election.findByPk(electionId, { transaction });
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    const results = await blockchainService.getResults(election.contract_address);
    
    // Update candidate vote counts
    for (const result of results) {
      await Candidate.update(
        { vote_count: result.voteCount, is_winner: result.isWinner },
        { where: { blockchain_id: result.id, election_id: electionId }, transaction }
      );
    }
    
    await transaction.commit();
    
    res.json({
      message: 'Votes synced successfully',
      candidates_updated: results.length
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to sync votes' });
  }
};

// Get contract events
exports.getContractEvents = async (req, res) => {
  try {
    const { contractAddress, eventName, fromBlock, toBlock } = req.query;
    
    const web3 = await blockchainService.getWeb3();
    const contract = new web3.eth.Contract([], contractAddress);
    
    const events = await contract.getPastEvents(eventName || 'allEvents', {
      fromBlock: fromBlock || 'earliest',
      toBlock: toBlock || 'latest'
    });
    
    res.json({
      contract_address: contractAddress,
      event_count: events.length,
      events: events.slice(0, 100) // Limit to 100 events
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch contract events' });
  }
};

module.exports = exports;