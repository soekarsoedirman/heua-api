import { DynamoDBClient, Update$ } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;

const getIncomeSK = (tanggal: string) => `INCOME#${new Date(tanggal).toISOString()}`;
const outIncomeSK = (tanggal: string) => `OUTCOME#${new Date(tanggal).toISOString()}`;

export const newIncome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, nominal, sumber, kategori, note } = data;
    if (!tanggal || !nominal || !sumber) throw { status: 400, message: "Data tidak lengkap" };

    await docClient.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: TableName,
                    Item: {
                        PK: `USER#${userEmail}`,
                        SK: getIncomeSK(tanggal),
                        nominal,
                        sumber,
                        kategori,
                        note,
                        tanggal,
                    }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`
                    },
                    UpdateExpression: "SET #attr = #attr + :val",
                    ExpressionAttributeNames: {
                        "#attr": kategori
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            }
        ]
    }));
}

export const editIncome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, nominal, sumber, kategori, note } = data;
    if (!tanggal || !nominal || !sumber) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: getIncomeSK(tanggal)
        }
    }))

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;

    const transactItems: any[] = [
        {
            Put: {
                TableName: TableName,
                Item: { PK: `USER#${userEmail}`, SK: getIncomeSK(tanggal), nominal, sumber, kategori, note, tanggal }
            }
        }
    ];

    if (oldKategori === kategori) {
        transactItems.push({
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                UpdateExpression: "SET #attr = #attr - :oldVal + :newVal",
                ExpressionAttributeNames: { "#attr": kategori },
                ExpressionAttributeValues: { ":oldVal": oldNominal, ":newVal": nominal }
            }
        });
    } else {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #oldAttr = #oldAttr - :oldVal",
                    ExpressionAttributeNames: { "#oldAttr": oldKategori },
                    ExpressionAttributeValues: { ":oldVal": oldNominal }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #newAttr = #newAttr + :newVal",
                    ExpressionAttributeNames: { "#newAttr": kategori },
                    ExpressionAttributeValues: { ":newVal": nominal }
                }
            }
        );
    }

    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
}

export const deleteIncome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal } = data;
    if (!tanggal) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: getIncomeSK(tanggal)
        }
    }))

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" }

    await docClient.send(new TransactWriteCommand({
        TransactItems: [
            {
                Delete: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: getIncomeSK(tanggal)
                    }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`
                    },
                    UpdateExpression: "SET #attr = #attr - :val",
                    ExpressionAttributeNames: {
                        "#attr": oldData.Item.kategori
                    },
                    ExpressionAttributeValues: {
                        ":val": oldData.Item.nominal
                    }
                }
            }
        ]
    }));
}

export const newOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const editOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const deleteOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const newDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const editDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const deleteDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const newCategory = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const editCategory = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}

export const deleteCategory = async (data: any, user: any) => {
    const userEmail = (user as any).email;
}