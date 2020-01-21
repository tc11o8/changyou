/**
 * 系统操作工具类
 */
const os = require("os");
const S = require('string');

/**
 * 根据网卡获取ip
 * @param networkcard
 * @returns {string}
 */
function getIPv4ByCard(networkcard) {
    var IPv4 = '';
    if (!networkcard) return IPv4;
    var network = os.networkInterfaces()[networkcard];
    for(var i=0; i<network.length; i++){
        if(network[i].family=='IPv4'){
            IPv4 = network[i].address;
        }
    }
    return IPv4;
}

/**
 * 获取局域网ip
  * @returns {string}
 */
function getIPv4() {
    var IPv4 = '';
    var range = S(',192,10,');
    var wlan = os.networkInterfaces();
    var ips = [];
    for (var i in wlan) {
        var networks = wlan[i];
        for (var network of networks) {
            if(network.family=='IPv4'){
                IPv4 = network.address;
                if ('00:00:00:00:00:00' === network.mac || range.indexOf(',' + S(IPv4).substr(0, S(IPv4).indexOf('.')).s + ',') == -1) continue;
                ips.push(IPv4);
            }
        }
    }
    IPv4 = ips[0];

    return IPv4;
}

/**
 * 获取当前服务器cpu个数
 * @returns {any}
 */
function getCpus() {
    return os.cpus().length;
}

/**
 * 当前操作系统是否是windows
 * @returns {boolean}
 */
function isWindow() {
    return os.type().indexOf("Windows") != -1;
}

module.exports = getIPv4ByCard, getIPv4, getCpus, isWindow;