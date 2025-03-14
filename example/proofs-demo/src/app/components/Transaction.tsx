"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getEnv } from "../utils/env";
import { getSafeOwnerProof, getBlock, executeTxFromSupraOwner } from "@cometh/crosschain";
import { counterAbi } from "../abis/counterAbi";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

const savedBlockNumber = "0x15e786e";

interface TransactionProps {
    transactionSuccess: boolean;
    setTransactionSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

function Transaction({ transactionSuccess, setTransactionSuccess }: TransactionProps) {
    const [isTransactionLoading, setIsTransactionLoading] = useState(false);
    const [transactionSended, setTransactionSended] = useState<string | null>(null);
    const [transactionFailure, setTransactionFailure] = useState(false);
    const [nftBalance, setNftBalance] = useState<number>(0);

    const prepareTransaction = async (counter: ethers.Contract) => {
        const msgTo = await counter.getAddress();
        const msgValue = 0;
        const msgData = counter.interface.encodeFunctionData("increment", []);
        const msgOperation = 0;

        return ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256", "bytes", "uint8"],
            [msgTo, msgValue, msgData, msgOperation]
        );
    };

    const sendTestTransaction = async () => {
        setTransactionSended(null);
        setTransactionFailure(false);
        setTransactionSuccess(false);
        setIsTransactionLoading(true);

        try {
            const privateKey = getEnv("NEXT_PUBLIC_PRIVATE_KEY");
            const providerUrl = `https://mainnet.infura.io/v3/${getEnv("NEXT_PUBLIC_INFURA_PROJECT_ID")}`;
            const provider = new ethers.JsonRpcProvider(providerUrl);
            const counterAddress = getEnv("NEXT_PUBLIC_CONTRACT_COUNTER");
            const crossChainModuleAddress = getEnv("NEXT_PUBLIC_SECONDARY_CROSS_CHAIN_MODULE");
            const ownerMain = new ethers.Wallet(privateKey, provider);
            const ownerMainAddress = await ownerMain.getAddress();
            const mainSafeAddress = getEnv("NEXT_PUBLIC_MAIN_SAFE_ADDRESS");

            const counter = new ethers.Contract(counterAddress, counterAbi, ownerMain);
            const block = await getBlock(savedBlockNumber, provider);
            const transactionData = await prepareTransaction(counter);
            const proof = await getSafeOwnerProof(savedBlockNumber, mainSafeAddress, ownerMainAddress, provider);

            const tx = await executeTxFromSupraOwner(
                ownerMainAddress,
                crossChainModuleAddress,
                mainSafeAddress,
                proof,
                transactionData
            );

            console.log(`- Executed. (tx: ${tx.hash})`);
            setTransactionSended(tx.hash);
            setTransactionSuccess(true);

            const count = await counter.count();
            setNftBalance(Number(count));
        } catch (e) {
            console.error("Error:", e);
            setTransactionFailure(true);
        }

        setIsTransactionLoading(false);
    };

    return (
        <main>
            <div className="p-4">
                <div className="relative flex flex-col items-center gap-y-6 rounded-lg p-4">
                    <button
                        className="mt-1 flex h-11 py-2 px-4 gap-2 flex-none items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
                        onClick={sendTestTransaction}
                    >
                        {isTransactionLoading ? (
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                            <PlusIcon width={16} height={16} />
                        )} Send tx
                    </button>

                    <p className="text-gray-600">{nftBalance}</p>
                </div>
            </div>

            {transactionSuccess && (
                <Alert
                    state="success"
                    content="Transaction confirmed !"
                    link={{
                        content: "Go see your transaction",
                        url: `https://etherscan.io/tx/${transactionSended}`,
                    }}
                />
            )}
            {transactionFailure && <Alert state="error" content="Transaction Failed !" />}
        </main>
    );
}

export default Transaction;
