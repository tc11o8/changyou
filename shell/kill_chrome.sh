#!/bin/bash
source /etc/profile
cd /opt/changyou/
PROID1=`ps -ef|grep chrome|grep -v grep|awk '{print $2}'`
  if [ -n "$PROID1" ]; then
    echo "Kill process id - ${PROID1}"
    kill -9 ${PROID1}
    echo STOPPED
  else
    echo "No process running."
  fi
