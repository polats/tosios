FROM nikolaik/python-nodejs:python3.7-nodejs10-alpine

WORKDIR /usr/src/app

# Dependencies
COPY ./package.json .
COPY ./yarn.lock .
COPY ./packages/client/package.json ./packages/client/
COPY ./packages/common/package.json ./packages/common/
COPY ./packages/server/package.json ./packages/server/
RUN yarn

# Files
COPY . .

# Build
RUN yarn build

# Port
EXPOSE 3001

# Serve
CMD [ "yarn", "serve" ]
