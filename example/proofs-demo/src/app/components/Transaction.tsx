"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { http, createPublicClient, encodeFunctionData } from "viem";

import { baseSepolia } from "viem/chains";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

import counterContractAbi from "../abis/counterABI.json";

import {
    getCrosschainValidator,
    sendCrossChainUserOperation,
} from "@cometh/crosschain";


const COUNTER_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";
const rpc = process.env.NEXT_PUBLIC_RPC_URL;

interface TransactionProps {
    transactionSuccess: boolean;
    setTransactionSuccess: React.Dispatch<React.SetStateAction<boolean>>;
    safeChildClient: any;
    parentAccountClient: any;
    masterOwner: any;
    pimlicoClient: any;
}

function Transaction({
    transactionSuccess,
    setTransactionSuccess,
    safeChildClient,
    parentAccountClient,
    masterOwner,
    pimlicoClient,
}: TransactionProps) {
    const [isTransactionLoading, setIsTransactionLoading] = useState(false);
    const [transactionSended, setTransactionSended] = useState<string | null>(
        null
    );
    const [transactionFailure, setTransactionFailure] = useState(false);
    const [nftBalance, setNftBalance] = useState<number>(0);
    const [parentSafeAddress, setParentSafeAddress] = useState<string | null>(
        null
    );
    const [childSafeAddress, setChildSafeAddress] = useState<string | null>(
        null
    );
    const [masterOwnerAddress, setMasterOwnerAddress] = useState<string | null>(
        null
    );

    useEffect(() => {
        if (parentAccountClient) {
            setParentSafeAddress(parentAccountClient.account.address);
        }
        if (safeChildClient) {
            setChildSafeAddress(safeChildClient.account.address);
        }
        if (masterOwner) {
            setMasterOwnerAddress(masterOwner.address);
        }
    }, [parentAccountClient, safeChildClient, masterOwner]);

    const sendTestTransaction = async (
        masterOwner: any,
        safeChildClient: any,
        parentAccountClient: any,
        pimlicoClient: any
    ) => {
        setTransactionSended(null);
        setTransactionFailure(false);
        setTransactionSuccess(false);
        setIsTransactionLoading(true);

        try {
            const publicClient = createPublicClient({
                transport: http(rpc),
                chain: baseSepolia,
            });

            const counterData = encodeFunctionData({
                abi: counterContractAbi,
                functionName: "count",
                args: [],
            });

            console.log(
                "Smart Account Address: ",
                safeChildClient.account?.address
            );

            const crossChainValidator = getCrosschainValidator(
                parentAccountClient.account.address
            );
            console.log({ crossChainValidator });
            let isValidatorInstalled = false;
            try {
                isValidatorInstalled = await safeChildClient.isModuleInstalled(crossChainValidator);
            } catch (error) {
                console.warn("Error checking if module is installed: crossChainValidator may not be installed");
            }

            console.log({ isValidatorInstalled });

            if (!isValidatorInstalled) {
                const opHash2 =
                    await safeChildClient.installModule(crossChainValidator);

                await pimlicoClient.waitForUserOperationReceipt({
                    hash: opHash2,
                });

                console.log("Validator installation completed");
            }

            const userOpHash = await sendCrossChainUserOperation({
                safeChildClient,
                masterOwner,
                contractAddress: COUNTER_ADDRESS,
                callData: counterData,
            });

            const receipt2 = await pimlicoClient.waitForUserOperationReceipt({
                hash: userOpHash,
            });

            console.log("receipt2", receipt2);

            const count = await publicClient.readContract({
                address: COUNTER_ADDRESS,
                abi: counterContractAbi,
                functionName: "counters",
                args: [safeChildClient.account.address],
            });

            console.log("Count: ", count);

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
                        onClick={() =>
                            sendTestTransaction(
                                masterOwner,
                                safeChildClient,
                                parentAccountClient,
                                pimlicoClient
                            )
                        }
                    >
                        {isTransactionLoading ? (
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                            <PlusIcon width={16} height={16} />
                        )}{" "}
                        Send tx
                    </button>

                    <p className="text-gray-600">{nftBalance}</p>
                    {parentSafeAddress && (
                        <p>Parent Safe Account Address: {parentSafeAddress}</p>
                    )}
                    {childSafeAddress && (
                        <p>Child Safe Account Address: {childSafeAddress}</p>
                    )}
                    {masterOwnerAddress && (
                        <p>Master Owner Address: {masterOwnerAddress}</p>
                    )}
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
            {transactionFailure && (
                <Alert state="error" content="Transaction Failed !" />
            )}
        </main>
    );
}

export default Transaction;
