'use strict';
const taskNum = [
    82, 152, 213, 263,   //0
    307, 344, 375, 404,  //1
    429, 454, 475, 494,  //2
    510, 526, 541, 556,  //3
    570, 584, 597, 610,  //4
    627, 651, 680, 718,   //5
    765, 821, 886, 960,   //6
    1038, 1113, 1182, 1253,  //7
    1318, 1392, 1464, 1540,  //8
    1615, 1694, 1776, 1860,  //9
    1944, 2035, 2126, 2222, //10
    2324, 2431, 2545, 2671, //11
    2807, 2956, 3110, 3261, //12
    3412, 3559, 3692, 3812, //13
    3924, 4029, 4132, 4245, //14
    4349, 4452, 4557, 4664, //15
    4774, 4890, 5012, 5150, //16
    5300, 5457, 5630, 5819, //17
    6017, 6222, 6421, 6603, //18
    6791, 6986, 7180, 7378, //19
    7579, 7787, 7991, 8197, //20
    8402, 8611, 8804, 8986, //21
    9161, 9318, 9461, 9594, //22
    9711, 9820, 9918, 10000 //23
];

/**
 * 获取当前时间应该执行的任务数量
 * @param int
 */
function getNowNum(totalNum) {
    let now = new Date();
    let hour = now.getHours();
    let min = now.getMinutes();
    let index = (hour * 4) + getMinIndex(min);
    let needs = taskNum[index];

    let val = totalNum * needs / 10000;
    return val;
}

function getMinIndex(min) {
    if (min < 15) {
        return 0;
    } else if (min < 30) {
        return 1;
    } else if (min < 45) {
        return 2;
    }
    return 3;
}

module.exports = getNowNum;

// let dd = getNowNum(800);
// console.log(dd);