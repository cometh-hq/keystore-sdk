# Crosschain SDK

The Crosschain SDK is designed to facilitate cross-chain operations and interactions within dApps.

## Installation

```bash
bun add @cometh/crosschain-sdk
```

## Setup

### Create Clients

```ts
import { MOCK_ATTESTER_ADDRESS } from "@rhinestone/module-sdk";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { erc7579Actions } from "permissionless/actions/erc7579";

const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL!;
const ownerPK = process.env.NEXT_PUBLIC_PRIVATE_KEY!;
const rpc = process.env.NEXT_PUBLIC_RPC_URL!;

const masterOwner = privateKeyToAccount(ownerPK);

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

const paymasterClient = createPaymasterClient({
  transport: http(paymasterUrl),
});

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
```

### Slim Keystore contract

```ts
import {
  getOwners,
  registerOwnerOnKeystore,
  deleteOwnerOnKeystore,
} from "@cometh/crosschain-sdk";
import { privateKeyToAccount } from "viem/accounts";

const ownerPK = privateKeyToAccount(PK as Hex);

const txHash = await registerOwnerOnKeystore({
  smartAccountClient,
  owner: masterOwner,
});

const owners = await getOwners({
  smartAccountClient,
  publicClient,
});

const txHash = await deleteOwnerOnKeystore({
  smartAccountClient,
  owner: masterOwner,
});
```

### Install Crosschain Validator

```ts
import { getCrosschainValidator } from "@cometh/crosschain-sdk";

const crossChainValidator = getCrosschainValidator();

const opHash = await smartAccountClient.installModule(crossChainValidator);

await pimlicoClient.waitForUserOperationReceipt({
  hash: opHash,
});
```

## Send a Cross-Chain Transaction

```ts
const userOpHash = await sendCrossChainTransaction({
  smartAccountClient,
  masterOwner,
  contractAddress,
  callData,
});

const receipt = await pimlicoClient.waitForUserOperationReceipt({
  hash: userOpHash,
});
```

## Send Cross-Chain Batch Transactions

```ts
import { sendCrossChainCalls } from "@cometh/crosschain-sdk";

const userOpHash = await sendCrossChainCalls({
  smartAccountClient,
  masterOwner,
  calls: [
    {
      to: contractAddress,
      data: callData1,
      value: 0n,
    },
    {
      to: contractAddress,
      data: callData2,
      value: 0n,
    },
  ],
});

const receipt = await pimlicoClient.waitForUserOperationReceipt({
  hash: userOpHash,
});
```

## Prepare a Cross-Chain Transaction

```ts
import { prepareCrossChainUserOperation } from "@cometh/crosschain-sdk";

const userOperation = await prepareCrossChainUserOperation({
  smartAccountClient,
  masterOwner,
  calls,
});
```
