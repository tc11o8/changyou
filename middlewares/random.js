/**
 * 随机工具类
 * @type {v1|exports|module.exports}
 */
//随机uuid
const uuidv1 = require('uuid/v1');
// 字符串操作
const S = require('string');
const randomNavigator = require('random-user-agent');
const randomCname = require("randomCname");

let random = {};

// 随机获取pc端useragent
random.getRandomNavigator = function() {
    // randomUserAgent([type]) type can be one of desktop mobile other
    var navigator = randomNavigator('desktop');
    // if (S(navigator['useragent']).indexOf('AppleWebKit/537.36') == -1) {
    // return random.getRandomNavigator();
    // }
    return navigator;
}

// 随机获取移动端useragent
random.getRandomNavigatorMobile = function() {
    var navigator = randomNavigator('mobile');
    // if (S(navigator['useragent']).indexOf('AppleWebKit') == -1) {
    // return random.getRandomNavigatorMobile();
    // }
    return navigator;
}

random.getRandomOneFromArray = function(array){
    if(array && array.length >0){
        var count = array.length;
        var index = getRandomInt(0,count -1);
        var obj = array[index];
        return obj;
    }
   return null;
}

random.getRandom = function(min, max) {
    return Math.random() * (max - min) + min;
}

random.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

random.getUUID = function(){
    return uuidv1();
}

random.getScreen = function(screen) {
    var screens = S(screen).splitLeft(',');
    var sc = screens[parseInt(random.getRandom(0, screens.length - 1))];
    var scs = S(sc).splitLeft('x');
    return {width: Number(scs[0]), height: Number(scs[1])};
}

random.generalPwd = function() {
    return S(uuidv1()).left(13).s;
}

random.generateName = function(){
    var RandomCnameInstance = new randomCname();
    //默认随机返回一个中文名
    return RandomCnameInstance.result()[0] + 'の' + RandomCnameInstance.result()[0];
}

module.exports = random;

