const truffleAssert = require("truffle-assertions");
const IdentityProvider = artifacts.require("./IdentityProvider.sol");
const url = "https://example.com";

contract(
  "IdentityProvider",
  ([owner, verifierA, verifierB, user1, user2, user3]) => {
    describe("construction", () => {
      let contract;

      before(async () => {
        contract = await IdentityProvider.new(url);
      });

      it("will not have any existing verifiers", async () => {
        assert.equal(false, await contract.isVerifier(verifierA));
      });

      it("will not have any known wallets", async () => {
        assert.equal(false, await contract.isKnown(user1));
      });
    });

    describe("register verifier", () => {
      let contract;

      before(async () => {
        contract = await IdentityProvider.new(url);
      });

      it("will add a verifier", async () => {
        await contract.registerVerifier(verifierA);
        assert.equal(true, await contract.isVerifier(verifierA));
        assert.equal(false, await contract.isVerifier(verifierB));
      });

      it("will add a second verifier", async () => {
        await contract.registerVerifier(verifierB);
        assert.equal(true, await contract.isVerifier(verifierA));
        assert.equal(true, await contract.isVerifier(verifierB));
      });

      it("can only be called by the owner", async () => {
        await truffleAssert.reverts(
          contract.registerVerifier(user3, { from: user3 }),
          "caller is not the owner"
        );
      });
    });

    describe("revoke verifier", () => {
      let contract;

      before(async () => {
        contract = await IdentityProvider.new(url);
      });

      before(async () => {
        await contract.registerVerifier(verifierA);
        await contract.registerVerifier(verifierB);
      });

      it("will set the suspend flag of identity provider", async () => {
        await contract.revokeVerifier(verifierB);

        assert.equal(true, await contract.isVerifier(verifierA));
        assert.equal(false, await contract.isVerifier(verifierB));
      });

      it("checks that the address belongs to a registered provider", async () => {
        await truffleAssert.reverts(
          contract.revokeVerifier(user3),
          "address is not a verifier"
        );
      });

      it("can only be called by the owner", async () => {
        await truffleAssert.reverts(
          contract.revokeVerifier(verifierA, { from: user3 }),
          "caller is not the owner"
        );
      });
    });

    describe("register wallet", () => {
      let contract;

      before(async () => {
        contract = await IdentityProvider.new(url);
      });

      before(async () => {
        await contract.registerVerifier(verifierA);
      });

      it("will set a pending attestation", async () => {
        const result = await contract.register(user1);

        assert.equal(true, await contract.isKnown(user1));
        assert.equal(false, await contract.isKnown(user2));

        truffleAssert.eventEmitted(result, "Register", (ev) => {
          return ev.wallet === user1;
        });
      });

      it("can only be called by the owner", async () => {
        await truffleAssert.reverts(
          contract.register(user3, { from: user3 }),
          "caller is not the owner"
        );
      });
    });

    describe("revoke wallet", () => {
      let contract;

      before(async () => {
        contract = await IdentityProvider.new(url);
      });

      before(async () => {
        await contract.registerVerifier(verifierA);
        await contract.register(user1);
        await contract.register(user2);
      });

      it("will revoke an existing attestation", async () => {
        const result = await contract.revoke(user1);

        assert.equal(false, await contract.isKnown(user1));
        assert.equal(true, await contract.isKnown(user2));

        truffleAssert.eventEmitted(result, "Revoke", (ev) => {
          return ev.wallet === user1;
        });
      });

      it("can only be called by the owner", async () => {
        await truffleAssert.reverts(
          contract.revoke(user2, { from: user2 }),
          "caller is not the owner"
        );
      });
    });
  }
);
