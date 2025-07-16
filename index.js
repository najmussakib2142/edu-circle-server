const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

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

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const assignmentsCollection = client.db('eduCircle').collection('assignments')
        const submissionsCollection = client.db('eduCircle').collection('submissions');


        // assignments api

        app.post('/assignments', async (req, res) => {
            const newAssignment = req.body;
            const result = await assignmentsCollection.insertOne(newAssignment)
            res.send(result)
        })

        app.get('/assignments', async (req, res) => {
            const cursor = assignmentsCollection.find()
            const result = await cursor.toArray();
            res.send(result)
        })

        // specific assignment
        app.get('/assignments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await assignmentsCollection.findOne(query)
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
        app.get('/submissions', async (req, res) => {
            const email = req.query.email;
            const query = {
                studentEmail: email
            }
            const result = await submissionsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/submissions', async (req, res) => {
            const submission = req.body;
            console.log(submission);
            const result = await submissionsCollection.insertOne(submission)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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