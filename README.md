# firebase-kakao-auth

**Sample authentication server** to use [Kakao Login API](https://developers.kakao.com/docs/latest/en/kakaologin/rest-api) with [Firebase Authentication](https://firebase.google.com/docs/auth).

## Prerequisites

### NodeJS

- Make sure [Node.js](https://nodejs.org/en/) (v.14 or above) is installed on your local machine.

## Project Setup

### Kakao API

- Create a new application on the official [Kakao Developers Site](https://developers.kakao.com/).

- Retrieve the REST API key, and include it in *kakaoLoginConfig* in *app.js*. The use of environment variables is highly recommended to build a secure server.

- Update Redirect URIs in Product Settings, and include the callback URI in *kakaoLoginConfig* in *app.js*.

### Firebase SDK

- Create a Firebase account on [Firebase Console](https://console.firebase.google.com/).

- Import Firebase Admin SDK from Project Settings, and place the file in the root directory of the server.

## Running the server

Install dependencies and run app.js

For NPM:

```shell
npm install
npm run start
```

For Yarn:

```shell
yarn add
yarn start
```

## Client Side

This server has two API endpoints:

### Kakao Login

```hljs
GET /auth/kakao HTTP/1.1
```

- Server will send back a response with a callback URL with an access code.

### Verify Token

```hljs
GET /auth/kakao/verifyToken HTTP/1.1
Parameter: code
```

- The parameter *code* is the access code retrieved from the ```/auth/kakao``` request. Server will return a Firebase token in JSON format.

This token can be used to create a Firebase user on the client side. Follow this [Firebase Custom Token Authentication Documentation](https://firebase.google.com/docs/auth/web/custom-auth) for reference.
