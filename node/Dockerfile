FROM node:latest

RUN mkdir /project

WORKDIR /project

ADD ./project/package.json .

RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]