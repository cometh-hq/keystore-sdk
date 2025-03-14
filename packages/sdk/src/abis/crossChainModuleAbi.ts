export const crosschainModuleAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "param1", type: "type1" },
            { name: "param2", type: "type2" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "currentSafe",
        inputs: [],
        outputs: [{ name: "", type: "type3" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "executeTxFromSupraOwner",
        inputs: [{ name: "param", type: "type4" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "mainSafe",
        inputs: [],
        outputs: [{ name: "", type: "type5" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "setCurrentSafe",
        inputs: [{ name: "newSafe", type: "type6" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "verifier",
        inputs: [],
        outputs: [{ name: "", type: "type7" }],
        stateMutability: "view",
    },
];
