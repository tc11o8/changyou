/**
 * Created by liyimpc on 17/1/12.
 * mysql工具类
 */
// co中间件
const co = require('co');
const mysql = require('mysql2');
const config = require('../config');

var tool = {};

co(function* () {

    // 初始化数据库连接
    var options = {
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        connectionLimit: config.mysql.connectionLimit
    };

    var pool = mysql.createPool(options);

    /**
     * 查询方法
     * @param sql 查询sql
     * @param fn 回调函数
     */
    tool.select = co.wrap(function* (sql) {
        const promisePool = pool.promise();
        const [rows,fields] = yield promisePool.query(sql);
        return rows;
    });

    tool.update = co.wrap(function* (sql) {
        const promisePool = pool.promise();
        const [rows,fields] = yield promisePool.query(sql);
        return rows.changedRows;
    });

    tool.insert = co.wrap(function* (sql) {
        const promisePool = pool.promise();
        const [rows,fields] = yield promisePool.query(sql);
        return rows.affectedRows;
    });

    tool.delete = co.wrap(function* (sql) {
        const promisePool = pool.promise();
        const [rows,fields] = yield promisePool.query(sql);
        return rows.affectedRows;
    });

    /**
     * 开始事务
     */
    tool.beginTransaction = co.wrap(function* () {
        return new Promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log('[beginTransaction][getConnection]异常:'+err);
                    tool.release(connection);
                    reject(err);
                }
                connection.beginTransaction(function (err) {
                    if (err) {
                        console.log('[beginTransaction][beginTransaction]异常:'+err);
                        tool.release(connection);
                        reject(err);
                    }
                    connection.query("SET SESSION wait_timeout=30");
                    resolve(connection);
                });
            });
        });
    });

    /**
     * 执行sql
     */
    tool.execute = co.wrap(function* (connection, sql) {
        return new Promise(function (resolve, reject) {
            connection.query(sql, function (tErr, rows, fields) {
                if (tErr) {
                    console.log("[execute] transaction query error: " + tErr);
                    tool.rollback(connection);
                    tool.release(connection);
                    reject(tErr);
                } else {
                    var head = sql.substring(0, 10).toLowerCase(),
                        row = {};
                    if (head && (head.indexOf('insert') != -1 || head.indexOf('delete') != -1)) {
                        row.count = rows.affectedRows;
                    }
                    if (head && head.indexOf('update') != -1) {
                        row.count = rows.changedRows;
                    }
                    if (head && head.indexOf('select') != -1) {
                        row = rows;
                    }
                    resolve(row, fields);
                }
            })
        });
    });

    tool.rollback = co.wrap(function* (connection) {
        return new Promise(function (resolve, reject) {
            connection.rollback(function (err) {
                if (err) {
                    console.log("[rollback] transaction rollback error: " + err);
                    tool.release(connection);
                    reject(err);
                } else {
                    console.log("[rollback] transaction rollback success");
                    tool.release(connection);
                    resolve();
                }
            });
        });
    });

    /**
     * 提交事务
     */
    tool.commit = co.wrap(function* (connection) {
        return new Promise(function (resolve, reject) {
            connection.commit(function (err, info) {
                if (err) {
                    console.log("[commit] transaction commit error: " + err);
                    connection.rollback(function (err) {
                        console.log("[commit] transaction rollback error: " + err);
                        tool.release(connection);
                        reject(err);
                    });
                } else {
                    console.log("[commit] transaction commit success");
                    tool.release(connection);
                    resolve(info);
                }
            })
        });
    });

    tool.release = co.wrap(function* (connection) {
        try {
            pool.releaseConnection(connection);
        } catch(e) {
            console.log("[release] 释放连接异常:"+e);
        }
    });
});

module.exports = tool;
