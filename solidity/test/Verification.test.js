const truffleAssert = require("truffle-assertions");
const Web3 = require("web3");
const web3 = new Web3();
const DemoNFT = artifacts.require("./DemoNFT.sol");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");
const MockContract = artifacts.require("./MockContract.sol");
const linkABI = require("../abi/link.abi");
const linkToken = new web3.eth.Contract(linkABI);

contract(
  "Verification",
  ([root, oracle, providerOwner, nftOwner, user1, user2, user3, unknown]) => {
    let provider;
    let link;
    let transferAndCall;

    before(async () => {
      provider = await IdentityProvider.new("https://example.com/", {from: providerOwner});
      link = await MockContract.new();
      transferAndCall = linkToken.methods.transferAndCall.call(0, oracle, 0, "0x0").encodeABI();
    });

    before(async () => {
      await provider.registerVerifier(nftOwner, {from: providerOwner});
      await provider.register(user1, {from: providerOwner});
      await provider.register(user2, {from: providerOwner});
      await provider.register(user3, {from: providerOwner});
    });

    describe("mint and verify", () => {
      let nft;

      before(async () => {
        nft = await DemoNFT.new("DMY", "Dummy", {from: nftOwner});

        await nft.setupVerification(
          provider.address,
          link.address,
          oracle,
          "0xc1c5e92880894eb6b27d3cae19670aa3",
          web3.utils.toBN(100000000000000000),
          {from: nftOwner}
        )
      });

      describe("by a registered wallet", () => {
        let result;
        let tokenId;

        before(async () => {
          await link.reset();
          await link.givenMethodReturnBool(transferAndCall, true);
        });

        it("mint()", async () => {
          result = await nft.mint({ from: user1 });
          tokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        it("has issued a chainlink API call", async () => {
          assert.equal(1, await link.invocationCountForMethod.call(transferAndCall));
          truffleAssert.eventEmitted(result, "ChainlinkRequested");
        });

        it("minted a locked NFT for the user", async() => {
          assert.equal(user1, await nft.ownerOf(tokenId));
          assert.equal(true, await nft.isLocked(tokenId));
        });

        it("marked the user as pending verification", async () => {
          assert.equal(true, await nft.isPendingVerification(user1));
        });
      });

      describe("by an unknown wallet", () => {
        it("will revert the call", async () => {
          await truffleAssert.reverts(
              nft.mint({ from: unknown }),
              "unable to verify unknown wallet"
          );
        });
      });
    });

    describe("fulfill verification", () => {
      let nft;
      let otherToken;

      before(async () => {
        await link.reset();
        await link.givenMethodReturnBool(transferAndCall, true);
      });

      before(async () => {
        nft = await DemoNFT.new("DMY", "Dummy", {from: nftOwner});

        await nft.setupVerification(
            provider.address,
            link.address,
            oracle,
            "0xc1c5e92880894eb6b27d3cae19670aa3",
            web3.utils.toBN(100000000000000000),
            {from: nftOwner}
        )
      });

      before(async () => {
        const result = await nft.mint({ from: user3 });
        otherToken = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
      });

      describe("approved", () => {
        let requestId;
        let tokenId;
        let secondTokenId;

        before(async () => {
          const result = await nft.mint({ from: user1 });
          requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
          tokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        before(async () => {
          const result = await nft.mint({ from: user1 });
          secondTokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        it("fulfillVerification(requestId, true)", async () => {
          await nft.fulfillVerification(requestId, true, { from: oracle });
        });

        it("will mark the address as approved", async () => {
          assert.equal(true, await nft.isApproved(user1));
        });

        it("will unlock the token", async () => {
          assert.equal(false, await nft.isLocked(tokenId));
        });

        it("will also unlock the user's second token", async () => {
          assert.equal(false, await nft.isLocked(secondTokenId));
        });

        it("will not unlock other tokens", async () => {
          assert.equal(true, await nft.isLocked(otherToken));
        });
      });

      describe("declined", () => {
        let requestId;
        let tokenId;

        before(async () => {
          const result = await nft.mint({ from: user2 });
          requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
          tokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        it("fulfillVerification(requestId, false)", async () => {
          await nft.fulfillVerification(requestId, false, { from: oracle });
        });

        it("will mark the address as declined", async () => {
          assert.equal(true, await nft.isDeclined(user2));
        });

        it("will not unlock the token", async () => {
          assert.equal(true, await nft.isLocked(tokenId));
        });
      });
    });

    describe("mint by verified user", () => {
      let nft;

      before(async () => {
        nft = await DemoNFT.new("DMY", "Dummy", {from: nftOwner});

        await nft.setupVerification(
            provider.address,
            link.address,
            oracle,
            "0xc1c5e92880894eb6b27d3cae19670aa3",
            web3.utils.toBN(100000000000000000),
            {from: nftOwner}
        )
      });

      describe("approved user", () => {
        let result;
        let tokenId;

        before(async () => {
          const result = await nft.mint({from: user1});
          const requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
          await nft.fulfillVerification(requestId, true, {from: oracle});
        });

        before(async () => {
          await link.reset();
          await link.givenMethodReturnBool(transferAndCall, true);
        });

        it("mint()", async () => {
          result = await nft.mint({ from: user1 });
          tokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        it("has not issued a chainlink API call", async () => {
          assert.equal(0, await link.invocationCountForMethod.call(transferAndCall));
          truffleAssert.eventNotEmitted(result, "ChainlinkRequested");
        });

        it("has minted an unlocked token", async () => {
          assert.equal(false, await nft.isLocked(tokenId));
        });
      });

      describe("declined user", () => {
        let result;
        let tokenId;

        before(async () => {
          const result = await nft.mint({from: user2});
          const requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
          await nft.fulfillVerification(requestId, false, {from: oracle});
        });

        before(async () => {
          await link.reset();
          await link.givenMethodReturnBool(transferAndCall, true);
        });

        it("mint()", async () => {
          result = await nft.mint({ from: user2 });
          tokenId = result.logs.filter(e => e.event === 'Transfer')[0].args.tokenId;
        });

        it("has not issued a chainlink API call", async () => {
          assert.equal(0, await link.invocationCountForMethod.call(transferAndCall));
          truffleAssert.eventNotEmitted(result, "ChainlinkRequested");
        });

        it("has minted an locked token", async () => {
          assert.equal(true, await nft.isLocked(tokenId));
        });
      });
    });

    describe("retry verification", () => {
      let nft;

      before(async () => {
        nft = await DemoNFT.new("DMY", "Dummy", {from: nftOwner});

        await nft.setupVerification(
            provider.address,
            link.address,
            oracle,
            "0xc1c5e92880894eb6b27d3cae19670aa3",
            web3.utils.toBN(100000000000000000),
            {from: nftOwner}
        )
      });

      describe("previously declined user", () => {
        let result;
        let requestId;

        before(async () => {
          const result = await nft.mint({from: user1});
          const requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
          await nft.fulfillVerification(requestId, false, {from: oracle});
        });

        before(async () => {
          await link.reset();
          await link.givenMethodReturnBool(transferAndCall, true);
        });

        it("unlock()", async () => {
          result = await nft.unlock({ from: user1 });
          requestId = result.logs.filter(e => e.event === 'ChainlinkRequested')[0].args.id;
        });

        it("has issued a chainlink API call", async () => {
          assert.equal(1, await link.invocationCountForMethod.call(transferAndCall));
          truffleAssert.eventEmitted(result, "ChainlinkRequested");
        });

        it("marked the user as pending verification", async () => {
          assert.equal(true, await nft.isPendingVerification(user1));
        });
      });
    });
  }
);
