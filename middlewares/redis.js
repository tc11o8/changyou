/**
 * Created by liyimpc on 2017/11/2.
 * redis工具类
 */
const co = require('co');
const redis = require("redis")
const wrapper = require('co-redis');
const config = require('../config');

var rdc = {};

co(function*() {

    var options  = {
        host            : config.redis.host,
        port            : config.redis.port,
        db              : config.redis.db,
        password        : config.redis.pass
    };

    // 初始化redis连接
    var redisClient = redis.createClient({host:options.host, port:options.port, db:options.db, password:options.password});
    var redisCo = wrapper(redisClient);

    /**
     * 初始化验证异常
     */
    //redis.on("error", function (err) {
    //    console.log("Redis连接异常" + err);
    //});

    //============================= Keys =============================//

    /**
     * 删除节点数据
     * @type {Function}
     */
    rdc.del = co.wrap(function* (key) {
        return yield redisCo.del(key);
    });

    /**
     * redis失效时间设置
     * @type {Function}
     */
    rdc.expire = co.wrap(function* (key, seconds) {
        return yield redisCo.expire(key, seconds);
    });

    //============================= Strings =============================//

    /**
     * 存入节点数据
     * @type {Function}
     */
    rdc.set = co.wrap(function* (key, value) {
        return yield redisCo.set(key, value);
    });

    /**
     * 获取节点数据
     * @type {Function}
     */
    rdc.get = co.wrap(function* (key) {
        return yield redisCo.get(key);
    });

    /**
     * 自增1
     * @type {Function}
     */
    rdc.incr = co.wrap(function* (key) {
        return yield redisCo.incr(key);
    });

    /**
     * 自减1
     * @type {Function}
     */
    rdc.decr = co.wrap(function* (key) {
        return yield redisCo.decr(key);
    });

    //============================= Lists =============================//

    /**
     * 从左侧写入一个或多个数据到Lists
     * @type {Function}
     */
    rdc.lpush = co.wrap(function* (key, value) {
        return yield redisCo.lpush(key, value);
    });

    /**
     * 从lists左侧拿数据,先进先出
     * @type {Function}
     */
    rdc.lpop = co.wrap(function* (key) {
        return yield redisCo.lpop(key);
    });

    /**
     * 获取lists长度
     * @type {Function}
     */
    rdc.llen = co.wrap(function* (key) {
        return yield redisCo.llen(key);
    });


});

module.exports = rdc;
