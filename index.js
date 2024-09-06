const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');



//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ppdndxv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db("survey").collection("users");
        const surveyCollection = client.db("survey").collection("suurveys");
        const voteCollection = client.db("survey").collection("votes");
        const reportCollection = client.db("survey").collection("reports");
        const responseCollection = client.db("survey").collection("responses");
        const surveyorCollection = client.db("survey").collection("surveyors");

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })
        //middleware
        const verifyToken =( req, res, next)=>{
            console.log("insite vt", req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({massage: 'Forbidden Access'});
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
                if (err) {
                  return res.status(401).send({message: 'Forbidden Access'})              
                }
                req.decoded = decoded;
                next();
            })            
        }
        // user related api
        app.get("/users", verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        // surveyor true
        app.get("/users/surveyor/:email", verifyToken, async(req, res) =>{
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({message: 'Unauthorized access'}) 
            }
            const query = {email: email};
            const user = await userCollection.findOne(query);
            let surveyor = false;
            if (user) {
                surveyor = user?.role === 'surveyor';
            }
            res.send({surveyor})
        });
        // admin true
        app.get("/users/admin/:email", verifyToken, async(req, res) =>{
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({message: 'Unauthorized access'}) 
            }
            const query = {email: email};
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({admin});
        });
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const exitUser = await userCollection.findOne(query);
            if (exitUser) {
                return res.send({ massage: " User Already Exists", insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });
        //admin
        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin' 
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        // surveyor
        app.patch("/users/surveyor/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'surveyor'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });
        // Get surveys created by the currently logged-in user
        app.get("/surveys/user/:userId", async (req, res) => {
            const userId = req.params.userId;
            const surveys = await surveyCollection.find({ createdBy: userId }).toArray();
            res.send(surveys);
        });

        // Get responses for a specific survey
        app.get("/survey-responses/:surveyId", async (req, res) => {
            const surveyId = req.params.surveyId;
            const responses = await responseCollection.find({ surveyId: surveyId }).toArray();
            res.send(responses);
        });
        app.get("/surveyors/user/:userId", async (req, res) => {
            const userId = req.params.userId;
            console.log("Received userId:", userId); // Check if the userId is received correctly

            try {
                const surveys = await surveyorCollection.find({ createdBy: userId }).toArray();
                console.log("Fetched surveys:", surveys); // Log fetched data
                res.send(surveys);
            } catch (error) {
                console.error("Error fetching surveys:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        });
        // surveyor relateds
        app.get('/surveyors', async (req, res) => {
            try {
                const surveyors = await surveyorCollection.find().toArray();
                console.log("Fetched surveyors:", surveyors); // Log fetched surveyors
                res.send(surveyors);
            } catch (error) {
                console.error("Error fetching surveyors:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        });
        app.post('/surveyors', async (req, res) => {
            const { city, title, description, options, category, deadline, createdBy } = req.body;
            const newSurvey = {
                city,
                title,
                description,
                options,
                category,
                deadline,
                createdBy,
                status: 'publish',
                timestamp: new Date().toISOString(),
            };
            try {
                const result = await surveyorCollection.insertOne(newSurvey);
                res.send(result);
            } catch (error) {
                console.error("Error inserting surveyor:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        });
        app.delete("/surveyors/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await surveyorCollection.deleteOne(query);
            res.send(result);
        });

        //Apis
        app.get("/suurveys", async (req, res) => {
            const result = await surveyCollection.find().toArray();
            res.send(result);
        });

        app.get("/suurveys/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await surveyCollection.findOne(query);
            res.send(result);
        });

        //vote collection
        app.get("/votes", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await voteCollection.find(query).toArray();
            res.send(result);
        });
        app.post("/votes", async (req, res) => {
            const voters = req.body;
            const result = await voteCollection.insertOne(voters);
            res.send(result);
        })
        //report coolection
        app.get("/reports", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const reports = await reportCollection.find(query).toArray();
            res.send(reports);
        });
        app.post("/reports", async (req, res) => {
            const reportData = req.body;
            const result = await reportCollection.insertOne(reportData);  // `reportCollection` is your MongoDB collection for reports
            res.send(result);
        });
        // Endpoint for fetching user surveys
        app.get("/user-surveys/:userId", async (req, res) => {
            const userId = req.params.userId;
            const userSurveys = await responseCollection.find({ userId }).toArray();
            res.send(userSurveys);
        });

        // Endpoint for submitting survey responses
        app.post("/submit-survey/:id", async (req, res) => {
            const surveyId = req.params.id;
            const { userId, selectedAnswers } = req.body;

            // Assuming 'surveyResponses' is the collection where responses are stored
            await responseCollection.insertOne({
                surveyId,
                userId,
                selectedAnswers,
                createdAt: new Date()
            });

            res.status(200).send({ message: "Survey submitted successfully" });
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("survey server");
})

app.listen(port, () => {
    console.log(`survey is running on port ${port}`);

})