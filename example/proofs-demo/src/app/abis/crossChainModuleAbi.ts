export const crosschainModuleAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_verifier",
                type: "address",
            },
            {
                internalType: "address",
                name: "_mainSafe",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "currentSafe",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "slotValue",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "accountAddress",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "balance",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "storageRoot",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "codeHash",
                        type: "bytes32",
                    },
                ],
                internalType: "struct MPT.Account",
                name: "account",
                type: "tuple",
            },
            {
                internalType: "bytes[]",
                name: "accountProof",
                type: "bytes[]",
            },
            {
                internalType: "bytes[]",
                name: "storageProof",
                type: "bytes[]",
            },
            {
                internalType: "bytes",
                name: "transactionData",
                type: "bytes",
            },
        ],
        name: "executeTxFromSupraOwner",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "mainSafe",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_currentSafe",
                type: "address",
            },
        ],
        name: "setCurrentSafe",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "verifier",
        outputs: [
            {
                internalType: "contract StorageVerifier",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
