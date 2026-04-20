// contracts/MUSTElection.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MUSTElection {
    // ============ STRUCTS ============
    struct Candidate {
        uint id;
        string name;
        string registrationNumber;
        string position;
        string manifesto;
        uint voteCount;
        bool isApproved;
        bool isWinner;
        string campaignSlogan;
        uint registeredAt;
    }
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedCandidateId;
        uint votedAt;
        string registrationNumber;
        string fullName;
        uint registeredAt;
    }
    
    struct ElectionDetails {
        string title;
        string description;
        uint startTime;
        uint endTime;
        bool isActive;
        bool resultsPublished;
        uint totalVotes;
        uint totalVoters;
        string ipfsHash;
    }
    
    // ============ STATE VARIABLES ============
    address public admin;
    address public dean;
    mapping(address => bool) public commissioners;
    mapping(address => bool) public isAuthorizedVoter;
    
    ElectionDetails public election;
    mapping(uint => Candidate) public candidates;
    uint public candidatesCount;
    
    mapping(address => Voter) public voters;
    address[] public voterAddresses;
    
    mapping(uint => uint[]) public positionCandidates;
    string[] public positions;
    mapping(string => bool) public positionExists;
    
    // ============ EVENTS ============
    event VoterRegistered(address indexed voter, string registrationNumber, string fullName);
    event VoteCast(address indexed voter, uint candidateId, uint timestamp, uint blockNumber);
    event CandidateAdded(uint candidateId, string name, string position, address addedBy);
    event CandidateApproved(uint candidateId, address indexed approver, string role);
    event ElectionStarted(uint startTime, uint endTime, address startedBy);
    event ElectionEnded(uint endTime, uint totalVotes, address endedBy);
    event ResultsPublished(uint totalVotes, string ipfsHash, address publishedBy);
    event CommissionerAdded(address indexed commissioner, address addedBy);
    event CommissionerRemoved(address indexed commissioner, address removedBy);
    event DeanChanged(address oldDean, address newDean);
    event VoterAuthorized(address indexed voter, string registrationNumber);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    
    modifier onlyDean() {
        require(msg.sender == dean || msg.sender == admin, "Only Dean/Admin can call this");
        _;
    }
    
    modifier onlyCommissioner() {
        require(commissioners[msg.sender] || msg.sender == admin, "Only Commissioner can call this");
        _;
    }
    
    modifier onlyAuthorizedVoter() {
        require(isAuthorizedVoter[msg.sender], "Not authorized to vote");
        _;
    }
    
    modifier electionActive() {
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Election not started yet");
        require(block.timestamp <= election.endTime, "Election has ended");
        _;
    }
    
    modifier electionNotStarted() {
        require(!election.isActive || block.timestamp < election.startTime, "Election already started or active");
        _;
    }
    
    modifier electionEnded() {
        require(!election.isActive || block.timestamp > election.endTime, "Election still active");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(
        string memory _title,
        string memory _description,
        uint _durationDays
    ) {
        admin = msg.sender;
        dean = msg.sender;
        
        election.title = _title;
        election.description = _description;
        election.startTime = block.timestamp;
        election.endTime = block.timestamp + (_durationDays * 1 days);
        election.isActive = true;
        election.resultsPublished = false;
        election.totalVotes = 0;
        election.totalVoters = 0;
        election.ipfsHash = "";
        
        emit ElectionStarted(election.startTime, election.endTime, msg.sender);
    }
    
    // ============ ADMIN FUNCTIONS ============
    function setDean(address _dean) external onlyAdmin {
        require(_dean != address(0), "Invalid address");
        address oldDean = dean;
        dean = _dean;
        emit DeanChanged(oldDean, _dean);
    }
    
    function addCommissioner(address _commissioner) external onlyDean {
        require(!commissioners[_commissioner], "Already a commissioner");
        commissioners[_commissioner] = true;
        emit CommissionerAdded(_commissioner, msg.sender);
    }
    
    function removeCommissioner(address _commissioner) external onlyDean {
        require(commissioners[_commissioner], "Not a commissioner");
        commissioners[_commissioner] = false;
        emit CommissionerRemoved(_commissioner, msg.sender);
    }
    
    function addPosition(string memory _position) external onlyDean electionNotStarted {
        require(!positionExists[_position], "Position already exists");
        positions.push(_position);
        positionExists[_position] = true;
    }
    
    // ============ VOTER MANAGEMENT ============
    function registerVoter(
        address _voter, 
        string memory _regNumber, 
        string memory _fullName
    ) external onlyDean {
        require(!voters[_voter].isRegistered, "Voter already registered");
        
        voters[_voter] = Voter({
            isRegistered: true,
            hasVoted: false,
            votedCandidateId: 0,
            votedAt: 0,
            registrationNumber: _regNumber,
            fullName: _fullName,
            registeredAt: block.timestamp
        });
        
        voterAddresses.push(_voter);
        
        emit VoterRegistered(_voter, _regNumber, _fullName);
    }
    
    function authorizeVoter(address _voter) external onlyDean {
        require(voters[_voter].isRegistered, "Voter not registered");
        require(!isAuthorizedVoter[_voter], "Already authorized");
        
        isAuthorizedVoter[_voter] = true;
        election.totalVoters++;
        
        emit VoterAuthorized(_voter, voters[_voter].registrationNumber);
    }
    
    function authorizeMultipleVoters(address[] memory _voters) external onlyDean {
        for (uint i = 0; i < _voters.length; i++) {
            if (voters[_voters[i]].isRegistered && !isAuthorizedVoter[_voters[i]]) {
                isAuthorizedVoter[_voters[i]] = true;
                election.totalVoters++;
                emit VoterAuthorized(_voters[i], voters[_voters[i]].registrationNumber);
            }
        }
    }
    
    // ============ CANDIDATE MANAGEMENT ============
    function addCandidate(
        string memory _name,
        string memory _regNumber,
        string memory _position,
        string memory _manifesto,
        string memory _campaignSlogan
    ) external onlyCommissioner {
        require(positionExists[_position], "Position does not exist");
        require(!_isCandidateAlreadyRegistered(_regNumber), "Candidate already registered");
        
        candidatesCount++;
        candidates[candidatesCount] = Candidate({
            id: candidatesCount,
            name: _name,
            registrationNumber: _regNumber,
            position: _position,
            manifesto: _manifesto,
            voteCount: 0,
            isApproved: false,
            isWinner: false,
            campaignSlogan: _campaignSlogan,
            registeredAt: block.timestamp
        });
        
        positionCandidates[_getPositionId(_position)].push(candidatesCount);
        
        emit CandidateAdded(candidatesCount, _name, _position, msg.sender);
    }
    
    function approveCandidate(uint _candidateId) external onlyDean {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");
        require(!candidates[_candidateId].isApproved, "Already approved");
        
        candidates[_candidateId].isApproved = true;
        emit CandidateApproved(_candidateId, msg.sender, "Dean");
    }
    
    function approveMultipleCandidates(uint[] memory _candidateIds) external onlyDean {
        for (uint i = 0; i < _candidateIds.length; i++) {
            if (_candidateIds[i] > 0 && _candidateIds[i] <= candidatesCount) {
                if (!candidates[_candidateIds[i]].isApproved) {
                    candidates[_candidateIds[i]].isApproved = true;
                    emit CandidateApproved(_candidateIds[i], msg.sender, "Dean");
                }
            }
        }
    }
    
    function rejectCandidate(uint _candidateId) external onlyDean {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");
        candidates[_candidateId].isApproved = false;
    }
    
    // ============ VOTING FUNCTION ============
    function vote(uint _candidateId) external electionActive onlyAuthorizedVoter {
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");
        require(candidates[_candidateId].isApproved, "Candidate not approved");
        
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        voters[msg.sender].votedAt = block.timestamp;
        
        candidates[_candidateId].voteCount++;
        election.totalVotes++;
        
        emit VoteCast(msg.sender, _candidateId, block.timestamp, block.number);
    }
    
    // ============ ELECTION MANAGEMENT ============
    function updateElectionTimes(uint _newStartTime, uint _newEndTime) external onlyDean electionNotStarted {
        require(_newStartTime < _newEndTime, "Start time must be before end time");
        election.startTime = _newStartTime;
        election.endTime = _newEndTime;
    }
    
    function startElection() external onlyDean {
        require(!election.isActive, "Election already active");
        require(block.timestamp <= election.endTime, "Election period expired");
        
        election.isActive = true;
        election.startTime = block.timestamp;
        
        emit ElectionStarted(election.startTime, election.endTime, msg.sender);
    }
    
    function endElection() external onlyDean electionActive {
        election.isActive = false;
        emit ElectionEnded(block.timestamp, election.totalVotes, msg.sender);
    }
    
    function publishResults(string memory _ipfsHash) external onlyDean electionEnded {
        require(!election.resultsPublished, "Results already published");
        
        // Determine winners for each position
        for (uint i = 0; i < positions.length; i++) {
            uint[] memory posCandidates = positionCandidates[i];
            uint highestVotes = 0;
            uint winnerId = 0;
            
            for (uint j = 0; j < posCandidates.length; j++) {
                uint candidateId = posCandidates[j];
                if (candidates[candidateId].voteCount > highestVotes && candidates[candidateId].isApproved) {
                    highestVotes = candidates[candidateId].voteCount;
                    winnerId = candidateId;
                }
            }
            
            if (winnerId > 0) {
                candidates[winnerId].isWinner = true;
            }
        }
        
        election.resultsPublished = true;
        election.ipfsHash = _ipfsHash;
        
        emit ResultsPublished(election.totalVotes, _ipfsHash, msg.sender);
    }
    
    // ============ VIEW FUNCTIONS ============
    function getElectionInfo() external view returns (
        string memory title,
        string memory description,
        uint startTime,
        uint endTime,
        bool isActive,
        bool resultsPublished,
        uint totalVotes,
        uint totalVoters,
        string memory ipfsHash
    ) {
        return (
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.isActive,
            election.resultsPublished,
            election.totalVotes,
            election.totalVoters,
            election.ipfsHash
        );
    }
    
    function getCandidate(uint _candidateId) external view returns (
        uint id,
        string memory name,
        string memory regNumber,
        string memory position,
        string memory manifesto,
        uint voteCount,
        bool isApproved,
        bool isWinner,
        string memory campaignSlogan,
        uint registeredAt
    ) {
        Candidate memory c = candidates[_candidateId];
        return (
            c.id,
            c.name,
            c.registrationNumber,
            c.position,
            c.manifesto,
            c.voteCount,
            c.isApproved,
            c.isWinner,
            c.campaignSlogan,
            c.registeredAt
        );
    }
    
    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidatesCount);
        for (uint i = 1; i <= candidatesCount; i++) {
            allCandidates[i-1] = candidates[i];
        }
        return allCandidates;
    }
    
    function getCandidatesByPosition(string memory _position) external view returns (Candidate[] memory) {
        uint posId = _getPositionId(_position);
        uint[] memory posCandidates = positionCandidates[posId];
        Candidate[] memory result = new Candidate[](posCandidates.length);
        
        for (uint i = 0; i < posCandidates.length; i++) {
            result[i] = candidates[posCandidates[i]];
        }
        return result;
    }
    
    function getVoter(address _voter) external view returns (
        bool isRegistered,
        bool hasVoted,
        uint votedCandidateId,
        uint votedAt,
        string memory registrationNumber,
        string memory fullName,
        uint registeredAt
    ) {
        Voter memory v = voters[_voter];
        return (
            v.isRegistered,
            v.hasVoted,
            v.votedCandidateId,
            v.votedAt,
            v.registrationNumber,
            v.fullName,
            v.registeredAt
        );
    }
    
    function getTotalVoters() external view returns (uint) {
        return voterAddresses.length;
    }
    
    function getVoterCount() external view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].hasVoted) {
                count++;
            }
        }
        return count;
    }
    
    function getPositions() external view returns (string[] memory) {
        return positions;
    }
    
    function isCommissioner(address _addr) external view returns (bool) {
        return commissioners[_addr];
    }
    
    function getWinners() external view returns (Candidate[] memory) {
        uint winnerCount = 0;
        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].isWinner) {
                winnerCount++;
            }
        }
        
        Candidate[] memory winners = new Candidate[](winnerCount);
        uint index = 0;
        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].isWinner) {
                winners[index] = candidates[i];
                index++;
            }
        }
        return winners;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    function _getPositionId(string memory _position) internal view returns (uint) {
        for (uint i = 0; i < positions.length; i++) {
            if (keccak256(bytes(positions[i])) == keccak256(bytes(_position))) {
                return i;
            }
        }
        revert("Position not found");
    }
    
    function _isCandidateAlreadyRegistered(string memory _regNumber) internal view returns (bool) {
        for (uint i = 1; i <= candidatesCount; i++) {
            if (keccak256(bytes(candidates[i].registrationNumber)) == keccak256(bytes(_regNumber))) {
                return true;
            }
        }
        return false;
    }
}