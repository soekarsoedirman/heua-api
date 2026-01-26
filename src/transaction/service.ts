import { DynamoDBClient, Update$ } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { updateExportAssignment } from "typescript";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;

export const getIncomeSK = (tanggal: string) => {
    const uniqueId = Math.random().toString(36).substring(2, 7); 
    return `INCOME#${new Date(tanggal).toISOString()}#${uniqueId}`;
};

export const getOutcomeSK = (tanggal: string) => {
    const uniqueId = Math.random().toString(36).substring(2, 7);
    return `OUTCOME#${new Date(tanggal).toISOString()}#${uniqueId}`;
};

export const getDebtSK = (tanggal: string) => {
    const uniqueId = Math.random().toString(36).substring(2, 7);
    return `DEBT#${new Date(tanggal).toISOString()}#${uniqueId}`;
};

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
    const { sk, nominal, sumber, kategori, note } = data;
    if (!sk || !nominal || !sumber) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
        }
    }))

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;

    const transactItems: any[] = [
        {
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: sk},
                UpdateExpression : "SET #nominal = :nominal, #sumber = :sumber, #kategori = :kategori, #note = :note",
                ExpressionAttributeNames: {
                    "#nominal": "nominal",
                    "#sumber": "sumber",
                    "#kategori": "kategori",
                    "#note": "note"
                },
                ExpressionAttributeValues: {
                    ":nominal": nominal,
                    ":sumber": sumber,
                    ":kategori": kategori,
                    ":note": note
                }
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
    const { sk } = data;
    if (!sk) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
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
                        SK: sk
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
                        SK: getOutcomeSK(tanggal),
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
                    UpdateExpression: "SET #attr = #attr - :attr",
                    ConditionExpression: "#attr >= :attr",
                    ExpressionAttributeNames: {
                        "#attr": sumber
                    },
                    ExpressionAttributeValues: {
                        ":attr": nominal
                    }
                }
            }
        ]
    }));
}

export const editOutcome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { sk, nominal, sumber, kategori, note } = data;
    if (!sk || !nominal || !kategori) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
        }
    }))

    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;
    const oldSumber = oldData.Item.sumber;

    const transactItems: any[] = [
        {
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: sk},
                UpdateExpression: "SET #nominal = :nominal, #sumber = :sumber, #kategori = :kategori, #note = :note",
                ExpressionAttributeNames : {
                    "#nominal": "nominal",
                    "#sumber": "sumber",
                    "#kategori": "kategori",
                    "#note": "note"
                },
                ExpressionAttributeValues: {
                    ":nominal": nominal,
                    ":sumber": sumber,
                    ":kategori": kategori,
                    ":note": note
                }
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
    const { sk } = data;
    if (!sk) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
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
                        SK: sk
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
                    UpdateExpression: "SET #attr = #attr + :attr",
                    ExpressionAttributeNames: {
                        "#attr": oldSumber
                    },
                    ExpressionAttributeValues: {
                        ":attr": oldNominal
                    }
                }
            }
        ]
    }))
}

export const newDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, pihak, nominal, tipe, tenggat, source, note } = data;
    if (!tanggal || !pihak || !nominal || !tipe || !source) throw { status: 400, message: "Data tidak lengkap" };

    const transactItems: any[] = [
        {
            Put: {
                TableName: TableName,
                Item: {
                    PK: `USER#${userEmail}`,
                    SK: getDebtSK(tanggal),
                    pihak,
                    nominal,
                    tipe,
                    tenggat,
                    source,
                    note,
                    status : "UNPAID",
                    tanggal,
                }
            }
        }
    ]

    if (tipe === "PIUTANG"){
         transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr - :val",
                    ConditionExpression: "#attr >= :val",
                    ExpressionAttributeNames: {
                        "#attr": source
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            })
    }else{
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr + :val",
                    ExpressionAttributeNames: {
                        "#attr": source
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            })
    }

    try {
        await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } catch (error: any) {
        if (error.name === 'TransactionCanceledException') {
            throw { status: 400, message: "Saldo di dompet Anda tidak mencukupi" };
        }
        throw error;
    }
}

export const editDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { sk, pihak, nominal, tipe, tenggat, source, note } = data;
    if (!sk || !pihak || !nominal || !tipe || !source) throw { status: 400, message: "Data tidak lengkap" };

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
        }
    }));
    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };

    const oldNominal = oldData.Item.nominal;
    const oldSource = oldData.Item.source;
    const oldTipe = oldData.Item.tipe;
    const status = oldData.Item.status;

    if (status === "PAID") throw { status: 400, message: "Hutang sudah dibayar" };

    const transactItems: any[] = [
        {
            Update:{
                TableName: TableName,
                Key: {
                    PK: `USER#${userEmail}`,
                    SK: sk
                },
                UpdateExpression: "SET #pihak = :pihak, #nominal = :nominal, #tipe = :tipe, #tenggat = :tenggat, #source = :source, #note = :note",
                ExpressionAttributeNames: {
                    "#pihak": "pihak",
                    "#nominal": "nominal",
                    "#tipe": "tipe",
                    "#tenggat": "tenggat",
                    "#source": "source",
                    "#note": "note"
                },
                ExpressionAttributeValues: {
                    ":pihak": pihak,
                    ":nominal": nominal,
                    ":tipe": tipe,
                    ":tenggat": tenggat,
                    ":source": source,
                    ":note": note
                }
            }
        }
    ];

    if (oldTipe === tipe){
        if (oldSource === source){
            if (tipe === "PIUTANG"){
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #attr = #attr + :oldVal - :newVal",
                            ConditionExpression: "#attr + :oldVal >= :newVal",
                            ExpressionAttributeNames: {
                                "#attr": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }else{
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #attr = #attr - :oldVal + :newVal",
                            ConditionExpression: "#attr + :newVal >= :oldVal",
                            ExpressionAttributeNames: {
                                "#attr": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }
        }else{
            if (tipe === "PIUTANG"){
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #old = #old + :oldVal, #new = #new - :newVal",
                            ConditionExpression: "#new >= :newVal",
                            ExpressionAttributeNames: {
                                "#old": oldSource,
                                "#new": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }else{
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #old = #old - :oldVal, #new = #new + :newVal",
                            ConditionExpression: "#old >= :oldVal",
                            ExpressionAttributeNames: {
                                "#old": oldSource,
                                "#new": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }
        }
    }else{
        if (oldSource === source){
            if (tipe === "PIUTANG"){
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #attr = #attr - :total",
                            ConditionExpression: "#attr >= :total",
                            ExpressionAttributeNames: {
                                "#attr": oldSource
                            },
                            ExpressionAttributeValues: {
                                ":total": oldNominal + nominal
                            }
                        }
                    }
                )
            }else{
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #attr = #attr + :total",
                            ExpressionAttributeNames: {
                                "#attr": oldSource
                            },
                            ExpressionAttributeValues: {
                                ":total": oldNominal + nominal
                            }
                        }
                    }
                )
            }
        }else{
            if (tipe === "PIUTANG"){
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #old = #old - :oldVal, #new = #new - :newVal",
                            ConditionExpression: "#old >= :oldVal AND #new >= :newVal",
                            ExpressionAttributeNames: {
                                "#old": oldSource,
                                "#new": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }else{
                transactItems.push(
                    {
                        Update: {
                            TableName: TableName,
                            Key: {
                                PK: `USER#${userEmail}`,
                                SK: `MONEY`,
                            },
                            UpdateExpression: "SET #old = #old + :oldVal, #new = #new + :newVal",
                            ExpressionAttributeNames: {
                                "#old": oldSource,
                                "#new": source
                            },
                            ExpressionAttributeValues: {
                                ":oldVal": oldNominal,
                                ":newVal": nominal
                            }
                        }
                    }
                )
            }
        }
    }
}

export const deleteDebt = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { sk } =data;

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
        }
    }));
    if (!oldData.Item) throw { status: 400, message: "Data tidak ditemukan" };
    const transactItems: any[] = [
        {
            Delete: {
                TableName: TableName,
                Key: {
                    PK: `USER#${userEmail}`,
                    SK: sk
                }
            }
        }
    ];

    const {status, tipe, source, nominal} = oldData.Item;

    if (status === "PAID" ) throw { status: 400, message: "Hutang sudah dibayar" };

    if (status === "UNPAID"){
        if (tipe === "PIUTANG"){
            transactItems.push(
                {
                    Update: {
                        TableName: TableName,
                        Key: {
                            PK: `USER#${userEmail}`,
                            SK: `MONEY`,
                        },
                        UpdateExpression: "SET #attr = #attr + :val",
                        ExpressionAttributeNames: {
                            "#attr": source
                        },
                        ExpressionAttributeValues: {
                            ":val": nominal
                        }
                    }
                }
            )
        }else{
            transactItems.push(
                {
                    Update: {
                        TableName: TableName,
                        Key: {
                            PK: `USER#${userEmail}`,
                            SK: `MONEY`,
                        },
                        UpdateExpression: "SET #attr = #attr - :val",
                        ExpressionAttributeNames: {
                            "#attr": source
                        },
                        ExpressionAttributeValues: {
                            ":val": nominal
                        }
                    }
                }
            )
        }
    }

    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
}

export const payDebt = async (data:any, user:any) => {
    const userEmail = (user as any).email;
    const { tanggal } = data;

    const Hutang = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: getDebtSK(tanggal)
        }
    }));

    if(!Hutang.Item) throw { status: 400, message: "Data tidak ditemukan" };
    
    const {tipe, nominal, source} = Hutang.Item;

    const transactItems: any[] = [
        {
            Update: {
                TableName: TableName,
                Key: {
                    PK: `USER#${userEmail}`,
                    SK: getDebtSK(tanggal)
                },
                UpdateExpression: "SET #status = :status",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":status": "PAID" }
            }
        }
    ];

    if (tipe === "PIUTANG"){
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr + :val",
                    ExpressionAttributeNames: {
                        "#attr": source
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            }
        )
    }else{
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: {
                        PK: `USER#${userEmail}`,
                        SK: `MONEY`,
                    },
                    UpdateExpression: "SET #attr = #attr - :val",
                    ConditionExpression: "#attr >= :val",
                    ExpressionAttributeNames: {
                        "#attr": source
                    },
                    ExpressionAttributeValues: {
                        ":val": nominal
                    }
                }
            }
        )
    }

    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
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
                SK: `CAT#${nama.toUpperCase().replace(/\s+/g, "_")}`,
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

export const tukarsimpanan = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { nominal, asal, tujuan } = data;
    
    if (!asal || !tujuan || !nominal ) throw { status: 400, message: "Data tidak lengkap" };
    if (asal === tujuan) throw { status: 400, message: "Simpanan asal dan tujuan tidak boleh sama" };

    try {
        await docClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Update: {
                        TableName: TableName,
                        Key: {
                            PK: `USER#${userEmail}`,
                            SK: `MONEY`,
                        },
                        UpdateExpression: "SET #asal = #asal - :nominal, #tujuan = #tujuan + :nominal",
                        ConditionExpression: "#asal >= :nominal",
                        ExpressionAttributeNames: {
                            "#asal": asal,
                            "#tujuan": tujuan
                        },
                        ExpressionAttributeValues: {
                            ":nominal": nominal
                        }
                    }
                }
            ]
        }));
    } catch (error: any) {
        if (error.name === 'TransactionCanceledException') {
            throw { status: 400, message: "Saldo di dompet Anda tidak mencukupi untuk transaksi ini." };
        }
        throw error;
    }
}