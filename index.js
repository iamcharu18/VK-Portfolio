const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const escaper = require('html-escaper');

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

require('dotenv').config();

app.use('/assets', express.static('assets'))
app.use('/admin/assets', express.static('assets'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//setting view engine to ejs
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

const dbPath = path.join(__dirname, "vkportfolio.db");
let database = null;

const initializeDBAndServer = async () => {
    try {
        database = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(process.env.PORT || 3000, () => {
            console.log("Server running at http://localhost:3000/");
        });
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

// USER INTERFACE

//route for index page
app.get("/", function (req, res) {
    res.render("index", {
        title: "Vamshi Kurapati - I'm VK",
        nav: "index"
    });
});

//route for story page
app.get("/story", function (req, res) {
    res.render("story", {
        title: "Story - I'm VK",
        nav: "story"
    });
});

//route for gallery page
app.get("/gallery", function (req, res) {
    res.render("gallery", {
        title: "Gallery - I'm VK",
        nav: "gallery"
    });
});

//route for videos page
app.get("/videos", function (req, res) {
    res.render("videos", {
        title: "Videos - I'm VK",
        nav: "videos"
    });
});

//route for mentorship page
app.get("/mentorship", function (req, res) {
    res.render("mentorship", {
        title: "Mentorship - I'm VK",
        nav: "mentorship"
    });
});

//route for mentorship page
app.get("/blog", async function (req, res) {
    let page = req.query.page || 1; // Default to page 1 if not specified
    let resultsPerPage = 3; // Change this value as desired

    // Calculate the offset based on the current page and results per page
    let offset = (page - 1) * resultsPerPage;

    const blogsQuery = `SELECT id,title,urlSlug,bannerImg,description,draft,datePosted from blog ORDER BY datePosted DESC LIMIT ${resultsPerPage} OFFSET ${offset}`;
    const blogsObject = await database.all(blogsQuery);

    // Calculate the total number of pages based on the total number of results and the results per page
    let totalResultsQuery = "SELECT COUNT(*) as total FROM blog";
    let totalResults = 0;

    totalResults = await database.get(totalResultsQuery);

    totalResults = totalResults.total;

    let totalPages = Math.ceil(totalResults / resultsPerPage);

    res.render("blog", {
        title: "Blog - I'm VK",
        nav: "blog",
        blogs: blogsObject,
        totalPages,
        currentPage: page,
    });
});

// route for individual blog
app.get("/blog/:urlSlug", async function (req, res) {
    const urlSlug = req.params.urlSlug;
    let blogContent = await database.get(`SELECT * FROM blog WHERE urlSlug='${urlSlug}'`);
    // console.log(`SELECT * FROM blog WHERE urlSlug='${urlSlug}'`);
    // blogContent.content = blogContent.content.replace(/\\\\\\/g, "");
    // console.log(blogContent);
    if (blogContent !== undefined) {
        res.render("blogpage",
            {
                title: blogContent.title,
                nav: "mentorship",
                blog: blogContent
            });
    } else {
        res.render("404", {
            title: "Page not found - I'm VK",
            nav: "404"
        });
    }
})

// ADMIN INTERFACE

// post admin login
app.post("/admin/login/", async (request, response) => {
    const { username, password } = request.body;
    console.log(request.body);
    const getUserQuery = `SELECT * FROM admin WHERE username='${username}';`;
    const userDBObject = await database.get(getUserQuery);
    if (userDBObject === undefined) {
        response.status(401).send({ error: 'Invalid User' });
    } else {
        const isPasswordMatched = (password === userDBObject.password);
        if (isPasswordMatched) {
            const payload = { username: username };
            const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
            response.cookie('token', jwtToken, { httpOnly: true });
            // response.status(200);
            // response.json({ message: 'Successfully logged in' });
            response.set({ "Content-Type": "text/html" });
            response.redirect('/admin/dashboard');
            // response.send({ jwtToken });
        } else {
            response.status(401).send({ error: 'Invalid User' });
        }
    }
});

// Middleware - Authentication with JWT Token
const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["cookie"];
    if (authHeader !== undefined) {
        // jwtToken = authHeader.split(" ")[1];
        // jwtToken = jwtToken.split("=")[1];
        // console.log(jwtToken);
        const tokenIndex = authHeader.indexOf("token=");
        const tokenEndIndex = authHeader.indexOf(";", tokenIndex);
        // console.log(tokenIndex, tokenEndIndex);
        if (tokenEndIndex !== -1) {
            jwtToken = authHeader.substring(tokenIndex + 6, tokenEndIndex);
        }
        else {
            jwtToken = authHeader.substring(tokenIndex + 6);
        }
        // console.log(jwtToken);
    }
    if (jwtToken === undefined) {
        response.redirect("/admin/login");
    } else {
        jwt.verify(jwtToken, process.env.JWT_SECRET, async (error, payload) => {
            if (error) {
                response.redirect("/admin/login");
            } else {
                request.username = payload.username;
                request.message = "logged";
                next();
            }
        });
    }
};

// route for admin dashboard
app.get("/admin/dashboard", authenticateToken, function (req, res) {
    res.render("admin/index",
        {
            user: req.username
        });
})

// route for admin create
app.get("/admin/create", authenticateToken, function (req, res) {
    res.render("admin/create",
        {
            user: req.username,
            blog: {}
        });
})

// route for admin update
app.get("/admin/edit/:id", authenticateToken, async function (req, res) {
    const id = req.params.id;
    let blogContent = await database.get(`SELECT * FROM blog WHERE id=${id}`)
    res.render("admin/update",
        {
            user: req.username,
            blog: blogContent
        });
})

// route for admin blogs view
app.get("/admin/view", authenticateToken, async function (req, res) {
    const blogsQuery = `SELECT id,title,urlSlug,bannerImg,description,draft,content from blog`;
    const blogsObject = await database.all(blogsQuery);
    // console.log(blogsObject);
    res.render("admin/view",
        {
            user: req.username,
            blogs: blogsObject,
        });
})

function escapeValue(value) {
    if (typeof value === 'string') {
        return value.replace(/'/g, "''");
    } else {
        return value;
    }
}

// route for post blog data
app.post("/admin/create", authenticateToken, upload.single('bannerImg'), async function (req, res) {
    let file = req.file;
    // console.log(req.body);
    let date = new Date();
    let imagePath = `assets/uploads/coverImages/${date.getTime() + file.originalname}`;
    fs.writeFile(imagePath, file.buffer, (err) => {
        if (err) {
            console.log(err)
            return res.status(500).send(err);
        }
        // console.log(`Image saved to ${imagePath}`);
        // res.send('Image saved successfully!');
    });
    let { title, urlSlug, metaTitle, metaDescription, metaKeywords, description, category, content, isDraft } = req.body;
    title = escapeValue(title);
    metaTitle = escapeValue(metaTitle);
    metaDescription = escapeValue(metaDescription);
    metaKeywords = escapeValue(metaKeywords);
    description = escapeValue(description);
    imagePath = '/' + imagePath;
    // content = escaper.unescape(content);
    // content = content.substring(0, 0) + "'" + content.substring(0 + 1);
    // content = content.slice(0, -1) + "'";
    // console.log(content);
    // content = escapeValue(content);
    const insertBlogQuery = `INSERT INTO blog(title,urlSlug,datePosted,metaTitle,metaDescription,metaKeywords,bannerImg,category,description,content,draft) VALUES ('${title}','${urlSlug}',date('now'),'${metaTitle}', '${metaDescription}', '${metaKeywords}','${imagePath}','${category}','${description}','${content}',${isDraft})`;
    // console.log(insertBlogQuery);
    await database.run(insertBlogQuery, function (err) {
        if (err) {
            console.log(err.message);
            return res.status(500).send(err);
        }
    });
    res.status(200).send("OK");
})

// route for post blog data
app.post("/admin/edit/:id", authenticateToken, upload.single('bannerImg'), async function (req, res) {
    let file = req.file;
    const id = req.params.id;
    let date = new Date();
    let imagePath;
    if (file?.originalname) {
        imagePath = `assets/uploads/coverImages/${date.getTime() + file.originalname}`;
        fs.writeFile(imagePath, file.buffer, (err) => {
            if (err) {
                console.log(err)
                return res.status(500).send(err);
            }
            // console.log(`Image saved to ${imagePath}`);
            // res.send('Image saved successfully!');
        });
        imagePath = '/' + imagePath;
    } else {
        imagePath = new URL(req.body.bannerImg);
        imagePath = imagePath.pathname;
    }
    let { title, urlSlug, metaTitle, metaDescription, metaKeywords, description, category, content, isDraft } = req.body;
    title = escapeValue(title);
    metaTitle = escapeValue(metaTitle);
    metaDescription = escapeValue(metaDescription);
    metaKeywords = escapeValue(metaKeywords);
    description = escapeValue(description);

    // content = escaper.unescape(content);
    // content = content.substring(0, 0) + "'" + content.substring(0 + 1);
    // content = content.slice(0, -1) + "'";
    // console.log(imagePath);
    // // content = escapeValue(content);
    const updateBlogQuery = `UPDATE blog SET title='${title}',urlSlug='${urlSlug}',datePosted=date('now'),metaTitle='${metaTitle}',metaDescription='${metaDescription}',metaKeywords='${metaKeywords}',bannerImg='${imagePath}',category='${category}',description='${description}',content='${content}',draft=${isDraft} WHERE id=${id};`;
    // console.log(updateBlogQuery);
    await database.run(updateBlogQuery, function (err) {
        if (err) {
            console.log(err.message);
            return res.status(500).send(err);
        }
    });
    res.status(200).send("OK");
})

// route for post blog data
app.post("/admin/add-blog-image", authenticateToken, upload.single('file'), async function (req, res) {
    let file = req.file;
    // console.log(req.body);
    let date = new Date();
    // image name
    const imagePath = `assets/uploads/blogContent/${date.getTime() + "_" + file.originalname}`;
    fs.writeFile(imagePath, file.buffer, (err) => {
        if (err) {
            console.log(err)
            return res.status(500).send(err);
        }
        console.log(`Image saved to ${imagePath}`);
        res.send(imagePath);
    });
})

// route for delete blog data
app.post("/admin/delete/:id", authenticateToken, async function (req, res) {
    const id = req.params.id;
    // console.log(id);
    const deleteBlogQuery = `DELETE FROM blog WHERE id=${id};`;
    console.log(deleteBlogQuery);
    await database.run(deleteBlogQuery, function (err) {
        if (err) {
            console.log(err.message);
            return res.status(500).send(err);
        }
    });
    res.status(200).send("OK");
})

// route for admin login
app.get("/admin/login", function (request, res) {
    let jwtToken;
    const authHeader = request.headers["cookie"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split("=")[1];
    }
    if (jwtToken === undefined) {
        res.status(201);
        res.render("login", {
            title: "Login",
            nav: "login"
        });
    } else {
        jwt.verify(jwtToken, process.env.JWT_SECRET, async (error, payload) => {
            if (error) {
                res.status(201);
                res.render("login", {
                    title: "Login",
                    nav: "login"
                });
            } else {
                res.redirect("/admin/dashboard");
            }
        });
    }
});

// route for error pages
app.get("*", function (req, res) {
    res.render("404", {
        title: "Page not found - I'm VK",
        nav: "404"
    });
})

module.exports = app;