import { MongoClient } from "mongodb"

if (!process.env.MONGO_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGO_URI"')
}

const uri = process.env.MONGO_URI
const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
}

let client
let clientPromise

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options)
        console.log("Connecting to MongoDB (Dev)...");
        global._mongoClientPromise = client.connect()
            .then(c => {
                console.log("MongoDB Connected (Dev)");
                return c;
            })
            .catch(err => {
                console.error("MongoDB Connection Error (Dev):", err);
                throw err;
            });
    }
    clientPromise = global._mongoClientPromise
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise
