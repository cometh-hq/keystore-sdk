//import {ethers, network} from "hardhat"
import { ethers } from "ethers";
import rlp from "rlp";
import { crosschainModuleAbi } from "../abis/crossChainModuleAbi";

export async function getSafeOwnerProof(
    blockNumber: string,
    safe: string,
    owner: string,
    provider: any
): Promise<any> {
    const paddedAddress = ethers.zeroPadValue(owner, 32);
    // https://miro.medium.com/v2/resize:fit:750/format:webp/1*yUeWLrjMp_ADv3oHdNO6iA.png
    const paddedSlot = ethers.toBeHex(BigInt("0x2"), 32);
    const concatenated = ethers.concat([paddedAddress, paddedSlot]);
    const hash = ethers.keccak256(concatenated);

    const proof = await provider.request({
        method: "eth_getProof",
        params: [safe, [hash], blockNumber],
    });
    return proof;
}

export async function formatStorageProof(proof: any): Promise<any> {
    const rawProofArray = proof.storageProof[0].proof;

    // ✅ Ensure each proof element is converted to `bytes32[]`
    const formattedProofArray = rawProofArray
        .flatMap((p: string) => {
            try {
                const decoded = rlp.decode(p);

                return Array.isArray(decoded)
                    ? decoded
                          .map((d: any) =>
                              d.length === 32
                                  ? ethers.hexlify(Uint8Array.from(d))
                                  : null
                          )
                          .filter((d) => d !== null) // ✅ Remove invalid elements
                    : decoded.length === 32
                      ? ethers.hexlify(Uint8Array.from(decoded))
                      : null;
            } catch (error) {
                return p.length === 66 ? ethers.hexlify(p) : null; // ✅ Only keep valid `bytes32`
            }
        })
        .filter((p: any) => p !== null); // Remove nulls
    return formattedProofArray;
}

export async function getBlock(
    blockNumber = "latest",
    provider: any
): Promise<any> {
    const block: any = await provider.request({
        method: "eth_getBlockByNumber",
        params: [blockNumber, false],
    });
    return {
        blockNumber: block.number,
        blockStateRoot: block.stateRoot,
    };
}

export async function executeTxFromSupraOwner(
    ownerMainAddress: string,
    crossChainModuleAddress: string,
    mainSafeAddress: string,
    proof: any,
    transactionData: any
): Promise<any> {
    const crossChainModule: any = new ethers.Contract(
        crossChainModuleAddress,
        crosschainModuleAbi
    );

    const storageProof = proof.storageProof[0];
    const posValue = ethers.toBeHex(storageProof.value, 32);
    const tx = await crossChainModule.executeTxFromSupraOwner(
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
        transactionData
    );

    return tx;
}
