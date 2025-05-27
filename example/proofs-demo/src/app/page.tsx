"use client";

import { createPimlicoClient } from "permissionless/clients/pimlico";
import React, { useState } from "react";
import { http, type Hex, createPublicClient } from "viem";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, baseSepolia } from "viem/chains";
import ConnectSafes from "./components/ConnectSafes";
import Transaction from "./components/Transaction";
import {
  getSafeChildAccount,
  getSafeParentAccount,
} from "./services/safeAccountService";
import { getOwners, registerOwnerOnKeystore } from "@cometh/crosschain-sdk";

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

    try {
      const bundlerUrlArb = process.env.NEXT_PUBLIC_4337_BUNDLER_URL_ARB!;
      const paymasterUrlArb = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL_ARB!;
      const bundlerUrlBase = process.env.NEXT_PUBLIC_4337_BUNDLER_URL_BASE!;
      const paymasterUrlBase = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL_BASE!;

      const masterOwnerPK = process.env.NEXT_PUBLIC_PRIVATE_KEY_MASTER!;
      const ownerPK = process.env.NEXT_PUBLIC_PRIVATE_KEY!;
      const rpc = process.env.NEXT_PUBLIC_RPC_URL;

      const masterOwner = privateKeyToAccount(masterOwnerPK as Hex);

      setMasterOwner(masterOwner);

      const arbPublicClient = createPublicClient({
        transport: http(rpc),
        chain: arbitrumSepolia,
      });

      const basePublicClient = createPublicClient({
        transport: http(),
        chain: baseSepolia,
      });

      const arbpimlicoClient = createPimlicoClient({
        transport: http(bundlerUrlArb),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      }) as any;

      const basepimlicoClient = createPimlicoClient({
        transport: http(bundlerUrlBase),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      }) as any;

      setPimlicoClient(arbpimlicoClient);

      const arbPaymasterClient = createPaymasterClient({
        transport: http(paymasterUrlArb),
      });

      const basePaymasterClient = createPaymasterClient({
        transport: http(paymasterUrlBase),
      });

      const arbSafeChildClient = await getSafeChildAccount({
        bundlerUrl: bundlerUrlArb,
        paymasterClient: arbPaymasterClient,
        pimlicoClient: arbpimlicoClient,
        publicClient: arbPublicClient,
        ownerPK: ownerPK,
      });

      const baseSafeChildClient = await getSafeChildAccount({
        bundlerUrl: bundlerUrlBase,
        paymasterClient: basePaymasterClient,
        pimlicoClient: basepimlicoClient,
        publicClient: basePublicClient,
        ownerPK: ownerPK,
      });

      const arbSafeMasterClient = await getSafeParentAccount({
        bundlerUrl: bundlerUrlArb,
        paymasterClient: arbPaymasterClient,
        pimlicoClient: arbpimlicoClient,
        publicClient: arbPublicClient,
        ownerPK: masterOwnerPK,
      });

      const txhash = await registerOwnerOnKeystore({
        smartAccountClient: baseSafeChildClient as any,
        owner: masterOwner,
      });

      const owners = await getOwners({
        safeChildClient: baseSafeChildClient as any,
        publicClient: basePublicClient as any,
      });

      console.log({ owners });

      setSafeChildClient(arbSafeChildClient);
      setParentAccountClient(arbSafeMasterClient);

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

            {isConnected && (
              <>
                <Transaction
                  transactionSuccess={transactionSuccess}
                  setTransactionSuccess={setTransactionSuccess}
                  safeChildClient={safeChildClient}
                  parentAccountClient={parentAccountClient}
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
