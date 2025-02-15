import express from "express";
import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import path from "path";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.post("/:parentDirId?", async (req, res, next) => {
  const db = req.db;
  const directoryCollection = db.collection('directories');
  const parentDirId = req.params.parentDirId || req.user.rootDirId;
  const parentDirData = await directoryCollection.findOne({_id : new ObjectId(parentDirId) , userId: req.user._id});

  // Check if parent directory exists
  if (!parentDirData) {
    return res.status(404).json({ error: "Parent directory not found!" });
  }

  const filename = req.headers.filename || "untitled";
  const extension = path.extname(filename);

  const insertedFile = await db.collection('files').insertOne({
      extension,
      name: filename,
      parentDirId : parentDirData._id,
      userId : req.user._id
  })

  const fileId = insertedFile.insertedId.toString();

  const fullFileName = `${fileId}${extension}`;
  console.log(fullFileName);

  const writeStream = createWriteStream(`./storage/${fullFileName}`);
  req.pipe(writeStream);

  req.on("end", async () => {
      return res.status(201).json({ message: "File Uploaded" });
  });

  req.on("error" ,async ()=>{
    await db.collection('files').deleteOne({_id :  insertedFile.insertedId});
    return res.status(404).json({message : "Could not Uploaded"});
  })
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const fileData = await db.collection('files').findOne({_id : new ObjectId(id) , userId:req.user._id });
  console.log(fileData);

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }



  // If "download" is requested, set the appropriate headers
  const filePath = `${process.cwd()}/storage/${id}${fileData.extension}`;

  if (req.query.action === "download") {
    return res.download(filePath, fileData.name);
  }

  // Send file
  return res.sendFile(filePath, (err) => {
    if (!res.headersSent && err) {
      return res.status(404).json({ error: "File not found!" });
    }
  });
});

router.patch("/:id", async (req, res, next) => {
  const { id } = req.params;
  const db =  req.db;
  const fileData = db.collection('files').findOne({_id : new ObjectId(id) , userId : req.user._id});

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }

  // // Check parent directory ownership
  // const parentDir = directoriesData.find(
  //   (dir) => dir.id === fileData.parentDirId
  // );
  // if (!parentDir) {
  //   return res.status(404).json({ error: "Parent directory not found!" });
  // }
  // if (parentDir.userId !== req.user.id) {
  //   return res
  //     .status(403)
  //     .json({ error: "You don't have access to this file." });
  // }

  // Perform rename
  try {
    await db.collection('files').updateOne({_id : new ObjectId(id)} , {$set : {name : req.body.newFilename}});
    return res.status(200).json({ message: "Renamed" });
  } catch (err) {
    err.status = 500;
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;
  const db =  req.db;
  const fileData = await db.collection('files').findOne({_id : new ObjectId(id) , userId : req.user._id});

  if(! fileData)
  {
    return res.status(401).json({message : "file not found"});
  }

  // // Check parent directory ownership
  // const parentDir = directoriesData.find(
  //   (dir) => dir.id === fileData.parentDirId
  // );
  // if (!parentDir) {
  //   return res.status(404).json({ error: "Parent directory not found!" });
  // }
  // if (parentDir.userId !== req.user.id) {
  //   return res
  //     .status(403)
  //     .json({ error: "You don't have access to this file." });
  // }

  try {
    // Remove file from filesystem
    console.log(fileData);
    await rm(`./storage/${id}${fileData.extension}`);
  
    await db.collection('files').deleteOne({_id : fileData._id})
    return res.status(200).json({ message: "File Deleted Successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
