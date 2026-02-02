import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

// --- KONFIGURASI ---
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "HeUaTable"; 
const TARGET_EMAIL = "guru@sma.sch.id";

// --- HELPER ---
const getRandomId = () => Math.random().toString(36).substring(2, 7);
const getISO = (dateStr: string) => new Date(dateStr).toISOString();

// Fungsi Utama
const seedData = async () => {
    console.log(`🚀 Mulai seeding data lengkap untuk: ${TARGET_EMAIL}...`);
    const allItems: any[] = [];

    // ==========================================
    // 1. DATA HISTORIS (JANUARI 2026) - SUDAH TUTUP BUKU
    // ==========================================
    
    // A. Transaksi Income Januari
    const incJan1 = { nominal: 8000000, kategori: "Gaji", tanggal: "2026-01-01T09:00:00Z" };
    const incJan2 = { nominal: 1500000, kategori: "Freelance", tanggal: "2026-01-15T10:00:00Z" };
    
    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `INCOME#${incJan1.tanggal}#${getRandomId()}`, ...incJan1, sumber: "bank", note: "Gaji Bulan Jan" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `INCOME#${incJan2.tanggal}#${getRandomId()}`, ...incJan2, sumber: "cash", note: "Proyek Web" } } }
    );

    // B. Transaksi Outcome Januari
    const outJan1 = { nominal: 2000000, kategori: "Makan", tanggal: "2026-01-05T12:00:00Z" }; // Overbudget ceritanya
    const outJan2 = { nominal: 500000, kategori: "Transportasi", tanggal: "2026-01-10T08:00:00Z" };
    const outJan3 = { nominal: 300000, kategori: "Internet & Pulsa", tanggal: "2026-01-20T19:00:00Z" };

    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan1.tanggal}#${getRandomId()}`, ...outJan1, sumber: "cash", note: "Makan sebulan" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan2.tanggal}#${getRandomId()}`, ...outJan2, sumber: "cash", note: "Bensin" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan3.tanggal}#${getRandomId()}`, ...outJan3, sumber: "bank", note: "WiFi" } } }
    );

    // C. STATISTIK JANUARI (STAT#2026-01)
    // Ini adalah hasil "makestate" yang kita simpan manual untuk seed
    const totalIncomeJan = incJan1.nominal + incJan2.nominal; // 9.500.000
    const totalOutcomeJan = outJan1.nominal + outJan2.nominal + outJan3.nominal; // 2.800.000

    const statJan = {
        PK: `USER#${TARGET_EMAIL}`,
        SK: `STAT#2026-01`,
        type: "MONTHLY_REPORT",
        created_at: "2026-02-01T00:00:01Z",
        summary: {
            total_income: totalIncomeJan,
            total_outcome: totalOutcomeJan,
            savings_ratio: ((totalIncomeJan - totalOutcomeJan) / totalIncomeJan) * 100,
            cashflow_health: "Sehat"
        },
        breakdown: {
            income: {
                "Gaji": { total: 8000000, percent: 84.2 },
                "Freelance": { total: 1500000, percent: 15.8 }
            },
            outcome: {
                "Makan": { limit: 2000000, terpakai: 2000000, percent: 100, status: "SAFE" }, // Pas limit
                "Transportasi": { limit: 500000, terpakai: 500000, percent: 100, status: "SAFE" },
                "Internet & Pulsa": { limit: 300000, terpakai: 300000, percent: 100, status: "SAFE" }
            }
        }
    };
    allItems.push({ PutRequest: { Item: statJan } });


    // ==========================================
    // 2. DATA BERJALAN (FEBRUARI 2026) - LIVE
    // ==========================================

    // A. Transaksi Income Feb
    const incFeb1 = { nominal: 8000000, kategori: "Gaji", tanggal: "2026-02-01T09:00:00Z" };
    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `INCOME#${incFeb1.tanggal}#${getRandomId()}`, ...incFeb1, sumber: "bank", note: "Gaji Feb" } } }
    );

    // B. Transaksi Outcome Feb (Ini yang akan mempengaruhi 'terpakai' di Kategori)
    // Makan baru pakai 500rb, Transport 100rb
    const outFeb1 = { nominal: 500000, kategori: "Makan", tanggal: "2026-02-02T12:00:00Z" };
    const outFeb2 = { nominal: 100000, kategori: "Transportasi", tanggal: "2026-02-03T08:00:00Z" };

    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outFeb1.tanggal}#${getRandomId()}`, ...outFeb1, sumber: "cash", note: "Makan siang" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outFeb2.tanggal}#${getRandomId()}`, ...outFeb2, sumber: "cash", note: "Ojek" } } }
    );


    // ==========================================
    // 3. MASTER DATA (KATEGORI & SALDO)
    // ==========================================

    // A. Kategori (Running Balance untuk FEBRUARI)
    // Ingat: terpakai di sini HANYA menghitung transaksi Februari
    const categories = [
        { nama: "Makan", limit: 2000000, terpakai: 500000 }, // Sesuai outFeb1
        { nama: "Transportasi", limit: 500000, terpakai: 100000 }, // Sesuai outFeb2
        { nama: "Internet & Pulsa", limit: 300000, terpakai: 0 },
        { nama: "Hiburan", limit: 500000, terpakai: 0 },
        { nama: "Belanja Harian", limit: 1000000, terpakai: 0 },
        { nama: "Lainnya", limit: 500000, terpakai: 0 }
    ];

    categories.forEach(cat => {
        allItems.push({
            PutRequest: {
                Item: {
                    PK: `USER#${TARGET_EMAIL}`,
                    SK: `CAT#${cat.nama.toUpperCase().replace(/\s+/g, "_")}`,
                    nama: cat.nama,
                    limit: cat.limit,
                    terpakai: cat.terpakai, // Data Realtime Feb
                    periode: "2026-02",     // Menandakan ini data aktif Feb
                    isDefault: true
                }
            }
        });
    });

    // B. Saldo Akhir (MONEY)
    // Hitungan Kasar: 
    // Awal (misal 5jt) + IncJan(9.5) - OutJan(2.8) + IncFeb(8.0) - OutFeb(0.6) = ~19.1jt
    // Kita set manual saja biar mudah
    const moneyItem = {
        PK: `USER#${TARGET_EMAIL}`,
        SK: "MONEY",
        bank: 15000000,
        cash: 1000000,
        tabungan: 3100000, // Total sekitar 19.1jt
        updated_at: new Date().toISOString()
    };
    allItems.push({ PutRequest: { Item: moneyItem } });


    // ==========================================
    // 4. EKSEKUSI BATCH (Chunking per 25 items)
    // ==========================================
    const chunks = [];
    while (allItems.length > 0) {
        chunks.push(allItems.splice(0, 25));
    }

    console.log(`Menulis total ${chunks.reduce((acc, c) => acc + c.length, 0)} items...`);

    for (const chunk of chunks) {
        try {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: chunk
                }
            }));
            console.log(`✅ Batch berhasil (${chunk.length} items)`);
        } catch (error) {
            console.error("❌ Gagal seeding batch:", error);
        }
    }

    console.log("🎉 Seeding Selesai! Data siap dipakai untuk demo.");
};

seedData();