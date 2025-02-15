// import { MongoClient } from "mongodb";

// const client = new MongoClient("mongodb://127.0.0.1:27017/storageApp");


// export async function connectDB()
// {
//     await client.connect();
//     const db = client.db();
//     console.log("DataBase Connected");
//     return db;
// }

// process.on("SIGINT" , async ()=>{
//     await client.close();
//     console.log("Client Disconnected");
//     process.exit(0);
// })



import  { MongoClient, ServerApiVersion } from 'mongodb';
const uri = "mongodb+srv://mayank_db:N7CDR0lbRMxjfpdG@mayank.t4kde.mongodb.net/?retryWrites=true&w=majority&appName=mayank";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function connectDB() {
  try {
    await client.connect();
    const db = client.db("storageApp");
    console.log("You successfully connected to MongoDB!");
    return db;
  } catch(err){
    console.log("error aa rah hai , yeh waala error hai :" , err);
}
}

process.on("SIGINT" , async ()=>{
    await client.close();
    console.log("Client Disconnected");
    process.exit(0);
})

