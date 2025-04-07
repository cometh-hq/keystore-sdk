# Crosschain SDK

The Crosschain SDK is designed to facilitate cross-chain operations and interactions within dApps.

## Installation

```bash
bun add @cometh/crosschain-sdk
```

## Setup

### Create Clients

```bash
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createPaymasterClient, entryPoint07Address } from 'viem/account-abstraction';
import { getSafeChildAccount, getSafeParentAccount } from './services/safeAccountService';

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
        version: '0.7',
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
```

### Install Crosschain Validator

```bash
    const opHash = await safeChildClient.installModule(crossChainValidator);

    await pimlicoClient.waitForUserOperationReceipt({
        hash: opHash,
    });
```


## Send a Cross-Chain Transaction

```bash
const userOpHash = await sendCrossChainTransaction({
    safeChildClient,
    masterOwner,
    contractAddress,
    callData,
});

const receipt = await pimlicoClient.waitForUserOperationReceipt({
    hash: userOpHash,
});
```

## Send Cross-Chain Batch Transactions

```bash
const calls = [
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
];

const userOpHash = await sendCrossChainCalls({
    safeChildClient,
    masterOwner,
    calls
});

const receipt = await pimlicoClient.waitForUserOperationReceipt({
    hash: userOpHash,
});
```

## Prepare a Cross-Chain Transaction

```bash
const userOperation = await prepareCrossChainUserOperation({
  safeChildClient,
  masterOwner,
  calls
});
```

### Get the Safe Owner proof
Fetch the Merkle proof of ownership of a given address in the parent Safe's storage.

```bash
const proof = await getSafeOwnerProof(
  publicClient,
  parentSafeAddress,
  masterOwnerAddress
);
```


### Get the Crosschain Validator module instance
Generate a cross-chain validator module instance for Safe installation.

```bash
const validatorModule = getCrosschainValidator(parentSafeAddress);
```