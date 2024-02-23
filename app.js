if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/user');
const chatCompletion = require('./models/chatCompletion');
const assistant = require('./models/assistant');
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
const isAdmin = require('./middleware/isAdmin');
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

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});

const admin = process.env.admin;
const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl
).then(() => {
    console.log("connect to Alfred data base");
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
                    user: 'aihealthapp1@gmail.com',
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
                from: 'emti7ani@gmail.com',
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
        const userInfo = await User.findById(req.user._id).populate('assistantUsage.id').populate('chatUsage.id');
        if (!userInfo) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Extracting assistant and chatCompletion IDs from user's usage
        const assistantIds = userInfo.assistantUsage.map(usage => usage.id._id.toString());
        const chatCompletionIds = userInfo.chatUsage.map(usage => usage.id._id.toString());

        // Fetching only those assistants and chatCompletions that are attached to the user
        const assistantList = await assistant.find({ '_id': { $in: assistantIds } });
        const chatCompletionList = await chatCompletion.find({ '_id': { $in: chatCompletionIds } });

        res.render('userDashboard', { userInfo, chatCompletionList, assistantList });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
})

// ======================= Chat Interface ===============
app.get('/chat', isAuthenticated, async (req, res) => {
    res.render('chatInterface')
})

app.get('/assistant/chat-interface/:id', isAuthenticated, async (req, res) => {
    let foundAssistant = await assistant.findById(req.params.id);
    let data = {
        name: foundAssistant.assistantName,
        image: foundAssistant.assistantPhoto.url,
        assistantId: foundAssistant.assistantId,
        chatPrompt: undefined,
        id: foundAssistant._id
    }
    console.log(data);
    res.render('chatInterface', { data })
})
app.get('/chat-completion/chat-interface/:id', isAuthenticated, async (req, res) => {
    let foundChat = await chatCompletion.findById(req.params.id);
    let data = {
        name: foundChat.chatName,
        image: foundChat.chatPhoto.url,
        assistantId: undefined,
        chatPrompt: foundChat.chatSystemPrompt,
        model: foundChat.model,
        id: foundChat._id
    }
    console.log(data);
    res.render('chatInterface', { data })
})
app.get('/create-thread', isAuthenticated, async (req, res) => {
    console.log("kk")
    const emptyThread = await openai.beta.threads.create();
    let thread = emptyThread.id;

    console.log(thread);
    const data = {
        thread
    }
    res.status(200).send(data);
})


// Configure multer for in-memory storage
const memoryStorage = multer.memoryStorage();
const uploadInMemory = multer({ storage: memoryStorage });

app.post('/get-assistant-response', isAuthenticated, uploadInMemory.array('assistantFiles', 10), async (req, res) => {
    console.log("body", req.body);
    console.log("files", req.files);
    let thread_id = req.body.thread;
    console.log("thread", req.body.thread);

    // Find the assistant by id from req.body
    const assistantId = req.body.id; // Assuming this is the assistant's id
    const assistantOne = await assistant.findById(assistantId);
    if (!assistantOne) {
        return res.status(404).json({ message: 'Assistant not found' });
    }

    // Find the user and check for the assistant reference
    const user = await User.findById(req.user.id);
    const assistantUsageEntry = user.assistantUsage.find(entry => entry.id.equals(assistantOne._id));

    if (assistantUsageEntry) {
        if (assistantUsageEntry.usage <= 0) {
            return res.status(200).json({ response: "usage limit exceeded" });
        }
        // Decrement the usage in anticipation of a successful assistant interaction
        assistantUsageEntry.usage -= 1;
        assistantUsageEntry.total += 1;
        await user.save();
    } else {
        // If the assistant is not already assigned to the user, do not proceed
        return res.status(404).json({ message: "Assistant not assigned to this user" });
    }

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Upload files to OpenAI
    const fileIds = [];
    if (req.files) {
        for (const file of req.files) {
            const tempFilePath = path.join(tempDir, file.originalname);
            await fs.promises.writeFile(tempFilePath, file.buffer);

            try {
                const openaiFile = await openai.files.create({
                    file: fs.createReadStream(tempFilePath),
                    purpose: 'assistants',
                });
                console.log(openaiFile);
                fileIds.push(openaiFile.id);
            } catch (e) {
                console.log(e);
            }

            // Clean up the temporary file
            await fs.promises.unlink(tempFilePath);
        }
    }
    const message = await openai.beta.threads.messages.create(
        thread_id,
        {
            role: "user",
            content: req.body.userMessage,
            file_ids: fileIds
        }
    );
    console.log(message);
    const run = await openai.beta.threads.runs.create(
        req.body.thread,
        {
            assistant_id: req.body.assistantId,
        }
    );
    const checkStatusAndPrintMessages = async (threadId, runId) => {
        let runStatus;
        let success = true;
        while (true) {
            runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (runStatus.status === "completed") {
                break; // Exit the loop if the run status is completed
            } else if (runStatus.status === "failed") {
                console.log(runStatus);
                success = false;
                break;
            }
            console.log(runStatus.status);
            await delay(1000); // Wait for 1 second before checking again
        }
        if (success) {
            

            let messages = await openai.beta.threads.messages.list(threadId);
            res.status(200).json({
                response: messages.data[0].content[0].text.value,
                threadId: req.body.thread,
                assistantId: req.body.assistantId
            });
        } else {
            res.status(400).json({
                response: "there is an issue generating the response"
            });
        }
    };

    function delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    // Call checkStatusAndPrintMessages function
    checkStatusAndPrintMessages(thread_id, run.id);
})


// Adjusted endpoint to handle multiple file uploads and JSON data
app.post('/get-chat-response', isAuthenticated, async (req, res) => {
    console.log("body", req.body);

    const { prompt, userMessage, model, id } = req.body; // Assuming 'id' is the chatCompletion's id

    try {
        // Find the chatCompletion by id
        const chatCompletionOne = await chatCompletion.findById(id);
        if (!chatCompletionOne) {
            return res.status(404).json({ message: 'ChatCompletion not found' });
        }
        console.log(chatCompletionOne);

        // Find the user and check for the chatCompletion reference
        const user = await User.findById(req.user.id);
        const chatUsageEntry = user.chatUsage.find(entry => entry.id.equals(chatCompletionOne._id));
        console.log(chatUsageEntry);

        if (chatUsageEntry) {
            // ChatCompletion is already assigned to the user
            if (chatUsageEntry.usage > 0) {
                // Decrement the usage for the response, but don't save it yet
                chatUsageEntry.usage -= 1;
                chatUsageEntry.total += 1;
                // Note: The save operation is moved after the AI response to ensure usage is only decremented upon successful response generation

                // Proceed with the chat completion request
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: prompt },
                        { role: "user", content: userMessage }
                    ],
                    model: model
                });

                // Now save the user with updated usage
                await user.save();

                // Return the AI's response
                return res.status(200).json({
                    response: completion.choices[0].message.content,
                });
            } else {
                // Usage limit exceeded
                return res.status(200).json({ response: "usage limit exceeded" });
            }
        } else {
            // This case handles the first-time use where the chatCompletion isn't assigned to the user yet
            user.chatUsage.push({ id: chatCompletionOne._id, usage: 0 }); // Assign with 0 usage since the limit is reached on first use
            await user.save();
            return res.status(200).json({ response: "usage limit reached, but chatCompletion assigned" });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});





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

// ======================= Admin ===============
app.get('/admin', isAdmin, async (req, res) => {
    const assistantList = await assistant.find({});
    const chatCompletionList = await chatCompletion.find({});
    res.render('dashboard', { chatCompletionList, assistantList })
})

app.post('/admin/chat', isAdmin, upload.single('chatPhoto'), catchAsync(async (req, res) => {
    const user = req.user._id;
    let newChat;
    if (req.file) {
        const chatPhoto = { url: req.file.path, filename: req.file.filename };
        newChat = new chatCompletion({ chatPhoto, ...req.body });
    } else {
        newChat = new chatCompletion({ ...req.body });
    }
    console.log(newChat)
    await newChat.save();
    req.flash('success', 'chatCompletion added successfully');
    res.redirect('/admin');
}))

const uploadBoth = multer().fields([
    { name: 'assistantPhoto', maxCount: 1 },
    { name: 'assistantFiles', maxCount: 10 }
]);

app.post('/admin/assistant', isAdmin, uploadBoth, catchAsync(async (req, res) => {
    req.body.fileRetrieval = req.body.fileRetrieval === 'on';
    req.body.codeInterpreter = req.body.codeInterpreter === 'on';
    let newAssistant;

    // Manually upload image to Cloudinary
    try {
        if (req.files.assistantPhoto) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.files.assistantPhoto[0].buffer);
                bufferStream.pipe(uploadStream);
            });
            const assistantPhoto = { url: result.url, filename: result.public_id };
            newAssistant = new assistant({ assistantPhoto, ...req.body });
        } else {
            newAssistant = new assistant({ ...req.body });
        }
        console.log(newAssistant);
    } catch (e) {
        console.log(e);
    }

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Upload files to OpenAI
    const fileIds = [];
    if (req.files.assistantFiles) {
        for (const file of req.files.assistantFiles) {
            const tempFilePath = path.join(tempDir, file.originalname);
            await fs.promises.writeFile(tempFilePath, file.buffer);

            try {
                const openaiFile = await openai.files.create({
                    file: fs.createReadStream(tempFilePath),
                    purpose: 'assistants',
                });
                console.log(openaiFile);
                fileIds.push(openaiFile.id);
            } catch (e) {
                console.log(e);
            }

            // Clean up the temporary file
            await fs.promises.unlink(tempFilePath);
        }
    }

    newAssistant.assistantFiles = fileIds;

    let myAssistant;

    if (req.body.fileRetrieval && req.body.codeInterpreter) {
        myAssistant = await openai.beta.assistants.create({
            instructions: req.body.assistantInstructions,
            name: req.body.assistantName,
            tools: [{ type: "code_interpreter" }, { type: "retrieval" }],
            model: req.body.model,
        });
    } else if (!req.body.fileRetrieval && req.body.codeInterpreter) {
        myAssistant = await openai.beta.assistants.create({
            instructions: req.body.assistantInstructions,
            name: req.body.assistantName,
            tools: [{ type: "code_interpreter" }],
            model: req.body.model,
        });
    } else if (req.body.fileRetrieval && !req.body.codeInterpreter) {
        myAssistant = await openai.beta.assistants.create({
            instructions: req.body.assistantInstructions,
            name: req.body.assistantName,
            tools: [{ type: "retrieval" }],
            model: req.body.model,
        });
    } else {
        myAssistant = await openai.beta.assistants.create({
            instructions: req.body.assistantInstructions,
            name: req.body.assistantName,
            tools: [{}],
            model: req.body.model,
        });
    }
    console.log(req.body);
    console.log(myAssistant);

    console.log("assistant id: ", myAssistant.id);

    for (const fileId of fileIds) {
        const myAssistantFile = await openai.beta.assistants.files.create(myAssistant.id, {
            file_id: fileId
        });
        console.log(myAssistantFile);
    }

    newAssistant.assistantId = myAssistant.id;

    await newAssistant.save();

    req.flash('success', 'Assistant added successfully');
    res.redirect('/admin');
}));


app.delete('/admin/assistant/:id', isAdmin, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const foundAssistant = await assistant.findById(id);
    console.log(foundAssistant);
    const response = await openai.beta.assistants.del(foundAssistant.assistantId);
    console.log(response);
    const deletedAssistant = await assistant.deleteOne({ _id: id });
    req.flash('success', "Assistant has been deleted");
    res.redirect('/admin')
}));
app.delete('/admin/chat/:id', isAdmin, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const deletedChat = await chatCompletion.deleteOne({ _id: id });
    req.flash('success', "Chat has been deleted");
    res.redirect('/admin')
}));

// ======================= Users ===============
app.get('/users', isAdmin, async (req, res) => {
    try {
        let users = await User.find({});

        // Calculate total usage for each user
        const usersWithTotalUsage = users.map(user => {
            // Aggregate chatUsage and assistantUsage
            const totalChatUsage = user.chatUsage.reduce((acc, curr) => acc + curr.total, 0);
            const totalAssistantUsage = user.assistantUsage.reduce((acc, curr) => acc + curr.total, 0);

            // Calculate total usage
            const totalUsage = totalChatUsage + totalAssistantUsage;

            // Return the user object with totalUsage
            return { ...user.toObject(), totalUsage }; // Convert mongoose document to plain object and add totalUsage
        });

        // Find all assistants and chatCompletions
        const allAssistants = await assistant.find({}, 'assistantName');
        const allChatCompletions = await chatCompletion.find({}, 'chatName');

        console.log(allChatCompletions);

        res.render('users', {
            users: usersWithTotalUsage,
            prompts: {
                assistants: allAssistants,
                chatCompletions: allChatCompletions
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/admin/usage', async (req, res) => {
    const promptId = req.body.prompt;
    const usageLimit = parseInt(req.body.usageLimit, 10);
    let modelFound = null;
    let modelType = '';

    try {
        // First, try to find the prompt in the Assistant model
        const assistantModel = await assistant.findById(promptId);
        if (assistantModel) {
            modelFound = assistantModel;
            modelType = 'assistant';
        } else {
            // If not found in Assistant, try the ChatCompletion model
            const chatCompletionModel = await chatCompletion.findById(promptId);
            if (chatCompletionModel) {
                modelFound = chatCompletionModel;
                modelType = 'chatCompletion';
            }
        }

        if (!modelFound) {
            return res.status(404).json({ message: 'Prompt not found in any model' });
        }

        // Find the user
        const user = await User.findById(req.body.userId); // Ensure req.user.id is set appropriately
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine the correct usage array based on modelType and assign the new usage
        const usageArray = modelType === 'assistant' ? user.assistantUsage : user.chatUsage;
        const existingUsageIndex = usageArray.findIndex(entry => entry.id.equals(modelFound._id));

        if (existingUsageIndex !== -1) {
            // Update existing usage if it already exists for the user
            usageArray[existingUsageIndex].usage = usageLimit; // Set usage to 1 as per your requirement to assign not increment
            usageArray[existingUsageIndex].total = 0; // Set usage to 1 as per your requirement to assign not increment
        } else {
            // Assign the prompt to the user with usage set to 1
            usageArray.push({ id: modelFound._id, usage: usageLimit, total: 0 });
            console.log(usageArray);
        }

        await user.save();
        req.flash('success', "Usage Access updated");
        res.redirect('/users')

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/user/:userId/usage', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Concurrently fetch details for each assistant and chatCompletion
        const fetchAssistantsDetails = user.assistantUsage.map(async (usage) => {
            const assistantModel = await assistant.findById(usage.id).select('assistantName');
            return {
                type: 'assistant',
                id: assistantModel._id.toString(), // Ensure the id is a string
                name: assistantModel.assistantName,
                usage: usage.usage
            };
        });

        const fetchChatCompletionsDetails = user.chatUsage.map(async (usage) => {
            const chatCompletionModel = await chatCompletion.findById(usage.id).select('chatName');
            return {
                type: 'chatCompletion',
                id: chatCompletionModel._id.toString(), // Ensure the id is a string
                name: chatCompletionModel.chatName,
                usage: usage.usage
            };
        });

        // Wait for all promises to resolve and combine the results
        const combinedDetails = await Promise.all([...fetchAssistantsDetails, ...fetchChatCompletionsDetails]);

        res.json({ data: combinedDetails }); // Combine all details into a single 'data' array
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/admin/usage/delete', async (req, res) => {
    const { promptId, userId } = req.body; // Assuming you're sending userId in your form

    if (!promptId || !userId) {
        return res.status(400).json({ message: 'Prompt ID and User ID are required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Remove the prompt from both assistantUsage and chatUsage arrays
        const initialAssistantUsageLength = user.assistantUsage.length;
        user.assistantUsage = user.assistantUsage.filter(usage => !usage.id.equals(promptId));

        const initialChatUsageLength = user.chatUsage.length;
        user.chatUsage = user.chatUsage.filter(usage => !usage.id.equals(promptId));

        // If nothing was removed, the prompt was not found
        if (initialAssistantUsageLength === user.assistantUsage.length && initialChatUsageLength === user.chatUsage.length) {
            return res.status(404).json({ message: 'Prompt not found for the user.' });
        }

        await user.save();
        req.flash('success', "Usage Access deleted");
        res.redirect('/users')
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});