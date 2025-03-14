import {ethers} from "ethers"
import {getEnv} from "./src/utils/env"
import {getSafeOwnerProof, getBlock, executeTxFromSupraOwner} from "@cometh/crosschain"
import {counterAbi} from "./src/abis/counterAbi"

const savedBlockNumber: string = "0x15e786e"

const prepareTransaction = async (counter: any) => {
    const msgTo = await counter.getAddress()    // The contract address that will be called
    const msgValue = 0  // Set to zero since this is a non-payable function
    const msgData = counter.interface.encodeFunctionData("increment", [])  // Encode the function call
    const msgOperation = 0  // 0 for `call`, 1 for `delegatecall`

    // Encode transaction data for `executeTxFromSupraOwner`
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes", "uint8"],
        [msgTo, msgValue, msgData, msgOperation]
    )
}

const main = async (blockNumber: string) => {

    const privateKey = getEnv(`PRIVATE_KEY`);
    const providerUrl = `https://mainnet.infura.io/v3/${getEnv("INFURA_PROJECT_ID")}`; 

    // 1. Create a provider (connects to the blockchain)
    const provider = new ethers.JsonRpcProvider(providerUrl);

    const counterAddress = getEnv(`CONTRACT_COUNTER`)
    const crossChainModuleAddress = getEnv(`SECONDARY_CROSS_CHAIN_MODULE`)
    const ownerMain = new ethers.Wallet(privateKey, provider);
    const ownerMainAddress = await ownerMain.getAddress()
    //const ownerSecondary = accounts[1]
    //const ownerSecondaryAddress = await ownerSecondary.getAddress()
    const mainSafeAddress = getEnv(`MAIN_SAFE_ADDRESS`)

    console.log(`account[${ownerMainAddress}] >> contract[${counterAddress}]`)
    const counter: any = new ethers.Contract(counterAddress, counterAbi, ownerMain)

    const block = await getBlock(blockNumber, provider)
    console.log("- block", block)

    const transactionData = await prepareTransaction(counter)
    console.log("- transactionData", transactionData)

    const proof = await getSafeOwnerProof(blockNumber, mainSafeAddress, ownerMainAddress, provider)

    const tx = await executeTxFromSupraOwner(
        ownerMainAddress,
        crossChainModuleAddress,
        mainSafeAddress,
        proof,
        transactionData
    )

    console.log(`- Executed. (tx: ${tx.hash})`)
    const count = await counter.count()
    console.log(`- Counter: ${count}.`)
}

main(savedBlockNumber).catch((error) => {
    console.error(error)
    process.exitCode = 1
})
