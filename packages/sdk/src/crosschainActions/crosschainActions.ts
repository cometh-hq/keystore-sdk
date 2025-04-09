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
    keccak256,
} from "viem";
import {
    type UserOperation,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";

import blockStorageAbi from "@/abis/blockStorage.json";
import crossChainValidatorAbi from "@/abis/crosschainValidator.json";
import {
    BLOCK_STORAGE_ADDRESS,
    CROSS_CHAIN_VALIDATOR_ADDRESS,
    DUMMY_SIG,
    OWNERS_SLOT,
    SIGNATURE_DATA_ABI,
} from "@/constants";
import type { SmartAccountClient } from "permissionless";
import { getAccountNonce } from "permissionless/actions";
import type { AccountData, Proof } from "./types";

function createCrossChainUserOpSignature(
    parentSafeAddress: Address,
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
                accountAddress: parentSafeAddress,
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
    parentSafeAddress: Address,
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
        [masterOwnerAddress, OWNERS_SLOT]
    );

    // Calculate the storage slot hash using keccak256
    const hash = keccak256(encodedData);

    // Request the proof
    const proof = await client.request({
        method: "eth_getProof",
        params: [parentSafeAddress, [hash], blockNumberHex],
    });

    return proof;
}

function getCrosschainValidator(parentSafeAddress: Address): Module {
    return {
        address: CROSS_CHAIN_VALIDATOR_ADDRESS,
        module: CROSS_CHAIN_VALIDATOR_ADDRESS,
        initData: encodeAbiParameters(
            [
                { name: "ownerSlotNumber", type: "uint256" },
                { name: "parentAddress", type: "address" },
            ],
            [OWNERS_SLOT, parentSafeAddress]
        ) as Hex,
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

    const isInitialized = await publicClient.readContract({
        address: CROSS_CHAIN_VALIDATOR_ADDRESS,
        abi: crossChainValidatorAbi,
        functionName: "isInitialized",
        args: [safeChildClient.account.address],
    });

    if (!isInitialized) {
        throw new Error(
            `Crosschain validator is not initialized for child safe account ${safeChildClient.account.address}`
        );
    }

    const accountData = (await publicClient.readContract({
        address: CROSS_CHAIN_VALIDATOR_ADDRESS,
        abi: crossChainValidatorAbi,
        functionName: "accountData",
        args: [safeChildClient.account.address],
    })) as AccountData;

    const parentSafeAddress = accountData[1];

    const proof = await getSafeOwnerProof(
        publicClient as PublicClient,
        parentSafeAddress,
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
            validator: getCrosschainValidator(parentSafeAddress),
        }),
    });

    // Prepare user operation
    const userOperation = await safeChildClient.prepareUserOperation({
        account: safeChildClient.account,
        calls,
        nonce,
        signature: createCrossChainUserOpSignature(
            parentSafeAddress,
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
        parentSafeAddress,
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
    const calls = [
        {
            to: contractAddress,
            data: callData,
            value: 0n,
        },
    ];

    const userOperation = await prepareCrossChainUserOperation({
        safeChildClient,
        masterOwner,
        calls,
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
