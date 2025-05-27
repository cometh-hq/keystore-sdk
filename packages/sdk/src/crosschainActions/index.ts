import {
    type Module,
    type ModuleType,
    encodeValidatorNonce,
    getAccount,
} from "@rhinestone/module-sdk";
import {
    http,
    type Address,
    type Call,
    type Chain,
    type EncodeFunctionDataReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    createPublicClient,
    encodeAbiParameters,
    hexToBigInt,
    keccak256,
} from "viem";
import {
    type UserOperation,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";

import blockStorageAbi from "@/abis/blockStorage.json";
import {
    BLOCK_STORAGE_ADDRESS,
    CROSS_CHAIN_VALIDATOR_ADDRESS,
    DUMMY_SIG,
    LITE_KEYSTORE_ADDRESS,
    OWNERS_SLOT,
    SIGNATURE_DATA_ABI,
} from "@/constants";
import type { SmartAccountClient } from "permissionless";
import { getAccountNonce } from "permissionless/actions";
import type { Proof } from "./types";

function createCrossChainUserOpSignature(
    masterOwnerAddress: Address,
    proof: Proof,
    masterOwnerSignature: Hex,
    chain: Chain
): Hex {
    const storageProof = proof.storageProof[0];

    const valueStr = storageProof.value.toString().replace(/^0x/, "");
    // Pad to 64 characters (32 bytes = 64 hex chars) and add prefix
    const posValue = `0x${valueStr.padStart(64, "0")}`;

    // Structure the signature data according to the SignatureData struct in the CrossChainValidator
    const signature = encodeAbiParameters(SIGNATURE_DATA_ABI, [
        {
            chainId: BigInt(chain.id),
            owner: masterOwnerAddress,
            slotValue: BigInt(posValue),
            account: {
                accountAddress: LITE_KEYSTORE_ADDRESS,
                nonce: BigInt(proof.nonce),
                balance: BigInt(proof.balance),
                storageRoot: proof.storageHash,
                codeHash: proof.codeHash,
            },
            accountProof: proof.accountProof,
            storageProof: storageProof.proof,
        },
        masterOwnerSignature,
    ]);

    return signature;
}

async function getSafeOwnerProof(
    client: PublicClient,
    accountAddress: Address,
    masterOwnerAddress: Address
): Promise<Proof> {
    const blockNumber = (await client.readContract({
        address: BLOCK_STORAGE_ADDRESS,
        abi: blockStorageAbi,
        functionName: "blockNumber",
    })) as bigint;

    // Format block number as hex string with '0x' prefix
    const blockNumberHex = `0x${blockNumber.toString(16)}` as Hex;

    // Use encodeAbiParameters to properly replicate abi.encode
    const encodedData = encodeAbiParameters(
        [
            { name: "owner", type: "address" },
            { name: "slot", type: "uint256" },
        ],
        [
            masterOwnerAddress,
            hexToBigInt(
                keccak256(
                    encodeAbiParameters(
                        [
                            { name: "account", type: "address" },
                            { name: "slot", type: "uint256" },
                        ],
                        [accountAddress, OWNERS_SLOT]
                    )
                )
            ),
        ]
    );


    // Calculate the storage slot hash using keccak256
    const hash = keccak256(encodedData);

    const keyStoreReferenceClient = createPublicClient({
        transport: http(
            "https://base-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY"
        ),
        chain: baseSepolia,
    });

    // Request the proof
    const proof = await keyStoreReferenceClient.request({
        method: "eth_getProof",
        params: [LITE_KEYSTORE_ADDRESS, [hash], blockNumberHex],
    });

    return proof;
}

function getCrosschainValidator(): Module {
    return {
        address: CROSS_CHAIN_VALIDATOR_ADDRESS,
        module: CROSS_CHAIN_VALIDATOR_ADDRESS,
        initData: "0x" as Hex,
        deInitData: "0x" as Hex,
        additionalContext: "0x" as Hex,
        type: "validator" as ModuleType,
    };
}

async function prepareCrossChainUserOperation({
    safeChildClient,
    masterOwner,
    calls,
}: {
    safeChildClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    calls: Call[];
}): Promise<UserOperation> {
    if (!safeChildClient.account) {
        throw new Error("Safe Child Client account is undefined");
    }
    const publicClient = safeChildClient.account.client as PublicClient;
    const chain = safeChildClient.chain as Chain;

    const proof = await getSafeOwnerProof(
        publicClient as PublicClient,
        safeChildClient.account.address,
        masterOwner.address
    );

    const nonce = await getAccountNonce(publicClient, {
        address: safeChildClient.account.address,
        entryPointAddress: entryPoint07Address,
        key: encodeValidatorNonce({
            account: getAccount({
                address: safeChildClient.account.address,
                type: "safe",
            }),
            validator: getCrosschainValidator(),
        }),
    });

    const userOperation = await safeChildClient.prepareUserOperation({
        account: safeChildClient.account,
        calls,
        nonce,
        signature: createCrossChainUserOpSignature(
            masterOwner.address,
            proof,
            DUMMY_SIG,
            chain
        ) as Hex,
    });

    const userOpHashToSign = getUserOperationHash({
        chainId: chain.id,
        entryPointAddress: entryPoint07Address,
        entryPointVersion: "0.7",
        userOperation,
    });

    const masterOwnerSignature = await masterOwner.sign({
        hash: userOpHashToSign,
    });

    userOperation.signature = createCrossChainUserOpSignature(
        masterOwner.address,
        proof,
        masterOwnerSignature,
        chain
    );

    return userOperation as UserOperation;
}

async function sendCrossChainTransaction({
    safeChildClient,
    masterOwner,
    contractAddress,
    callData,
}: {
    safeChildClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    contractAddress: Address;
    callData: EncodeFunctionDataReturnType;
}): Promise<Hex> {

    const userOperation = await prepareCrossChainUserOperation({
        safeChildClient,
        masterOwner,
        calls: [
            {
                to: contractAddress,
                data: callData,
                value: 0n,
            },
        ],
    });

    const userOpHash = await safeChildClient.sendUserOperation(userOperation);

    return userOpHash;
}

async function sendCrossChainCalls({
    safeChildClient,
    masterOwner,
    calls,
}: {
    safeChildClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    calls: Call[];
}): Promise<Hex> {
    const userOperation = await prepareCrossChainUserOperation({
        safeChildClient,
        masterOwner,
        calls,
    });

    const userOpHash = await safeChildClient.sendUserOperation(userOperation);

    return userOpHash;
}

export {
    getSafeOwnerProof,
    getCrosschainValidator,
    prepareCrossChainUserOperation,
    sendCrossChainTransaction,
    sendCrossChainCalls,
};
