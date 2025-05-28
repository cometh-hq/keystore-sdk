import { MOCK_ATTESTER_ADDRESS } from "@rhinestone/module-sdk";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { http, type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";


export async function getSmartAccountClient({
    publicClient,
    paymasterClient,
    pimlicoClient,
    bundlerUrl,
    ownerPK,
}: {
    bundlerUrl: string;
    pimlicoClient: any;
    publicClient: any;
    paymasterClient: any;
    ownerPK: string;
}) {
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
        chain: publicClient.chain,
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
