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

export { SIGNATURE_DATA_ABI, OWNERS_SLOT };
