#!/bin/bash
# init.sh is a command you can use to setup your DB to the latest state
docker exec -i eve-mapper-db psql -U postgres -d eve_mapper < init.sql
