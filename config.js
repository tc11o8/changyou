const programName = 'changyou';
var config = {
	host: 'http://test-m-stg.ppppoints.com/butler/mbrauthorization.htm?',
	secret: '123456',
	imgAddress: 'http://172.27.83.80:8000/calpos',
	serverUrl: 'http://172.27.41.48:8070/',
	merId: 'S1000134',
	channelSource: '02000000',
	debug: true,
	plen: 1,	// 开几个浏览器处理绑定和兑换积分
	dlen: 1,	// 开几个容器处理授权
	smsTimes: 60, // 短信等待次数
	times: 10,	  // 滑动匹配最大次数
	checkchrom: 'Chromium --disable-background-networking',
	image: 'registry.cn-hangzhou.aliyuncs.com/terminal_project/pojie-changyou:1.17',
	top: 595,
	left: 110,
	width: 20,
	validWaitTimes: 6,
	redis:{
		port:6379,
		db: 7,
		host:'172.27.83.47',
		pass:'tryme'
	},
	mysql:{
		host: "172.27.83.63",
		port: 3306,
		user: "wulei",
		password: "tOvwycLUVAwq4ZlU",
		database: "se",
		connectionLimit: 10
	},
	log:{
		appenders: {
			console: { //记录器1:输出到控制台
				type: "console"
			},
			log_file: {	//记录器2：输出到文件
				type: "file",
				filename: __dirname + `/logs/${programName}.log`,
				maxLogSize: 10485760,
				layout: {
					type: "pattern",
					pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m"
				},
				backups: 10,
				//compress: true,
				encoding : 'utf-8'
			},
			data_file:{//：记录器3：输出到日期文件
				type: "dateFile",
				filename: __dirname + `/logs/${programName}`,//您要写入日志文件的路径
				alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
				daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
				//compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
				layout: {
					type: "pattern",
					pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m"
				},
				pattern: "yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
				encoding : 'utf-8',//default "utf-8"，文件的编码
			},
			error_file:{//：记录器4：输出到error log
				type: "dateFile",
				filename: __dirname + `/logs/${programName}_error`,//您要写入日志文件的路径
				alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
				daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
				//compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
				layout: {
					type: "pattern",
					pattern: "[%d{yyyy-MM-dd hh:mm:ss} %h  %p ] %m"
				},
				pattern: "yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
				encoding : 'utf-8',//default "utf-8"，文件的编码
				// compress: true, //是否压缩
			}
		},
		categories: {
			default:{appenders:['data_file', 'console', 'log_file'], level:'info' },//默认log类型，输出到控制台 log文件 log日期文件 且登记大于info即可
			prod:{appenders:['data_file'], level:'info'},  //生产环境 log类型 只输出到按日期命名的文件，且只输出警告以上的log
			console:{appenders:['console'], level:'debug'}, //开发环境  输出到控制台
			debug:{appenders:['console', 'log_file'], level:'debug'}, //调试环境 输出到log文件和控制台    
			error:{appenders:['error_file'], level:'error'}//error 等级log 单独输出到error文件中 任何环境的errorlog 将都以日期文件单独记录
		}
	},
	logcate: 'default'
}

// 测试环境
if (process.env.active == 'test') {
	config.plen = 2;
	config.dlen = 2;
	config.top = 555;
	config.left = 70;
	config.width = 10;
	config.serverUrl = 'http://172.27.83.63:8903/';
	config.checkchrom = 'chrome-linux/chrome --disable-background-networking';
	config.logcate = 'default';
}

// 线上环境
if (process.env.active == 'prod') {
	config.plen = 2;
	config.dlen = 5;
	config.smsTimes = 100;
	config.times = 1;
	config.top = 555;
	config.left = 70;
	config.width = 16;
	config.validWaitTimes = 6;
	config.host = 'https://m.changyoyo.com/butler/mbrauthorization.htm?';
	config.secret = 'ae4101f5ec8f4e0a';
	config.serverUrl = 'http://114.55.185.124:8070/';
	config.channelSource = '02004342';
	config.merId = 'S1000478';
	config.redis = {
		port:6379,
		db: 0,
		host:'r-bp16tofrkwh97ltewc.redis.rds.aliyuncs.com',
		pass:'mwlQy1ntBLmjGPLcN+k1qsGeLohTjVL7VexVjt1XqDb/S2XuLgPHCoiXFLXP8k7oAZ4EynHr3xQF0IJafrm7Zw=='
	};
	config.mysql = {
		host: "rm-bp1v3fzd4fc1599h7.mysql.rds.aliyuncs.com",
		port: 3306,
		user: "zx_mtk",
		password: "x3yw2lpRsrAdUQ6K0OoicEYif",
		database: "se",
		connectionLimit: 10
	};
	config.checkchrom = 'chrome-linux/chrome --disable-background-networking';
	config.logcate = 'prod';
}

module.exports = config;
