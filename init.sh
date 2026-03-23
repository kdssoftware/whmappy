#!/bin/bash

docker exec -i eve-mapper-db psql -U postgres -d eve_mapper < init.sql
