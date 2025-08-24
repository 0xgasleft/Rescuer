
const NONCE_TO_DEPLOY_SAVER = 79;
const SLEEP_PERIOD = 10;


function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function main() {

    console.log("---------------------------------------- Welcome to Hustler rescue script! ----------------------------------------");

    const signer = (await ethers.getSigners())[0];
    const targetEOA = signer.address;


    let currentNonce = await ethers.provider.getTransactionCount(targetEOA, "latest");
    console.log(`Current nonce of ${targetEOA}:`, currentNonce);

    if (BigInt(currentNonce) > NONCE_TO_DEPLOY_SAVER) {
        throw new Error(
            `Current nonce (${currentNonce}) is already beyond desired (${NONCE_TO_DEPLOY_SAVER}).`
        );
    }

    while (BigInt(currentNonce) < NONCE_TO_DEPLOY_SAVER) {
        const tx = await signer.sendTransaction({
            to: targetEOA,
            value: 0n,
        });
        await tx.wait();
        console.log(`Sleeping ${SLEEP_PERIOD} to avoid nonce issues...`);
        await sleep(SLEEP_PERIOD);
        currentNonce++;
        if (currentNonce % 10 === 0) {
            console.log(`Bumped nonce to ${currentNonce}`);
        }
    }

    const expectedCreateAddr = ethers.getCreateAddress({ from: targetEOA, nonce: NONCE_TO_DEPLOY_SAVER });
    console.log("Expected contract address for next CREATE:", expectedCreateAddr);

    const factory = await ethers.getContractFactory("Saver", signer);
    const deployed = await factory.deploy();
    const deployTx = deployed.deploymentTransaction();
    const deployReceipt = await deployTx.wait();

    const deployedAddr = await deployed.getAddress();
    console.log("Saver deployed at:", deployedAddr);
    await sleep(SLEEP_PERIOD);

    if (deployedAddr.toLowerCase() !== expectedCreateAddr.toLowerCase()) {
        console.warn(
            `WARNING: Deployed address (${deployedAddr}) != expected (${expectedCreateAddr}).`
        );
    } else {
        console.log(`Deployed address matches expected CREATE address: ${deployedAddr}`);
    }

    const saverGasUsed = deployReceipt.gasUsed;
    console.log(
        `Saver deployment gas used: ${saverGasUsed.toString()}`
    );

    const tx = await deployed.createWithdrawer();
    const withdrawerReceipt = await tx.wait();
    await sleep(SLEEP_PERIOD);

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
    await sleep(SLEEP_PERIOD);

    const newBalance = await ethers.provider.getBalance(targetEOA);
    console.log(`New balance of ${targetEOA}:`, ethers.formatEther(newBalance), "ETH");
    console.log(`Gained ${ethers.formatEther(newBalance - currentBalance)} ETH`);
    console.log("Congratulations, All done!");

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
