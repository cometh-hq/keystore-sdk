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

const OWNERS_SLOT = 0n;

const BLOCK_STORAGE_ADDRESS =
    "0x37752C7758DdD62c9F5Be635e79a40c2AaC57881" as Address;
const CROSS_CHAIN_VALIDATOR_ADDRESS =
    "0x6b65d2ae15a7ad15ce229afae3403df3d03396f1" as Address;
const LITE_KEYSTORE_ADDRESS =
    "0xf98e60b2a9850b28e74912abf057f6e8ac422ea6" as Address;

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
    LITE_KEYSTORE_ADDRESS,
    DUMMY_SIG,
};
