import slimKeystoreAbi from "@/abis/slimKeyStore.json";
import { SLIM_KEYSTORE_ADDRESS } from "@/constants";
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
        abi: slimKeystoreAbi,
        functionName: "addOwner",
        args: [smartAccountClient?.account?.address, owner.address],
    });

    const txhash = await smartAccountClient.sendTransaction({
        calls: [
            {
                to: SLIM_KEYSTORE_ADDRESS,
                data: callData,
                value: 0n,
            },
        ],
    });

    return txhash;
}

async function deleteOwnerOnKeystore({
    smartAccountClient,
    owner,
}: {
    smartAccountClient: SmartAccountClient;
    owner: PrivateKeyAccount;
}): Promise<Hex> {
    const callData = encodeFunctionData({
        abi: slimKeystoreAbi,
        functionName: "removeOwner",
        args: [smartAccountClient?.account?.address, owner.address],
    });

    const txhash = await smartAccountClient.sendTransaction({
        calls: [
            {
                to: SLIM_KEYSTORE_ADDRESS,
                data: callData,
                value: 0n,
            },
        ],
    });

    return txhash;
}

async function getOwners({
    smartAccountClient,
    publicClient,
}: {
    smartAccountClient: SmartAccountClient;
    publicClient: PublicClient;
}): Promise<Hex[]> {
    return (await publicClient.readContract({
        address: SLIM_KEYSTORE_ADDRESS,
        abi: slimKeystoreAbi,
        functionName: "getOwners",
        args: [smartAccountClient?.account?.address],
    })) as Hex[];
}

export { registerOwnerOnKeystore, deleteOwnerOnKeystore, getOwners };
