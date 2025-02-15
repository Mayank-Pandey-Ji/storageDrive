import express from "express";
import { rm } from "fs/promises";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);


// Read
router.get("/:id?", async (req, res) => {
  const db = req.db;
  const user = req.user;
  const _id = req.params.id ? new ObjectId(req.params.id) : user.rootDirId;
  const dircollection = db.collection('directories');
  // Find the directory and verify ownership
  const directoryData = await dircollection.findOne({_id});
  if (!directoryData) {
    return res
      .status(404)
      .json({ error: "Directory not found or you do not have access to it!" });
  }

  const files = await db.collection('files').find({parentDirId : directoryData._id}).toArray();
  const directories = await dircollection.find({parentDirId : _id}).toArray();
  return res.status(200).json({ 
      ...directoryData,
      files: files.map((dir) => ({...dir , id:dir._id})),
      directories : directories.map((dir) => ({...dir , id:dir._id})) });
});

router.post("/:parentDirId?", async (req, res, next) => {
  const user = req.user;
  const db = req.db;
  const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;
  const dirname = req.headers.dirname || "New Folder";
  
  try {
    const directoryCollection = db.collection('directories');
  const parentDir = await directoryCollection.findOne({_id : parentDirId})
  if (!parentDir)
    return res
      .status(404)
      .json({ message: "Parent Directory Does not exist!" });

      const saveDir = await directoryCollection.insertOne({
        name: dirname,
        parentDirId,
        userId: user._id,
      })
    return res.status(200).json({ message: "Directory Created!" });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;
  const db = req.db;
  const dircollection = db.collection('directories');

  // const dirData = directoriesData.find((dir) => dir.id === id);
  // if (!dirData)
  //   return res.status(404).json({ message: "Directory not found!" });
  // // Check if the directory belongs to the user
  // if (dirData.userId !== user.id) {
  //   return res
  //     .status(403)
  //     .json({ message: "You are not authorized to rename this directory!" });
  // }

  try {
 const a =await  dircollection.updateOne({_id: new ObjectId(id) , userId: user._id} , {$set :{name : newDirName}} );

    res.status(200).json({ message: "Directory Renamed!" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const db = req.db;
  const filesCollection = db.collection('files');
  const dirCollection = db.collection('directories');
  const dirObjId = new ObjectId(id);


  const directoryData = await dirCollection.findOne({_id:dirObjId , userId : req.user._id} , {projection : {_id:1}});
  if(! directoryData)
  {
    return res.status(404).json({error: " Directory not Found"});
  }

  
  const {files , directories} = await getDirectoryContents(dirObjId, filesCollection, dirCollection );
  for(const {_id , extension} of files)
  {
    await rm(`./storage/${_id.toString()}${extension}`);
  }
  const a = await filesCollection.deleteMany({_id : {$in : files.map(({_id})=>_id)}});
  const b = await dirCollection.deleteMany({_id : {$in : [...directories.map(({_id})=>_id) , dirObjId]}});
  console.log(a,b);
  return res.json({message : "Files Deleted Successfully"});
});

async function getDirectoryContents(id, filesCollection, dirCollection) {
  let files = await filesCollection.find({parentDirId : id} , {projection:  {extension:1}}).toArray();
  let directories = await dirCollection.find({parentDirId : id} , {projection:  {_id:1}}).toArray();
  for(const  {_id , name} of directories)
  {
    const {files : childFiles , directories: childDirectories} =  await getDirectoryContents(_id);
    files = [...files ,... childFiles];
    directories = [...directories , ...childDirectories];
  }
  return {files , directories};
}


export default router;
