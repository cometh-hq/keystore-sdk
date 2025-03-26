import type { Address, Hex } from "viem";

import type { ModuleType } from "@rhinestone/module-sdk";
import type { SmartAccountClientConfig } from "permissionless";

export type StorageProof = {
    key: Hex;
    proof: Hex[];
    value: Hex;
};

export type Proof = {
    address: Address;
    accountProof: Hex[];
    balance: Hex;
    codeHash: Hex;
    nonce: Hex;
    storageHash: Hex;
    storageProof: StorageProof[];
};

export type CrosschainValidator = {
    address: Address;
    module: Address;
    initData: Hex;
    deInitData: Hex;
    additionalContext: Hex;
    type: ModuleType;
};

export type AccountData = [bigint, Address];

export type UserOperationType = SmartAccountClientConfig["userOperation"];
