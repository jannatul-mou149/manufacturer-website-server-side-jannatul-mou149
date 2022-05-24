const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9xfrd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('dream_pc_build').collection('products');
        const orderCollection = client.db('dream_pc_build').collection('orders');
        const userCollection = client.db('dream_pc_build').collection('users');
        const reviewCollection = client.db('dream_pc_build').collection('reviews');
        //loading all products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query).sort({ _id: -1 });
            const products = await cursor.toArray();
            res.send(products);
        });
        //order a product
        app.post('/new-order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
        //add new product
        app.post('/products', async (req, res) => {
            const newItem = req.body;
            const result = await productCollection.insertOne(newItem);
            res.send(result);
        })
        //find products by id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const productQuery = { _id: ObjectId(id) };
            console.log(productQuery);
            const product = await productCollection.findOne(productQuery);
            res.send(product);
        })
        //users 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })
        //loading all reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query).sort({ _id: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        //add new review
        app.post('/reviews', async (req, res) => {
            const newItem = req.body;
            const result = await reviewCollection.insertOne(newItem);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        //make admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden access' });
            }
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from assignment-12')
})

app.listen(port, () => {
    console.log(`Dream PC Build Listening on port ${port}`);
})