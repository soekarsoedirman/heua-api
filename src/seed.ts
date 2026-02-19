import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs"; // <--- Tambahan Import

// --- KONFIGURASI ---
// Pastikan region sesuai dengan tabel Anda (ap-southeast-3 = Jakarta)
const client = new DynamoDBClient({ region: "ap-southeast-3" }); 
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "HeuaData"; 
const TARGET_EMAIL = "guru@sma.sch.id";

// --- HELPER ---
const getRandomId = () => Math.random().toString(36).substring(2, 7);

export const getRemainingDaysInMonth = () => {
    const now = new Date(); 
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const today = now.getDate();
    const remainingDays = lastDayOfMonth - today;

    return {
        today,
        year,
        monthStr: String(month).padStart(2, '0'), 
        lastDayOfMonth,
        remainingDays: remainingDays > 0 ? remainingDays : 0
    };
};

// Fungsi Utama
const seedData = async () => {
    console.log(`🚀 Mulai seeding data lengkap untuk: ${TARGET_EMAIL}...`);
    const allItems: any[] = [];
    const dateinfo = getRemainingDaysInMonth();

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
    const outJan1 = { nominal: 2000000, kategori: "Makan", tanggal: "2026-01-05T12:00:00Z" }; 
    const outJan2 = { nominal: 500000, kategori: "Transportasi", tanggal: "2026-01-10T08:00:00Z" };
    const outJan3 = { nominal: 300000, kategori: "Internet & Pulsa", tanggal: "2026-01-20T19:00:00Z" };

    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan1.tanggal}#${getRandomId()}`, ...outJan1, sumber: "cash", note: "Makan sebulan" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan2.tanggal}#${getRandomId()}`, ...outJan2, sumber: "cash", note: "Bensin" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outJan3.tanggal}#${getRandomId()}`, ...outJan3, sumber: "bank", note: "WiFi" } } }
    );

    // ==========================================
    // C. STATISTIK JANUARI (STAT#2026-01)
    // ==========================================
    const totalIncomeJan = incJan1.nominal + incJan2.nominal; 
    const totalOutcomeJan = outJan1.nominal + outJan2.nominal + outJan3.nominal; 
    
    const statJan = {
        PK: `USER#${TARGET_EMAIL}`,
        SK: `STAT#2026-01`,
        type: "MONTHLY_REPORT",
        created_at: "2026-02-01T00:00:01Z",
        summary: {
            total_duit: 19100000,
            saldo_breakdown: { bank: 15000000, cash: 1000000, tabungan: 3100000 },
            total_hutang: 0,
            total_piutang: 0,
            total_income: totalIncomeJan,
            total_outcome: totalOutcomeJan,
            daily_average_outcome: Math.round(totalOutcomeJan / 31), 
            savings_ratio: 0, 
            cashflow_health: totalIncomeJan >= totalOutcomeJan ? "Sehat" : "Tidak Sehat",
            mom_comparison: {
                income_growth_percent: 100, 
                outcome_growth_percent: 100
            }
        },
        breakdown: {
            income: {
                "Gaji": { 
                    total: incJan1.nominal, 
                    percent: parseFloat(((incJan1.nominal / totalIncomeJan) * 100).toFixed(2)) 
                },
                "Freelance": { 
                    total: incJan2.nominal, 
                    percent: parseFloat(((incJan2.nominal / totalIncomeJan) * 100).toFixed(2)) 
                }
            },
            outcome: {
                "Makan": { 
                    limit: 2000000, 
                    terpakai: outJan1.nominal, 
                    percent: (outJan1.nominal / 2000000) * 100, 
                    status: outJan1.nominal > 2000000 ? "OVERBUDGET" : "SAFE" 
                },
                "Transportasi": { 
                    limit: 500000, 
                    terpakai: outJan2.nominal, 
                    percent: (outJan2.nominal / 500000) * 100, 
                    status: outJan2.nominal > 500000 ? "OVERBUDGET" : "SAFE" 
                },
                "Internet & Pulsa": { 
                    limit: 300000, 
                    terpakai: outJan3.nominal, 
                    percent: (outJan3.nominal / 300000) * 100, 
                    status: outJan3.nominal > 300000 ? "OVERBUDGET" : "SAFE" 
                }
            }
        }
    };
    allItems.push({ PutRequest: { Item: statJan } });


    // ==========================================
    // 2. DATA BERJALAN (FEBRUARI 2026) - LIVE
    // ==========================================

    const incFeb1 = { nominal: 8000000, kategori: "Gaji", tanggal: "2026-02-01T09:00:00Z" };
    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `INCOME#${incFeb1.tanggal}#${getRandomId()}`, ...incFeb1, sumber: "bank", note: "Gaji Feb" } } }
    );

    const outFeb1 = { nominal: 500000, kategori: "Makan", tanggal: "2026-02-02T12:00:00Z" };
    const outFeb2 = { nominal: 100000, kategori: "Transportasi", tanggal: "2026-02-03T08:00:00Z" };

    allItems.push(
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outFeb1.tanggal}#${getRandomId()}`, ...outFeb1, sumber: "cash", note: "Makan siang" } } },
        { PutRequest: { Item: { PK: `USER#${TARGET_EMAIL}`, SK: `OUTCOME#${outFeb2.tanggal}#${getRandomId()}`, ...outFeb2, sumber: "cash", note: "Ojek" } } }
    );


    // ==========================================
    // 3. MASTER DATA (KATEGORI & SALDO)
    // ==========================================

    // A. Kategori
    const categories = [
        { nama: "Makan", limit: 2000000, terpakai: 500000 },
        { nama: "Transportasi", limit: 500000, terpakai: 100000 },
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
                    terpakai: cat.terpakai,
                    bulan: dateinfo.monthStr,
                    tahun: dateinfo.year,
                    isDefault: true
                }
            }
        });
    });

    // B. Saldo Akhir (MONEY)
    const moneyItem = {
        PK: `USER#${TARGET_EMAIL}`,
        SK: "MONEY",
        bank: 15000000,
        cash: 1000000,
        tabungan: 3100000,
        updated_at: new Date().toISOString()
    };
    allItems.push({ PutRequest: { Item: moneyItem } });

    // ==========================================
    // 4. USER METADATA (LOGIN INFO)  
    // ==========================================
    
    const hashedPassword = await bcrypt.hash("123456", 10);

    const userMeta = {
        PK: `USER#${TARGET_EMAIL}`,
        SK: "METADATA",
        username: "Pak Guru", 
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        isActive: true
    };
    allItems.push({ PutRequest: { Item: userMeta } });

    // ==========================================
    // 5. Quote
    // ==========================================
    const quotesHematUang = [
        "Menghemat bukan berarti pelit, tapi menghargai setiap rupiah yang kamu hasilkan.",
        "Uang kecil yang disimpan hari ini, bisa menjadi kebebasan besar di masa depan.",
        "Bukan seberapa besar penghasilanmu, tapi seberapa bijak kamu mengelolanya.",
        "Disiplin menabung hari ini adalah hadiah untuk dirimu di kemudian hari.",
        "Keinginan itu sementara, keamanan finansial itu jangka panjang.",
        "Orang kaya bukan hanya yang banyak uang, tapi yang pandai mengatur uangnya.",
        "Hidup sederhana sekarang, hidup tenang selamanya."
    ];

    let inc = 1;

    quotesHematUang.forEach(q =>{
        allItems.push({ PutRequest: { Item: { 
                    PK: "QUOTE", 
                    SK: `${inc}`, 
                    text: q, 
                } } })
        inc += 1;
    })

    // ==========================================
    // 6. EKSEKUSI BATCH
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

    console.log("🎉 Seeding Selesai! Data siap dipakai.");
    console.log(`👉 Login Email: ${TARGET_EMAIL}`);
    console.log(`👉 Login Pass : 123456`);
};

seedData();