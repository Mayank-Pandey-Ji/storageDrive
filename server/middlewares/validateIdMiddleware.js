export default function (req, res, next, id) {
  // const uuidRegex =
  //   /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (id.length !== 24) {
    return res.status(400).json({ error: `Invalid ID: ${id}` });
  }
  next();
}
