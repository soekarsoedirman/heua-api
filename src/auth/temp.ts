import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand 
} from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

// Inisialisasi Client DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "HeuaData"; // Sesuaikan dengan nama di template.yaml

export const lambdaHandler = async (event: any) => {
    try {
        // Mengambil metadata HTTP dari Function URL [cite: 35]
        const httpMethod = event.requestContext.http.method;
        const path = event.rawPath;
        const body = event.body ? JSON.parse(event.body) : {};

        // Routing berdasarkan path dan method
        if (httpMethod === 'POST' && path === '/register') {
            return await handleRegister(body);
        } 
        
        if (httpMethod === 'POST' && path === '/login') {
            return await handleLogin(body);
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Endpoint tidak ditemukan" }),
        };

    } catch (error: any) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: "Internal Server Error", 
                error: error.message 
            }),
        };
    }
};

/**
 * Fitur Register: Menyimpan username, email, dan password 
 */
async function handleRegister(data: any) {
    const { username, email, password } = data;

    if (!username || !email || !password) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ message: "Username, email, dan password wajib diisi" }) 
        };
    }

    // Hash password sebelum disimpan untuk keamanan
    const hashedPassword = await bcrypt.hash(password, 10);

    const params = {
        TableName: TABLE_NAME,
        Item: {
            PK: `USER#${email}`, // Partition Key berdasarkan email
            SK: `METADATA#${email}`, // Sort Key metadata [cite: 35]
            username: username,
            password: hashedPassword,
            photo_url: "default-avatar.png", // Avatar default tidak bisa diganti [cite: 34]
            quote: "Atur keuanganmu, atur masa depanmu", // Quote default [cite: 34]
            createdAt: new Date().toISOString(),
        },
        // Mencegah duplikasi email
        ConditionExpression: "attribute_not_exists(PK)"
    };

    try {
        await docClient.send(new PutCommand(params));
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Registrasi berhasil" }),
        };
    } catch (err: any) {
        if (err.name === "ConditionalCheckFailedException") {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ message: "Email sudah terdaftar" }) 
            };
        }
        throw err;
    }
}

/**
 * Fitur Login: Verifikasi email dan password 
 */
async function handleLogin(data: any) {
    const { email, password } = data;

    if (!email || !password) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ message: "Email dan password wajib diisi" }) 
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            PK: `USER#${email}`,
            SK: `METADATA#${email}`
        }
    };

    const { Item } = await docClient.send(new GetCommand(params));

    if (!Item) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ message: "Email atau password salah" }) 
        };
    }

    // Membandingkan hash password
    const isPasswordValid = await bcrypt.compare(password, Item.password);

    if (!isPasswordValid) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ message: "Email atau password salah" }) 
        };
    }

    // Mengembalikan data profil untuk Dashboard [cite: 18, 34]
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Login berhasil",
            user: {
                username: Item.username,
                email: email,
                photo_url: Item.photo_url,
                quote: Item.quote
            }
        }),
    };
}