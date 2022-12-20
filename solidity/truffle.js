const HDWalletProvider = require("@truffle/hdwallet-provider");
require('dotenv').config();

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 7545,
            network_id: "*"
        },
        test: {
            host: "localhost",
            port: 8545,
            network_id: "*"
        },
        mainnet: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`
                )
            },
            network_id: 1
        },
        rinkeby: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`
                )
            },
            network_id: 4
        },
        goerli: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://goerli.infura.io/v3/${process.env.INFURA_ID}`
                )
            },
            network_id: 5
        },
        kovan: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://kovan.infura.io/v3/${process.env.INFURA_ID}`
                )
            },
            network_id: 42
        },
        test_bsc: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://data-seed-prebsc-1-s1.binance.org:8545`
                )
            },
            network_id: 97,
            confirmations: 10,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bsc: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://bsc-dataseed1.binance.org`
                )
            },
            network_id: 56,
            confirmations: 10,
            timeoutBlocks: 200,
            skipDryRun: true
        },
    },

    compilers: {
        solc: {
            version: "0.8.10",
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },

    plugins: [
        'truffle-plugin-verify'
    ],

    api_keys: {
        bscscan: process.env.BSCSCAN_API_KEY,
        etherscan: process.env.ETHERSCAN_API_KEY
    }
};
