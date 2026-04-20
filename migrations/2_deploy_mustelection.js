// migrations/2_deploy_mustelection.js
const MUSTElection = artifacts.require("MUSTElection");

module.exports = function(deployer) {
  deployer.deploy(
    MUSTElection,
    "MUST Student Elections 2026",
    "Secure and transparent student leadership elections powered by blockchain",
    2  // Election lasts 2 days
  );
};