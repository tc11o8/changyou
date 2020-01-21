trash m_jd_login_proxyhost.js 
wget http://upload-file.zhexinit.com/upload_data/m_jd_login_proxyhost.js
./kill.sh
source /etc/profile
nohup node m_jd_login_proxyhost.js 50 &



