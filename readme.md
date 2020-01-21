## pm2安装
```
npm install -g pm2
sudo ln -s /usr/local/nodejs/bin/pm2 /usr/local/bin
```

## 开启启动
```
pm2 save;
cat more ~/.pm2/dump.pm2
pm2 startup
```

## 启动命令
```
pm2 start npm --name changyou -- start
```