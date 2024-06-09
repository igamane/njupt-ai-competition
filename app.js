if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/user');
const bodyParser = require('body-parser');
const port = 3000;
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MongoDBStore = require('connect-mongo');
const mongoSanitize = require('express-mongo-sanitize');
const preRegistration = require('./middleware/preRegistration');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const isAuthenticated = require('./middleware/isAuthenticated');
const nodemailer = require("nodemailer");
const hbs = require('nodemailer-express-handlebars');
const async = require("async");
const crypto = require("crypto");
const { storage, cloudinary } = require('./cloudinary');
const multer = require('multer');
const upload = multer({ storage });
const uploadS3 = multer({ storage: multer.memoryStorage() });
const stream = require('stream');
const { OpenAI } = require('openai');
const fs = require('fs');
const { promisify } = require('util');
const { threadId } = require('worker_threads');
const pipeline = promisify(require('stream').pipeline);


const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl
).then(() => {
    console.log("connect to Software Competition database");
}).catch((err) => {
    console.log("error wit connectiong", err);
})

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());


const secret = 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    name: 'sesion',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}

app.use(session(sessionConfig));
app.use(flash());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// passport.serializeUser(User.serializeUser);
// passport.deserializeUser(User.deserializeUser);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err);
        });
});

app.get('/', (req, res) => {
    res.render('welcome')
})

// =======================Sign Up ===============
app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/signup', preRegistration, catchAsync(async (req, res, next) => {
    try {
        const { firstName, lastName, username, phoneNumber, password } = req.body;

        let user = new User({ username, firstName, lastName, phoneNumber });
        const registredUser = await User.register(user, password);
        console.log(registredUser);
        console.log(admin)

        if (registredUser.username == admin) {
            req.login(registredUser, (err) => {
                if (err) return next(err);
                res.redirect('/admin');
            })
        } else {
            req.login(registredUser, (err) => {
                if (err) return next(err);
                res.redirect('/dashboard');
            })
        }
    } catch (e) {
        req.flash('error', e.message);
        console.log(e);
        res.redirect('/signup');
    }
}))

// ====================== Login =================
app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', preRegistration, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    console.log("Login successful");
    res.redirect('/dashboard');
});

// ====================== Log Out =================
app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/signup');
    });
});

// ====================== Forgot =================
app.get('/forgot', (req, res) => {
    res.render('forgot')
});

app.post('/forgot', (req, res, next) => {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                let token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({ username: req.body.username }).then(user => {
                if (!user) {
                    req.flash('error', 'No account exists with this email address');
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save().then(() => {
                    done(null, token, user);
                }).catch(err => {
                    done(err);
                });
            }).catch(err => {
                done(err);
            });
        },
        function (token, user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.GMAILAC,
                    pass: process.env.GMAILPW
                }
            });

            smtpTransport.use('compile', hbs({
                viewEngine: 'express-handlebars',
                viewEngine: {
                    extName: ".handlebars",
                    defaultLayout: false,
                    partialsDir: './views/'
                },
                viewPath: './views/',
                extName: ".handlebars"
            }));

            let mailOptions = {
                to: user.username,
                from: process.env.GMAILAC,
                subject: "Forgot your password?",
                template: 'resetemail',
                context: {
                    link: 'http://' + req.headers.host + '/reset/' + token
                }
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                done(err, 'done');
            });
        }
    ], function (err) {
        if (err) return next(err);
        req.flash('success', "A password recovery link has been sent.");
        res.redirect('/forgot');
    });
});

// ======================= Reset ===============

app.get('/reset/:token', function (req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                req.flash('error', "The password reset link is invalid or has expired.");
                return res.redirect('/forgot');
            }
            res.render('reset', { token: req.params.token });
        })
        .catch(err => {
            // Handle any errors that occur during the query
            console.error(err);
            res.status(500).send('An error occurred while processing your request.');
        });
});

app.post('/reset/:token', function (req, res) {
    async.waterfall([
        function (done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
                .then(user => {
                    if (!user) {
                        req.flash('error', "The password reset link is invalid or has expired.");
                        return res.redirect('/forgot');
                    }
                    if (req.body.password === req.body.confirmPassword) {
                        user.setPassword(req.body.password, function (err) {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('An error occurred while setting the password.');
                            }
                            user.resetPasswordToken = undefined;
                            user.resetPasswordExpires = undefined;

                            user.save()
                                .then(() => {
                                    req.logIn(user, function (err) {
                                        if (err) {
                                            console.error(err);
                                            return res.status(500).send('An error occurred while logging in the user.');
                                        }
                                        done(null, user);
                                    });
                                })
                                .catch(err => {
                                    console.error(err);
                                    res.status(500).send('An error occurred while saving the user.');
                                });
                        });
                    } else {
                        req.flash("error", "The passwords do not match.");
                        fakeurl = "/reset/" + req.params.token;
                        return res.redirect(fakeurl);
                    }
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).send('An error occurred while processing your request.');
                });
        }
    ], function (err) {
        req.flash('success', "Password changed successfully.");
        res.redirect('/dashboard');
    });
});

// ====================== Reset Password =================
app.put('/settings/:id/changepassword', isAuthenticated, catchAsync(async (req, res) => {
    const author = await User.findById(req.params.id);
    if (!author._id.equals(req.user._id)) {
        return res.redirect('dashboard');
    }

    User.findById(req.params.id)
        .then(user => {
            if (!user) {
                req.flash('error', "No user found.");
                return res.redirect('/settings');
            }
            if (req.body.newPassword !== req.body.confirmPassword) {
                req.flash('error', "Please confirm your password.");
                return res.redirect('/settings');
            }

            user.changePassword(req.body.oldPassword, req.body.newPassword, function (err) {
                if (err) {
                    console.log(err);
                    req.flash('error', "The current password is incorrect.");
                    return res.redirect('/settings');
                }
                req.flash('success', "Password changed successfully.");
                res.redirect('/settings');
            });
        })
        .catch(err => {
            console.error(err);
            req.flash('error', "An error occurred while searching for the user.");
            res.redirect('/settings');
        });

}));

// ======================= User ===============
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userInfo = await User.findById(req.user._id);
        if (!userInfo) {
            return res.status(404).json({ message: 'User not found.' });
        }



        res.render('userDashboard', { userInfo});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
})

// ======================= Chat Interface ===============
app.get('/chat', isAuthenticated, async (req, res) => {
    res.render('chatInterface')
})

app.get('/assistant/chat-interface/hsk1', isAuthenticated, async (req, res) => {
    let data = {
        name: 'HSK 1',
        image: "../../images/hsk1.png",
        chatPrompt: undefined,
    }
    res.render('chatInterface', { data })
})
app.get('/assistant/chat-interface/hsk2', isAuthenticated, async (req, res) => {
    let data = {
        name: 'HSK 2',
        image: "../../images/hsk2.png",
        chatPrompt: undefined,
    }
    res.render('chatInterface', { data })
})
app.get('/assistant/chat-interface/hsk3', isAuthenticated, async (req, res) => {
    let data = {
        name: 'HSK 3',
        image: "../../images/hsk3.png",
        chatPrompt: undefined,
    }
    res.render('chatInterface', { data })
})
app.get('/assistant/chat-interface/hsk4', isAuthenticated, async (req, res) => {
    let data = {
        name: 'HSK 4',
        image: "../../images/hsk4.png",
        chatPrompt: undefined,
    }
    res.render('chatInterface', { data })
})



// ======================= Settings ===============
app.get('/settings', isAuthenticated, async (req, res) => {
    const userInfo = await User.findById(req.user._id);
    res.render('settings', { userInfo })
})

app.put('/settings/:id/edit', isAuthenticated, upload.single('profileImage'), catchAsync(async (req, res, next) => {
    const author = await User.findById(req.params.id);
    if (!author._id.equals(req.user._id)) {
        return res.redirect('dashboard');
    }
    let user;
    if (req.file) {
        const profileImage = { url: req.file.path, filename: req.file.filename };
        user = await User.findByIdAndUpdate(req.params.id, { ...req.body, profileImage });
    } else {
        user = await User.findByIdAndUpdate(req.params.id, { ...req.body });
    }
    const updatedAuthor = await User.findById(req.params.id);
    req.login(updatedAuthor, (err) => {
        if (err) return next(err);
        req.flash('success', "The information has been successfully updated.");
        res.redirect('/settings')
    })
}));


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});