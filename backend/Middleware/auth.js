
const{ validateToken }=require("../services/jwtAuth");

const verifyUser = (req, res, next) => {
  const token = req.header('Authorization')?.split(" ")[1];
  
  if (!token) return res.status(401).json({ msg: "NO token" });
  try {
    const payload = validateToken(token);
    // console.log("Decoded payload:", payload);
    req.user = payload;
    console.log(`user ${req.user._id} processed `);
    next();
  } catch (error) {
    return res.status(401).json({ msg: "NO token" });
  }
};

const isAdmin = (req, res, next) => {
  // console.log("User role:", req.user.role);
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: "unauthorized" });
  }
  next();
};


module.exports={
verifyUser,
isAdmin
}


