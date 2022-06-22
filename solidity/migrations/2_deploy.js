const allConfigs = require("../config.json");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");

module.exports = async function (deployer, network, addresses) {
  const config = allConfigs[network.replace(/-fork$/, '')] || allConfigs.default;
  if (!config.url) return;

  await deployer.deploy(IdentityProvider, config.url);
};
