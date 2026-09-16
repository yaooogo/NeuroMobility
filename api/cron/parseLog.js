import ChainConfig from "../Util/ChainConfig.js";
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import Helper from "../Util/Helper.js";
import DB from "../Util/database/DB.js";
import parse from "./parseLog/parse.js";

const allowContractNames = {};
const allowContractList = [];
const contracts =  ChainConfig.getContracts()

for(const key in contracts){
    if(contracts[key]?.events && contracts[key]?.address){
        allowContractList.push(contracts[key]?.address)
        allowContractNames[contracts[key]?.address] =  key;
    }
}

export default {
    providers:[],
    getProvider(){
        let rpcUrl = ChainConfig.getRpcs();
        let rpcIdx = 0;
        if(Array.isArray(rpcUrl)){
            rpcIdx = Helper.getRand(0,rpcUrl.length - 1)
            if(!this.providers[rpcIdx])
            this.providers[rpcIdx] = new ethers.JsonRpcProvider(rpcUrl[rpcIdx]);
        }
        else{
            if(!this.providers[rpcIdx])
            this.providers[rpcIdx] = new ethers.JsonRpcProvider(rpcUrl);
        }
        return this.providers[rpcIdx];
    },
    async parseLogs(){
        const maxBlock = 50;
        let startBlock = 0; 
        let endBlock =  0;
        try{
            const provider = this.getProvider();
            const blockNumber = await provider.getBlockNumber();
            startBlock =  await DB.query().table('block_number').value("block_number");
            if(!startBlock)
                startBlock = blockNumber;
            endBlock =  startBlock + maxBlock > blockNumber -1 ? blockNumber - 1 : startBlock + maxBlock;
            if(startBlock > endBlock){
                let tendBlock = endBlock;
                endBlock = startBlock;
                startBlock = tendBlock
            }

            if(endBlock - startBlock < maxBlock)
                startBlock = startBlock - 50
            
            if(startBlock !== endBlock){
                console.log("blockNumber:",startBlock,endBlock,"ing")
                await this._getPastLogs(startBlock,endBlock)
                if(await DB.query().table('block_number').count() > 0){
                    await DB.query().table('block_number').update({block_number:endBlock + 1});
                }else{
                    await DB.query().table('block_number').insert({block_number:endBlock + 1});
                }
            }
        }
        catch(e){
            if(startBlock && endBlock){
                console.log("blockNumber:",startBlock,endBlock,"bad")
                await DB.query().table('bad_block_number').insert({
                    start_block:startBlock,
                    end_block:endBlock,
                    status:0,
                    status_msg:e.message,
                    created_at:Helper.getUtcTime(),
                    updated_at:Helper.getUtcTime()
                })
            }
        }
    },
    /**
     * 修正块错误
     */
    async repair(){
        console.log("repair")
        let info =  await DB.query().table('bad_block_number').whereRaw("status=0 or (status=3 and updated_at + 180 < "+Helper.getUtcTime()+" )").first();
        if(info){
            let startBlock = info.start_block;
            let endBlock = info.end_block;
            if(startBlock > endBlock){
                startBlock= info.end_block;
                endBlock = info.start_block;
            }
            
            try{
                console.log("repair blockNumber:",startBlock,endBlock,"ing")
                await this._getPastLogs(startBlock,endBlock)
                await DB.query().table('bad_block_number').where("id",info.id).update({status:2});
              
            }
            catch(e){
                console.log("repair blockNumber:",startBlock,endBlock,"bad")
                await DB.query().table('bad_block_number').where("id",info.id).update({status:3,updated_at:Helper.getUtcTime()})
    
            }
        }
    },
    /**
     * 查询相应区块下合约的 log
     * @param {*} startBlock 
     * @param {*} endBlock 
     */    
    async _getPastLogs(startBlock, endBlock) {
        try{
         const filter = {
             address: allowContractList,
             // topics: [eventTopic],
              fromBlock: startBlock,
              toBlock: endBlock
          };
          const provider = this.getProvider();
          const logs = await provider.getLogs(filter);
          //const promises = logs.map(async log => {
          const promises = logs.map(async log => {
              //  console.log(`区块号: ${log.blockNumber}`);
              //  console.log(`交易哈希: ${log.transactionHash}`);
              //  console.log(`事件数据:`, parsedLog.args);
              try{
                  if(allowContractList.includes(log.address)){
                    if(typeof parse[allowContractNames[log.address]] == 'function')
                        await parse[allowContractNames[log.address]](log);
                  }
              }
              catch(ee){
                  throw new Error(ee)
              }
             
          });

          await Promise.all(promises);
  
        }
        catch(e){
         throw new Error(e)
        }
     },
    
}
