import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export const verifyToken = (event: any) => {
    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw { status: 401, message: "Akses ditolak. Token tidak ditemukan." };
        }

        const token = authHeader.split(" ")[1];
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        return decoded;
    } catch (error: any) {
        console.error("JWT Verification Error:", error.message);
        throw { status: 401, message: "Token tidak valid atau sudah kedaluwarsa." };
    }
};