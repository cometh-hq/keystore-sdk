import rlp from "rlp";
import { crosschainModuleAbi } from "../abis/crossChainModuleAbi";
import { privateKeyToAccount } from "viem/accounts";

import { 
    pad, 
    toHex,
    concat,
    keccak256,
    type Address, 
    type WalletClient,
} from 'viem'


export function getSafeStorageSlot(owner: Address) {
    const paddedAddress = pad(owner, { size: 32 });
    // https://miro.medium.com/v2/resize:fit:750/format:webp/1*yUeWLrjMp_ADv3oHdNO6iA.png
    const paddedSlot = toHex(BigInt("0x2"), { size: 32 });
    const concatenated = concat([paddedAddress, paddedSlot]);
    return keccak256(concatenated);
}

export async function getSafeOwnerProof(
    blockNumber: `0x${string}`,
    safeAddress: Address,
    owner: Address,
    walletClient: WalletClient
): Promise<any> {
    const slot = getSafeStorageSlot(owner);

    const proof = await walletClient.transport.request({
        method: "eth_getProof",
        params: [safeAddress, [slot], blockNumber],
    });
    return proof;
}

export async function formatStorageProof(proof: any): Promise<any> {
    const rawProofArray = proof.storageProof[0].proof;

    const formattedProofArray = rawProofArray
        .flatMap((p: string) => {
            try {
                const decoded = rlp.decode(p);

                return Array.isArray(decoded)
                    ? decoded
                          .map((d: any) =>
                              d.length === 32
                                  ? toHex(Uint8Array.from(d))
                                  : null
                          )
                          .filter((d) => d !== null) 
                    : decoded.length === 32
                      ? toHex(Uint8Array.from(decoded))
                      : null;
            } catch (error) {
                return p.length === 66 ? toHex(p) : null; 
            }
        })
        .filter((p: any) => p !== null); 
    return formattedProofArray;
}

export async function getBlock(
    blockNumber = "latest",
    walletClient: WalletClient
): Promise<any> {
    const block: any = await walletClient.transport.request({
        method: "eth_getBlockByNumber",
        params: [blockNumber, false],
    });
    return {
        blockNumber: block.number,
        blockStateRoot: block.stateRoot,
    };
}

export async function executeTxFromSupraOwner(
    ownerMainAddress: Address,
    crossChainModuleAddress: Address,
    mainSafeAddress: Address,
    proof: any,
    transactionData: any,
    walletClient: WalletClient
): Promise<any> {

    const storageProof = proof.storageProof[0];
    const posValue = toHex(storageProof.value, { size: 32 }); 

    const account = privateKeyToAccount(process.env.NEXT_PUBLIC_PRIVATE_KEY as Address);

    const tx = await walletClient.writeContract({
        address: crossChainModuleAddress,
        abi: crosschainModuleAbi,
        functionName: 'executeTxFromSupraOwner',
        args: [
            ownerMainAddress,
            posValue,
            {
                accountAddress: mainSafeAddress,
                balance: proof.balance,
                nonce: proof.nonce,
                storageRoot: proof.storageHash,
                codeHash: proof.codeHash,
            },
            proof.accountProof,
            storageProof.proof,
            transactionData,
        ],
        chain: walletClient.chain,
        account,
    });

    return tx;
}

export async function getAccountFromProof(proof: any, mainSafeAddress: Address): Promise<any> {
    return {
        accountAddress: mainSafeAddress,
        balance: proof.balance,
        nonce: proof.nonce,
        storageRoot: proof.storageHash,
        codeHash: proof.codeHash,
    }
}