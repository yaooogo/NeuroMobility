import Config from "./Config.js"
import AWS from 'aws-sdk'
import fs from 'fs'
import Helper from "./Helper.js"
import path from 'path'

export default {
    upload:async (filename, dist)=>{
        let rs = {};
        let ph =  "/"+ Helper.dateFormat("YYYYmm") + "/" + Helper.dateFormat("dd") + "/" 
        let distname = path.basename(filename);

        if (Config.UPLOAD_TYPE.toLowerCase() == 'file'){
            let outputPath = Config.uploadPath + ph;
            try{
                await fs.promises.mkdir(outputPath,{recursive:true})
            }
            catch(e){

            }
            await fs.promises.rename(filename, outputPath + distname, (err) => {
                if (err) throw err;
            });

            rs = {
                Key:ph + distname,
                Location: Config.UPLOAD_DOMAIN + ph + distname
            }
        }
        else if(Config.UPLOAD_TYPE.toLowerCase() == 'aws'){
            let fileContent = await fs.promises.createReadStream(filename)
    
            const params = {
                Bucket: Config.AWS_BUCKET_NAME,
                Key: `${dist + ph + distname}`,
                Body: fileContent,
                ACL: 'public-read', // 设置公开访问权限
                //ContentLength: fs.statSync(filename).size // 获取文件大小
            }
            const awsOpt = {
                Bucket:Config.AWS_BUCKET_NAME
            }
            if(Config.ACCESS_KEY_ID){
                awsOpt.accessKeyId = Config.ACCESS_KEY_ID
            }
            if(Config.AWS_SECRET_ACCESS_KEY){
                awsOpt.secretAccessKey = Config.AWS_SECRET_ACCESS_KEY
            }
            const s3 =  new AWS.S3(awsOpt);
            rs = await new Promise(function(resolve,reject){
                s3.upload(params, async(err, data) => {
                    await fs.promises.unlink(filename)
                    if (err) {
                        reject(err);
                    }
                    else{
                        resolve(data);
                    }
                })
            })

            if(Config.AWS_VISIT_DOMAIN){
                rs.Location = Config.AWS_VISIT_DOMAIN + rs.Key;
            }
        }
        return rs;
    }
}