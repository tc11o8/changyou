
sudo docker kill `sudo docker ps -a -q`
sudo docker rm -v `sudo docker ps -a -q`
sudo docker ps -a
sudo docker images
sudo docker rmi f70fabe4c5ba
sudo docker build -t registry.cn-hangzhou.aliyuncs.com/terminal_project/pojie-changyou:1.18 .

