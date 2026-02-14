import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb"; 
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand ,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";
import * as dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;

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

const getPreviousMonthParams = (year: number, monthStr: string) => {
    let m = parseInt(monthStr);
    let y = year;
    if (m === 1) {
        m = 12;
        y = y - 1;
    } else {
        m = m - 1;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
};

const generateLiveSummary = async (userEmail: string, year: number, month: string) => {
    const period = `${year}-${month}`;

    // 1. Ambil Semua Data Mentah
    const [incomeData, outcomeData, debtData, moneyData, switchData] = await Promise.all([
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk": "INCOME#" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk": "OUTCOME#" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk": "DEBT#" }
        })),
        docClient.send(new GetCommand({
            TableName: TableName,
            Key: { PK: `USER#${userEmail}`, SK: "MONEY" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk": "SWITCH#" }
        }))
    ]);

    // 2. Filter Data Sesuai Periode (Bulan Ini)
    const incomes = incomeData.Items?.filter(i => i.SK.includes(period)) || [];
    const outcomes = outcomeData.Items?.filter(i => i.SK.includes(period)) || [];
    const switches = switchData.Items?.filter(s => s.SK.includes(period)) || [];

    // 3. Hitung Summary Dasar
    const totalIncome = incomes.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
    const totalOutcome = outcomes.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
    
    // Hutang/Piutang (Status UNPAID)
    const debts = debtData.Items || [];
    const totalHutang = debts.filter(d => d.tipe === 'HUTANG' && d.status === 'UNPAID')
                             .reduce((s, i) => s + (Number(i.nominal)||0), 0);
    const totalPiutang = debts.filter(d => d.tipe === 'PIUTANG' && d.status === 'UNPAID')
                              .reduce((s, i) => s + (Number(i.nominal)||0), 0);

    // Saldo Saat Ini
    const saldo = moneyData.Item || { bank: 0, cash: 0, tabungan: 0 };
    const totalDuit = (saldo.bank || 0) + (saldo.cash || 0) + (saldo.tabungan || 0);

    // 4. Hitung Rasio Menabung (Logika Baru: Income Bank + Switch ke Bank)
    const incomeSaved = incomes
        .filter(inc => inc.kategori && inc.kategori.toLowerCase() === 'bank') // Case insensitive
        .reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);

    const switchSaved = switches
        .filter(sw => sw.tujuan && sw.tujuan.toLowerCase() === 'bank')
        .reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);

    const totalSaved = incomeSaved + switchSaved;
    const savingsRatio = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

    // 5. Breakdown Kategori Income
    const incomeBreakdown: any = {};
    incomes.forEach(inc => {
        const catName = inc.kategori || "Lainnya";
        if (!incomeBreakdown[catName]) incomeBreakdown[catName] = { total: 0, percent: 0 };
        incomeBreakdown[catName].total += Number(inc.nominal);
    });
    // Hitung Persen Income
    Object.keys(incomeBreakdown).forEach(k => {
        incomeBreakdown[k].percent = totalIncome > 0 ? (incomeBreakdown[k].total / totalIncome) * 100 : 0;
    });

    // 6. Breakdown Kategori Outcome
    const outcomeBreakdown: any = {};
    outcomes.forEach(out => {
        const catName = out.kategori || "Lainnya";
        if (!outcomeBreakdown[catName]) outcomeBreakdown[catName] = { total: 0, percent: 0 }; // Note: Live stat tidak cek limit krn ribet fetch CAT# satu2
        outcomeBreakdown[catName].total += Number(out.nominal);
    });
    // Hitung Persen Outcome
    Object.keys(outcomeBreakdown).forEach(k => {
        outcomeBreakdown[k].percent = totalOutcome > 0 ? (outcomeBreakdown[k].total / totalOutcome) * 100 : 0;
    });

    // 7. Return Format Object (Mirip dengan struktur yang disimpan di DB)
    return {
        PK: `USER#${userEmail}`,
        SK: `STAT#${period}#PREVIEW`, // Penanda bahwa ini preview
        type: "MONTHLY_PREVIEW",
        created_at: new Date().toISOString(),
        summary: {
            total_duit: totalDuit,
            saldo_breakdown: { bank: saldo.bank, cash: saldo.cash, tabungan: saldo.tabungan },
            total_hutang: totalHutang,
            total_piutang: totalPiutang,
            total_income: totalIncome,
            total_outcome: totalOutcome,
            savings_ratio: parseFloat(savingsRatio.toFixed(2)),
            cashflow_health: totalIncome >= totalOutcome ? "Sehat" : "Tidak Sehat"
        },
        breakdown: {
            income: incomeBreakdown,
            outcome: outcomeBreakdown
        }
    };
};

export const makestate = async (userEmail: any) => {
    const dateInfo = getRemainingDaysInMonth();
    
    const validate = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: { PK: `USER#${userEmail}`, SK: "CAT#MAKAN" }
    }));

    if (!validate.Item) {return};
    if (validate.Item.bulan === dateInfo.monthStr) {return};

    // Bulan yang akan di-arsipkan (Bulan yang tertulis di Database, misal: user buka di Feb, DB masih Jan)
    const monthToArchive = validate.Item.bulan; 
    const yearToArchive = validate.Item.tahun; 
    const archivePeriod = `${yearToArchive}-${monthToArchive}`; // Format: 2026-01

    // 2. Pengambilan Data (Sudah Anda tulis, saya rapikan sedikit destructuring-nya)
    const [incomeData, outcomeData, debtData, moneyData, categoryData, switchData] = await Promise.all([
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk_prefix": "INCOME#" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk_prefix": "OUTCOME#" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk_prefix": "DEBT#" }
        })),
        docClient.send(new GetCommand({
            TableName: TableName,
            Key: { PK: `USER#${userEmail}`, SK: "MONEY" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk_prefix": "CAT#" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: { ":pk": `USER#${userEmail}`, ":sk_prefix": "SWITCH#" }
        }))
    ]);

    // 3. Pembuatan Statistik & Pengolahan Data

    // A. Filter Data Sesuai Bulan yang Diarsipkan
    // Karena query mengambil semua history, kita filter manual di sini untuk bulan yang mau di-close
    const incomes = incomeData.Items?.filter(i => i.SK.includes(archivePeriod)) || [];
    const outcomes = outcomeData.Items?.filter(i => i.SK.includes(archivePeriod)) || [];
    const switches = switchData.Items?.filter(s => s.SK.includes(archivePeriod)) || [];

    // B. Hitung Summary Dasar
    const totalIncome = incomes.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalOutcome = outcomes.reduce((sum, item) => sum + (item.nominal || 0), 0);
    
    // C. Hutang & Piutang (Mengambil status UNPAID saja atau semua running balance)
    const debts = debtData.Items || [];
    const totalHutang = debts.filter(d => d.tipe === 'HUTANG' && d.status === 'UNPAID')
                             .reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalPiutang = debts.filter(d => d.tipe === 'PIUTANG' && d.status === 'UNPAID')
                              .reduce((sum, item) => sum + (item.nominal || 0), 0);

    // D. Saldo (Asset)
    const saldo = moneyData.Item || { bank: 0, cash: 0, tabungan: 0 };
    const totalDuit = (saldo.bank || 0) + (saldo.cash || 0) + (saldo.tabungan || 0);

    // E. Analisis Lanjutan (BI)
    // - Rata-rata outcome harian (menggunakan jumlah hari di bulan yang diarsipkan)
    const daysInArchivedMonth = new Date(yearToArchive, parseInt(monthToArchive), 0).getDate();
    const dailyAverageOutcome = totalOutcome / daysInArchivedMonth;

    // - Rasio Menabung
    const incomeSaved = incomes
        .filter(inc => inc.kategori && inc.kategori.toLowerCase() === 'bank')
        .reduce((sum, item) => sum + (item.nominal || 0), 0);
    
    const switchSaved = switches
        .filter(sw => sw.tujuan && sw.tujuan.toLowerCase() === 'bank')
        .reduce((sum, item) => sum + (item.nominal || 0), 0);

    const totalSaved = incomeSaved + switchSaved;
    const savingsRatio = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

    // - Cashflow Health
    const cashflowHealth = totalIncome >= totalOutcome ? "Sehat" : "Tidak Sehat";

    // - Perbandingan Bulan ke Bulan (MoM)
    const prevPeriod = getPreviousMonthParams(yearToArchive, monthToArchive);
    const prevIncomes = incomeData.Items?.filter(i => i.SK.includes(prevPeriod)).reduce((s, i) => s + (i.nominal||0), 0) || 0;
    const prevOutcomes = outcomeData.Items?.filter(i => i.SK.includes(prevPeriod)).reduce((s, i) => s + (i.nominal||0), 0) || 0;
    
    const momIncome = prevIncomes === 0 ? 100 : ((totalIncome - prevIncomes) / prevIncomes) * 100;
    const momOutcome = prevOutcomes === 0 ? 100 : ((totalOutcome - prevOutcomes) / prevOutcomes) * 100;

    // F. Breakdown Kategori (Outcome & Income)
    const outcomeBreakdown: any = {};
    const categories = categoryData.Items || [];

    // Mengambil data dari CAT# items karena itu menyimpan 'limit' dan 'terpakai' real-time bulan itu
    categories.forEach(cat => {
        outcomeBreakdown[cat.nama] = {
            limit: cat.limit,
            terpakai: cat.terpakai,
            percent: cat.limit > 0 ? (cat.terpakai / cat.limit) * 100 : 0,
            status: cat.terpakai > cat.limit ? "OVERBUDGET" : "SAFE"
        };
    });

    // Grouping Income by Category (Manual dari raw data income karena tidak ada tabel CAT khusus income)
    const incomeBreakdown: any = {};
    incomes.forEach(inc => {
        const catName = inc.kategori || "Lainnya";
        if (!incomeBreakdown[catName]) {
            incomeBreakdown[catName] = { total: 0, percent: 0 };
        }
        incomeBreakdown[catName].total += inc.nominal;
    });
    // Hitung persentase income
    Object.keys(incomeBreakdown).forEach(key => {
        incomeBreakdown[key].percent = totalIncome > 0 ? (incomeBreakdown[key].total / totalIncome) * 100 : 0;
    });

    // 4. Persiapan Objek Statistik Lengkap
    const statItem = {
        PK: `USER#${userEmail}`,
        SK: `STAT#${archivePeriod}`, 
        type: "MONTHLY_REPORT",
        created_at: new Date().toISOString(),
        summary: {
            total_duit: totalDuit,
            saldo_breakdown: { bank: saldo.bank, cash: saldo.cash, tabungan: saldo.tabungan },
            total_hutang: totalHutang,
            total_piutang: totalPiutang,
            total_income: totalIncome,
            total_outcome: totalOutcome,
            daily_average_outcome: Math.round(dailyAverageOutcome),
            savings_ratio: parseFloat(savingsRatio.toFixed(2)),
            cashflow_health: cashflowHealth,
            mom_comparison: {
                income_growth_percent: parseFloat(momIncome.toFixed(2)),
                outcome_growth_percent: parseFloat(momOutcome.toFixed(2))
            }
        },
        breakdown: {
            outcome: outcomeBreakdown, // Berisi limit, terpakai, persentase
            income: incomeBreakdown    // Berisi total, persentase
        }
    };

    // 5. Transaksi Database: Simpan Statistik + Reset Kategori
    const transactItems: any[] = [];

    // Step A: Simpan Data Statistik (Snapshot)
    transactItems.push({
        Put: {
            TableName: TableName,
            Item: statItem
        }
    });

    // Step B: Reset Semua Kategori
    // Mengubah 'terpakai' jadi 0 dan update 'bulan' ke bulan sekarang (dateInfo.monthStr)
    categories.forEach(cat => {
        transactItems.push({
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: cat.SK },
                UpdateExpression: "SET #terpakai = :zero, #bulan = :newMonth",
                ExpressionAttributeNames: { 
                    "#terpakai": "terpakai",
                    "#bulan": "bulan" 
                },
                ExpressionAttributeValues: { 
                    ":zero": 0,
                    ":newMonth": dateInfo.monthStr // Update ke bulan baru (misal "02")
                }
            }
        });
    });

    try {
        // Eksekusi transaksi (Atomis: Semua sukses atau semua gagal)
        // Catatan: DynamoDB TransactWriteItems max 100 items. 
        // Jika kategori user > 90-an, perlu logic splitting batch (chunking).
        await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
        
        return { 
            status: "SUCCESS", 
            message: `Laporan bulan ${archivePeriod} berhasil dibuat dan kategori di-reset ke bulan ${dateInfo.monthStr}.`,
            data: statItem
        };

    } catch (error: any) {
        console.error("Gagal membuat state:", error);
        throw { status: 500, message: "Gagal memproses statistik bulanan." };
    }
};

export const dashboard = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const dateInfo = getRemainingDaysInMonth();

    const [moneyResult, outcomeResult] = await Promise.all([
        docClient.send(new GetCommand({
            TableName: TableName,
            Key: { PK: `USER#${userEmail}`, SK: "MONEY" }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":sk_prefix": `OUTCOME#${dateInfo.year}-${dateInfo.monthStr}` 
            }
        }))
    ]);

    if (!moneyResult.Item) throw { status: 404, message: "Data keuangan tidak ditemukan" };

    const outcomes = outcomeResult.Items || [];
    const totalOutcome = outcomes.reduce((sum, item) => sum + (item.nominal || 0), 0);
    
    const { bank = 0, cash = 0} = moneyResult.Item;
    const totalAvailableMoney = bank + cash;

    const dailyAverage = totalOutcome / dateInfo.today;
    const estimatedNeed = dailyAverage * dateInfo.remainingDays;

    const isOverBudget = estimatedNeed > totalAvailableMoney;
    const peringatan = isOverBudget 
        ? "Peringatan: Laju pengeluaran Anda melampaui sisa uang yang tersedia!" 
        : "Status keuangan Anda aman.";

    return {
        summary: {
            totalOutcome,
            dailyAverage: Math.round(dailyAverage),
            estimatedNeed: Math.round(estimatedNeed),
            remainingDays: dateInfo.remainingDays
        },
        money: moneyResult.Item,
        peringatan
    };
};


export const statistic = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const dateInfo = getRemainingDaysInMonth();

    const requestYear = data.year ? parseInt(data.year) : dateInfo.year;
    const requestMonth = data.month ? String(data.month).padStart(2, '0') : dateInfo.monthStr;
    
    const isCurrentMonth = (requestYear === dateInfo.year) && (requestMonth === dateInfo.monthStr);

    if (isCurrentMonth) {
        try {
            const liveData = await generateLiveSummary(userEmail, requestYear, requestMonth);
            
            return {
                status: "SUCCESS",
                message: "Summary sementara bulan ini (Live Data).",
                data: liveData
            };
        } catch (error) {
            console.error("Error generating live stats:", error);
            throw { status: 500, message: "Gagal menghitung statistik live." };
        }
    }

    const targetSK = `STAT#${requestYear}-${requestMonth}`;
    const result = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: targetSK
        }
    }));

    if (!result.Item) {
        return {
            status: "NOT_FOUND",
            message: `Laporan statistik periode ${requestYear}-${requestMonth} belum diarsipkan (Tutup Buku).`,
            data: null 
        };
    }

    return {
        status: "SUCCESS",
        message: "Data statistik arsip ditemukan.",
        data: result.Item 
    };
};

export const riwayat = async(data:any, user:any) => {
    const userEmail = (user as any).email;

    const [income, outcome, debt] = await Promise.all([
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":sk_prefix": "INCOME#"
            }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":sk_prefix": "OUTCOME#"
            }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":sk_prefix": "DEBT#"
            }
        }))
    ]);

    return {
        income: income.Items || [],
        outcome: outcome.Items || [],
        debt: debt.Items || []
    }
}

export const kategori = async(data:any, user:any) => {
    const userEmail = (user as any).email;

    const result = await docClient.send(new QueryCommand({
        TableName: TableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
        ExpressionAttributeValues: {
            ":pk": `USER#${userEmail}`,
            ":sk_prefix": "CAT#"
        }
    }))

    return result.Items;
}