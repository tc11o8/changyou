'use strict';
const http=require('http');
let getIpUrl = "http://api.ipproxy.info:8422/api/getIp?type=1&num=1&pid=&unbindTime=900&cid=&orderId=O19050709452361455547&time=1567683376&sign=91e0624c578e233af40800633dbdd678&noDuplicate=0&dataType=1&lineSeparator=0&singleIp=0";

let proxyHostArr=[];
let liuguan_proxy =function () {

    return new Promise(function(resolve,reject){
        http.get(getIpUrl,(res)=>{
            const {statusCode} = res;
            let error;
            if (statusCode != 200) {
                error = new Error('请求失败\n' +
                    `状态码: ${statusCode}`);

            }
            if (error) {
                // 消费响应数据来释放内存。
                res.resume();
                reject(error);
                return ;
            }
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                resolve(rawData);
            });
        })
    });
}




module.exports = liuguan_proxy;