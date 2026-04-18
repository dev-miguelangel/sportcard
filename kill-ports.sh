#!/bin/bash

PORTS=(3000 4200)

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti :"$PORT")
  if [ -n "$PID" ]; then
    echo "Matando proceso en puerto $PORT (PID $PID)"
    kill -9 $PID
  else
    echo "Puerto $PORT libre"
  fi
done
