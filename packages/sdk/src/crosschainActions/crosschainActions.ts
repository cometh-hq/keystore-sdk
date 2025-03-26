import {
    type ModuleType,
    encodeValidatorNonce,
    getAccount,
} from "@rhinestone/module-sdk";

import {
    http,
    type Address,
    type Chain,
    type EncodeFunctionDataReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    concat,
    createWalletClient,
    encodeAbiParameters,
    keccak256,
    pad,
    toHex,
} from "viem";
import {
    type UserOperation,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";

import { OWNERS_SLOT, SIGNATURE_DATA_ABI } from "@/constants";
import type { SmartAccountClient } from "permissionless";
import { getAccountNonce } from "permissionless/actions";
import crossChainValidatorAbi from "../abis/crosschainValidator.json";
import type { AccountData, CrosschainValidator, Proof } from "./types";

const CROSS_CHAIN_VALIDATOR_ADDRESS =
    "0x92d370ab0c66f0183698e03c0c2fba7034eeaa32" as Address;

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
    blockNumber: Hex,
    parentSafeAddress: Address,
    masterOwnerAddress: Address
): Promise<Proof> {
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
        params: [parentSafeAddress, [hash], blockNumber],
    });

    return proof;
}

function getCrosschainValidator(
    parentSafeAddress: Address
): CrosschainValidator {
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
    contractAddress,
    callData,
}: {
    safeChildClient: SmartAccountClient;
    masterOwner: PrivateKeyAccount;
    contractAddress: Address;
    callData: EncodeFunctionDataReturnType;
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
    const blockNumber = toHex(await publicClient.getBlockNumber());
    const blockState = await publicClient.getBlock({
        blockNumber: BigInt(blockNumber),
    });
    const blockStateRoot = blockState.stateRoot;

    const walletClient = createWalletClient({
        account: masterOwner,
        chain: chain,
        transport: http(publicClient.transport.url),
    });

    const tx = await walletClient.writeContract({
        address: CROSS_CHAIN_VALIDATOR_ADDRESS,
        abi: crossChainValidatorAbi,
        functionName: "setLatestBlockStateRoot",
        args: [blockStateRoot],
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });

    const proof = await getSafeOwnerProof(
        publicClient as PublicClient,
        blockNumber,
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

    const dummySig = concat([
        pad(
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            { size: 32 }
        ),
        pad(
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            { size: 32 }
        ),
        "0x1c",
    ]) as Hex;

    // Prepare user operation
    const userOperation = await safeChildClient.prepareUserOperation({
        account: safeChildClient.account,
        calls: [
            {
                to: contractAddress,
                value: 0n,
                data: callData,
            },
        ],
        nonce,
        signature: createCrossChainUserOpSignature(
            parentSafeAddress,
            masterOwner.address,
            proof,
            dummySig,
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

async function sendCrossChainUserOperation({
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
        contractAddress,
        callData,
    });

    const userOpHash = await safeChildClient.sendUserOperation(userOperation);

    return userOpHash;
}

export {
    getSafeOwnerProof,
    getCrosschainValidator,
    prepareCrossChainUserOperation,
    sendCrossChainUserOperation,
};
