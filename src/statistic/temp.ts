import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const getTransactions = async (user: any) => {
    const userEmail = (user as any).email;

    // Menyiapkan dua kueri berbeda yang berjalan secara paralel
    const [incomeResult, outcomeResult] = await Promise.all([
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":prefix": "INCOME#"
            }
        })),
        docClient.send(new QueryCommand({
            TableName: TableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userEmail}`,
                ":prefix": "OUTCOME#"
            }
        }))
    ]);

    // Menggabungkan hasil ke dalam satu objek result
    return {
        income: incomeResult.Items || [],
        outcome: outcomeResult.Items || []
    };
};