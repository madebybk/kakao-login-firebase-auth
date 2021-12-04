import express from 'express';
import axios from 'axios';
import firebaseAdmin from 'firebase-admin';
import serviceAccount from './service-account.js';

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
})

/**
 * Get Kakao Profile from Kakao API
 * 
 * @param {String} kakaoToken 
 * @returns {Object} Kakao Profile
 */
const getKakaoProfile = async (kakaoToken) => {
    try {
        console.log('Getting Kakao Profile from Kakao Login API.');
        return await axios.get('https://kapi.kakao.com/v2/user/me?secure_resource=true', {
            headers: { 'Authorization': 'Bearer ' + kakaoToken }
        })
    } catch (err) {
        console.log(err);
    }
}

/**
 * Create a new Firebase user. If user already exists, update the existing profile.
 * 
 * @param {String} userId 
 * @param {String} email
 * @param {String} displayName
 * @param {String} photoURL
 * @returns {Object} Firebase User Profile
 */
const createFirebaseUser = async (userId, email, displayName, photoURL) => {
    // Set params to either create or update user on Firebase
    const kakaoUserParams = {
        provider: 'KAKAO',
        displayName: displayName,
    };
    kakaoUserParams['uid'] = userId;
    kakaoUserParams['displayName'] = displayName ? displayName : email;
    if (photoURL) kakaoUserParams['photoURL'] = photoURL;
    if (email) kakaoUserParams['email'] = email;
    console.log(kakaoUserParams);

    // Update Firebase user. If user doens't exist, create user profile
    try {
        return await firebaseAdmin.auth().updateUser(userId, kakaoUserParams)
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            return await firebaseAdmin.auth().createUser(kakaoUserParams);
        }
        console.log(err)
    }
}

/**
 * Creates Firebase token with Firebase Admin SDK
 * 
 * @param {String} kakaoToken 
 * @returns {String} Firebase Token
 */
const getFirebaseToken = async (kakaoToken) => {
    try {
        // Request Kakao Profile
        const kakaoProfile = (await getKakaoProfile(kakaoToken)).data;
        if (!kakaoProfile) res.status(404).send({ message: 'Kakao Profile does not exist.'});

        // Create or Update Firebase User
        let nickname = kakaoProfile.properties ? kakaoProfile.properties.nickname : null;
        let profileImage = kakaoProfile.properties ? kakaoProfile.properties.profile_image : null;
        const kakaoUid = `kakao:${kakaoProfile.id}`;
        const firebaseUserProfile = await createFirebaseUser(kakaoUid, kakaoProfile.kaccount_email, nickname, profileImage);

        // Get Firebase token with the created profile
        return await firebaseAdmin.auth().createCustomToken(firebaseUserProfile.uid, { provider: 'KAKAO' });
    } catch (err) {
        console.log(err);
    }
}

// Initialize server with Express JS
const app = express();
const PORT = process.env.PORT || '8080';

// Get config details from https://developers.kakao.com
const kakaoLoginConfig = {
    clientID: '', // Enter Kakao REST API Key
    redirectUri: 'http://localhost:8080/auth/kakao/callback' // Make sure to put your redirectUri on on the Kakao project portal
}

const server = app.listen(PORT, () => console.log(`Firebase Kakao Auth Sample server running on port ${server.address().port}`));

app.get('/', (req, res) => res.status(200).send('Firebase Kakao Auth Sample server up and running!'));

// Starts Kakao Login process
app.get('/auth/kakao', (req, res) => {
    const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoLoginConfig.clientID}&redirect_uri=${kakaoLoginConfig.redirectUri}&response_type=code&scope=profile_nickname,profile_image,account_email`;
    res.redirect(kakaoAuthURL);
})

// Automatic Kakao Login callback once the user has logged
app.get('/auth/kakao/callback', (req, res) => res.send('Success! Use the Kakao user auth code in the callback URL to verify token'));

// Gets Kakao auth token given kakao user code and generates Firebase token
app.get('/auth/kakao/verifyToken', (req, res) => {
    // User will need to send a request with a param, code (Kakao Auth Code received from the callback URL)
    const postParams = new URLSearchParams()
    postParams.append('grant_type', 'authorization_code');
    postParams.append('client_id', kakaoLoginConfig.clientID)
    postParams.append('redirect_uri', kakaoLoginConfig.redirectUri)
    postParams.append('code', req.query.code.toString())

    const postConfig = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
    }

    const getAuthToken = async () => {
        try {
            // Get Kakao Auth Token
            const kakaoTokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', postParams, postConfig);
            const kakaoToken = kakaoTokenResponse.data.access_token;
            console.log(`Kakao auth token: ${kakaoToken}`)

            // Get Firebase Auth Token
            const firebaseToken = await getFirebaseToken(kakaoToken);
            console.log(`Returning firebase token to user: ${firebaseToken}`)
            res.json({ token: firebaseToken });
        } catch (error) {
            res.json(error.data);
            console.log(error)
        }
    }
    getAuthToken();
})
