"use client";

import { isSmartAccountDeployed } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import React, { useState, useEffect } from "react";
import { http, type Hex, createPublicClient, encodeFunctionData } from "viem";
import {
    createPaymasterClient,
    entryPoint07Address,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import counterContractAbi from "./abis/counterABI.json";
import ConnectSafes from "./components/ConnectSafes";
import Transaction from "./components/Transaction";
import {
    getSafeChildAccount,
    getSafeParentAccount,
} from "./services/safeAccountService";

export default function App() {
    const [transactionSuccess, setTransactionSuccess] = useState(false);
    const [safeChildClient, setSafeChildClient] = useState<Awaited<
        ReturnType<typeof getSafeChildAccount>
    > | null>(null);
    const [parentAccountClient, setParentAccountClient] = useState(null);
    const [masterOwner, setMasterOwner] = useState<ReturnType<
        typeof privateKeyToAccount
    > | null>(null);
    const [pimlicoClient, setPimlicoClient] = useState<ReturnType<
        typeof createPimlicoClient
    > | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const connect = async () => {
        setIsConnecting(true);
        setConnectionError(null);

        const COUNTER_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

        try {
            const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
            const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL!;
            const ownerPK = process.env.NEXT_PUBLIC_PRIVATE_KEY!;
            const rpc = process.env.NEXT_PUBLIC_RPC_URL!;

            const masterOwner = privateKeyToAccount(ownerPK as Hex);
            setMasterOwner(masterOwner);

            const publicClient = createPublicClient({
                transport: http(rpc),
                chain: baseSepolia,
            });

            const pimlicoClient = createPimlicoClient({
                transport: http(bundlerUrl),
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7",
                },
            });

            setPimlicoClient(pimlicoClient);

            const paymasterClient = createPaymasterClient({
                transport: http(paymasterUrl),
            });

            const safeChildClient = await getSafeChildAccount({
                bundlerUrl,
                paymasterClient,
                pimlicoClient,
                publicClient,
            });
            setSafeChildClient(safeChildClient);

            const parentAccountClient = await getSafeParentAccount({
                bundlerUrl,
                paymasterClient,
                pimlicoClient,
                publicClient,
                ownerPK,
            });
            setParentAccountClient(parentAccountClient);

            const counterData = encodeFunctionData({
                abi: counterContractAbi,
                functionName: "count",
                args: [],
            });

            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                parentAccountClient.account.address
            );

            if (!isDeployed) {
                const hash = await parentAccountClient.sendTransaction({
                    to: COUNTER_ADDRESS,
                    data: counterData,
                    value: 0n,
                });

                await pimlicoClient.waitForUserOperationReceipt({ hash });
            }

            setIsConnected(true);
        } catch (error) {
            setConnectionError("Failed to connect safes");
            console.error(error);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div className="md:min-h-[70vh] gap-2 flex flex-col justify-center items-center">
                <div className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
                    <div className="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
                        <div className="grid divide-gray-900/5 bg-gray-50">
                            <ConnectSafes
                                isConnected={isConnected}
                                isConnecting={isConnecting}
                                connect={connect}
                                connectionError={connectionError}
                            />
                        </div>

                        {isConnected &&
                            safeChildClient &&
                            parentAccountClient &&
                            masterOwner && (
                                <>
                                    <Transaction
                                        transactionSuccess={transactionSuccess}
                                        setTransactionSuccess={
                                            setTransactionSuccess
                                        }
                                        safeChildClient={safeChildClient}
                                        parentAccountClient={
                                            parentAccountClient
                                        }
                                        masterOwner={masterOwner}
                                        pimlicoClient={pimlicoClient}
                                    />
                                </>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}
