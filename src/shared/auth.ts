import jwt from "jsonwebtoken";
import * as dotenv from 'dotenv';
dotenv.config();

export const verifyToken = (event: any) => {
    try {
        // 1. Cek apakah Secret terbaca
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL: JWT_SECRET belum diset di Environment Variable Lambda ini!");
            throw { status: 500, message: "Konfigurasi server bermasalah." };
        }

        // 2. Cek Header yang masuk
        const authHeader = event.headers.authorization || event.headers.Authorization;
        console.log("Incoming Auth Header:", authHeader); // Debugging

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw { status: 401, message: "Format token salah. Gunakan 'Bearer <token>'" };
        }

        const token = authHeader.split(" ")[1];
        
        // 3. Verifikasi
        const decoded = jwt.verify(token, secret);
        return decoded;

    } catch (error: any) {
        console.error("JWT Verification Error:", error.message);
        // Lempar error agar ditangkap oleh handler
        throw { 
            status: 401, 
            message: error.message || "Token tidak valid atau sudah kedaluwarsa." 
        };
    }
};