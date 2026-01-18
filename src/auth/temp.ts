import bcrypt from "bcryptjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import jwt from "jsonwebtoken";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;

const getDailyQuote = async () => {
    const today = new Date();
    const dayNumber = today.getDay() === 0 ? 7 : today.getDay();
    const result = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: { PK: `QUOTE`, SK: `${dayNumber}` }
    }));
    return result.Item || { text: "Tetap hemat!", author: "HeUa" }; // Fallback jika quote kosong [cite: 34]
};

export const login = async (data: any) => {
    const { email, password } = data;
    if (!email || !password) throw { status: 400, message: "Email dan password wajib diisi" };

    const userResult = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: { PK: `USER#${email}`, SK: `METADATA#${email}` }
    }));

    const user = userResult.Item;
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw { status: 401, message: "Email atau password salah" };
    }

    const [quote, token] = await Promise.all([
        getDailyQuote(),
        jwt.sign({ email, username: user.username }, process.env.JWT_SECRET!, { expiresIn: "1h" })
    ]);

    return { token, username: user.username, quote };
};


export const register = async (data: any) => {
    const { email, password, username } = data;

    if (!username || !email || !password) {
        throw { status: 400, message: "Data pendaftaran tidak lengkap" };
    }

    const userItem = {
        PK: `USER#${email}`,
        SK: `METADATA`,
        username: username,
        password: await bcrypt.hash(password, 10),
        createdAt: new Date().toISOString(),
    };

    const moneyItem = {
        PK: `USER#${email}`,
        SK: 'MONEY',
        bank: 0,
        cash: 0,
        tabungan: 0,
    };

    const kategoriDefault = ["Makan", "Transportasi", "Internet & Pulsa", "Kebutuhan Harian", "Hiburan", "Lainnya"];
    const categoryActions = kategoriDefault.map((nama) => ({
        Put: {
            TableName: TableName,
            Item: {
                PK: `USER#${email}`,
                SK: `CAT#${nama.toUpperCase().replace(/\s+/g, "_")}`,
                nama,
                limit: 0,
                terpakai: 0,
                isDefault: true,
            },
        }
    }));

    // try {
    //     // Mengirimkan semua data (User, Money, & Kategori) dalam SATU transaksi
    //     // Ini jauh lebih OPTIMAL daripada mengirim satu per satu
    //     await docClient.send(new TransactWriteItemsCommand({
    //         TransactItems: [
    //             {
    //                 Put: {
    //                     TableName: TableName,
    //                     Item: userItem,
    //                     ConditionExpression: "attribute_not_exists(PK)"
    //                 }
    //             },
    //             {
    //                 Put: {
    //                     TableName: TableName,
    //                     Item: moneyItem
    //                 }
    //             },
    //             ...categoryActions
    //         ]
    //     }));

    // } catch (error: any) {
    //     if (error.name === "TransactionCanceledException") {
    //         throw { status: 400, message: "Email sudah terdaftar" };
    //     }
    //     throw error;
    // }

    // Eksekusi paralel untuk Quote dan JWT agar Lambda lebih cepat
    const [quote, token] = await Promise.all([
        getDailyQuote(),
        jwt.sign({ email, username }, process.env.JWT_SECRET!, { expiresIn: "1h" })
    ]);

    return { token, username, quote };
};