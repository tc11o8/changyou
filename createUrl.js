'use strict';
const UUID = require('uuid');
const crypto = require('crypto');

let host = 'https://m.changyoyo.com/butler/mbrauthorization.htm?';
let secret = 'ae4101f5ec8f4e0a';
let channelSource = '02004342';
let merId = 'S1000478';

let paramArray = [["channelSource", `${channelSource}`],
    ["jumpBack", "https%3a%2f%2fbaidu.com"],
    ["merId", `${merId}`],
    ["mobile", ""],
    ["uid", ""]];

function createUrl(mobile) {

    let uid = UUID.v1();
    paramArray[4][1] = uid;
    paramArray[3][1] = mobile;

    let params = "";
    paramArray.forEach(function (item, index, array) {
        params += ("&" + item[0] + "=" + item[1])
    });
    params = params.substring(1);
    console.log('params=' + params + ',mobile=' + mobile);

    let sign = crypto.createHash('md5').update(params + secret).digest("hex");
    let url = host + params + "&sign=" + sign;
    console.log('url=' + url);
    return url;
}

// let mobile='18376178463';
// let mobile='15954387962';
let mobile='15277249487';
// let mobile='15157009867';
// let mobile='15067239986';
let url = createUrl(mobile);
console.log(url);


let  ff = null;
if(ff){
    console.log('ff');
}else {
    console.log('ee');
}