const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let database = null;

const initializeDBAndServer = async () => {
    try {
        database = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server running at http://localhost:3000/");
        });
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const convertDBObjectToResponseTweet = (DBObject) => {
    return {
        username: DBObject.username,
        tweet: DBObject.tweet,
        dateTime: DBObject.date_time,
    };
};

// API-1 User Register
app.post("/register/", async (request, response) => {
    const { username, password, name, gender } = request.body;
    const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const userDBObject = await database.get(getUserQuery);
    if (userDBObject === undefined) {
        if (password.length < 6) {
            response.status(400);
            response.send("Password is too short");
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}'
        );`;
            await database.run(createUserQuery);
            response.send(`User created successfully`);
        }
    } else {
        response.status(400);
        response.send("User already exists");
    }
});

// API-2 User Login
app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const userDBObject = await database.get(getUserQuery);
    if (userDBObject === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const isPasswordMatched = await bcrypt.compare(
            password,
            userDBObject.password
        );
        if (isPasswordMatched) {
            const payload = { username: username };
            const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

// Middleware - Authentication with JWT Token
const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid JWT Token");
            } else {
                request.username = payload.username;
                const getUserId = `SELECT user_id FROM USER WHERE username='${payload.username}';`;
                const { user_id } = await database.get(getUserId);
                request.user_id = user_id;
                next();
            }
        });
    }
};

// API-3 Get Tweets
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
    const username = request.username;
    const getUserId = `SELECT user_id FROM USER WHERE username='${username}';`;
    const { user_id } = await database.get(getUserId);
    const getFeedQuery = `
    SELECT 
        username,tweet,date_time 
    FROM 
            (follower INNER JOIN user ON following_user_id=user.user_id) 
        INNER JOIN 
            tweet ON following_user_id=tweet.user_id 
    WHERE 
        follower_user_id=${user_id} 
    ORDER BY
        date_time DESC
    LIMIT 
        4;`;
    //   SELECT username,tweet,date_time FROM (follower INNER JOIN user ON following_user_id=user.user_id) INNER JOIN tweet ON following_user_id=tweet.user_id WHERE follower_user_id=${user_id} LIMIT 4;
    const feedTweetsArr = await database.all(getFeedQuery);
    response.send(
        feedTweetsArr.map((eachTweet) => convertDBObjectToResponseTweet(eachTweet))
    );
});

// API-4 Following
app.get("/user/following/", authenticateToken, async (request, response) => {
    const username = request.username;
    const user_id = request.user_id;
    const getFollowingNamesQuery = `
        SELECT name FROM USER INNER JOIN follower ON user_id=following_user_id WHERE follower_user_id=${user_id};
    `;
    const followingNamesArr = await database.all(getFollowingNamesQuery);
    response.send(
        followingNamesArr.map((eachName) => {
            return {
                name: eachName.name,
            };
        })
    );
});

// API-5 Followers
app.get("/user/followers/", authenticateToken, async (request, response) => {
    const username = request.username;
    const user_id = request.user_id;
    const getFollowerNamesQuery = `
        SELECT name FROM USER INNER JOIN follower ON user_id=follower_user_id WHERE following_user_id=${user_id};
    `;
    const followerNamesArr = await database.all(getFollowerNamesQuery);
    response.send(
        followerNamesArr.map((eachName) => {
            return {
                name: eachName.name,
            };
        })
    );
});

// API-6 Get Tweet by Tweet ID
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
    const username = request.username;
    const user_id = request.user_id;
    const { tweetId } = request.params;
    const getTweeterUserIdQuery = `
    SELECT user_id as tweetUserId FROM tweet WHERE tweet_id=${tweetId};
  `;
    const { tweetUserId } = await database.get(getTweeterUserIdQuery);
    const getFollowingIds = `
    SELECT following_user_id FROM follower WHERE follower_user_id=${user_id};
  `;
    const followingIds = (await database.all(getFollowingIds)).map(
        (eachId) => eachId.following_user_id
    );
    if (followingIds.includes(tweetUserId)) {
        const tweetTextQuery = `SELECT tweet FROM tweet WHERE tweet_id=${tweetId};`;
        const tweet = (await database.get(tweetTextQuery)).tweet;
        const getNoOfLikesQuery = `SELECT count(like_id) as likes FROM like WHERE tweet_id=${tweetId};`;
        const likes = (await database.get(getNoOfLikesQuery)).likes;
        const getNoOfRepliesQuery = `SELECT count(reply_id) as replies FROM reply WHERE tweet_id=${tweetId};`;
        const replies = (await database.get(getNoOfRepliesQuery)).replies;
        const getDateTimeQuery = `SELECT date_time FROM tweet WHERE tweet_id=${tweetId};`;
        const dateTime = (await database.get(getDateTimeQuery)).date_time;
        response.send({
            tweet: tweet,
            likes: likes,
            replies: replies,
            dateTime: dateTime,
        });
    } else {
        response.status(401);
        response.send("Invalid Request");
    }
});

// API-7 Get usernames Likes
app.get(
    "/tweets/:tweetId/likes/",
    authenticateToken,
    async (request, response) => {
        const username = request.username;
        const user_id = request.user_id;
        const { tweetId } = request.params;
        const getTweeterUserIdQuery = `
    SELECT user_id as tweetUserId FROM tweet WHERE tweet_id=${tweetId};
  `;
        const { tweetUserId } = await database.get(getTweeterUserIdQuery);
        const getFollowingIds = `
    SELECT following_user_id FROM follower WHERE follower_user_id=${user_id};
  `;
        const followingIds = (await database.all(getFollowingIds)).map(
            (eachId) => eachId.following_user_id
        );
        if (followingIds.includes(tweetUserId)) {
            const getLikesUserNamesQuery = `SELECT username FROM like NATURAL JOIN user WHERE tweet_id=${tweetId};`;
            const likes = (await database.all(getLikesUserNamesQuery)).map(
                (name) => name.username
            );
            response.send({
                likes: likes,
            });
        } else {
            response.status(401);
            response.send("Invalid Request");
        }
    }
);

// API-8 Get Replies and Names
app.get(
    "/tweets/:tweetId/replies/",
    authenticateToken,
    async (request, response) => {
        const username = request.username;
        const user_id = request.user_id;
        const { tweetId } = request.params;
        const getTweeterUserIdQuery = `
    SELECT user_id as tweetUserId FROM tweet WHERE tweet_id=${tweetId};
  `;
        const { tweetUserId } = await database.get(getTweeterUserIdQuery);
        const getFollowingIds = `
    SELECT following_user_id FROM follower WHERE follower_user_id=${user_id};
  `;
        const followingIds = (await database.all(getFollowingIds)).map(
            (eachId) => eachId.following_user_id
        );
        if (followingIds.includes(tweetUserId)) {
            const getNamesAndRepliesQuery = `SELECT name,reply FROM reply NATURAL JOIN user WHERE tweet_id=${tweetId};`;
            const namesAndReplies = (await database.all(getNamesAndRepliesQuery)).map(
                (object) => {
                    return {
                        name: object.name,
                        reply: object.reply,
                    };
                }
            );
            response.send({
                replies: namesAndReplies,
            });
        } else {
            response.status(401);
            response.send("Invalid Request");
        }
    }
);

// API-9 Get Own Tweets
app.get("/user/tweets/", authenticateToken, async (request, response) => {
    const username = request.username;
    const user_id = request.user_id;
    const getTweetUser = `
        SELECT 
            tweet,count(distinct like_id) as likes,count(distinct reply_id) as replies ,date_time
        FROM 
            tweet LEFT JOIN like ON tweet.tweet_id=like.tweet_id 
            LEFT JOIN reply ON tweet.tweet_id=reply.tweet_id 
        WHERE 
            tweet.user_id=${user_id}
        GROUP BY
            like.tweet_id,reply.tweet_id;
        `;
    const tweetUserArr = await database.all(getTweetUser);
    response.send(
        tweetUserArr.map((eachTweet) => {
            return {
                tweet: eachTweet.tweet,
                likes: eachTweet.likes,
                replies: eachTweet.replies,
                dateTime: eachTweet.date_time,
            };
        })
    );
});

// API-10 New Tweet
app.post("/user/tweets/", authenticateToken, async (request, response) => {
    const username = request.username;
    const user_id = request.user_id;
    const { tweet } = request.body;
    const newTweetQuery = `
    INSERT INTO tweet (tweet,user_id) VALUES ('${tweet}',${user_id});
  `;
    await database.run(newTweetQuery);
    response.send("Created a Tweet");
});

// API-11 Delete Tweet
app.delete(
    "/tweets/:tweetId/",
    authenticateToken,
    async (request, response) => {
        const username = request.username;
        const user_id = request.user_id;
        const { tweetId } = request.params;
        const getTweeterUserIdQuery = `
    SELECT user_id as tweetUserId FROM tweet WHERE tweet_id=${tweetId};
  `;
        const { tweetUserId } = await database.get(getTweeterUserIdQuery);
        if (user_id === tweetUserId) {
            const deleteTweetQuery = `
        DELETE FROM tweet WHERE tweet_id=${tweetId};
    `;
            await database.run(deleteTweetQuery);
            response.send("Tweet Removed");
        } else {
            response.status(401);
            response.send("Invalid Request");
        }
    }
);

module.exports = app;