import { DynamoDBClient, Update$ } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
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

export const daychek = (tanggal:string) =>{
    const transactionTime = new Date(tanggal).getTime();
    const currentTime = Date.now();
    
    const oneDayInMs = 24 * 60 * 60 * 1000; 

    const diff = currentTime - transactionTime;

    if (diff > oneDayInMs) {
        throw { 
            status: 403,
            message: "Transaksi terkunci. Tidak dapat mengubah data yang sudah lebih dari 24 jam." 
        };
    }
}

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

export const getSwitchSK = (tanggal: string) => {
    const uniqueId = Math.random().toString(36).substring(2, 7);
    return `SWITCH#${new Date(tanggal).toISOString()}#${uniqueId}`;
};

export const newIncome = async (data: any, user: any) => {
    const userEmail = (user as any).email;
    const { tanggal, nominal, sumber, kategori, note } = data;
    const amount = Number(nominal);
    if (!tanggal || !amount || !sumber) throw { status: 400, message: "Data tidak lengkap" };

    await docClient.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: TableName,
                    Item: {
                        PK: `USER#${userEmail}`,
                        SK: getIncomeSK(tanggal),
                        nominal: amount,
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
                        ":val": amount
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

    const tanggal = oldData.Item.tanggal;
    daychek(tanggal);

    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;
    const diff = nominal - oldNominal;

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
                UpdateExpression: "SET #attr = #attr  + :diff",
                ExpressionAttributeNames: { "#attr": kategori },
                ExpressionAttributeValues: { ":diff": diff}
            }
        });
    } else {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #oldAttr = #oldAttr - :oldVal, #newAttr = #newAttr + :newVal",
                    ConditionExpression: "#oldAttr >= :oldVal",
                    ExpressionAttributeNames: { "#oldAttr": oldKategori,  "#newAttr": kategori},
                    ExpressionAttributeValues: { ":oldVal": oldNominal,  ":newVal": nominal}
                }
            },
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

    const tanggal = oldData.Item.tanggal;
    daychek(tanggal);

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


    const tanggal = oldData.Item.tanggal;
    daychek(tanggal);


    const oldNominal = oldData.Item.nominal;
    const oldKategori = oldData.Item.kategori;
    const oldSumber = oldData.Item.sumber;

    const diffkt = nominal - oldNominal;
    const diffmy =  oldNominal - nominal;

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
                UpdateExpression: "SET #attr = #attr + :diff",
                ExpressionAttributeNames: { "#attr": "terpakai" },
                ExpressionAttributeValues: { ":diff": diffkt }
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
                    UpdateExpression: "SET #attr = #attr + :diff",
                    ConditionExpression: "#attr >= :diffc",
                    ExpressionAttributeNames: { "#attr": sumber },
                    ExpressionAttributeValues: { ":diff": diffmy, ":diffc": diffkt }
                }
            }
        )
    } else {
        transactItems.push(
            {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #old = #old + :oldVal, #new = #new - :newVal",
                    ConditionExpression: "#new >= :newVal",
                    ExpressionAttributeNames: { "#old": oldSumber,  "#new": sumber},
                    ExpressionAttributeValues: { ":oldVal": oldNominal, ":newVal": nominal }
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

    const tanggal = oldData.Item.tanggal;
    daychek(tanggal);
    
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
    const userEmail = user.email || (user as any).username;
    const { sk, pihak, nominal, tipe, tenggat, source, note } = data;

    const newAmount = Number(nominal);
    if (!sk || !pihak || !newAmount || !tipe || !source) {
        throw { status: 400, message: "Data tidak lengkap" };
    }

    const oldData = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: { PK: `USER#${userEmail}`, SK: sk }
    }));

    if (!oldData.Item) throw { status: 404, message: "Data tidak ditemukan" };
    const oldItem = oldData.Item;
    
    if (oldItem.status === "PAID") throw { status: 400, message: "Hutang sudah lunas, tidak bisa diedit" };

    const oldAmount = Number(oldItem.nominal);
    const oldSource = oldItem.source;
    const oldTipe = oldItem.tipe;

    const revertValue = (oldTipe === "PIUTANG") ? oldAmount : -oldAmount;

    const applyValue = (tipe === "PIUTANG") ? -newAmount : newAmount;

    const transactItems: any[] = [];

    transactItems.push({
        Update: {
            TableName: TableName,
            Key: { PK: `USER#${userEmail}`, SK: sk },
            UpdateExpression: "SET #pihak = :pihak, #nominal = :nominal, #tipe = :tipe, #tenggat = :tenggat, #source = :source, #note = :note, updated_at = :date",
            ExpressionAttributeNames: {
                "#pihak": "pihak", "#nominal": "nominal", "#tipe": "tipe",
                "#tenggat": "tenggat", "#source": "source", "#note": "note"
            },
            ExpressionAttributeValues: {
                ":pihak": pihak, ":nominal": newAmount, ":tipe": tipe,
                ":tenggat": tenggat, ":source": source, ":note": note,
                ":date": new Date().toISOString()
            }
        }
    });

    let moneyUpdate: any;

    if (oldSource === source) {
        const netChange = revertValue + applyValue;

        if (netChange !== 0) {
            moneyUpdate = {
                Update: {
                    TableName: TableName,
                    Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                    UpdateExpression: "SET #tgt = if_not_exists(#tgt, :zero) + :val",
                    ExpressionAttributeNames: { "#tgt": source },
                    ExpressionAttributeValues: { 
                        ":val": netChange, 
                        ":zero": 0 
                    }
                }
            };
            
            if (netChange < 0) {
                moneyUpdate.Update.ConditionExpression = "#tgt >= :minBalance";
                moneyUpdate.Update.ExpressionAttributeValues[":minBalance"] = Math.abs(netChange);
            }
        }

    } else {
        moneyUpdate = {
            Update: {
                TableName: TableName,
                Key: { PK: `USER#${userEmail}`, SK: `MONEY` },
                UpdateExpression: "SET #old = if_not_exists(#old, :zero) + :revert, #new = if_not_exists(#new, :zero) + :apply",
                ExpressionAttributeNames: { 
                    "#old": oldSource, 
                    "#new": source 
                },
                ExpressionAttributeValues: { 
                    ":revert": revertValue, 
                    ":apply": applyValue,
                    ":zero": 0
                }
            }
        };
        const conditions: string[] = [];
        if (revertValue < 0) {
            conditions.push("#old >= :minOld");
            moneyUpdate.Update.ExpressionAttributeValues[":minOld"] = Math.abs(revertValue);
        }
        if (applyValue < 0) {
            conditions.push("#new >= :minNew");
            moneyUpdate.Update.ExpressionAttributeValues[":minNew"] = Math.abs(applyValue);
        }

        if (conditions.length > 0) {
            moneyUpdate.Update.ConditionExpression = conditions.join(" AND ");
        }
    }

    if (moneyUpdate) {
        transactItems.push(moneyUpdate);
    }

    try {
        await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } catch (error: any) {
        if (error.name === 'TransactionCanceledException') {
            throw { status: 400, message: "Saldo tidak mencukupi untuk perubahan ini." };
        }
        console.error("Edit Debt Error:", error);
        throw { status: 500, message: "Gagal mengupdate data" };
    }
};

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
    const { sk } = data;

    const Hutang = await docClient.send(new GetCommand({
        TableName: TableName,
        Key: {
            PK: `USER#${userEmail}`,
            SK: sk
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
                    SK: sk
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
    const dateInfo = getRemainingDaysInMonth();
    
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
                bulan: dateInfo.monthStr,
                tahun: dateInfo.year,
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
    const { sk
        , limit } = data;

    try {
        await docClient.send(new UpdateCommand({
            TableName: TableName,
            Key: {
                PK: `USER#${userEmail}`,
                SK: sk
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
    const { sk } = data;

    try {
        await docClient.send(new DeleteCommand({
            TableName: TableName,
            Key: {
                PK: `USER#${userEmail}`,
                SK: sk
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

    const tanggal = new Date().toISOString();
    try {
        await docClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Put:{
                        TableName: TableName,
                        Item:{
                            PK: `USER#${userEmail}`,
                            SK: getSwitchSK(tanggal),
                            nominal,
                            asal,
                            tujuan,
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