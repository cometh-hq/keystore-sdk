import {
    MOCK_ATTESTER_ADDRESS,
} from "@rhinestone/module-sdk";
import dotenv from "dotenv";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
    http,
    type Hex,
    createPublicClient,
    encodeFunctionData,
} from "viem";
import {
    createPaymasterClient,
    entryPoint07Address,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import counterContractAbi from "../src/app/abis/counterABI.json";

import { getCrosschainValidator, sendCrossChainUserOperation } from "@cometh/crosschain";
dotenv.config();

const chain = baseSepolia;

const COUNTER_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";
const rpc =
    "https://base-sepolia.g.alchemy.com/v2/tCFPishTUTOa-7bz8oPU735Q1TFGIntR"

async function getSafeParentAccount({
    publicClient,
    pimlicoClient,
    paymasterClient,
    bundlerUrl,
    ownerPK,
}: {
    publicClient: any;
    pimlicoClient: any;
    paymasterClient: any;
    bundlerUrl: string;
    ownerPK: string;
}): Promise<any> {
    const owner = privateKeyToAccount(ownerPK as Hex);

    const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        owners: [owner],
        version: "1.4.1",
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
        erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
        attesters: [
            MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
        ],
        attestersThreshold: 1,
    });

    const smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        chain: chain,
        bundlerTransport: http(bundlerUrl),
        paymaster: paymasterClient,
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast;
            },
        },
    });

    console.log("Parent Safe Account Address: ", safeAccount.address);

    return smartAccountClient;
}

async function getSafeChildAccount({
    publicClient,
    paymasterClient,
    pimlicoClient,
    bundlerUrl,
}: {
    bundlerUrl: string;
    pimlicoClient: any;
    publicClient: any;
    paymasterClient: any;
}) {
    const owner = privateKeyToAccount(process.env.CHILD_OWNER_PK as Hex);

    const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        owners: [owner],
        version: "1.4.1",
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
        erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
        attesters: [
            MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
        ],
        attestersThreshold: 1,
    });

    const smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        chain: chain,
        bundlerTransport: http(bundlerUrl),
        paymaster: paymasterClient,
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast;
            },
        },
    }).extend(erc7579Actions());

    return smartAccountClient;
}



export default async function main() {
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
    const ownerPK = process.env.PRIVATE_KEY!;

    const masterOwner = privateKeyToAccount(ownerPK as Hex);

    console.log("Starting script...");

    const publicClient = createPublicClient({
        transport: http(rpc),
        chain: chain,
    });

    const pimlicoClient = createPimlicoClient({
        transport: http(bundlerUrl),
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
    });

    const paymasterClient = createPaymasterClient({
        transport: http(paymasterUrl),
    });

    const safeChildClient = await getSafeChildAccount({
        bundlerUrl,
        paymasterClient,
        pimlicoClient,
        publicClient,
    });
 

    const parentAccountClient = await getSafeParentAccount({
        bundlerUrl,
        paymasterClient,
        pimlicoClient,
        publicClient,
        ownerPK,
    });

    const counterData = encodeFunctionData({
        abi: counterContractAbi,
        functionName: "count",
        args: [],
    });

    //    const hash = await parentAccountClient.sendTransaction({
    //     to: COUNTER_ADDRESS,
    //     data: counterData,
    //     value: 0n
    // })

    // await pimlicoClient.waitForUserOperationReceipt({hash}) 

    console.log("Smart Account Address: ", safeChildClient.account?.address);

    const crossChainValidator = getCrosschainValidator(parentAccountClient.account.address);
    console.log({ crossChainValidator });
    const isValidatorInstalled =
        await safeChildClient.isModuleInstalled(crossChainValidator);

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
    })

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
    return;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});









