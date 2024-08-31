const express = require('express');
const app = express();
const cors = require('cors');
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

        // user related api
        app.get("/users", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        app.post("/users", async( req, res ) =>{
            const user = req.body;
            const query = {email : user.email};
            const exitUser = await userCollection.findOne(query);
            if (exitUser) {
                return res.send({massage: " User Already Exists", insertedId: null})
            }  
            const result = await userCollection.insertOne(user);
            res.send(result);
        });
        app.delete("/users/:id", async(req, res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


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
            const query = {email : email};
            const result = await voteCollection.find(query).toArray();
            res.send(result);
        });
        app.post("/votes", async(req, res) => {
            const voters = req.body;
            const result = await voteCollection.insertOne(voters);
            res.send(result);
        })
        //report coolection
        app.get("/reports", async (req, res) => { 
            const email = req.query.email;    
            const query = {email : email};       
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
            const userSurveys = await surveyResponsesCollection.find({ userId }).toArray();
            res.send(userSurveys);
        });

        // Endpoint for submitting survey responses
        app.post("/submit-survey/:id", async (req, res) => {
            const surveyId = req.params.id;
            const { userId, selectedAnswers } = req.body;

            // Assuming 'surveyResponses' is the collection where responses are stored
            await surveyResponsesCollection.insertOne({
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