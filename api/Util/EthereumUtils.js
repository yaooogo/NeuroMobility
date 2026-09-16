import { ethers } from "ethers";
import ChainConfig from "./ChainConfig.js";
import Config from "./Config.js";
import sigUtil from 'eth-sig-util';

export default{
    /**
     * 以太坊签名工具验证
     * @param {*} data 原始消息
     * @param {*} sig 签名字符串
     * @param {*} address 
     * @returns 
     */
    async verifySignature(data,sig,veirfyAddress){
        const address = sigUtil.recoverPersonalSignature({
            data: data,
            sig: sig,
        });

        if(address.toLocaleLowerCase() !== veirfyAddress.toLocaleLowerCase()){
            return false
        }

        return true;
    },
    /**
     * 签署 EIP-712 Typed Data
     * @param {*} contractName 
     * @param {*} signFields 
     * @param {*} signArgs 
     * @returns 
     */
    async contractSignature(contractName,signFields,signArgs){
        const signType = {
            // signFields: [
            //     { name: "orderId", type: "uint256" },
            //     { name: "owner", type: "address" },
            //     { name: "timestamp", type: "uint256" },
            //     { name: "claimAmount", type: "uint256" }
            // ]
            ...signFields
        };

        const domain = {
            name:  contractName,
            version: "1",
            chainId: ChainConfig.getNetId(),
            verifyingContract: ChainConfig.getContract(contractName)?.address
        };

        // let signArgs = {
        //     "orderId": orderId,
        //     "owner": owner,
        //     "timestamp": _timestamp,
        //     "claimAmount": _claimAmount
        // }


        let signer = new ethers.Wallet(ChainConfig.getVerifyAddrPk());

        let signResult = await signer.signTypedData(domain, signType, signArgs);
    
        const signature = signResult.substring(2);
        
        
        let seeds = [];
        
        seeds.push("0x" + signature.substring(0, 64));
        seeds.push("0x" + signature.substring(64, 128));
        seeds.push(parseInt(signature.substring(128, 130), 16));

        return seeds;
    }
}