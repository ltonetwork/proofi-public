const allConfigs = require("../config.json");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");

module.exports = async function (deployer, network, addresses) {
  const config = allConfigs[network.replace(/-fork$/, '')] || allConfigs.default;
  console.log("Config: ", config);
  console.log("Network: ", network);
  if (!config.url) return;

  await deployer.deploy(IdentityProvider, config.url);
};
