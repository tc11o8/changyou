//parent.js
const cp = require('child_process');
const os = require('os');
const n = cp.fork(`./sub.js`);
n.on('message', (m) => {
  console.log('PARENT got message:', m);
});
n.send({ hello: 'world' });

console.log(os.cpus.length);

// master.js 文件
// var fork = require('child_process').fork
// var cpus = require('os').cpus()
// for (var i = 0; i < cpus.length; i++) {
//   fork('./sub.js');
// }

var fork = require('child_process').fork
var cpus = require('os').cpus()
for (var i = 0; i < 3; i++) {
  fork('./changyou-exchange.js')
}