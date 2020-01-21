#!/bin/bash

portnum=`netstat -ano|grep LISTEN|grep 8810|wc -l`

port=8810

#echo "检查${port}端口是否存活"

if [ ${portnum} =  0 ];then

#echo "端口${port}是正常的"

#else

echo "端口${port}已经挂了，请重启服务...."

echo "Stopping  ${port} "
bash /opt/qypay/telecom-haagen-dazs/springboot.sh restart
echo "服务已经重启成功了"

fi

#######################################
date
#######################################
