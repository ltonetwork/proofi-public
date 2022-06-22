const DemoNFT = artifacts.require("./DemoNFT.sol");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");
const allConfigs = require("../config.json");
const Web3 = require("web3");

module.exports = async function(deployer, network) {
    const config = allConfigs[network.replace(/-fork$/, '')] || allConfigs.default;

    if (!config.nfts) return;

    const contract = await IdentityProvider.deployed();

    for (let i = 0; i < config.nfts.length; i++) {
        const settings = config.nfts[i];

        await deployer.deploy(DemoNFT, settings.name, settings.symbol);
        const nft = await DemoNFT.deployed();
        await nft.setup(
            contract.address,
            config.token,
            config.oracle,
            config.jobId,
            Web3.utils.toBN(config.fee),
        );
    }
};
