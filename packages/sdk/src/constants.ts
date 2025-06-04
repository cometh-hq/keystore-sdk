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
    "0x472c0dc38be07ad5229def2da13c1c5adfc80a35" as Address;
const SLIM_KEYSTORE_ADDRESS =
    "0x0ebd427c66b93cf65df764ac3ff474ef22a784ad" as Address;

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
    SLIM_KEYSTORE_ADDRESS,
    DUMMY_SIG,
};
