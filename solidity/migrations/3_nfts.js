const DemoNFT = artifacts.require("./DemoNFT.sol");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");
const allConfigs = require("../config.json");
const Web3 = require("web3");
const linkABI = require("../abi/link.abi");

module.exports = async function(deployer, network) {
    const config = allConfigs[network.replace(/-fork$/, '')] || allConfigs.default;

    if (!config.nfts) return;

    const provider = await IdentityProvider.deployed();
    const linkToken = new web3.eth.Contract(linkABI, config.token);
    const ownerAddress = await provider.owner();

    for (let i = 0; i < config.nfts.length; i++) {
        const settings = config.nfts[i];

        await deployer.deploy(DemoNFT, settings.name, settings.symbol);
        const nft = await DemoNFT.deployed();
        await nft.setupVerification(
            provider.address,
            config.token,
            config.oracle,
            config.jobId,
            Web3.utils.toBN(config.fee),
        );

        await linkToken.methods.transfer(nft.address, Web3.utils.toBN(config.fee).muln(10))
            .send({from: ownerAddress});
    }
};
