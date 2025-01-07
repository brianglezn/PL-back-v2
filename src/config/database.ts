import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;
const DB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@profit-lost.dojlby3.mongodb.net/?retryWrites=true&w=majority&ssl=true`;

// Create a MongoClient instance
const client = new MongoClient(DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Function to initiate connection with the database
async function connectDB() {
    try {
        // Connect to the server
        await client.connect();
        console.log("✅ MongoDB connected successfully");

        // Send a ping to confirm the connection
        const pingResult = await client.db("admin").command({ ping: 1 });
        console.log("📡 MongoDB ping result:", pingResult);

        return client.db(DB_NAME);
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error);
        // Try to close the client if there is an error
        try {
            await client.close();
        } catch (closeError) {
            console.error("❌ Error closing MongoDB connection:", closeError);
        }
        process.exit(1); // Exit the process with error
    }
}

export { client, connectDB, DB_NAME, DB_URI }; 