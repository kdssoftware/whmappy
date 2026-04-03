==== Prerequisites

```bash
docker
```

```bash
# created .env.local and fill in variables
cp ./backend/.env.example ./backend/.env.local && vim ./backend/.env
```

=== development tools

```bash
# run stack locally
docker compose -f docker-compose.local.yaml up -d
```

```bash
# create database tables
./init.sh
```

```bash
# seed the database with random data
./seed.sh
```
