FROM node:20

#Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

#Install app dependencies
COPY package*.json ./

RUN npm install

#Bundle app source
COPY . .

RUN npm run build

EXPOSE 4000

CMD [ "npm", "run", "start:dev" ]