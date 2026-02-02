// migrate.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "HeUaTable";

const migrateCategories = async () => {
    console.log("Mulai migrasi...");

    // 1. Scan semua item yang merupakan Kategori
    // Hati-hati: Scan itu mahal jika data sudah jutaan. Gunakan segmen jika perlu.
    const scanResults = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":prefix": "CAT#"
        }
    }));

    if (!scanResults.Items || scanResults.Items.length === 0) {
        console.log("Tidak ada data yang perlu dimigrasi.");
        return;
    }

    console.log(`Ditemukan ${scanResults.Items.length} kategori. Memperbarui...`);

    // 2. Loop dan Update setiap item
    for (const item of scanResults.Items) {
        // Logika Migrasi: Menambahkan field baru 'status'
        const newItem = {
            ...item,
            status: "ACTIVE", // Atribut baru
            migrated_at: new Date().toISOString()
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: newItem
            }));
            console.log(`Updated: ${item.PK} - ${item.SK}`);
        } catch (err) {
            console.error(`Gagal update ${item.PK}:`, err);
        }
    }

    console.log("Migrasi Selesai.");
};

migrateCategories();