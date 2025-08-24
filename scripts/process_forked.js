const { network } = require("hardhat");

async function main() {

    const targetEOA = "0x5d4Da23d08cFCB29009876cbFCE91a3eb961997f";
    const nonceToDeploySaver = 79;


    await network.provider.request({
        method: "hardhat_setBalance",
        params: [
        targetEOA,
        "0x" + (10n ** 21n).toString(16),
        ],
    });

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [targetEOA],
    });
    const signer = await ethers.getSigner(targetEOA);

    let currentNonce = await ethers.provider.getTransactionCount(targetEOA, "latest");
    console.log(`Current nonce of ${targetEOA}:`, currentNonce);

    if (BigInt(currentNonce) > nonceToDeploySaver) {
        throw new Error(
            `Current nonce (${currentNonce}) is already beyond desired (${nonceToDeploySaver}).`
        );
    }

    while (BigInt(currentNonce) < nonceToDeploySaver) {
        const tx = await signer.sendTransaction({
            to: targetEOA,
            value: 0n,
        });
        await tx.wait();
        currentNonce++;
        if (currentNonce % 10 === 0) {
            console.log(`Bumped nonce to ${currentNonce}`);
        }
    }

    const expectedCreateAddr = ethers.getCreateAddress({ from: targetEOA, nonce: nonceToDeploySaver });
    console.log("Expected contract address for next CREATE:", expectedCreateAddr);

    const factory = await ethers.getContractFactory("Saver", signer);
    const deployed = await factory.deploy();
    const deployTx = deployed.deploymentTransaction();
    const deployReceipt = await deployTx.wait();

    const deployedAddr = await deployed.getAddress();
    console.log("Saver deployed at:", deployedAddr);

    if (deployedAddr.toLowerCase() !== expectedCreateAddr.toLowerCase()) {
        console.warn(
            `WARNING: Deployed address (${deployedAddr}) != expected (${expectedCreateAddr}).`
        );
    } else {
        console.log(`✓ Deployed address matches expected CREATE address: ${deployedAddr}`);
    }

    const saverGasUsed = deployReceipt.gasUsed;
    console.log(
        `Saver deployment gas used: ${saverGasUsed.toString()}`
    );

    const tx = await deployed.createWithdrawer();
    const withdrawerReceipt = await tx.wait();

    const withdrawerAddr = await deployed.withdrawer();
    console.log("Withdrawer deployed at:", withdrawerAddr);

    const withdrawerGasUsed = withdrawerReceipt.gasUsed;
    console.log(
        `Withdrawer deployment gas used: ${withdrawerGasUsed.toString()}`
    );

    const currentBalance = await ethers.provider.getBalance(targetEOA);
    console.log(`Current balance of ${targetEOA}:`, ethers.formatEther(currentBalance), "ETH");

    console.log("Sending rescue withdraw request..");
    const tx2 = await deployed.withdrawer().then(addr => {
        const withdrawOperation = ethers.getContractAt("Withdrawer", addr, signer).then(withdrawer => {
            return withdrawer.withdraw();
        });
        return withdrawOperation;
    });
    await tx2.wait();

    const newBalance = await ethers.provider.getBalance(targetEOA);
    console.log(`New balance of ${targetEOA}:`, ethers.formatEther(newBalance), "ETH");
    console.log(`Gained ${ethers.formatEther(newBalance - currentBalance)} ETH`);
    console.log("All done!");

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [targetEOA],
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
