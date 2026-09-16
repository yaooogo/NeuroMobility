import Config from "./Config.js"

export default {
    test:{
        netId:97,
        verifyAddrPk:Config.TEST_VERIFY_ADDR_PK || "",
        rpcs:[
            Config.TEST_RPC_URL || "",
        ],
        contracts:{
            "TokenReceiver":{
                address: Config.TEST_TOKEN_RECEIVER_CONTRACT_ADDRESS || Config.TEST_USDT_RECEIVER_CONTRACT_ADDRESS || "",
                events:{
                    "PaymentReceived":"PaymentReceived(address,address,address,uint256,uint256,uint256)",
                }
            },
            "TokenWithdrawal":{
                address: Config.TEST_TOKEN_WITHDRAWAL_CONTRACT_ADDRESS || "",
                events:{
                    "Claimed":"Claimed(address,uint256,address,uint256,uint256,address,uint256)",
                }
            },
            "USDT":{
                address: Config.TEST_USDT_CONTRACT_ADDRESS || "",
                events:{}
            },
            "ROH":{
                address: Config.TEST_ROH_CONTRACT_ADDRESS || "",
                events:{}
            },
            "NEU":{
                address: Config.TEST_NEU_CONTRACT_ADDRESS || "",
                events:{}
            },
        }
    },
    main:{
        netId:56,
        verifyAddrPk:Config.MAIN_VERIFY_ADDR_PK || "",
        rpcs:[
            Config.MAIN_RPC_URL || "",
        ],
        contracts:{
            "TokenReceiver":{
                address: Config.MAIN_TOKEN_RECEIVER_CONTRACT_ADDRESS || Config.MAIN_USDT_RECEIVER_CONTRACT_ADDRESS || "",
                events:{
                    "PaymentReceived":"PaymentReceived(address,address,address,uint256,uint256,uint256)",
                }
            },
            "TokenWithdrawal":{
                address: Config.MAIN_TOKEN_WITHDRAWAL_CONTRACT_ADDRESS || "",
                events:{
                    "Claimed":"Claimed(address,uint256,address,uint256,uint256,address,uint256)",
                }
            },
            "USDT":{
                address: Config.MAIN_USDT_CONTRACT_ADDRESS || "",
                events:{}
            },
            "ROH":{
                address: Config.MAIN_ROH_CONTRACT_ADDRESS || "",
                events:{}
            },
            "NEU":{
                address: Config.MAIN_NEU_CONTRACT_ADDRESS || "",
                events:{}
            },
        }
    },
    getNetId(){
        try{
            return this[Config.CHAIN_NET]['netId'] || ''
        }
        catch(e){
            return ''
        }
    },
    getRpcs(){
        try{
            return this[Config.CHAIN_NET]['rpcs'] || ''
        }
        catch(e){
            return ''
        }
    },
    getVerifyAddrPk(){
        try{
            return this[Config.CHAIN_NET]['verifyAddrPk'] || ''
        }
        catch(e){
            return ''
        }
    },
    getContracts(){
        try{
            return this[Config.CHAIN_NET]['contracts'] || {}
        }
        catch(e){
            return {}
        }
    },
    getContract(contractName){
        try{
            return this[Config.CHAIN_NET]['contracts'][contractName] || {}
        }
        catch(e){
            return {}
        }
    },
    /**
     * 获取所有的通知事件
     * @param {*} contractName 
     * @returns 
     */
    getContractEvents(contractName){
        try{
            return this.getContract(contractName).events  || {}
        }catch(e){
            return {}
        }
    },
    /**
     * 获取某个通知事件
     * @param {*} contractName 
     * @param {*} event 
     * @returns 
     */
    getContractEvent(contractName,event){
        try{
            return this.getContract(contractName)['events'][event]  || ''
        }catch(e){
            return ''
        }
    }
}
