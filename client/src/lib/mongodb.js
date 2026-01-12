import { MongoClient } from "mongodb"

if (!process.env.MONGO_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGO_URI"')
}

const uri = process.env.MONGO_URI
const options = {
    serverSelectionTimeoutMS: 10000, // Increase to 10s for slow connections
    socketTimeoutMS: 45000,
}

let client
let clientPromise

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        console.log("Connecting to MongoDB (Dev)...");
        client = new MongoClient(uri, options)
        global._mongoClientPromise = client.connect()
            .then(client => {
                console.log("MongoDB Connected (Dev)");
                return client;
            })
            .catch(err => {
                console.error("MongoDB Connection Error (Dev):", err.message);
                throw err;
            });
    }
    clientPromise = global._mongoClientPromise
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
}

export default clientPromise
