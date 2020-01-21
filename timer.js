/**
 * 计时器
 */
var i = 0;
var clr = setInterval(function(){
    if (i == 360) {
        clearInterval(clr);
        console.log(1);
    }
    i ++;
}, 1000);
