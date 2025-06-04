import {
    type Module,
    type ModuleType,
    encodeValidatorNonce,
    getAccount,
} from "@rhinestone/module-sdk";
import {
    type Address,
    type Call,
    type Chain,
    type EncodeFunctionDataReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    encodeAbiParameters,
    hexToBigInt,
    keccak256,
} from "viem";
import {
    type UserOperation,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";

import blockStorageAbi from "@/abis/blockStorage.json";
import {
    BLOCK_STORAGE_ADDRESS,
    CROSS_CHAIN_VALIDATOR_ADDRESS,
    DUMMY_SIG,
    SLIM_KEYSTORE_ADDRESS,
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
    return encodeAbiParameters(SIGNATURE_DATA_ABI, [
        {
            chainId: BigInt(chain.id),
            owner: masterOwnerAddress,
            slotValue: BigInt(posValue),
            account: {
                accountAddress: SLIM_KEYSTORE_ADDRESS,
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
}

async function getSafeOwnerProof(
    client: PublicClient,
    accountAddress: Address,
    masterOwnerAddress: Address,
    keyStoreReferencePublicClient: PublicClient
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

    return await keyStoreReferencePublicClient.request({
        method: "eth_getProof",
        params: [SLIM_KEYSTORE_ADDRESS, [hash], blockNumberHex],
    });
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
    smartAccountClient,
    masterOwner,
    calls,
    keyStoreReferencePublicClient,
}: {
    smartAccountClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    calls: Call[];
    keyStoreReferencePublicClient: PublicClient;
}): Promise<UserOperation> {
    if (!smartAccountClient.account) {
        throw new Error("Safe Child Client account is undefined");
    }
    const publicClient = smartAccountClient.account.client as PublicClient;
    const chain = smartAccountClient.chain as Chain;

    const proof = await getSafeOwnerProof(
        publicClient as PublicClient,
        smartAccountClient.account.address,
        masterOwner.address,
        keyStoreReferencePublicClient
    );

    const nonce = await getAccountNonce(publicClient, {
        address: smartAccountClient.account.address,
        entryPointAddress: entryPoint07Address,
        key: encodeValidatorNonce({
            account: getAccount({
                address: smartAccountClient.account.address,
                type: "safe",
            }),
            validator: getCrosschainValidator(),
        }),
    });

    const userOperation = await smartAccountClient.prepareUserOperation({
        account: smartAccountClient.account,
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
    smartAccountClient,
    masterOwner,
    contractAddress,
    callData,
    keyStoreReferencePublicClient,
}: {
    smartAccountClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    contractAddress: Address;
    callData: EncodeFunctionDataReturnType;
    keyStoreReferencePublicClient: PublicClient;
}): Promise<Hex> {
    const userOperation = await prepareCrossChainUserOperation({
        smartAccountClient,
        masterOwner,
        calls: [
            {
                to: contractAddress,
                data: callData,
                value: 0n,
            },
        ],
        keyStoreReferencePublicClient,
    });

    return await smartAccountClient.sendUserOperation(userOperation);
}

async function sendCrossChainCalls({
    smartAccountClient,
    masterOwner,
    calls,
    keyStoreReferencePublicClient,
}: {
    smartAccountClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    calls: Call[];
    keyStoreReferencePublicClient: PublicClient;
}): Promise<Hex> {
    const userOperation = await prepareCrossChainUserOperation({
        smartAccountClient,
        masterOwner,
        calls,
        keyStoreReferencePublicClient,
    });

    return await smartAccountClient.sendUserOperation(userOperation);
}

export {
    getSafeOwnerProof,
    getCrosschainValidator,
    prepareCrossChainUserOperation,
    sendCrossChainTransaction,
    sendCrossChainCalls,
};
