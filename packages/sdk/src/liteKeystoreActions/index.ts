import liteKeystoreAbi from "@/abis/liteKeyStore.json";
import { LITE_KEYSTORE_ADDRESS } from "@/constants";
import type { SmartAccountClient } from "permissionless";
import {
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    encodeFunctionData,
} from "viem";

async function registerOwnerOnKeystore({
    smartAccountClient,
    owner,
}: {
    smartAccountClient: SmartAccountClient;
    owner: PrivateKeyAccount;
}): Promise<Hex> {
    const callData = encodeFunctionData({
        abi: liteKeystoreAbi,
        functionName: "addOwner",
        args: [smartAccountClient?.account?.address, owner.address],
    });

    const txhash = await smartAccountClient.sendTransaction({
        calls: [
            {
                to: LITE_KEYSTORE_ADDRESS,
                data: callData,
                value: 0n,
            },
        ],
    });

    return txhash;
}

async function deleteOwnerOnKeystore({
    safeChildClient,
    owner,
}: {
    safeChildClient: SmartAccountClient;
    owner: PrivateKeyAccount;
}): Promise<Hex> {
    const callData = encodeFunctionData({
        abi: liteKeystoreAbi,
        functionName: "removeOwner",
        args: [safeChildClient?.account?.address, owner.address],
    });

    const txhash = await safeChildClient.sendTransaction({
        calls: [
            {
                to: LITE_KEYSTORE_ADDRESS,
                data: callData,
                value: 0n,
            },
        ],
    });

    return txhash;
}

async function getOwners({
    safeChildClient,
    publicClient,
}: {
    safeChildClient: SmartAccountClient;
    publicClient: PublicClient;
}): Promise<Hex[]> {
    return (await publicClient.readContract({
        address: LITE_KEYSTORE_ADDRESS,
        abi: liteKeystoreAbi,
        functionName: "getOwners",
        args: [safeChildClient?.account?.address],
    })) as Hex[];
}

export { registerOwnerOnKeystore, deleteOwnerOnKeystore, getOwners };
