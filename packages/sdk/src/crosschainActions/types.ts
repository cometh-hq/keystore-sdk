import type { SmartAccountClientConfig } from "permissionless";
import type { Address, Hex } from "viem";

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

export type AccountData = [bigint, Address];

export type UserOperationType = SmartAccountClientConfig["userOperation"];
