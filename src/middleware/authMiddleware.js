import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
