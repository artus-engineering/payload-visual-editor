FROM node:18-alpine

WORKDIR /usr/src/app/

# RUN apk add tini
RUN apk add --no-cache git && chown node:node /usr/src/app
USER node

# ENTRYPOINT ["/sbin/tini", "--"]

CMD ["sleep", "infinity"]
