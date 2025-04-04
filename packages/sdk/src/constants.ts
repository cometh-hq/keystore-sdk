import { type Address, type Hex, concat, pad } from "viem";

const SIGNATURE_DATA_ABI = [
    {
        type: "tuple",
        name: "storageProofData",
        components: [
            { type: "uint256", name: "chainId" },
            { type: "address", name: "owner" },
            { type: "uint256", name: "slotValue" },
            {
                type: "tuple",
                name: "account",
                components: [
                    { type: "address", name: "accountAddress" },
                    { type: "uint256", name: "nonce" },
                    { type: "uint256", name: "balance" },
                    { type: "bytes32", name: "storageRoot" },
                    { type: "bytes32", name: "codeHash" },
                ],
            },
            { type: "bytes[]", name: "accountProof" },
            { type: "bytes[]", name: "storageProof" },
        ],
    },
    { type: "bytes", name: "signature" },
];

const OWNERS_SLOT = 2n;

const BLOCK_STORAGE_ADDRESS =
    "0x2628EC1d1F1aAD3D344cabaDEA6a5166cAe720F8" as Address;
const CROSS_CHAIN_VALIDATOR_ADDRESS =
    "0x92d370ab0c66f0183698e03c0c2fba7034eeaa32" as Address;

const DUMMY_SIG = concat([
    pad("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
        size: 32,
    }),
    pad("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", {
        size: 32,
    }),
    "0x1c",
]) as Hex;

export {
    SIGNATURE_DATA_ABI,
    OWNERS_SLOT,
    BLOCK_STORAGE_ADDRESS,
    CROSS_CHAIN_VALIDATOR_ADDRESS,
    DUMMY_SIG,
};
