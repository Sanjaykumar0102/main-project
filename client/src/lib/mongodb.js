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

// In serverless environments (like Vercel), we need to use a global variable 
// to prevent the MongoClient from being recreated every time.
if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
}
clientPromise = global._mongoClientPromise

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise
