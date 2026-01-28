import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand ,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;

export const getRemainingDaysInMonth = () => {
    const now = new Date(); 
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // Januari = 1

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

export const statistic = async(data:any, user:any) => {
    const userEmail = (user as any).email;
}

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