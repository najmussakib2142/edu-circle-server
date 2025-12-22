require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KRY, 'base64').toString('utf-8')
const serviceAccount = JSON.parse(decoded);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleWare
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1l01jrg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const verifyFirebaseToken = async (req, res, next) => {
    // console.log("token", req.headers);
    const authHeader = req.headers?.authorization;
    // console.log(authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        // console.log('decoded token', decoded);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).send({ message: 'unauthorized access' })
    }
}


const verifyTokenEmail = (req, res, next) => {
    if (req.query.email && req.query.email !== req.user?.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const assignmentsCollection = client.db('eduCircle').collection('assignments')
        const submissionsCollection = client.db('eduCircle').collection('submissions');
        const reviewsCollection = client.db('eduCircle').collection('reviews');


        // assignments api

        app.post('/assignments', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const newAssignment = req.body;
            const result = await assignmentsCollection.insertOne(newAssignment)
            res.send(result)
        })

        app.get('/assignments', async (req, res) => {

            const { page = 1, limit = 10, difficulty, search } = req.query;

            const query = {};

            if (difficulty) {
                query.difficulty = difficulty;
            }

            if (search) {
                query.title = { $regex: search, $options: 'i' };
            }

            const skip = (page - 1) * limit;

            const data = await assignmentsCollection
                .find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .toArray();

            const total = await assignmentsCollection.countDocuments(query);

            res.send({
                data,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            });
        });


        app.get('/assignments/home', async (req, res) => {

            const data = await assignmentsCollection.aggregate([
                { $sample: { size: 5 } },
                {
                    $project: {
                        title: 1,
                        thumbnail: 1,
                        description: 1,
                        marks: 1,
                        difficulty: 1,
                        creatorEmail: 1,
                        createdAt: 1
                    }
                }
            ]).toArray();

            res.send(data)
        });


        // specific assignment
        app.get('/assignments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await assignmentsCollection.findOne(query)
            res.send(result)
        })

        app.put('/assignments/:id', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedData = req.body;
            const updatedDoc = {
                $set: updatedData
            }
            const result = await assignmentsCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.delete('/assignments/:id', async (req, res) => {
            const assignmentId = req.params.id;
            const userEmail = req.query.email;
            const query = { _id: new ObjectId(assignmentId) }

            try {
                const assignment = await assignmentsCollection.findOne(query)

                if (!assignment) {
                    return res.status(404).send({ message: 'Assignment not found' })
                }

                if (assignment.creatorEmail !== userEmail) {
                    return res.status(403).send({ message: 'Unauthorized delete attempt' })
                }

                const result = await assignmentsCollection.deleteOne(query)
                res.send(result)
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Something went wrong' });
            }

        })

        // submissions related api
        // app.get('/submissions', async (req, res) => {
        //     const email = req.query.email;
        //     const query = {
        //         studentEmail: email
        //     }
        //     const result = await submissionsCollection.find(query).toArray()
        //     res.send(result)
        // })
        app.get('/submissions', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const { email, status } = req.query;

            // console.log(req.headers);
            // if (!email || req.user?.email !== email) {
            //     return res.status(403).send({ message: 'Access denied' });
            // }
            // const query = { studentEmail: email };
            const query = {};
            if (email) {
                query.studentEmail = email;
            }
            if (status) {
                query.status = status;
            }
            const result = await submissionsCollection.find(query).toArray()
            res.send(result)
        })

        app.patch('/submissions/:id', async (req, res) => {
            const { id } = req.params;
            const { obtainedMarks, feedback, markedBy } = req.body;

            try {
                const existing = await submissionsCollection.findOne({ _id: new ObjectId(id) });

                if (existing?.studentEmail === markedBy) {
                    return res.status(403).send({ message: "You cannot mark your own assignment." });
                }

                const result = await submissionsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            obtainedMarks,
                            feedback,
                            status: "completed",
                            markedBy,
                            markedAt: new Date()
                        }
                    }
                );

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to update submission", error: error.message });
            }
        });


        app.post('/submissions', verifyFirebaseToken, async (req, res) => {
            const submission = req.body;
            // console.log(submission);
            const result = await submissionsCollection.insertOne(submission)
            res.send(result)
        })

        app.get('/stats', async (req, res) => {
            try {
                // Students: count distinct studentEmail
                const studentsAgg = await submissionsCollection.aggregate([
                    { $group: { _id: "$studentEmail" } },
                    { $count: "totalStudents" }
                ]).toArray();
                const totalStudents = studentsAgg[0]?.totalStudents || 0;

                // Instructors: count distinct creatorEmail
                const instructorsAgg = await assignmentsCollection.aggregate([
                    { $group: { _id: "$creatorEmail" } },
                    { $count: "totalInstructors" }
                ]).toArray();
                const totalInstructors = instructorsAgg[0]?.totalInstructors || 0;

                // Courses: total assignments
                const totalCourses = await assignmentsCollection.countDocuments();

                // Partners: if you don't have collection, keep static number
                const totalPartners = 12;

                res.send({
                    students: totalStudents,
                    instructors: totalInstructors,
                    courses: totalCourses,
                    partners: totalPartners
                });

            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to fetch stats" });
            }
        });


        // Get all reviews
        app.get('/reviews', async (req, res) => {
            try {
                const reviews = await reviewsCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(reviews);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
            }
        });

        // Add review (logged-in users only)
        app.post('/reviews', verifyFirebaseToken, async (req, res) => {
            const { message, rating } = req.body;
            if (!message || !rating) {
                return res.status(400).send({ message: "Message and rating are required" });
            }

            const newReview = {
                userEmail: req.user.email,
                userName: req.user.name || req.user.email.split("@")[0],
                userPhoto: req.user.picture || null,
                message,
                rating,
                createdAt: new Date(),
            };

            try {
                const result = await reviewsCollection.insertOne(newReview);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to save review", error: error.message });
            }
        });

        app.post('/bookmarks', verifyFirebaseToken, async (req, res) => {
            const { assignmentId } = req.body;
            if (!assignmentId) return res.status(400).send({ message: "AssignmentId required" });

            const newBookmark = {
                userEmail: req.user.email,
                assignmentId,
                createdAt: new Date()
            };

            try {
                const existing = await client.db('eduCircle').collection('bookmarks')
                    .findOne({ userEmail: req.user.email, assignmentId });

                if (existing) return res.status(400).send({ message: "Already bookmarked" });

                const result = await client.db('eduCircle').collection('bookmarks').insertOne(newBookmark);
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to add bookmark", error: err.message });
            }
        });

        app.get('/bookmarks', verifyFirebaseToken, async (req, res) => {
            try {
                const bookmarks = await client.db('eduCircle').collection('bookmarks')
                    .find({ userEmail: req.user.email })
                    .toArray();
                res.send(bookmarks);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch bookmarks" });
            }
        });

        app.delete('/bookmarks/:assignmentId', verifyFirebaseToken, async (req, res) => {
            const { assignmentId } = req.params;
            try {
                const result = await client.db('eduCircle').collection('bookmarks')
                    .deleteOne({ userEmail: req.user.email, assignmentId });
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to remove bookmark" });
            }
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Edu Circle is Running!')
})

app.listen(port, () => {
    console.log(`Edu circle is running on port ${port}`)
})