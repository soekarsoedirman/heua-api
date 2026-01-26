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


export const dashboard = async(data:any, user:any ) => {
    const userEmail = (user as any).email;

    const transactItems: any [] = [
        {
            Get:{
                TableName: TableName,
                Key: {
                    Pk: `USER#${userEmail}`,
                    Sk: "MONEY"
                } 
            }
        }
    ];

    //TAMBAHIN LAGI NANTI 
    //TAMBAHIN LAGI NANTI


    const result = await docClient.send(new TransactWriteCommand({TransactItems: transactItems}));

    return result;
}

export const statistic = async(data:any, user:any) => {
    const userEmail = (user as any).email;

    const transactItems: any [] = [
        {
            Get:{
                TableName: TableName,
                Key: {
                    Pk: `USER#${userEmail}`,
                    Sk: "MONEY"
                } 
            }
        }
    ];

    //TAMBAHIN LAGI NANTI
    //TAMBAHIN LAGI NANTI

    const result = await docClient.send(new TransactWriteCommand({TransactItems: transactItems}));

    return result;
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