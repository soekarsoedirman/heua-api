import { DynamoDBClient, Update$ } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
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

    const oldKategori = oldData.Item.kategori;
    const oldNominal = oldData.Item.nominal;

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
                        "#attr": oldKategori
                    },
                    ExpressionAttributeValues: {
                        ":val": oldNominal
                    }
                }
            }
        ]
    }));
}

export const newOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, nominal, sumber, kategori, note } = data;
    if (!tanggal || !nominal || !kategori) throw { status: 400, message: "Data tidak lengkap" };

    await docClient.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: TableName,
                    Item: {
                        PK: `USER#${userEmail}`,
                        SK: outIncomeSK(tanggal),
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
                        SK: `CAT#${kategori}`
                    },
                    UpdateExpression: "SET #attr = #attr + :val",
                    ExpressionAttributeNames: {
                        "#attr": "terpakai"
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr - :atr",
                    ConditionExpression: "#attr >= :atr",
                    ExpressionAttributeNames: {
                        "#attr": sumber
                    },
                    ExpressionAttributeValues: {
                        ":atr": nominal
                    }
                }
            }
        ]
    }));
}

export const editOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, nominal, sumber, kategori, note } = data;
    if (!tanggal || !nominal || !kategori) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: outIncomeSK(tanggal)
        }
    }))

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;
    const oldSumber = oldData.Item.sumber;

    const transactItems: any[] = [
        {
            Put: {
                TableName: TableName,
                Item: { PK: `USER#${userEmail}`, SK: outIncomeSK(tanggal), nominal, sumber, kategori, note, tanggal }
            }
        }
    ];

    if (oldKategori === kategori) {
        transactItems.push({
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: `CAT#${kategori}` },
                UpdateExpression: "SET #attr = #attr - :oldVal + :newVal",
                ExpressionAttributeNames: { "#attr": "terpakai" },
                ExpressionAttributeValues: { ":oldVal": oldNominal, ":newVal": nominal }
            }
        })
    } else {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `CAT#${oldKategori}` },
                    UpdateExpression: "SET #attr = #attr - :oldVal",
                    ExpressionAttributeNames: { "#attr": "terpakai" },
                    ExpressionAttributeValues: { ":oldVal": oldNominal }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `CAT#${kategori}` },
                    UpdateExpression: "SET #attr = #attr + :newVal",
                    ExpressionAttributeNames: { "#attr": "terpakai" },
                    ExpressionAttributeValues: { ":newVal": nominal }
                }
            }
        )
    }

    if (oldSumber === sumber) {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #attr = #attr + :oldVal - :newVal",
                    ConditionExpression: "#attr + :oldVal >= :newVal",
                    ExpressionAttributeNames: { "#attr": sumber },
                    ExpressionAttributeValues: { ":oldVal": oldNominal, ":newVal": nominal }
                }
            }
        )
    } else {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #old = #old + :oldVal",
                    ExpressionAttributeNames: { "#old": oldSumber },
                    ExpressionAttributeValues: { ":oldVal": oldNominal }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #new = #new - :newVal",
                    ConditionExpression: "#new >= :newVal",
                    ExpressionAttributeNames: { "#new": sumber },
                    ExpressionAttributeValues: { ":newVal": nominal }
                }
            }
        )
    }

    try {
        await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } catch (error: any) {
        if (error.name === 'TransactionCanceledException') {
            throw { status: 400, message: "Saldo di dompet Anda tidak mencukupi untuk transaksi ini." };
        }
        throw error;
    }
}

export const deleteOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal } = data;
    if (!tanggal) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: outIncomeSK(tanggal)
        }
    }));

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldKategori = oldData.Item.kategori;
    const oldNominal = oldData.Item.nominal;
    const oldSumber = oldData.Item.sumber;

    await docClient.send(new TransactWriteCommand({
        TransactItems: [
            {
                Delete: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: outIncomeSK(tanggal)
                    }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `CAT#${oldKategori}`
                    },
                    UpdateExpression: "SET #attr = #attr - :val",
                    ExpressionAttributeNames: {
                        "#attr": "terpakai"
                    },
                    ExpressionAttributeValues: {
                        ":val": oldNominal
                    }
                }
            },
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr + :atr",
                    ExpressionAttributeNames: {
                        "#attr": oldSumber
                    },
                    ExpressionAttributeValues: {
                        ":atr": oldNominal
                    }
                }
            }
        ]
    }))
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
    const { nama, limit } = data;
    if (!nama || limit === undefined) throw { status: 400, message: "Data tidak lengkap" };

    try {
        await docClient.send(new PutCommand({
            TableName: TableName,
            Item: {
                PK: `USER#${userEmail}`,
                SK: `CAT#${nama.toUpperCase()}`,
                nama,
                limit,
                terpakai: 0,
                isDefault: false
            },
            ConditionExpression: "attribute_not_exists(SK)"
        }));
    } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
            throw { status: 400, message: "Kategori sudah ada" };
        }
        throw error;
    }
}

export const editCategory = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { nama, limit } = data;

    try {
        await docClient.send(new UpdateCommand({
            TableName: TableName,
            Key: {
                PK: `USER#${userEmail}`,
                SK: `CAT#${nama.toUpperCase()}`
            },
            UpdateExpression: "SET #limit = :limit",
            ConditionExpression: "attribute_exists(SK)",
            ExpressionAttributeNames: { "#limit": "limit" },
            ExpressionAttributeValues: { ":limit": limit }
        }));
    } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
            throw { status: 404, message: "Kategori tidak ditemukan" };
        }
        throw error;
    }
}

export const deleteCategory = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { nama } = data;

    try {
        await docClient.send(new DeleteCommand({
            TableName: TableName,
            Key: {
                PK: `USER#${userEmail}`,
                SK: `CAT#${nama.toUpperCase()}`
            },
            ConditionExpression: "attribute_exists(SK) AND isDefault <> :true",
            ExpressionAttributeValues: { ":true": true }
        }));
    } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
            throw { status: 400, message: "Kategori utama aplikasi tidak boleh dihapus" };
        }
        throw error;
    }
}


//TAMBAHIN KONDISI BUAT SETIAP PENCATATAN SUMBER DAN KATEGORI