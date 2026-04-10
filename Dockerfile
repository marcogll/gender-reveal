FROM caddy:2.10-alpine

WORKDIR /srv

COPY Caddyfile /etc/caddy/Caddyfile
COPY . /srv
